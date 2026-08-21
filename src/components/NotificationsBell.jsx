import React, { useEffect, useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { useLang } from '@/lib/i18n';
import { base44 } from '@/api/base44Client';
import { timeAgo } from '@/lib/format';
import { cn } from '@/lib/utils';

export default function NotificationsBell() {
  const { user } = useAuth();
  const { lang, t } = useLang();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const list = await base44.entities.Notification.filter({ user_id: user.id }, '-created_date', 20);
      setItems(list || []);
    } catch { setItems([]); }
    setLoading(false);
  };

  useEffect(() => {
    if (user) load();
  }, [user]);

  // Poll for new notifications every 60s while logged in.
  useEffect(() => {
    if (!user) return;
    const id = setInterval(() => { load(); }, 60000);
    return () => clearInterval(id);
  }, [user]);

  useEffect(() => {
    const close = () => setOpen(false);
    if (open) {
      window.addEventListener('click', close);
      return () => window.removeEventListener('click', close);
    }
  }, [open]);

  const unread = items.filter(i => !i.read).length;

  const markAll = async (e) => {
    e.stopPropagation();
    const unread = items.filter(i => !i.read);
    if (!unread.length) return;
    await base44.entities.Notification.bulkUpdate(unread.map(i => ({ id: i.id, read: true })));
    load();
  };

  const openItem = async (n) => {
    if (!n.read) {
      setItems(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
      try { await base44.entities.Notification.update(n.id, { read: true }); } catch {}
    }
    setOpen(false);
    if (n.link) navigate(n.link);
  };

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => { setOpen(o => !o); if (!open) load(); }}
        className="relative grid h-10 w-10 place-items-center rounded-full hover:bg-muted transition-colors"
      >
        <Bell className="h-5 w-5 text-foreground" />
        {unread > 0 && (
          <span className="absolute top-1.5 right-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-border bg-card shadow-xl shadow-black/5 overflow-hidden z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="font-semibold text-sm">{t('notifications')}</span>
            {unread > 0 && (
              <button onClick={markAll} className="inline-flex items-center gap-1 text-xs text-primary font-semibold hover:underline">
                <CheckCheck className="h-3.5 w-3.5" /> {t('markAllRead')}
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="p-6 text-center text-sm text-muted-foreground">{t('loading')}</div>
            ) : items.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <Bell className="h-7 w-7 mx-auto text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">{t('notif.empty')}</p>
              </div>
            ) : items.map(n => (
              <button key={n.id} onClick={() => openItem(n)} className={cn('w-full text-left flex gap-3 px-4 py-3 border-b border-border/60 last:border-0 hover:bg-muted/50 transition-colors', !n.read && 'bg-primary/5')}>
                <div className="mt-0.5 h-2 w-2 flex-shrink-0 rounded-full bg-primary" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground leading-snug">{n.title}</p>
                  {n.body && <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{n.body}</p>}
                  <p className="text-[10px] text-muted-foreground/70 mt-1">{timeAgo(n.created_date, lang)}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
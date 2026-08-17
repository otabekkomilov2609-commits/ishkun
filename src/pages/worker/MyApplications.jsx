import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { useLang } from '@/lib/i18n';
import { base44 } from '@/api/base44Client';
import { Card, Skeleton } from '@/components/ui';
import StatusBadge from '@/components/StatusBadge';
import EmptyState from '@/components/EmptyState';
import { ClipboardList, ChevronRight, Calendar, Clock, Wallet } from 'lucide-react';
import { formatSom } from '@/lib/format';

export default function MyApplications() {
  const { user } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();
  const [apps, setApps] = useState(null);
  const [shifts, setShifts] = useState({});

  useEffect(() => {
    if (!user) return;
    (async () => {
      const a = await base44.entities.Application.filter({ worker_id: user.id }, '-created_date', 100);
      setApps(a);
      const ids = [...new Set(a.map(x => x.shift_id))];
      const map = {};
      await Promise.all(ids.map(async id => {
        try { map[id] = await base44.entities.Shift.get(id); } catch {}
      }));
      setShifts(map);
    })();
  }, [user]);

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-display font-bold tracking-tight text-foreground mb-1">{t('wrk.myAppsTitle')}</h1>
      <p className="text-sm text-muted-foreground mb-5">{t('wrk.trackTitle')}</p>

      {apps === null ? (
        <div className="space-y-3">{[0,1].map(i => <Skeleton key={i} className="h-24 w-full" />)}</div>
      ) : apps.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title={t('wrk.noMyApps')}
          action={<button onClick={() => navigate('/worker')} className="text-primary font-semibold text-sm hover:underline">{t('nav.browse')}</button>}
        />
      ) : (
        <div className="space-y-3">
          {apps.map(a => {
            const s = shifts[a.shift_id];
            return (
              <Card key={a.id} className="p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => s && navigate(`/worker/shifts/${a.shift_id}`)}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-foreground line-clamp-1">{s?.title || '—'}</h3>
                    <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" /> {s?.date}</span>
                      <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {s?.start_time}</span>
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-medium"><Wallet className="h-3 w-3" /> {s ? formatSom(s.payment_amount) : ''}</span>
                    </div>
                  </div>
                  <StatusBadge status={a.status} label={t(`app.status${a.status.charAt(0).toUpperCase()}${a.status.slice(1)}`)} />
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
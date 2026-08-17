import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useLang } from '@/lib/i18n';
import { base44 } from '@/api/base44Client';
import { Button, Card, Skeleton } from '@/components/ui';
import StatusBadge from '@/components/StatusBadge';
import EmptyState from '@/components/EmptyState';
import { Users, CalendarDays, Building2, ClipboardList, Shield, ShieldCheck, ShieldOff, ShieldAlert } from 'lucide-react';
import { formatSom } from '@/lib/format';

export default function AdminPanel() {
  const { t } = useLang();
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [shifts, setShifts] = useState(null);
  const [users, setUsers] = useState(null);

  const loadStats = async () => {
    const [u, s, c, a] = await Promise.all([
      base44.entities.User.list('-created_date', 200),
      base44.entities.Shift.list('-created_date', 200),
      base44.entities.Company.list('-created_date', 200),
      base44.entities.Application.list('-created_date', 200)
    ]);
    setStats({ users: u.length, shifts: s.length, companies: c.length, apps: a.length });
    setShifts(s);
    setUsers(u);
  };

  useEffect(() => { loadStats(); }, []);

  const setMod = async (shift, moderation) => {
    await base44.entities.Shift.update(shift.id, { moderation });
    setShifts(prev => prev.map(x => x.id === shift.id ? { ...x, moderation } : x));
  };

  const statCards = [
    { key: 'totalUsers', icon: Users, value: stats?.users, color: 'text-blue-600 bg-blue-50' },
    { key: 'totalShifts', icon: CalendarDays, value: stats?.shifts, color: 'text-emerald-600 bg-emerald-50' },
    { key: 'totalCompanies', icon: Building2, value: stats?.companies, color: 'text-violet-600 bg-violet-50' },
    { key: 'totalApps', icon: ClipboardList, value: stats?.apps, color: 'text-amber-600 bg-amber-50' }
  ];

  const tabs = [
    { id: 'overview', label: t('adm.overview') },
    { id: 'shifts', label: t('adm.allShifts') },
    { id: 'users', label: t('adm.allUsers') }
  ];

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-2 mb-5">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground"><Shield className="h-5 w-5" /></div>
        <div>
          <h1 className="text-2xl font-display font-bold tracking-tight text-foreground">{t('adm.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('adm.overview')}</p>
        </div>
      </div>

      <div className="flex gap-1 mb-5 rounded-xl bg-muted p-1 w-fit">
        {tabs.map(tb => (
          <button key={tb.id} onClick={() => setTab(tb.id)}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${tab === tb.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}>
            {tb.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {statCards.map(c => {
            const Icon = c.icon;
            return (
              <Card key={c.key} className="p-4">
                <div className={`grid h-10 w-10 place-items-center rounded-xl mb-3 ${c.color}`}><Icon className="h-5 w-5" /></div>
                <div className="text-2xl font-display font-bold text-foreground">{stats ? c.value : <Skeleton className="h-7 w-10" />}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{t(`adm.${c.key}`)}</div>
              </Card>
            );
          })}
        </div>
      )}

      {tab === 'shifts' && (
        <div>
          {shifts === null ? (
            <div className="space-y-3">{[0,1,2].map(i => <Skeleton key={i} className="h-24 w-full" />)}</div>
          ) : shifts.length === 0 ? (
            <EmptyState icon={CalendarDays} title={t('adm.noShifts')} />
          ) : (
            <div className="space-y-3">
              {shifts.map(s => (
                <Card key={s.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-foreground line-clamp-1">{s.title}</h3>
                      <p className="text-sm text-muted-foreground mt-0.5">{s.city} · {s.date} · {formatSom(s.payment_amount)}</p>
                      <div className="mt-2">
                        {s.moderation === 'approved' && <StatusBadge status="approved_mod" label={t('adm.approved')} />}
                        {s.moderation === 'pending' && <StatusBadge status="pending_mod" label={t('adm.pending')} />}
                        {s.moderation === 'blocked' && <StatusBadge status="blocked" label={t('adm.blocked')} />}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      {s.moderation !== 'approved' && <Button size="sm" variant="soft" onClick={() => setMod(s, 'approved')}><ShieldCheck className="h-4 w-4" /> {t('adm.approve_mod')}</Button>}
                      {s.moderation !== 'blocked' && <Button size="sm" variant="outline" onClick={() => setMod(s, 'blocked')}><ShieldOff className="h-4 w-4" /> {t('adm.block')}</Button>}
                      {s.moderation === 'blocked' && <Button size="sm" variant="soft" onClick={() => setMod(s, 'approved')}><ShieldAlert className="h-4 w-4" /> {t('adm.unblock')}</Button>}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'users' && (
        <div>
          {users === null ? (
            <div className="space-y-3">{[0,1,2].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
          ) : (
            <Card className="divide-y divide-border">
              {users.map(u => (
                <div key={u.id} className="flex items-center gap-3 p-4">
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                    {(u.full_name || '?').trim().split(/\s+/).slice(0,2).map(s=>s[0]?.toUpperCase()).join('')}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground truncate">{u.full_name || '—'}</p>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  </div>
                  <div className="text-right text-xs">
                    <div className="font-semibold text-foreground">{u.role === 'admin' ? t('admin') : (u.account_type === 'employer' ? t('employer') : t('worker'))}</div>
                    {u.city && <div className="text-muted-foreground">{u.city}</div>}
                  </div>
                </div>
              ))}
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
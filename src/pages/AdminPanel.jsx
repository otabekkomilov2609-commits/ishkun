import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useLang } from '@/lib/i18n';
import { base44 } from '@/api/base44Client';
import { Button, Card, Skeleton } from '@/components/ui';
import StatusBadge from '@/components/StatusBadge';
import EmptyState from '@/components/EmptyState';
import { Users, CalendarDays, Building2, ClipboardList, Shield, ShieldCheck, ShieldOff, ShieldAlert, Bell, UserX } from 'lucide-react';
import AdminKycReview from '@/components/AdminKycReview';
import AdminInvite from '@/components/AdminInvite';
import AdminAttendanceIssues from '@/components/AdminAttendanceIssues';
import { formatSom, displayName } from '@/lib/format';

export default function AdminPanel() {
  const { user } = useAuth();
  const { t, tCity } = useLang();
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [shifts, setShifts] = useState(null);
  const [users, setUsers] = useState(null);
  const [notifs, setNotifs] = useState(null);

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
    if (user) {
      const n = await base44.entities.Notification.filter({ user_id: user.id }, '-created_date', 50);
      setNotifs(n);
    }
  };

  useEffect(() => { loadStats(); }, []);

  const setMod = async (shift, moderation) => {
    await base44.entities.Shift.update(shift.id, { moderation });
    setShifts(prev => prev.map(x => x.id === shift.id ? { ...x, moderation } : x));
  };

  const setUserStatus = async (u, account_status) => {
    await base44.entities.User.update(u.id, { account_status });
    setUsers(prev => prev.map(x => x.id === u.id ? { ...x, account_status } : x));
  };

  const statCards = [
    { key: 'totalUsers', icon: Users, value: stats?.users, color: 'text-blue-600 bg-blue-50' },
    { key: 'totalShifts', icon: CalendarDays, value: stats?.shifts, color: 'text-emerald-600 bg-emerald-50' },
    { key: 'totalCompanies', icon: Building2, value: stats?.companies, color: 'text-violet-600 bg-violet-50' },
    { key: 'totalApps', icon: ClipboardList, value: stats?.apps, color: 'text-amber-600 bg-amber-50' }
  ];

  const tabs = [
    { id: 'overview', label: t('adm.overview') },
    { id: 'kyc', label: t('kyc.tab') },
    { id: 'shifts', label: t('adm.allShifts') },
    { id: 'users', label: t('adm.allUsers') },
    { id: 'invite', label: t('adm.inviteTab') },
    { id: 'attendance', label: t('adm.attendanceIssues') },
    { id: 'notifications', label: t('adm.notifications') }
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

      {tab === 'kyc' && (
        <AdminKycReview />
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
                      <p className="text-sm text-muted-foreground mt-0.5">{tCity(s.city)} · {s.date} · {formatSom(s.payment_amount)}</p>
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
              {users.map(u => {
                const status = u.account_status || 'active';
                const restricted = status === 'paused' || status === 'blocked';
                return (
                  <div key={u.id} className="flex items-center gap-3 p-4">
                    <div className="grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                      {(displayName(u) || '?').trim().split(/\s+/).slice(0,2).map(s=>s[0]?.toUpperCase()).join('')}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground truncate">{displayName(u) || '—'}</p>
                      <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{u.role === 'admin' ? t('admin') : (u.account_type === 'employer' ? t('employer') : t('worker'))}</span>
                        {status === 'paused' && <span className="inline-flex items-center rounded-full bg-amber-50 text-amber-700 text-[10px] font-semibold px-2 py-0.5">{t('adm.statusPaused')}</span>}
                        {status === 'blocked' && <span className="inline-flex items-center rounded-full bg-rose-50 text-rose-700 text-[10px] font-semibold px-2 py-0.5">{t('adm.statusBlocked')}</span>}
                        {status === 'active' && <span className="inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-semibold px-2 py-0.5">{t('adm.statusActive')}</span>}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      {restricted && u.account_type === 'worker' ? (
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => setUserStatus(u, 'blocked')}><ShieldOff className="h-4 w-4" /> {t('adm.confirmBlock')}</Button>
                          <Button size="sm" variant="soft" onClick={() => setUserStatus(u, 'active')}><ShieldCheck className="h-4 w-4" /> {t('adm.reactivate')}</Button>
                        </div>
                      ) : (
                        u.city && <div className="text-xs text-muted-foreground">{tCity(u.city)}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </Card>
          )}
        </div>
      )}

      {tab === 'invite' && (
        <AdminInvite />
      )}

      {tab === 'attendance' && (
        <AdminAttendanceIssues />
      )}

      {tab === 'notifications' && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Bell className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-display font-bold text-foreground">{t('adm.noShowNotif')}</h2>
          </div>
          {notifs === null ? (
            <div className="space-y-3">{[0,1].map(i => <Skeleton key={i} className="h-20 w-full" />)}</div>
          ) : notifs.length === 0 ? (
            <EmptyState icon={Bell} title={t('adm.noNotifs')} />
          ) : (
            <div className="space-y-3">
              {notifs.map(n => (
                <Card key={n.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`grid h-9 w-9 place-items-center rounded-xl flex-shrink-0 ${n.type === 'worker_no_show' ? 'bg-rose-50 text-rose-600' : 'bg-primary/10 text-primary'}`}>
                      {n.type === 'worker_no_show' ? <UserX className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-foreground text-sm">{n.title}</p>
                      <p className="text-sm text-muted-foreground mt-0.5">{n.body}</p>
                    </div>
                    {!n.read && <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-2" />}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
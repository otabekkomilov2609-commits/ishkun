import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { useLang } from '@/lib/i18n';
import { base44 } from '@/api/base44Client';
import { Button, Card, Skeleton } from '@/components/ui';
import WorkerShiftBadge from '@/components/WorkerShiftBadge';
import EmptyState from '@/components/EmptyState';
import TabsNav from '@/components/TabsNav';
import AttendanceBanner from '@/components/AttendanceBanner';
import UpcomingShiftBanner from '@/components/UpcomingShiftBanner';
import { getWorkerShiftState } from '@/lib/shiftStatus';
import { isMismatch } from '@/lib/shiftTime';
import { AlertTriangle } from 'lucide-react';
import { shiftPay } from '@/lib/format';
import CancelBookingDialog from '@/components/CancelBookingDialog';
import { ClipboardList, Calendar, Clock, Wallet, XCircle } from 'lucide-react';
import { formatSom, formatDateDMY } from '@/lib/format';

export default function MyApplications() {
  const { user } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();
  const [apps, setApps] = useState(null);
  const [shifts, setShifts] = useState({});
  const [tab, setTab] = useState('pending');
  const [cancelApp, setCancelApp] = useState(null);

  const load = async () => {
    if (!user) return;
    const a = await base44.entities.Application.filter({ worker_id: user.id }, '-created_date', 100);
    setApps(a);
    const ids = [...new Set(a.map(x => x.shift_id))];
    const map = {};
    await Promise.all(ids.map(async id => {
      try { map[id] = await base44.entities.Shift.get(id); } catch {}
    }));
    setShifts(map);
  };

  useEffect(() => { load(); }, [user]);

  // Cancellation is handled by <CancelBookingDialog /> below (single code path).

  const activeApps = (apps || []).filter(a => a.status !== 'cancelled');

  const matchTab = (a, key) => {
    if (key === 'pending') return a.status === 'pending';
    if (key === 'approved') return (a.status === 'approved' || a.status === 'in_progress') && shifts[a.shift_id]?.status !== 'completed';
    if (key === 'completed') return !['pending', 'approved', 'in_progress'].includes(a.status) || shifts[a.shift_id]?.status === 'completed';
    return false;
  };

  const tabs = [
    { id: 'pending', label: t('wrk.tabPending'), count: activeApps.filter(a => matchTab(a, 'pending')).length },
    { id: 'approved', label: t('wrk.tabApproved'), count: activeApps.filter(a => matchTab(a, 'approved')).length },
    { id: 'completed', label: t('wrk.tabCompleted'), count: activeApps.filter(a => matchTab(a, 'completed')).length }
  ];

  const visible = activeApps.filter(a => matchTab(a, tab));

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-display font-bold tracking-tight text-primary mb-4">{t('wrk.myAppsTitle')}</h1>

      <AttendanceBanner apps={apps} onRefresh={load} />
      <UpcomingShiftBanner apps={apps} shifts={shifts} />

      <TabsNav tabs={tabs} active={tab} onChange={setTab} className="mb-4" />

      {apps === null ? (
        <div className="space-y-3">{[0,1].map(i => <Skeleton key={i} className="h-24 w-full" />)}</div>
      ) : apps.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title={t('wrk.noMyApps')}
          action={<button onClick={() => navigate('/worker')} className="text-primary font-semibold text-sm hover:underline">{t('nav.browse')}</button>}
        />
      ) : visible.length === 0 ? (
        <EmptyState icon={ClipboardList} title={t('wrk.sectionEmpty')} />
      ) : (
        <div className="space-y-3">
          {visible.map(a => {
            const s = shifts[a.shift_id];
            const state = getWorkerShiftState(a, s);
            const pay = s ? shiftPay(s) : null;
            return (
              <Card key={a.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 cursor-pointer" onClick={() => s && navigate(`/worker/shifts/${a.shift_id}`)}>
                    <h3 className="font-semibold text-foreground line-clamp-1">{s?.title || '—'}</h3>
                    <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" /> {s ? formatDateDMY(s.date) : ''}</span>
                      <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {s?.start_time}</span>
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-medium"><Wallet className="h-3 w-3" /> {pay?.total != null ? formatSom(pay.total) : ''}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {isMismatch(a) && <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 text-rose-700 text-[10px] font-semibold px-2 py-0.5"><AlertTriangle className="h-3 w-3" /> {t('att.mismatch')}</span>}
                    <WorkerShiftBadge state={state} />
                  </div>
                </div>
                {(a.status === 'pending' || a.status === 'approved') && (
                  <div className="mt-3">
                    {['blocked', 'paused'].includes(user?.account_status) ? (
                      <p className="text-xs text-rose-700 font-medium">{t('cancelDialog.blockedMsg')}</p>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => setCancelApp(a)}>
                        <XCircle className="h-4 w-4" /> {t('wrk.cancelApp')}
                      </Button>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <CancelBookingDialog
        open={!!cancelApp}
        onOpenChange={(o) => { if (!o) setCancelApp(null); }}
        app={cancelApp}
        shift={cancelApp ? shifts[cancelApp.shift_id] : null}
        workerName={user?.full_name}
        onCancelled={load}
      />
    </div>
  );
}
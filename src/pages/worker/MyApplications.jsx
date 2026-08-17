import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { useLang } from '@/lib/i18n';
import { base44 } from '@/api/base44Client';
import { Button, Card, Skeleton } from '@/components/ui';
import StatusBadge from '@/components/StatusBadge';
import EmptyState from '@/components/EmptyState';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel
} from '@/components/ui/alert-dialog';
import { ClipboardList, Calendar, Clock, Wallet, XCircle, CheckCircle2, Briefcase } from 'lucide-react';
import { formatSom } from '@/lib/format';

export default function MyApplications() {
  const { user } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();
  const [apps, setApps] = useState(null);
  const [shifts, setShifts] = useState({});
  const [cancelTarget, setCancelTarget] = useState(null);
  const [canceling, setCanceling] = useState(false);

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

  const doCancel = async () => {
    if (!cancelTarget) return;
    setCanceling(true);
    try {
      await base44.entities.Application.delete(cancelTarget);
      setCancelTarget(null);
      await load();
    } catch (e) { console.error(e); }
    setCanceling(false);
  };

  const statusLabel = (s) => t(`app.status${s.charAt(0).toUpperCase()}${s.slice(1)}`);

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
        <div className="space-y-6">
          {[
            { statuses: ['pending'], title: t('wrk.sectionPending'), icon: Clock, color: 'text-amber-600' },
            { statuses: ['approved'], title: t('wrk.sectionApproved'), icon: CheckCircle2, color: 'text-emerald-600' },
            { statuses: ['completed'], title: t('wrk.sectionCompleted'), icon: Briefcase, color: 'text-zinc-500' }
          ].map(group => {
            const items = apps.filter(a => group.statuses.includes(a.status));
            const GIcon = group.icon;
            return (
              <div key={group.title}>
                <div className="flex items-center gap-2 mb-2.5">
                  <GIcon className={`h-4 w-4 ${group.color}`} />
                  <h2 className="text-sm font-bold text-foreground">{group.title}</h2>
                  <span className="text-xs font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">{items.length}</span>
                </div>
                {items.length === 0 ? (
                  <p className="text-xs text-muted-foreground pl-6 pb-1">{t('wrk.sectionEmpty')}</p>
                ) : (
                  <div className="space-y-2.5">
                    {items.map(a => {
                      const s = shifts[a.shift_id];
                      return (
                        <Card key={a.id} className="p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1 cursor-pointer" onClick={() => s && navigate(`/worker/shifts/${a.shift_id}`)}>
                              <h3 className="font-semibold text-foreground line-clamp-1">{s?.title || '—'}</h3>
                              <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                                <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" /> {s?.date}</span>
                                <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {s?.start_time}</span>
                                <span className="inline-flex items-center gap-1 text-emerald-700 font-medium"><Wallet className="h-3 w-3" /> {s ? formatSom(s.payment_amount) : ''}</span>
                              </div>
                            </div>
                            <StatusBadge status={a.status} label={statusLabel(a.status)} />
                          </div>
                          {a.status === 'pending' && (
                            <div className="mt-3">
                              <Button size="sm" variant="outline" onClick={() => setCancelTarget(a.id)}>
                                <XCircle className="h-4 w-4" /> {t('wrk.cancelApp')}
                              </Button>
                            </div>
                          )}
                          {a.status === 'approved' && (
                            <div className="mt-3">
                              <Button size="sm" variant="outline" onClick={() => setCancelTarget(a.id)}>
                                <XCircle className="h-4 w-4" /> {t('cancel')}
                              </Button>
                            </div>
                          )}
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <AlertDialog open={!!cancelTarget} onOpenChange={(o) => !o && setCancelTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('wrk.confirmCancel')}</AlertDialogTitle>
            <AlertDialogDescription>{t('wrk.confirmCancelDesc')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={canceling}>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); doCancel(); }}
              disabled={canceling}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {canceling ? t('loading') : t('confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
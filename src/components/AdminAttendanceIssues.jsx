import React, { useEffect, useState } from 'react';
import { useLang } from '@/lib/i18n';
import { base44 } from '@/api/base44Client';
import { Card, Skeleton } from '@/components/ui';
import EmptyState from '@/components/EmptyState';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { isUnresolved } from '@/lib/shiftTime';

// Admin section: bookings unresolved 3+ days after shift end — neither side
// confirmed attendance and the worker didn't self-report (cancel). No automatic
// violation is recorded; this is for manual follow-up only.
export default function AdminAttendanceIssues() {
  const { t } = useLang();
  const [apps, setApps] = useState(null);
  const [shifts, setShifts] = useState(null);
  const [users, setUsers] = useState(null);

  useEffect(() => {
    (async () => {
      const [a, s, u] = await Promise.all([
        base44.entities.Application.list('-created_date', 500),
        base44.entities.Shift.list('-created_date', 500),
        base44.entities.User.list('-created_date', 500)
      ]);
      setApps(a); setShifts(s); setUsers(u);
    })();
  }, []);

  const loading = apps === null || shifts === null || users === null;

  let unresolved = [];
  if (!loading) {
    const shiftById = Object.fromEntries(shifts.map(s => [s.id, s]));
    const userById = Object.fromEntries(users.map(u => [u.id, u]));
    unresolved = apps
      .filter(a => isUnresolved(a, shiftById[a.shift_id]))
      .map(a => ({ a, shift: shiftById[a.shift_id], worker: userById[a.worker_id] }));
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="h-5 w-5 text-amber-500" />
        <h2 className="text-lg font-display font-bold text-foreground">{t('adm.attendanceIssues')}</h2>
      </div>
      {loading ? (
        <div className="space-y-3">{[0, 1].map(i => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : unresolved.length === 0 ? (
        <EmptyState icon={CheckCircle2} title={t('adm.noAttendanceIssues')} />
      ) : (
        <div className="space-y-3">
          {unresolved.map(({ a, shift, worker }) => (
            <Card key={a.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-semibold text-foreground line-clamp-1">{shift?.title || '—'}</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">{worker?.full_name || '—'} · {shift?.date || ''}</p>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-700 text-xs font-semibold px-2.5 py-1 ring-1 ring-inset ring-amber-600/20 whitespace-nowrap">
                  {t('adm.unresolved')}
                </span>
              </div>
              {a.cancellation_reason && (
                <p className="text-xs text-muted-foreground mt-2"><span className="font-semibold">{t('att.cancellationReason')}:</span> {a.cancellation_reason}</p>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
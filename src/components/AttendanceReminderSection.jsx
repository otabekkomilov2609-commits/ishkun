import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { useLang } from '@/lib/i18n';
import { base44 } from '@/api/base44Client';
import { Button, Card } from '@/components/ui';
import { AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { isShiftEnded } from '@/lib/shiftTime';
import { displayName } from '@/lib/format';
import AbsentReasonDialog from '@/components/AbsentReasonDialog';

// Persistent reminder on the employer dashboard: shifts that ended but the
// company still hasn't confirmed whether the worker came or not.
export default function AttendanceReminderSection() {
  const { user } = useAuth();
  const { t } = useLang();
  const [hidden, setHidden] = useState(new Set());
  const [absentApp, setAbsentApp] = useState(null);

  const appsQ = useQuery({
    queryKey: ['employerApps', user?.id],
    queryFn: () => base44.entities.Application.filter({ employer_id: user.id }, '-created_date', 200),
    enabled: !!user,
    staleTime: 30_000,
  });
  const shiftsQ = useQuery({
    queryKey: ['myShifts', user?.id],
    queryFn: () => base44.entities.Shift.filter({ created_by_id: user.id }, '-created_date', 50),
    enabled: !!user,
    staleTime: 60_000,
  });
  const usersQ = useQuery({
    queryKey: ['myApplicants', user?.id],
    queryFn: async () => {
      const res = await base44.functions.invoke('getMyApplicants', {});
      return res?.data?.workers || [];
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  const apps = appsQ.data || [];
  const shifts = shiftsQ.data || [];
  const users = usersQ.data || [];

  const shiftById = useMemo(() => Object.fromEntries(shifts.map(s => [s.id, s])), [shifts]);
  const userById = useMemo(() => Object.fromEntries(users.map(u => [u.id, u])), [users]);

  const reminders = apps.filter(a =>
    a.status === 'approved' &&
    a.company_attendance_status === 'pending' &&
    !hidden.has(a.id) &&
    shiftById[a.shift_id] &&
    isShiftEnded(shiftById[a.shift_id])
  );

  if (reminders.length === 0) return null;

  const confirm = async (app) => {
    setHidden(prev => new Set([...prev, app.id]));
    const now = new Date().toISOString();
    try {
      await base44.entities.Application.update(app.id, { company_attendance_status: 'confirmed_present', company_confirmed_at: now });
      await appsQ.refetch();
    } catch (e) {
      console.error(e);
      setHidden(prev => { const n = new Set(prev); n.delete(app.id); return n; });
    }
  };

  return (
    <div className="mb-6 space-y-3">
      {reminders.map(a => {
        const w = userById[a.worker_id];
        const s = shiftById[a.shift_id];
        return (
          <Card key={a.id} className="p-4 border-amber-300 bg-amber-50">
            <div className="flex items-start gap-2 mb-3">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">{t('att.confirmReminder').replace('{name}', displayName(w) || '—')}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{s?.title} · {s?.date}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="soft" onClick={() => confirm(a)}><CheckCircle2 className="h-4 w-4" /> {t('att.came')}</Button>
              <Button size="sm" variant="outline" onClick={() => setAbsentApp(a)}><XCircle className="h-4 w-4" /> {t('att.notCame')}</Button>
            </div>
          </Card>
        );
      })}
      <AbsentReasonDialog
        open={!!absentApp}
        onOpenChange={(o) => { if (!o) setAbsentApp(null); }}
        app={absentApp}
        shift={absentApp ? shiftById[absentApp.shift_id] : null}
        workerName={absentApp ? displayName(userById[absentApp.worker_id]) : null}
        onConfirmed={(appId) => setHidden(prev => new Set([...prev, appId]))}
      />
    </div>
  );
}
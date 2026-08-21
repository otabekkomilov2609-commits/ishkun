import React, { useState } from 'react';
import { useLang } from '@/lib/i18n';
import { base44 } from '@/api/base44Client';
import { queryClientInstance } from '@/lib/query-client';
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

// Company-side "Kelmadi" confirmation: collects a reason, marks the booking
// confirmed_absent, saves the reason to cancellation_reason, and records a
// no-show violation (idempotent via violation_recorded). Used from
// EmployerShiftDetail and the employer dashboard attendance reminder.
export default function AbsentReasonDialog({ open, onOpenChange, app, shift, workerName, onConfirmed }) {
  const { t } = useLang();
  const [submitting, setSubmitting] = useState(false);

  if (!app || !shift) return null;

  const doConfirm = async () => {
    setSubmitting(true);
    try {
      const now = new Date().toISOString();
      await base44.entities.Application.update(app.id, {
        company_attendance_status: 'confirmed_absent',
        company_confirmed_at: now
      });
      if (!app.violation_recorded) {
        await base44.functions.invoke('recordViolation', {
          application_id: app.id,
          worker_id: app.worker_id,
          source: 'no_show',
          shift_title: shift.title,
          employer_id: app.employer_id || shift.created_by_id
        });
      }
      queryClientInstance.invalidateQueries({ queryKey: ['employerApps'] });
      onOpenChange(false);
      onConfirmed?.(app.id);
    } catch (e) {
      console.error(e);
    }
    setSubmitting(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={(o) => { if (!submitting) onOpenChange(o); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('att.absentTitle')}</AlertDialogTitle>
          <AlertDialogDescription>{t('att.absentDesc').replace('{name}', workerName || '—')}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={submitting}>{t('cancel')}</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => { e.preventDefault(); doConfirm(); }}
            disabled={submitting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {submitting ? t('loading') : t('att.notCame')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
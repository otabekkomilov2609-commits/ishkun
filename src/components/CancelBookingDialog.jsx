import React, { useState, useEffect } from 'react';
import { useLang } from '@/lib/i18n';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';
import { queryClientInstance } from '@/lib/query-client';
import { shiftStartDateTime } from '@/lib/shiftTime';
import { Textarea } from '@/components/ui';
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

const REASONS = ['sick', 'transport', 'emergency', 'other'];
const HOURS_24 = 24 * 60 * 60 * 1000;

export default function CancelBookingDialog({ open, onOpenChange, app, shift, workerName, onCancelled }) {
  const { t } = useLang();
  const { checkUserAuth } = useAuth();
  const [reason, setReason] = useState('');
  const [otherText, setOtherText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { if (open) { setReason(''); setOtherText(''); } }, [open]);

  if (!app || !shift) return null;

  const start = shiftStartDateTime(shift);
  const msUntilStart = start ? start.getTime() - Date.now() : 0;
  const isLate = msUntilStart < HOURS_24;

  const doCancel = async () => {
    setSubmitting(true);
    try {
      const reasonValue = reason === 'other' ? otherText.trim() : t('cancelDialog.reason.' + reason);
      await base44.entities.Application.update(app.id, {
        status: 'cancelled',
        ...(isLate && reason ? { cancellation_reason: reasonValue } : {})
      });
      if (isLate) {
        const res = await base44.functions.invoke('recordViolation', {
          application_id: app.id,
          worker_id: app.worker_id,
          source: 'late_cancel',
          reason: reasonValue,
          shift_title: shift.title,
          worker_name: workerName,
          employer_id: app.employer_id || shift.created_by_id
        });
        if (res?.data?.blocked) {
          try { await checkUserAuth(); } catch {}
        }
      } else {
        await base44.functions.invoke('createNotificationFor', {
          notifications: [{
            user_id: app.employer_id || shift.created_by_id,
            title: 'Ishchi arizani bekor qildi',
            body: `Ishchi ${workerName || 'Ishchi'} arizani bekor qildi.`,
            type: 'application_cancelled',
            link: `/employer/shifts/${shift.id}`
          }]
        });
      }
      queryClientInstance.invalidateQueries({ queryKey: ['myApps'] });
      onOpenChange(false);
      onCancelled?.();
    } catch (e) {
      console.error(e);
    }
    setSubmitting(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={(o) => { if (!submitting) onOpenChange(o); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{isLate ? t('cancelDialog.lateTitle') : t('cancelDialog.title')}</AlertDialogTitle>
          {isLate ? (
            <>
              <AlertDialogDescription>{t('cancelDialog.lateWarning')}</AlertDialogDescription>
              <div className="mt-3">
                <p className="text-sm font-semibold text-foreground mb-2">{t('cancelDialog.reasonLabel')}</p>
                <div className="grid grid-cols-2 gap-2">
                  {REASONS.map(r => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setReason(r)}
                      className={cn(
                        'rounded-xl border px-3 py-2.5 text-sm font-medium text-left transition-colors',
                        reason === r ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card text-foreground hover:bg-muted'
                      )}
                    >
                      {t('cancelDialog.reason.' + r)}
                    </button>
                  ))}
                </div>
                {reason === 'other' && (
                  <Textarea
                    rows={2}
                    className="mt-2"
                    value={otherText}
                    onChange={e => setOtherText(e.target.value)}
                    placeholder={t('cancelDialog.reason.otherPh')}
                  />
                )}
              </div>
            </>
          ) : (
            <AlertDialogDescription>{t('cancelDialog.confirmDesc')}</AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={submitting}>{t('cancel')}</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => { e.preventDefault(); doCancel(); }}
            disabled={submitting || (isLate && (!reason || (reason === 'other' && !otherText.trim())))}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {submitting ? t('loading') : t('cancelDialog.confirmBtn')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
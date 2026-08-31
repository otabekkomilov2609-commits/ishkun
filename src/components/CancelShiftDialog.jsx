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

// Destructive confirmation for cancelling a whole shift. Calls the cancelShift
// backend function (which cancels the shift + its pending/approved applications
// and notifies affected workers), then invalidates employer caches.
export default function CancelShiftDialog({ open, onOpenChange, shift, onCancelled }) {
  const { t } = useLang();
  const [submitting, setSubmitting] = useState(false);

  if (!shift) return null;

  const doConfirm = async () => {
    setSubmitting(true);
    try {
      await base44.functions.invoke('cancelShift', { shift_id: shift.id });
      queryClientInstance.invalidateQueries({ queryKey: ['myShifts'] });
      queryClientInstance.invalidateQueries({ queryKey: ['employerApps'] });
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
          <AlertDialogTitle>{t('shift.cancelConfirmTitle')}</AlertDialogTitle>
          <AlertDialogDescription>{t('shift.cancelConfirmDesc')}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={submitting}>{t('closeBtn')}</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => { e.preventDefault(); doConfirm(); }}
            disabled={submitting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {submitting ? t('loading') : t('shift.cancelConfirmBtn')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
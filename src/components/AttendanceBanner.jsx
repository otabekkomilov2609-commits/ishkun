import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useLang } from '@/lib/i18n';
import { Button, Card } from '@/components/ui';
import { Star } from 'lucide-react';
import RatingPrompt from '@/components/RatingPrompt';
import { isShiftStarted, isShiftEnded } from '@/lib/shiftTime';

export default function AttendanceBanner({ apps, onRefresh }) {
  const { t } = useLang();
  const [shiftsById, setShiftsById] = useState({});
  const [busy, setBusy] = useState(false);
  const [rateApp, setRateApp] = useState(null);

  const list = apps || [];
  const needIds = [...new Set(
    list
      .filter(a => a.status === 'approved' || a.status === 'in_progress' || (a.check_in_time && !a.check_out_time))
      .map(a => a.shift_id)
  )];
  const needKey = needIds.join(',');

  useEffect(() => {
    let alive = true;
    (async () => {
      const map = {};
      await Promise.all(needIds.map(async sid => {
        try { map[sid] = await base44.entities.Shift.get(sid); } catch {}
      }));
      if (alive) setShiftsById(map);
    })();
    return () => { alive = false; };
  }, [needKey]);

  const checkOutTarget = list.find(a => a.check_in_time && !a.check_out_time && shiftsById[a.shift_id] && isShiftEnded(shiftsById[a.shift_id]));
  const checkInTarget = list.find(a => a.status === 'approved' && !a.check_in_time && shiftsById[a.shift_id] && isShiftStarted(shiftsById[a.shift_id]));
  const target = checkOutTarget || checkInTarget;

  if (rateApp) {
    const shift = shiftsById[rateApp.shift_id];
    const confirmed = rateApp.company_attendance_status === 'confirmed_present';
    return (
      <Card className="p-4 mb-4">
        <div className="flex items-center gap-1.5 mb-3">
          <Star className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-bold text-foreground">{t('rating.rateCompany')}</h2>
        </div>
        {confirmed ? (
          <RatingPrompt
            applicationId={rateApp.id}
            shiftId={rateApp.shift_id}
            workerId={rateApp.worker_id}
            companyId={shift?.company_id}
            employerId={shift?.created_by_id}
            ratedBy="worker"
            onDone={onRefresh}
          />
        ) : (
          <p className="text-sm text-muted-foreground">{t('att.waitingConfirm')}</p>
        )}
      </Card>
    );
  }

  if (!target) return null;
  const shift = shiftsById[target.shift_id];
  const isCheckOut = !!checkOutTarget;

  const handle = async () => {
    setBusy(true);
    try {
      if (isCheckOut) {
        const now = new Date().toISOString();
        const hrs = Math.round(((new Date(now) - new Date(target.check_in_time)) / 3600000) * 10) / 10;
        await base44.entities.Application.update(target.id, { check_out_time: now, actual_hours: hrs, status: 'completed' });
        setRateApp({ ...target, check_out_time: now, actual_hours: hrs, status: 'completed' });
      } else {
        const now = new Date().toISOString();
        await base44.entities.Application.update(target.id, { check_in_time: now, status: 'in_progress' });
      }
      onRefresh?.();
    } catch (e) { console.error(e); }
    setBusy(false);
  };

  return (
    <Card className="p-4 mb-4 border-primary/30 bg-primary/5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">{isCheckOut ? t('att.checkOutTitle') : t('att.checkInTitle')}</p>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{shift?.title}</p>
        </div>
        <Button size="sm" disabled={busy} onClick={handle}>
          {isCheckOut ? t('att.checkOutBtn') : t('att.checkInBtn')}
        </Button>
      </div>
    </Card>
  );
}
import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useLang } from '@/lib/i18n';
import { useAuth } from '@/lib/AuthContext';
import { Button, Card, Select } from '@/components/ui';
import { useToast } from '@/components/ui/use-toast';
import { Star } from 'lucide-react';
import RatingPrompt from '@/components/RatingPrompt';
import { isShiftEnded, isCheckInWindowOpen } from '@/lib/shiftTime';
import { shiftDurationHours, parseTime, formatSom, hhmmFromStamp, displayName } from '@/lib/format';
import { queryClientInstance } from '@/lib/query-client';
import CancelBookingDialog from '@/components/CancelBookingDialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from '@/components/ui/drawer';

function hhmmNow() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
function computeLive(shift, start, end) {
  let s = parseTime(start), e = parseTime(end);
  if (e <= s) e += 24 * 60;
  const actualHours = Math.round(((e - s) / 60) * 10) / 10;
  const plannedHours = shiftDurationHours(shift);
  const hourlyRate = plannedHours > 0 ? (shift.daily_rate || 0) / plannedHours : 0;
  const deviation = actualHours - plannedHours;
  const payment = Math.abs(deviation) <= 0.5 ? (shift.daily_rate || 0) : Math.round(hourlyRate * actualHours);
  return { actualHours, plannedHours, deviation, payment };
}

export default function WorkHoursBanner({ apps, onRefresh }) {
  const { t } = useLang();
  const { user } = useAuth();
  const { toast } = useToast();
  const [shiftsById, setShiftsById] = useState({});
  const [busy, setBusy] = useState(false);
  const [rateApp, setRateApp] = useState(null);
  const [cancelApp, setCancelApp] = useState(null);
  const [drawer, setDrawer] = useState(null);
  const [startVal, setStartVal] = useState('');
  const [endVal, setEndVal] = useState('');
  const [reason, setReason] = useState('');
  const [otherText, setOtherText] = useState('');

  const list = apps || [];
  const needIds = [...new Set(
    list.filter(a => a.status === 'approved' || a.status === 'in_progress' || (a.check_in_time && !a.check_out_time)).map(a => a.shift_id)
  )];
  const needKey = needIds.join(',');

  useEffect(() => {
    let alive = true;
    (async () => {
      const map = {};
      await Promise.all(needIds.map(async sid => { try { map[sid] = await base44.entities.Shift.get(sid); } catch {} }));
      if (alive) setShiftsById(map);
    })();
    return () => { alive = false; };
  }, [needKey]);

  const endTarget = list.find(a =>
    shiftsById[a.shift_id] &&
    isShiftEnded(shiftsById[a.shift_id]) &&
    !a.check_out_time &&
    a.hours_status !== 'confirmed' &&
    (a.check_in_time || a.status === 'approved')
  );
  const startTarget = list.find(a =>
    a.status === 'approved' &&
    !a.check_in_time &&
    a.hours_status !== 'confirmed' &&
    shiftsById[a.shift_id] &&
    isCheckInWindowOpen(shiftsById[a.shift_id]) &&
    !isShiftEnded(shiftsById[a.shift_id])
  );
  const workingTarget = list.find(a => a.check_in_time && !a.check_out_time && shiftsById[a.shift_id] && !isShiftEnded(shiftsById[a.shift_id]));
  const target = endTarget || startTarget;

  if (rateApp) {
    const shift = shiftsById[rateApp.shift_id];
    return (
      <Card className="p-4 mb-4">
        <div className="flex items-center gap-1.5 mb-3">
          <Star className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-bold text-foreground">{t('rating.rateCompany')}</h2>
        </div>
        <RatingPrompt applicationId={rateApp.id} shiftId={rateApp.shift_id} workerId={rateApp.worker_id} companyId={shift?.company_id} employerId={shift?.created_by_id} ratedBy="worker" onDone={onRefresh} />
      </Card>
    );
  }

  const blocked = ['blocked', 'paused'].includes(user?.account_status);
  if (blocked && (target || workingTarget)) {
    return <Card className="p-4 mb-4"><p className="text-sm text-rose-700 font-medium">{t('cancelDialog.blockedMsg')}</p></Card>;
  }

  if (!target && workingTarget) {
    const shift = shiftsById[workingTarget.shift_id];
    return (
      <Card className="p-4 mb-4">
        <p className="text-sm font-semibold text-foreground">{t('hours.workingTitle')}</p>
        <p className="text-xs text-muted-foreground mt-1">{t('att.came')}: {hhmmFromStamp(workingTarget.check_in_time)} · {shift?.title}</p>
        <p className="text-xs text-muted-foreground mt-1">{t('hours.endHint')}</p>
      </Card>
    );
  }

  if (!target) return null;

  const shift = shiftsById[target.shift_id];
  const isEnd = !!endTarget;

  const openDrawer = () => {
    if (isEnd) {
      setStartVal(hhmmFromStamp(target.check_in_time, shift.start_time));
      setEndVal(shift.end_time);
    } else {
      setStartVal(shift.start_time);
      setEndVal('');
    }
    setReason('');
    setOtherText('');
    setDrawer({ phase: isEnd ? 'end' : 'start', app: target, shift });
  };

  const live = isEnd ? computeLive(shift, startVal || shift.start_time, endVal || shift.end_time) : null;
  const needsReason = live && Math.abs(live.deviation) > 0.5;
  const reasonValue = reason === 'r5' ? otherText.trim() : (reason ? t('hours.' + reason) : '');
  const canSubmit = !busy && (!isEnd || !needsReason || (reason && (reason !== 'r5' || otherText.trim())));

  const submit = async () => {
    setBusy(true);
    try {
      if (isEnd) {
        const res = await base44.functions.invoke('submitHours', { application_id: target.id, phase: 'end', start_time: startVal, end_time: endVal, deviation_reason: needsReason ? reasonValue : undefined });
        const data = res?.data || {};
        if (data.hours_status === 'confirmed') {
          setRateApp({ ...target, status: 'completed', actual_hours: data.actual_hours, final_payment_amount: data.final_payment_amount, hours_status: 'confirmed' });
          setDrawer(null);
        } else {
          setDrawer(null);
          toast({ title: t('hours.sentToEmployer') });
        }
        onRefresh?.();
        queryClientInstance.invalidateQueries({ queryKey: ['myApps'] });
      } else {
        await base44.functions.invoke('submitHours', { application_id: target.id, phase: 'start', start_time: startVal });
        setDrawer(null);
        onRefresh?.();
        queryClientInstance.invalidateQueries({ queryKey: ['myApps'] });
      }
    } catch (e) {
      console.error(e);
      toast({ title: t('errUpdate'), description: e?.message, variant: 'destructive' });
      setDrawer(null);
    }
    setBusy(false);
  };

  return (
    <>
      <Card className="p-4 mb-4 border-primary/30 bg-primary/5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">{isEnd ? t('hours.endBtn') : t('hours.startBtn')}</p>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{shift?.title}</p>
          </div>
          <div className="flex items-center gap-2">
            {!isEnd && <Button size="sm" variant="outline" onClick={() => setCancelApp(target)}>{t('cancelDialog.cannotCome')}</Button>}
            <Button size="sm" onClick={openDrawer}>{isEnd ? t('hours.endBtn') : t('hours.startBtn')}</Button>
          </div>
        </div>
      </Card>

      <Drawer open={!!drawer} onOpenChange={(o) => { if (!o) setDrawer(null); }}>
        <DrawerContent className="max-h-[88vh]">
          <DrawerHeader className="pb-2">
            <DrawerTitle>{isEnd ? t('hours.endBtn') : t('hours.startBtn')}</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-2 overflow-y-auto space-y-3">
            <div>
              <label className="text-sm font-semibold text-foreground block mb-1.5">{t('hours.arrivedLabel')}</label>
              <input type="time" value={startVal} onChange={e => setStartVal(e.target.value)} className="h-11 w-full rounded-xl border border-input bg-card px-3 text-sm" />
              {!isEnd && <p className="text-xs text-muted-foreground mt-1">{t('hours.nowHint')} {hhmmNow()}</p>}
            </div>
            <p className="text-xs text-muted-foreground">{shift.start_time} — {shift.end_time}</p>
            {!isEnd && <p className="text-xs text-muted-foreground">{t('hours.startNote')}</p>}
            {isEnd && (
              <>
                <div>
                  <label className="text-sm font-semibold text-foreground block mb-1.5">{t('hours.leftLabel')}</label>
                  <input type="time" value={endVal} onChange={e => setEndVal(e.target.value)} className="h-11 w-full rounded-xl border border-input bg-card px-3 text-sm" />
                </div>
                {live && (
                  <div className="rounded-xl bg-muted/40 p-3 text-sm">
                    <p className="font-semibold text-foreground">{t('hours.totalLabel')}: {live.actualHours} {t('shift.durationShort')} <span className="text-muted-foreground font-normal">· {t('hours.plannedShort')} {live.plannedHours}</span></p>
                    <p className="text-emerald-700 font-semibold mt-1">{formatSom(live.payment)}</p>
                  </div>
                )}
                {needsReason && (
                  <>
                    <p className="text-xs text-amber-700 font-medium">{t('hours.deviationWarn')}</p>
                    <div>
                      <label className="text-sm font-semibold text-foreground block mb-1.5">{t('hours.reasonLabel')}</label>
                      <Select value={reason} onChange={e => setReason(e.target.value)}>
                        <option value="">—</option>
                        {['r1', 'r2', 'r3', 'r4', 'r5'].map(r => <option key={r} value={r}>{t('hours.' + r)}</option>)}
                      </Select>
                    </div>
                    {reason === 'r5' && (
                      <input value={otherText} onChange={e => setOtherText(e.target.value)} placeholder={t('hours.otherPh')} className="h-11 w-full rounded-xl border border-input bg-card px-3 text-sm" />
                    )}
                  </>
                )}
              </>
            )}
          </div>
          <DrawerFooter className="flex-row gap-2 border-t border-border bg-background">
            <Button variant="outline" onClick={() => setDrawer(null)} className="flex-1">{t('cancel')}</Button>
            <Button onClick={submit} disabled={!canSubmit} className="flex-[2]">{busy ? t('loading') : (isEnd ? t('hours.endBtn') : t('hours.startBtn'))}</Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <CancelBookingDialog
        open={!!cancelApp}
        onOpenChange={(o) => { if (!o) setCancelApp(null); }}
        app={cancelApp}
        shift={cancelApp ? shiftsById[cancelApp.shift_id] : null}
        workerName={displayName(user)}
        onCancelled={() => { setCancelApp(null); onRefresh?.(); }}
      />
    </>
  );
}
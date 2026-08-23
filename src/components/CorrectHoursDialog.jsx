import React, { useState, useMemo, useEffect } from 'react';
import { useLang } from '@/lib/i18n';
import { Button } from '@/components/ui';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from '@/components/ui/drawer';
import { base44 } from '@/api/base44Client';
import { shiftDurationHours, parseTime, formatSom } from '@/lib/format';

function hhmmOf(iso, fallback) {
  if (!iso) return fallback || '';
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function CorrectHoursDialog({ open, onOpenChange, app, shift, workerName, onDone }) {
  const { t } = useLang();
  const [startVal, setStartVal] = useState('');
  const [endVal, setEndVal] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open && shift) {
      setStartVal(hhmmOf(app?.check_in_time, shift.start_time));
      setEndVal(hhmmOf(app?.check_out_time, shift.end_time));
      setNote('');
    }
  }, [open, shift, app]);

  const live = useMemo(() => {
    if (!shift || !startVal || !endVal) return null;
    let s = parseTime(startVal), e = parseTime(endVal);
    if (e <= s) e += 24 * 60;
    const actualHours = Math.round(((e - s) / 60) * 10) / 10;
    const plannedHours = shiftDurationHours(shift);
    const hourlyRate = plannedHours > 0 ? (shift.daily_rate || 0) / plannedHours : 0;
    const deviation = actualHours - plannedHours;
    const payment = Math.abs(deviation) <= 0.5 ? (shift.daily_rate || 0) : Math.round(hourlyRate * actualHours);
    return { actualHours, plannedHours, payment };
  }, [shift, startVal, endVal]);

  if (!shift) return null;

  const save = async () => {
    if (!note.trim() || busy) return;
    setBusy(true);
    try {
      await base44.functions.invoke('confirmHours', { application_id: app.id, action: 'correct', start_time: startVal, end_time: endVal, note: note.trim() });
      onOpenChange(false);
      onDone?.();
    } catch (e) { console.error(e); }
    setBusy(false);
  };

  return (
    <Drawer open={open} onOpenChange={(o) => { if (!busy) onOpenChange(o); }}>
      <DrawerContent className="max-h-[88vh]">
        <DrawerHeader className="pb-2">
          <DrawerTitle>{workerName}</DrawerTitle>
          <p className="text-xs text-muted-foreground">{t('hours.plannedShort')} {shift.start_time} — {shift.end_time}</p>
        </DrawerHeader>
        <div className="px-4 pb-2 overflow-y-auto space-y-3">
          <div>
            <label className="text-sm font-semibold text-foreground block mb-1.5">{t('hours.arrivedLabel')}</label>
            <input type="time" value={startVal} onChange={e => setStartVal(e.target.value)} className="h-11 w-full rounded-xl border border-input bg-card px-3 text-sm" />
          </div>
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
          <div>
            <label className="text-sm font-semibold text-foreground block mb-1.5">{t('hours.noteLabel')}</label>
            <input value={note} onChange={e => setNote(e.target.value)} placeholder={t('hours.notePh')} className="h-11 w-full rounded-xl border border-input bg-card px-3 text-sm" />
          </div>
        </div>
        <DrawerFooter className="flex-row gap-2 border-t border-border bg-background">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">{t('cancel')}</Button>
          <Button onClick={save} disabled={!note.trim() || busy} className="flex-[2]">{busy ? t('loading') : t('save')}</Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
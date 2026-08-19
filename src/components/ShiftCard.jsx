import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Wallet, Users } from 'lucide-react';
import { useLang } from '@/lib/i18n';
import { formatSom, formatDateDMY, timeRange, shiftPay, shiftDurationHours } from '@/lib/format';
import StatusBadge from './StatusBadge';
import WorkerShiftBadge from './WorkerShiftBadge';
import { cn } from '@/lib/utils';

export default function ShiftCard({ shift, to, showStatus = false, statusLabel, workerState }) {
  const { t } = useLang();
  const link = to || (shift.id ? `/worker/shifts/${shift.id}` : '#');
  const pay = shiftPay(shift);
  const dur = shiftDurationHours(shift);
  const durLabel = Number.isInteger(dur) ? dur : dur.toFixed(1);

  return (
    <Link to={link} className="block group">
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm transition-all hover:shadow-md hover:border-primary/40 hover:-translate-y-0.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-semibold text-foreground leading-snug line-clamp-1">{shift.title}</h3>
            <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              <span className="truncate">{shift.location || shift.city}</span>
            </div>
          </div>
          {workerState ? <WorkerShiftBadge state={workerState} /> : showStatus ? <StatusBadge status={shift.status} label={statusLabel} /> : null}
        </div>

        <div className="mt-2.5 text-xs text-muted-foreground">
          {formatDateDMY(shift.date)}, {timeRange(shift)} ({durLabel} {t('shift.durationShort')})
        </div>

        <div className="mt-3 flex items-end justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 text-emerald-700 font-bold text-base">
              <Wallet className="h-4 w-4" />
              {pay.total != null ? formatSom(pay.total) : '—'}
            </div>
            {pay.hourlyRate != null && (
              <div className="text-xs text-muted-foreground mt-0.5">{formatSom(pay.hourlyRate)}/{t('shift.hourShort')}</div>
            )}
          </div>
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="h-3.5 w-3.5" /> {shift.required_workers} {t('wrk.perWorker')}
          </span>
        </div>
      </div>
    </Link>
  );
}
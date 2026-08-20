import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Wallet, CalendarDays, Heart, Clock } from 'lucide-react';
import { useLang } from '@/lib/i18n';
import { formatSom, formatDateWeekDay, shiftPay } from '@/lib/format';
import StatusBadge from './StatusBadge';
import WorkerShiftBadge from './WorkerShiftBadge';
import { cn } from '@/lib/utils';

export default function ShiftCard({ shift, to, showStatus = false, statusLabel, workerState, liked }) {
  const { t, lang } = useLang();
  const link = to || (shift.id ? `/worker/shifts/${shift.id}` : '#');
  const pay = shiftPay(shift);

  return (
    <Link to={link} className="block group">
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm transition-all hover:shadow-md hover:border-primary/40 hover:-translate-y-0.5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 text-emerald-700 font-extrabold text-lg">
              <Wallet className="h-4 w-4" />
              {pay.total != null ? formatSom(pay.total) : '—'}
            </div>
            {pay.hourlyRate != null && (
              <div className="text-xs text-muted-foreground mt-0.5">{formatSom(pay.hourlyRate)}/{t('shift.hourShort')}</div>
            )}
          </div>
          {workerState ? <WorkerShiftBadge state={workerState} /> : showStatus ? <StatusBadge status={shift.status} label={statusLabel} /> : null}
        </div>

        <div className="mt-2.5">
          <h3 className="font-semibold text-foreground leading-snug line-clamp-1">{shift.title}</h3>
          <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            <span className="truncate">{shift.location || shift.city}</span>
          </div>
        </div>

        <div className="mt-2.5 flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-2.5 py-1 text-sm font-semibold text-primary">
            <CalendarDays className="h-3.5 w-3.5" />
            {formatDateWeekDay(shift.date, lang)}
          </span>
          {shift.start_time && (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-2.5 py-1 text-sm font-semibold text-foreground">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              {shift.start_time}{shift.end_time ? `–${shift.end_time}` : ''}
            </span>
          )}
          {liked && (
            <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-semibold px-2 py-1">
              <Heart className="h-3 w-3" /> {t('att.likedCompany')}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
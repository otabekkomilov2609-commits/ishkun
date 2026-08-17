import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Clock, Wallet, Users } from 'lucide-react';
import { useLang } from '@/lib/i18n';
import { formatSom } from '@/lib/format';
import StatusBadge from './StatusBadge';
import { cn } from '@/lib/utils';

export default function ShiftCard({ shift, to, showStatus = false, statusLabel }) {
  const { t } = useLang();
  const link = to || (shift.id ? `/worker/shifts/${shift.id}` : '#');

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
          {showStatus && <StatusBadge status={shift.status} label={statusLabel} />}
        </div>
        <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" /> {shift.date}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" /> {shift.start_time}
          </span>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 text-emerald-700 font-bold">
            <Wallet className="h-4 w-4" />
            {formatSom(shift.payment_amount)}
          </span>
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="h-3.5 w-3.5" /> {shift.required_workers} {t('wrk.perWorker')}
          </span>
        </div>
      </div>
    </Link>
  );
}

function Calendar(props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}
import React from 'react';
import { Bell } from 'lucide-react';
import { useLang } from '@/lib/i18n';
import { shiftStartDateTime } from '@/lib/shiftTime';

const HOURS_24 = 24 * 60 * 60 * 1000;

// Informational reminder: shows when an accepted booking starts within the next 24h.
export default function UpcomingShiftBanner({ apps, shifts }) {
  const { t } = useLang();
  if (!apps || !shifts) return null;
  const now = Date.now();
  const upcoming = apps
    .filter(a => a.status === 'approved')
    .map(a => ({ shift: shifts[a.shift_id], start: shiftStartDateTime(shifts[a.shift_id]) }))
    .filter(x => x.shift && x.start)
    .map(x => ({ ...x, diff: x.start.getTime() - now }))
    .filter(x => x.diff > 0 && x.diff <= HOURS_24)
    .sort((a, b) => a.diff - b.diff);

  if (upcoming.length === 0) return null;
  const { shift, start } = upcoming[0];
  const hoursLeft = Math.max(1, Math.round((start.getTime() - now) / (60 * 60 * 1000)));
  const text = t('cancel.upcomingReminder').replace('{title}', shift.title).replace('{hours}', String(hoursLeft));
  return (
    <div className="mb-4 rounded-xl bg-blue-50 border border-blue-200 px-4 py-3 flex items-start gap-2">
      <Bell className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
      <p className="text-sm text-blue-800">{text}</p>
    </div>
  );
}
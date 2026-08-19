// Shared worker-facing shift/application status logic.
// Returns a display state for the logged-in worker's relationship to a shift.

export const STATE_STYLES = {
  primary: 'bg-primary text-primary-foreground',
  pending: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20',
  booked: 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20',
  active: 'bg-emerald-100 text-emerald-700 ring-1 ring-inset ring-emerald-600/30',
  completed: 'bg-zinc-100 text-zinc-600 ring-1 ring-inset ring-zinc-500/20',
  rejected: 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/20',
  muted: 'bg-muted text-muted-foreground ring-1 ring-inset ring-border'
};

// Priority order per spec.
export function getWorkerShiftState(app, shift) {
  if (!app) return { key: 'apply', labelKey: 'wstat.apply', kind: 'primary' };
  switch (app.status) {
    case 'rejected':
      return { key: 'rejected', labelKey: 'wstat.rejected', kind: 'rejected' };
    case 'cancelled':
      return { key: 'cancelled', labelKey: 'wstat.cancelled', kind: 'muted' };
    case 'completed':
      return { key: 'completed', labelKey: 'wstat.completed', kind: 'completed' };
    case 'no_show':
      return { key: 'noShow', labelKey: 'wstat.noShow', kind: 'rejected' };
    case 'in_progress':
      return { key: 'inProgress', labelKey: 'wstat.inProgress', kind: 'active' };
    case 'approved':
      if (shift && shift.status === 'completed') {
        return { key: 'completed', labelKey: 'wstat.completed', kind: 'completed' };
      }
      return { key: 'booked', labelKey: 'wstat.booked', kind: 'booked' };
    case 'pending':
    default:
      return { key: 'applied', labelKey: 'wstat.applied', kind: 'pending' };
  }
}

// Find the worker's relevant application for a shift (prefers non-cancelled).
export function pickWorkerApp(apps, shiftId) {
  if (!apps) return null;
  const matching = apps.filter(a => a.shift_id === shiftId);
  if (matching.length === 0) return null;
  const active = matching.find(a => a.status !== 'cancelled');
  return active || matching[0];
}
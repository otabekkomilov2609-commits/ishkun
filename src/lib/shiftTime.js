export function shiftStartDateTime(shift) {
  if (!shift?.date || !shift?.start_time) return null;
  const [y, m, d] = shift.date.split('-').map(Number);
  const [h, mi] = shift.start_time.split(':').map(Number);
  return new Date(y, m - 1, d, h || 0, mi || 0);
}

export function shiftEndDateTime(shift) {
  if (!shift?.date || !shift?.end_time) return null;
  const [y, m, d] = shift.date.split('-').map(Number);
  const [h, mi] = shift.end_time.split(':').map(Number);
  return new Date(y, m - 1, d, h || 0, mi || 0);
}

export function isShiftStarted(shift) {
  const s = shiftStartDateTime(shift);
  return !!s && Date.now() >= s.getTime();
}

// Check-in/attendance window: opens `leadMinutes` (default 10) before start_time,
// so the "did you arrive?" / "did the worker come?" prompts surface slightly ahead
// of the shift instead of only once it has already started.
export function isCheckInWindowOpen(shift, leadMinutes = 10) {
  const s = shiftStartDateTime(shift);
  return !!s && Date.now() >= s.getTime() - leadMinutes * 60000;
}

export function isShiftEnded(shift) {
  const e = shiftEndDateTime(shift);
  return !!e && Date.now() >= e.getTime();
}

// Worker self-report vs company confirmation disagreement.
export function isMismatch(app) {
  if (!app) return false;
  const cas = app.company_attendance_status;
  const checkedIn = !!app.check_in_time;
  if (cas === 'confirmed_absent' && checkedIn) return true;
  if (cas === 'confirmed_present' && !checkedIn) return true;
  return false;
}

// Live attendance label key (att.notArrived / att.late / att.working / att.done).
export function attendanceLabel(app, shift) {
  if (app?.check_out_time) return 'done';
  if (app?.check_in_time) return 'working';
  if (shift && isShiftStarted(shift)) return 'late';
  return 'notArrived';
}

// Unresolved: 3+ days after shift end, company hasn't confirmed attendance
// AND the worker hasn't self-reported (no check-in, booking not cancelled).
// No automatic violation — for manual admin follow-up.
export function isUnresolved(app, shift) {
  if (!app || !shift) return false;
  if (app.company_attendance_status !== 'pending') return false;
  if (app.check_in_time) return false;
  if (app.status && app.status !== 'approved') return false;
  const end = shiftEndDateTime(shift);
  if (!end) return false;
  return Date.now() - end.getTime() > 3 * 24 * 60 * 60 * 1000;
}
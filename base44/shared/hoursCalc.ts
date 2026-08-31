// Shared hours/payment calculation for submitHours and confirmHours.
// All datetimes are built with Date.UTC so .toISOString() yields exactly the
// entered wall-clock time, independent of the server or client timezone.

export function toStamp(dateStr, hhmm, addDays = 0) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [h, mi] = hhmm.split(':').map(Number);
  return new Date(Date.UTC(y, m - 1, (d || 1) + addDays, h || 0, mi || 0, 0, 0)).toISOString();
}

export function buildDateTime(dateStr, hhmm) {
  return new Date(toStamp(dateStr, hhmm));
}

export function buildTimes(dateStr, startHHMM, endHHMM) {
  const start = buildDateTime(dateStr, startHHMM);
  let end = buildDateTime(dateStr, endHHMM);
  if (end.getTime() <= start.getTime()) end = new Date(toStamp(dateStr, endHHMM, 1));
  return { start, end };
}

export function plannedHoursFromShift(shift) {
  if (!shift || !shift.start_time || !shift.end_time) return 0;
  const { start, end } = buildTimes(shift.date, shift.start_time, shift.end_time);
  return Math.round(((end.getTime() - start.getTime()) / 3600000) * 10) / 10;
}

// Unrounded planned hours. The hourly rate and the deviation must come from
// this, not from the 1-decimal display value: rounding 1.25h to 1.3h inflates
// the divisor and underpays every shift that is not a multiple of 6 minutes.
export function plannedHoursExactFromShift(shift) {
  if (!shift || !shift.start_time || !shift.end_time) return 0;
  const { start, end } = buildTimes(shift.date, shift.start_time, shift.end_time);
  return (end.getTime() - start.getTime()) / 3600000;
}

// tolerance: if |deviation| <= tolerance hours, payment = daily_rate (no overtime).
// Otherwise payment = round(hourlyRate * actualHours), overtime = positive deviation.
export function computeHours(shift, startHHMM, endHHMM) {
  const { start, end } = buildTimes(shift.date, startHHMM, endHHMM);
  const actualHoursExact = (end.getTime() - start.getTime()) / 3600000;
  const actualHours = Math.round(actualHoursExact * 10) / 10;
  const plannedHours = plannedHoursFromShift(shift);
  const plannedHoursExact = plannedHoursExactFromShift(shift);
  const hourlyRate = plannedHoursExact > 0 ? (shift.daily_rate || 0) / plannedHoursExact : 0;
  const deviation = actualHoursExact - plannedHoursExact;
  let finalPayment, overtimeHours;
  if (Math.abs(deviation) <= 0.5) {
    finalPayment = shift.daily_rate || 0;
    overtimeHours = 0;
  } else {
    finalPayment = Math.round(hourlyRate * actualHoursExact);
    overtimeHours = deviation > 0 ? Math.round(deviation * 10) / 10 : 0;
  }
  return { start, end, actualHours, plannedHours, hourlyRate, deviation, finalPayment, overtimeHours };
}
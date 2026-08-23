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

// tolerance: if |deviation| <= tolerance hours, payment = daily_rate (no overtime).
// Otherwise payment = round(hourlyRate * actualHours), overtime = positive deviation.
export function computeHours(shift, startHHMM, endHHMM) {
  const { start, end } = buildTimes(shift.date, startHHMM, endHHMM);
  const actualHours = Math.round(((end.getTime() - start.getTime()) / 3600000) * 10) / 10;
  const plannedHours = plannedHoursFromShift(shift);
  const hourlyRate = plannedHours > 0 ? (shift.daily_rate || 0) / plannedHours : 0;
  const deviation = actualHours - plannedHours;
  let finalPayment, overtimeHours;
  if (Math.abs(deviation) <= 0.5) {
    finalPayment = shift.daily_rate || 0;
    overtimeHours = 0;
  } else {
    finalPayment = Math.round(hourlyRate * actualHours);
    overtimeHours = deviation > 0 ? Math.round(deviation * 10) / 10 : 0;
  }
  return { start, end, actualHours, plannedHours, hourlyRate, deviation, finalPayment, overtimeHours };
}
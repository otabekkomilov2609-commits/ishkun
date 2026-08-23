// Shared hours/payment calculation for submitHours and confirmHours.
// Build absolute datetimes from a shift date + "HH:MM" strings, applying the
// overnight rule (end <= start means end is the next day), then compute actual
// hours, deviation from planned, hourly pro-rata rate, and final payment.

export function buildDateTime(dateStr, hhmm) {
  if (!dateStr || !hhmm) return null;
  const [y, m, d] = dateStr.split('-').map(Number);
  const [h, mi] = hhmm.split(':').map(Number);
  return new Date(y, m - 1, d, h || 0, mi || 0);
}

export function buildTimes(dateStr, startHHMM, endHHMM) {
  const start = buildDateTime(dateStr, startHHMM);
  const end = buildDateTime(dateStr, endHHMM);
  if (end.getTime() <= start.getTime()) end.setDate(end.getDate() + 1);
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
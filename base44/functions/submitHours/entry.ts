import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { buildDateTime, computeHours } from '../../shared/hoursCalc.ts';

// Worker self-reports their own start/end times ("HH:MM"). Payment is computed
// here, never in the browser. phase 'start' just records arrival + in_progress;
// phase 'end' computes hours/payment and either auto-confirms (within 0.5h of
// plan) or sends to the employer for confirmation (with a required reason).
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { application_id, phase, start_time, end_time, deviation_reason } = body || {};
    if (!application_id || !phase) return Response.json({ error: 'Missing required fields' }, { status: 400 });
    if (phase !== 'start' && phase !== 'end') return Response.json({ error: 'Invalid phase' }, { status: 400 });

    const app = await base44.asServiceRole.entities.Application.get(application_id);
    if (!app) return Response.json({ error: 'Application not found' }, { status: 404 });
    if (user.id !== app.worker_id) return Response.json({ error: 'Forbidden' }, { status: 403 });
    if (app.hours_status === 'confirmed') return Response.json({ error: 'Hours already confirmed' }, { status: 409 });

    const shift = await base44.asServiceRole.entities.Shift.get(app.shift_id);
    if (!shift) return Response.json({ error: 'Shift not found' }, { status: 404 });

    if (phase === 'start') {
      if (!start_time) return Response.json({ error: 'start_time required' }, { status: 400 });
      const start = buildDateTime(shift.date, start_time);
      await base44.asServiceRole.entities.Application.update(application_id, {
        check_in_time: start.toISOString(),
        status: 'in_progress'
      });
      return Response.json({ ok: true });
    }

    // phase === 'end'
    if (!start_time || !end_time) return Response.json({ error: 'start_time and end_time required' }, { status: 400 });
    const { start, end, actualHours, deviation, finalPayment, overtimeHours } = computeHours(shift, start_time, end_time);

    let hoursStatus, confirmedAt;
    if (Math.abs(deviation) <= 0.5) {
      hoursStatus = 'confirmed';
      confirmedAt = new Date().toISOString();
    } else {
      if (!deviation_reason || !String(deviation_reason).trim()) {
        return Response.json({ error: 'deviation_reason required' }, { status: 400 });
      }
      hoursStatus = 'pending_confirmation';
      confirmedAt = null;
    }

    await base44.asServiceRole.entities.Application.update(application_id, {
      check_in_time: start.toISOString(),
      check_out_time: end.toISOString(),
      actual_hours: actualHours,
      overtime_hours: overtimeHours,
      final_payment_amount: finalPayment,
      status: 'completed',
      hours_status: hoursStatus,
      worker_deviation_reason: deviation_reason || undefined,
      hours_confirmed_at: confirmedAt || undefined
    });

    if (hoursStatus === 'pending_confirmation') {
      const employerId = app.employer_id || shift.created_by_id;
      if (employerId) {
        await base44.functions.invoke('createNotificationFor', {
          notifications: [{
            user_id: employerId,
            title: 'Ishchi ish vaqtini yubordi',
            body: `${shift.title}: ${start_time} — ${end_time} (${actualHours} soat)`,
            type: 'hours_pending',
            link: `/employer/shifts/${shift.id}`
          }]
        });
      }
    }

    return Response.json({ ok: true, actual_hours: actualHours, final_payment_amount: finalPayment, hours_status: hoursStatus });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
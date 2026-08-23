import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { computeHours } from '../../shared/hoursCalc.ts';

// Employer reviews worker-submitted hours: 'confirm' accepts them as-is;
// 'correct' overrides start/end times (employer enters them, e.g. when the
// worker didn't submit) with a required note. Payment is always recomputed
// here using the same formula as submitHours.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { application_id, action, start_time, end_time, note } = body || {};
    if (!application_id || !action) return Response.json({ error: 'Missing required fields' }, { status: 400 });
    if (action !== 'confirm' && action !== 'correct') return Response.json({ error: 'Invalid action' }, { status: 400 });

    const app = await base44.asServiceRole.entities.Application.get(application_id);
    if (!app) return Response.json({ error: 'Application not found' }, { status: 404 });
    const shift = await base44.asServiceRole.entities.Shift.get(app.shift_id);
    if (!shift) return Response.json({ error: 'Shift not found' }, { status: 404 });

    const employerId = app.employer_id || shift.created_by_id;
    if (user.id !== employerId && user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
    if (app.hours_status === 'confirmed') return Response.json({ error: 'Hours already confirmed' }, { status: 409 });

    const now = new Date().toISOString();

    if (action === 'confirm') {
      await base44.asServiceRole.entities.Application.update(application_id, {
        hours_status: 'confirmed',
        hours_confirmed_at: now
      });
      if (app.worker_id) {
        await base44.functions.invoke('createNotificationFor', {
          notifications: [{
            user_id: app.worker_id,
            title: 'Ish vaqtingiz tasdiqlandi',
            body: shift.title,
            type: 'hours_confirmed',
            link: '/worker/applications'
          }]
        });
      }
      return Response.json({ ok: true, actual_hours: app.actual_hours, final_payment_amount: app.final_payment_amount });
    }

    // action === 'correct'
    if (!note || !String(note).trim()) return Response.json({ error: 'note required' }, { status: 400 });
    if (!start_time || !end_time) return Response.json({ error: 'start_time and end_time required' }, { status: 400 });

    const { start, end, actualHours, finalPayment, overtimeHours } = computeHours(shift, start_time, end_time);
    await base44.asServiceRole.entities.Application.update(application_id, {
      check_in_time: start.toISOString(),
      check_out_time: end.toISOString(),
      actual_hours: actualHours,
      overtime_hours: overtimeHours,
      final_payment_amount: finalPayment,
      hours_status: 'confirmed',
      hours_confirmed_at: now,
      employer_correction_note: note,
      hours_corrected_by_employer: true
    });

    if (app.worker_id) {
      await base44.functions.invoke('createNotificationFor', {
        notifications: [{
          user_id: app.worker_id,
          title: 'Ish vaqtingiz to\'g\'rilandi',
          body: `${shift.title}: ${actualHours} soat, ${finalPayment} so'm`,
          type: 'hours_corrected',
          link: '/worker/applications'
        }]
      });
    }

    return Response.json({ ok: true, actual_hours: actualHours, final_payment_amount: finalPayment });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
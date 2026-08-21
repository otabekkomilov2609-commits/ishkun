import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Records a single policy violation for a worker on a given booking.
// Idempotent: if the booking already caused a violation (violation_recorded=true),
// it does nothing. Increments Worker.violation_count and auto-blocks at 3.
// source: 'late_cancel' (worker cancelled <24h before shift) -> notify the company.
// source: 'no_show' (company confirmed_absent) -> notify the worker.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { application_id, worker_id, source, reason, shift_title, worker_name, employer_id } = body || {};
    if (!application_id || !worker_id || !source) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }
    if (source !== 'late_cancel' && source !== 'no_show') {
      return Response.json({ error: 'Invalid source' }, { status: 400 });
    }

    // Authorization: late_cancel must be the worker themselves; no_show must be the booking's employer.
    if (source === 'late_cancel' && user.id !== worker_id) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const app = await base44.asServiceRole.entities.Application.get(application_id);
    if (!app) return Response.json({ error: 'Application not found' }, { status: 404 });

    if (source === 'no_show' && app.employer_id && user.id !== app.employer_id && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Only one violation per booking.
    if (app.violation_recorded) {
      return Response.json({ already_recorded: true, blocked: false });
    }

    const worker = await base44.asServiceRole.entities.User.get(worker_id);
    if (!worker) return Response.json({ error: 'Worker not found' }, { status: 404 });

    const nextCount = (worker.violation_count || 0) + 1;
    const blocked = nextCount >= 3;

    await base44.asServiceRole.entities.User.update(worker_id, {
      violation_count: nextCount,
      ...(blocked ? { account_status: 'blocked' } : {})
    });

    await base44.asServiceRole.entities.Application.update(application_id, { violation_recorded: true });

    if (source === 'late_cancel') {
      const target = employer_id || app.employer_id;
      if (target) {
        await base44.asServiceRole.entities.Notification.create({
          user_id: target,
          title: 'Ishchi kela olmaydi',
          body: `Ishchi ${worker_name || 'Ishchi'} smenaga kela olmaydi: ${reason || 'sababsiz'}.`,
          type: 'worker_no_show',
          link: `/employer/shifts/${app.shift_id}`
        });
      }
    } else {
      await base44.asServiceRole.entities.Notification.create({
        user_id: worker_id,
        title: 'Smenaga kelmadingiz',
        body: `Siz "${shift_title || ''}" smenasiga kelmadingiz deb belgilandi. Bu hisobingizga qoida buzarlik sifatida yozildi.`,
        type: 'worker_no_show',
        link: '/worker/applications'
      });
    }

    return Response.json({ violation_count: nextCount, blocked, already_recorded: false });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
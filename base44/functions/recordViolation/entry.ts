import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Records a single policy violation for a worker on a given booking.
// Idempotent: if the booking already caused a violation (violation_recorded=true),
// it does nothing. Increments Worker.violation_count and auto-blocks at 3.
// source: 'late_cancel' (worker cancelled <24h before shift) -> notify the company.
// source: 'no_show' (company confirmed_absent) -> notify the worker.
// Authorization:
// - late_cancel (worker self-report): caller must be the application's own
//   worker_id, or an admin. Never allow an arbitrary third-party caller.
// - no_show (company report): caller must be the application's employer_id,
//   or an admin. A missing/null employer_id is rejected as Forbidden.
// The worker the violation is recorded against is always the application's own
// worker_id (looked up from the booking), never a caller-supplied value.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { application_id, source, reason, shift_title, worker_name, employer_id } = body || {};
    if (!application_id || !source) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }
    if (source !== 'late_cancel' && source !== 'no_show') {
      return Response.json({ error: 'Invalid source' }, { status: 400 });
    }

    const app = await base44.asServiceRole.entities.Application.get(application_id);
    if (!app) return Response.json({ error: 'Application not found' }, { status: 404 });
    if (!app.worker_id) return Response.json({ error: 'Application has no worker' }, { status: 400 });

    // Authorization.
    if (source === 'late_cancel') {
      if (user.id !== app.worker_id && user.role !== 'admin') {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
    } else {
      // no_show: must be the booking's employer or an admin; missing employer_id is rejected.
      if (!app.employer_id || (user.id !== app.employer_id && user.role !== 'admin')) {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Only one violation per booking.
    if (app.violation_recorded) {
      return Response.json({ already_recorded: true, blocked: false });
    }

    const worker_id = app.worker_id;
    const worker = await base44.asServiceRole.entities.User.get(worker_id);
    if (!worker) return Response.json({ error: 'Worker not found' }, { status: 404 });

    const nextCount = (worker.violation_count || 0) + 1;
    const blocked = nextCount >= 3;

    await base44.asServiceRole.entities.User.update(worker_id, {
      violation_count: nextCount,
      ...(blocked ? { account_status: 'blocked' } : {})
    });

    await base44.asServiceRole.entities.Application.update(application_id, { violation_recorded: true });

    // Always notify the worker that a violation was recorded against their account.
    const workerNotifs = [];
    if (source === 'late_cancel') {
      workerNotifs.push({
        user_id: worker_id,
        title: 'Bekor qilish qoida buzarlik sifatida qayd etildi',
        body: `"${shift_title || ''}" smenasi uchun bekor qilishingiz jiddiy qoida buzarlik sifatida hisobingizga yozildi (${nextCount}/3). 3 ta buzilishdan keyin hisob avtomatik bloklanadi.`,
        type: 'worker_no_show',
        link: '/worker/applications'
      });
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
      workerNotifs.push({
        user_id: worker_id,
        title: 'Smenaga kelmadingiz',
        body: `Siz "${shift_title || ''}" smenasiga kelmadingiz deb belgilandi. Bu jiddiy qoida buzarlik sifatida hisobingizga yozildi (${nextCount}/3). 3 ta buzilishdan keyin hisob avtomatik bloklanadi.`,
        type: 'worker_no_show',
        link: '/worker/applications'
      });
    }
    // Distinct "account blocked" notification when the worker just hit their 3rd violation.
    if (blocked) {
      workerNotifs.push({
        user_id: worker_id,
        title: 'Hisobingiz bloklandi',
        body: "3 ta qoida buzarlik to'planganligi sababli hisobingiz bloklandi. Iltimos, qo'llab-quvvatlash xizmati bilan bog'laning.",
        type: 'worker_no_show',
        link: '/profile'
      });
    }
    if (workerNotifs.length) {
      await base44.asServiceRole.entities.Notification.bulkCreate(workerNotifs);
    }

    // Notify all admins so panel visibility is consistent across both code paths.
    const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' }, '-created_date', 50);
    if (admins.length > 0) {
      const adminTitle = source === 'late_cancel' ? 'Bekor qilish: qoida buzarlik' : 'Ishchi kelmadi: qoida buzarlik';
      const adminBody = `${worker_name || 'Ishchi'} "${shift_title || ''}" uchun ${source === 'late_cancel' ? 'kech bekor qildi' : 'kelmadi'}. Jami buzilishlar: ${nextCount}${blocked ? ' (hisob bloklandi)' : ''}.`;
      await base44.asServiceRole.entities.Notification.bulkCreate(
        admins.map(a => ({
          user_id: a.id,
          title: adminTitle,
          body: adminBody,
          type: 'worker_no_show',
          link: `/employer/shifts/${app.shift_id}`,
          read: false
        }))
      );
    }

    return Response.json({ violation_count: nextCount, blocked, already_recorded: false });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
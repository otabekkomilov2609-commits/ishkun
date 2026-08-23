import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Creates one or more Notifications using the service role (bypasses the tightened
// Notification RLS, which only lets a client create notifications for its OWN id).
// Used for all cross-user notifications: worker→employer (new application, cancel),
// employer→worker (approval/rejection, shift completion). Input is validated and
// bounded; only known notification `type` values are accepted.
const ALLOWED_TYPES = [
  'application_approved', 'application_rejected', 'new_application',
  'shift_completed', 'worker_no_show', 'shift_created',
  'registration', 'verification_approved', 'verification_rejected',
  'rating_received', 'application_cancelled',
  'hours_pending', 'hours_confirmed', 'hours_corrected'
];

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await req.json();
    let items = payload?.notifications;
    if (!Array.isArray(items)) {
      items = [{ user_id: payload?.user_id, title: payload?.title, body: payload?.body, type: payload?.type, link: payload?.link }];
    }
    if (!items.length) return Response.json({ error: 'No notifications provided' }, { status: 400 });

    const valid = [];
    for (const n of items) {
      if (!n || !n.user_id || !n.title || !n.type) continue;
      if (!ALLOWED_TYPES.includes(n.type)) continue;
      valid.push({
        user_id: String(n.user_id),
        title: String(n.title).slice(0, 200),
        body: n.body ? String(n.body).slice(0, 1000) : '',
        type: String(n.type),
        link: n.link ? String(n.link).slice(0, 300) : undefined
      });
    }
    if (!valid.length) return Response.json({ error: 'Invalid notifications' }, { status: 400 });

    await base44.asServiceRole.entities.Notification.bulkCreate(valid);
    return Response.json({ created: valid.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
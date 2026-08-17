import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { shift_id, shift_title, employer_name } = body;
    if (!shift_id || !shift_title) {
      return Response.json({ error: 'shift_id and shift_title are required' }, { status: 400 });
    }

    const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' }, '-created_date', 50);
    if (admins.length === 0) return Response.json({ ok: true, notified: 0 });

    const title = employer_name ? `${employer_name}: ishchi kelmadi` : 'Ishchi kelmadi';
    const message = `${shift_title} uchun ishchi kelmadi, e'lon qayta ochildi`;

    await base44.asServiceRole.entities.Notification.bulkCreate(
      admins.map(a => ({
        user_id: a.id,
        title,
        body: message,
        type: 'worker_no_show',
        link: `/employer/shifts/${shift_id}`,
        read: false
      }))
    );

    return Response.json({ ok: true, notified: admins.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
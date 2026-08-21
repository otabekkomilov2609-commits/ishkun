import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Admin-only KYC approval/rejection. Sets verification_status (and verification_note
// on rejection) on the target worker via the service role — verification_status must
// never be written by a client-side update — and notifies the worker of the decision.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const payload = await req.json();
    const { user_id, approved, note } = payload || {};
    if (!user_id) return Response.json({ error: 'Missing user_id' }, { status: 400 });

    const status = approved ? 'verified' : 'rejected';
    await base44.asServiceRole.entities.User.update(user_id, {
      verification_status: status,
      verification_note: approved ? '' : (note || '')
    });

    await base44.asServiceRole.entities.Notification.create({
      user_id,
      title: approved ? 'Profilingiz tasdiqlandi' : 'Verifikatsiya rad etildi',
      body: approved
        ? "Tabriklaymiz! Profilingiz tasdiqlandi, endi siz ishlarga ariza topshirishingiz mumkin."
        : `Profilni verifikatsiyadan o'tkazishda xatolik aniqlandi. Iltimos, ma'lumotlarni tekshiring: ${note || '—'}`,
      type: approved ? 'verification_approved' : 'verification_rejected'
    });

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
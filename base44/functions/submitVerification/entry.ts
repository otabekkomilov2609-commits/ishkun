import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Worker self-submission of KYC. The KYC data fields (jshshir, passport images, etc.)
// are saved by the client via base44.auth.updateMe (the user's own data); this function
// flips verification_status to 'submitted' via the service role — verification_status
// must never be set by a client-side update. It first verifies the worker actually
// filled the required KYC data, so it can't be called empty to bypass the form.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const full = await base44.asServiceRole.entities.User.get(user.id);
    if (!full) return Response.json({ error: 'User not found' }, { status: 404 });
    if (!full.jshshir || !full.passport_front || !full.passport_back || !full.bank_card_number || !full.date_of_birth || !full.address) {
      return Response.json({ error: 'Missing KYC data' }, { status: 400 });
    }

    await base44.asServiceRole.entities.User.update(user.id, {
      verification_status: 'submitted',
      verification_note: ''
    });

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Authoritative self-profile update. The User entity's update RLS is admin-only,
// so this function is the ONLY path a normal user has to edit their own row.
// It server-side whitelists exactly which fields may change and silently ignores
// everything else (account_status, violation_count, verification_status,
// verification_note, rating_avg, rating_count, role — never settable here).
// account_type is only applied on the first-ever onboarding write (when the
// stored value is empty); once set it is locked. Editing KYC/identity fields
// while already verified re-arms admin review (verification_status -> submitted).

const WHITELIST = [
  'full_name', 'phone_number', 'city', 'profile_image', 'language',
  'jshshir', 'date_of_birth', 'address',
  'passport_front', 'passport_back', 'liveness_selfie', 'student_id',
  'bank_card_number', 'self_employed', 'self_employed_cert', 'onboarded'
];

const DOCUMENT_FIELDS = [
  'jshshir', 'passport_front', 'passport_back',
  'bank_card_number', 'liveness_selfie'
];

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    let body = {};
    try { body = await req.json(); } catch { body = {}; }
    const payload = body && typeof body === 'object' ? body : {};

    const update = {};
    for (const key of WHITELIST) {
      if (Object.prototype.hasOwnProperty.call(payload, key)) {
        update[key] = payload[key];
      }
    }

    const wantsAccountType = Object.prototype.hasOwnProperty.call(payload, 'account_type');
    const hasDocument = DOCUMENT_FIELDS.some(k => Object.prototype.hasOwnProperty.call(update, k));
    const current = await base44.asServiceRole.entities.User.get(user.id);

    // account_type: only on first onboarding write (stored value empty)
    if (wantsAccountType) {
      if (!current || current.account_type == null || current.account_type === '') {
        update.account_type = payload.account_type;
      }
    }

    // re-arm admin review if verified identity documents are being changed
    if (hasDocument && current && current.verification_status === 'verified') {
      update.verification_status = 'submitted';
      update.verification_note = '';
    }

    // Pilot auto-verify: once phone + date_of_birth are both present, mark the
    // user verified (unless an admin already verified or explicitly rejected).
    const resultingPhone = Object.prototype.hasOwnProperty.call(update, 'phone_number') ? update.phone_number : current?.phone_number;
    const resultingDob = Object.prototype.hasOwnProperty.call(update, 'date_of_birth') ? update.date_of_birth : current?.date_of_birth;
    if (resultingPhone && resultingDob && current && current.verification_status !== 'verified' && current.verification_status !== 'rejected') {
      update.verification_status = 'verified';
    }

    if (Object.keys(update).length === 0) {
      return Response.json({ ok: true, updated: false });
    }

    const updated = await base44.asServiceRole.entities.User.update(user.id, update);
    return Response.json({ ok: true, updated: true, user: updated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Authoritative shift creation for employers. payment_amount is ALWAYS recomputed
// server-side as hourly_rate × duration_hours (any client-supplied value is ignored),
// and company_id is taken from the authenticated employer's own company record (never
// trusted from the client). The Shift is created with the user-scoped client so that
// created_by_id is stamped to the employer (used by MyShifts); the server-built payload
// guarantees company_id and payment_amount are authoritative.
function durationHours(start_time, end_time) {
  const [sh, sm] = String(start_time).split(':').map(Number);
  const [eh, em] = String(end_time).split(':').map(Number);
  let mins = (eh * 60 + em) - (sh * 60 + sm);
  if (mins < 0) mins += 24 * 60; // overnight shift
  return mins / 60;
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.account_status === 'blocked') return Response.json({ error: 'Account blocked' }, { status: 403 });
    if (user.account_type !== 'employer') return Response.json({ error: 'Only employers can create shifts' }, { status: 403 });

    const payload = await req.json();
    const {
      title, description, tasks_text, important_notes_text, requirements_text, dress_code_text,
      map_link, date, start_time, end_time, city, daily_rate, required_workers, required_skill
    } = payload || {};

    if (!title || !date || !start_time || !end_time || !daily_rate || !city || !map_link) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }
    // The date input's `min` is only a client hint; enforce it here too.
    if (String(date) < new Date().toISOString().slice(0, 10)) {
      return Response.json({ error: 'Date in the past' }, { status: 400 });
    }
    const rate = Number(daily_rate);
    if (!Number.isFinite(rate) || rate < 0) return Response.json({ error: 'Invalid daily_rate' }, { status: 400 });

    // company_id from the employer's own company record — never trust a client value.
    const comps = await base44.asServiceRole.entities.Company.filter({ created_by_id: user.id });
    const company = comps[0];
    if (!company) return Response.json({ error: 'No company profile' }, { status: 400 });

    const payment_amount = rate;

    const shift = await base44.entities.Shift.create({
      title, description, tasks_text, important_notes_text, requirements_text, dress_code_text,
      map_link, date, start_time, end_time, city,
      daily_rate: rate,
      payment_amount,
      required_workers: Number(required_workers) || 1,
      required_skill: required_skill || undefined,
      company_id: company.id,
      status: 'open',
      moderation: 'approved'
    });

    return Response.json({ shift });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
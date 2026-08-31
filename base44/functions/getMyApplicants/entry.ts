import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Employers cannot call User.list() from the browser — the platform answers
// 403 ("Only collaborators can view the list of users"), which reached the UI
// as "—" for every applicant's name, phone, rating and completed-shift count.
// This function returns the workers who applied to the caller's OWN shifts,
// carrying only the fields the employer screens actually render. Identity
// documents, banking details and moderation fields are never returned, so a
// widened read here cannot leak a worker's KYC data to an employer.

const SAFE_FIELDS = [
  'id', 'first_name', 'last_name', 'full_name', 'profile_image',
  'phone_number', 'email', 'rating_avg', 'rating_count',
  'verification_status', 'account_status'
];

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.account_type !== 'employer' && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    let body = {};
    try { body = await req.json(); } catch { body = {}; }
    const payload = body && typeof body === 'object' ? body : {};
    const shiftId = payload.shift_id;

    // The caller's own shifts are the whole of what they may see.
    const myShifts = await base44.asServiceRole.entities.Shift.filter({ created_by_id: user.id }, '-created_date', 200);
    const myShiftIds = new Set((myShifts || []).map(s => s.id));

    if (shiftId && !myShiftIds.has(shiftId)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const apps = await base44.asServiceRole.entities.Application.filter(
      shiftId ? { shift_id: shiftId } : { employer_id: user.id },
      '-created_date',
      500
    );
    // employer_id is denormalised onto Application, so re-check ownership
    // against the shift list rather than trusting it on its own.
    const mine = shiftId ? (apps || []) : (apps || []).filter(a => myShiftIds.has(a.shift_id));

    const workerIds = [...new Set(mine.map(a => a.worker_id).filter(Boolean))];

    const completed = await base44.asServiceRole.entities.Application.filter(
      { status: 'completed', company_attendance_status: 'confirmed_present' },
      '-created_date',
      1000
    );
    const completedCount = {};
    for (const a of completed || []) {
      completedCount[a.worker_id] = (completedCount[a.worker_id] || 0) + 1;
    }

    const workers = [];
    for (const id of workerIds) {
      try {
        const w = await base44.asServiceRole.entities.User.get(id);
        if (!w) continue;
        const safe = {};
        for (const f of SAFE_FIELDS) safe[f] = w[f];
        safe.completed_count = completedCount[id] || 0;
        workers.push(safe);
      } catch {
        // a worker that cannot be loaded is skipped rather than failing the page
      }
    }

    return Response.json({ workers });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

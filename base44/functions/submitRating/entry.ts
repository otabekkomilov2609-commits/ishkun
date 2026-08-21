import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Creates a Rating with company_id and employer_id auto-populated from the
// associated Shift (Shift.company_id) and Application (Application.employer_id),
// so these fields are never left null. Also recalculates the averaged rating
// on the target Company (worker→company) or Worker (company→worker).
// rated_by: 'worker' (worker rating a company) or 'company' (company rating a worker).
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { application_id, shift_id, rated_by, score, comment } = body || {};
    if (!application_id || !shift_id || !rated_by || score == null) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }
    if (rated_by !== 'worker' && rated_by !== 'company') {
      return Response.json({ error: 'Invalid rated_by' }, { status: 400 });
    }

    // Look up shift + application to populate company_id and employer_id.
    const shift = await base44.asServiceRole.entities.Shift.get(shift_id);
    if (!shift) return Response.json({ error: 'Shift not found' }, { status: 404 });
    const app = await base44.asServiceRole.entities.Application.get(application_id);
    if (!app) return Response.json({ error: 'Application not found' }, { status: 404 });

    const company_id = shift.company_id || null;
    const employer_id = app.employer_id || shift.created_by_id || null;
    const worker_id = app.worker_id || null;

    // Authorization: worker rates company → must be the worker; company rates worker → must be the employer.
    if (rated_by === 'worker' && user.id !== worker_id) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (rated_by === 'company' && user.id !== employer_id && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Prevent duplicate ratings for the same booking by the same side.
    const existing = await base44.asServiceRole.entities.Rating.filter({ application_id, rated_by });
    if (existing && existing.length > 0) {
      return Response.json({ already_rated: true });
    }

    await base44.asServiceRole.entities.Rating.create({
      application_id,
      shift_id,
      worker_id,
      company_id,
      employer_id,
      rated_by,
      score,
      comment: comment || undefined
    });

    // Notify the rated party that they received a rating (includes the score).
    const ratedPartyId = rated_by === 'worker' ? employer_id : worker_id;
    if (ratedPartyId) {
      await base44.asServiceRole.entities.Notification.create({
        user_id: ratedPartyId,
        title: rated_by === 'worker' ? 'Siz baholandingiz' : 'Sizga baho qo\'yildi',
        body: `Sizga ${score}/5 baho qo'yildi${comment ? ': ' + comment : '.'}`,
        type: 'rating_received',
        link: rated_by === 'worker' ? `/employer/shifts/${shift_id}` : '/worker/applications'
      });
    }

    // Recalculate the averaged rating on the target.
    if (rated_by === 'worker' && company_id) {
      const ratings = await base44.asServiceRole.entities.Rating.filter({ company_id, rated_by: 'worker' });
      const count = ratings.length;
      const avg = count > 0 ? Math.round((ratings.reduce((s, r) => s + (r.score || 0), 0) / count) * 10) / 10 : null;
      await base44.asServiceRole.entities.Company.update(company_id, { rating_avg: avg, rating_count: count });
    } else if (rated_by === 'company' && worker_id) {
      const ratings = await base44.asServiceRole.entities.Rating.filter({ worker_id, rated_by: 'company' });
      const count = ratings.length;
      const avg = count > 0 ? Math.round((ratings.reduce((s, r) => s + (r.score || 0), 0) / count) * 10) / 10 : null;
      await base44.asServiceRole.entities.User.update(worker_id, { rating_avg: avg, rating_count: count });
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
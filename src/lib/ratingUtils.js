import { base44 } from '@/api/base44Client';

// Recalculate a worker's average rating from all company→worker ratings.
export async function recalcWorkerRating(workerId) {
  const ratings = await base44.entities.Rating.filter({ worker_id: workerId, rated_by: 'company' });
  const count = ratings.length;
  const avg = count > 0 ? Math.round((ratings.reduce((s, r) => s + (r.score || 0), 0) / count) * 10) / 10 : null;
  await base44.entities.User.update(workerId, { rating_avg: avg, rating_count: count });
  return { avg, count };
}

// Recalculate a company's average rating from all worker→company ratings.
export async function recalcCompanyRating(companyId) {
  const ratings = await base44.entities.Rating.filter({ company_id: companyId, rated_by: 'worker' });
  const count = ratings.length;
  const avg = count > 0 ? Math.round((ratings.reduce((s, r) => s + (r.score || 0), 0) / count) * 10) / 10 : null;
  await base44.entities.Company.update(companyId, { rating_avg: avg, rating_count: count });
  return { avg, count };
}
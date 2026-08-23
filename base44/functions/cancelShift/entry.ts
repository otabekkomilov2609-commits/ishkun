import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { toStamp } from '../../shared/hoursCalc.ts';

// Cancel a whole shift. Verifies the caller owns the shift (created_by_id) or is
// an admin, rejects completed/already-cancelled shifts, sets the shift status to
// 'cancelled', cancels every pending/approved application on it, and notifies
// each affected worker that the shift was cancelled by the employer — explicitly
// reassuring them this is NOT a violation on their record.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await req.json();
    const { shift_id } = payload || {};
    if (!shift_id) return Response.json({ error: 'Missing shift_id' }, { status: 400 });

    const shift = await base44.asServiceRole.entities.Shift.get(shift_id);
    if (!shift) return Response.json({ error: 'Shift not found' }, { status: 404 });

    const isOwner = shift.created_by_id === user.id;
    const isAdmin = user.role === 'admin';
    if (!isOwner && !isAdmin) return Response.json({ error: 'Forbidden' }, { status: 403 });

    if (shift.status === 'completed' || shift.status === 'cancelled') {
      return Response.json({ error: 'Cannot cancel a completed or already cancelled shift' }, { status: 400 });
    }

    if (shift.date && shift.start_time) {
      const startMs = new Date(toStamp(shift.date, shift.start_time)).getTime();
      const nowMs = new Date(new Date().toISOString().slice(0, 19) + 'Z').getTime();
      if (nowMs >= startMs) {
        return Response.json(
          { error: 'Cannot cancel a shift that has already started' },
          { status: 400 }
        );
      }
    }

    await base44.asServiceRole.entities.Shift.update(shift_id, { status: 'cancelled', urgent_replacement: false });

    const apps = await base44.asServiceRole.entities.Application.filter({ shift_id }, '-created_date', 500);
    const affected = apps.filter(a => a.status === 'pending' || a.status === 'approved');

    if (affected.length > 0) {
      await base44.asServiceRole.entities.Application.bulkUpdate(
        affected.map(a => ({ id: a.id, status: 'cancelled' }))
      );
      const link = `/worker/shifts/${shift_id}`;
      const notifTitle = 'Smena bekor qilindi';
      const notifBody = `"${shift.title || ''}" smenasi ish beruvchi tomonidan bekor qilindi. Bu sizning aybingiz emas — hisobingizga hech qanday qoida buzarlik yozilmaydi.`;
      await base44.asServiceRole.entities.Notification.bulkCreate(
        affected.map(a => ({
          user_id: a.worker_id,
          title: notifTitle,
          body: notifBody,
          type: 'shift_cancelled_by_employer',
          link,
          read: false
        }))
      );
    }

    return Response.json({ shift_id, cancelled: true, affected: affected.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
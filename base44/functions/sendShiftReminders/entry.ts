import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Scheduled (every 15 min): sends persisted shift reminder notifications to
// workers with approved upcoming applications. Two reminders per booking:
//  - ~24h before start (shift_reminder_24h)
//  - ~1h before start  (shift_reminder_1h)
// Idempotent via Application.reminder_24h_sent / reminder_1h_sent flags.
// Skips shifts that have already started (hoursLeft <= 0) to avoid stale sends.
export default async function(req) {
  try {
    // Runs on a platform scheduler with no requesting user; all work uses the service role.
    const base44 = createClientFromRequest(req);

    const apps = await base44.asServiceRole.entities.Application.filter({ status: 'approved' }, '-created_date', 500);
    if (!apps || apps.length === 0) return Response.json({ ok: true, processed: 0, sent: 0 });

    // Fetch each unique shift once.
    const shiftIds = [...new Set(apps.map(a => a.shift_id).filter(Boolean))];
    const shiftMap = {};
    for (const sid of shiftIds) {
      try { shiftMap[sid] = await base44.asServiceRole.entities.Shift.get(sid); } catch {}
    }

    const notifs = [];
    const updateMap = {};
    const now = Date.now();

    for (const a of apps) {
      const shift = shiftMap[a.shift_id];
      if (!shift || !shift.date || !shift.start_time) continue;
      const [y, m, d] = shift.date.split('-').map(Number);
      const [h, mi] = shift.start_time.split(':').map(Number);
      const startMs = new Date(y, m - 1, d, h || 0, mi || 0).getTime();
      const hoursLeft = (startMs - now) / 3600000;
      if (hoursLeft <= 0) continue; // already started/over

      const link = `/worker/shifts/${shift.id}`;
      const title = shift.title || '';

      if (hoursLeft <= 24 && !a.reminder_24h_sent) {
        notifs.push({
          user_id: a.worker_id,
          title: 'Smena 24 soatdan keyin',
          body: `"${title}" smenasi 24 soatdan keyin boshlanadi. Eslatma: bundan keyin bekor qilish jiddiy qoida buzarlik hisoblanadi.`,
          type: 'shift_reminder_24h',
          link
        });
        updateMap[a.id] = updateMap[a.id] || { id: a.id };
        updateMap[a.id].reminder_24h_sent = true;
      }
      if (hoursLeft <= 1 && !a.reminder_1h_sent) {
        notifs.push({
          user_id: a.worker_id,
          title: 'Smena 1 soatdan keyin',
          body: `"${title}" smenasi 1 soatdan keyin boshlanadi. Kelganda check-in qilishni unutmang.`,
          type: 'shift_reminder_1h',
          link
        });
        updateMap[a.id] = updateMap[a.id] || { id: a.id };
        updateMap[a.id].reminder_1h_sent = true;
      }
    }

    if (notifs.length) {
      await base44.asServiceRole.entities.Notification.bulkCreate(notifs);
    }
    const updates = Object.values(updateMap);
    if (updates.length) {
      await base44.asServiceRole.entities.Application.bulkUpdate(updates);
    }

    return Response.json({ ok: true, processed: apps.length, sent: notifs.length, updated: updates.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
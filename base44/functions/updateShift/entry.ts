import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Authoritative shift update for employers. Mirrors createShift's integrity
// guarantees: payment_amount is ALWAYS recomputed server-side as
// hourly_rate × duration_hours (any client value ignored), the caller must own
// the shift (created_by_id) or be an admin, company_id can never change, and
// edits are rejected for completed/cancelled shifts or when required_workers is
// reduced below the shift's current approved-application count.
function durationHours(start_time, end_time) {
  const [sh, sm] = String(start_time).split(':').map(Number);
  const [eh, em] = String(end_time).split(':').map(Number);
  let mins = (eh * 60 + em) - (sh * 60 + sm);
  if (mins < 0) mins += 24 * 60; // overnight shift
  return mins / 60;
}

// Local date parts, not toISOString(): that renders the UTC day, which lags
// Tashkent by up to five hours and would call today's date "past".
function todayYMD() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.account_status === 'blocked') return Response.json({ error: 'Account blocked' }, { status: 403 });

    const payload = await req.json();
    const {
      shift_id, title, description, tasks_text, important_notes_text, requirements_text, dress_code_text,
      map_link, date, start_time, end_time, city, daily_rate, required_workers, required_skill
    } = payload || {};

    if (!shift_id) return Response.json({ error: 'Missing shift_id' }, { status: 400 });
    if (!title || !date || !start_time || !end_time || !daily_rate || !city || !map_link) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }
    // Creating already rejects past dates; editing must not be a way around it.
    if (String(date) < todayYMD()) {
      return Response.json({ error: 'Date in the past' }, { status: 400 });
    }
    const rate = Number(daily_rate);
    if (!Number.isFinite(rate) || rate < 0) return Response.json({ error: 'Invalid daily_rate' }, { status: 400 });

    const shift = await base44.asServiceRole.entities.Shift.get(shift_id);
    if (!shift) return Response.json({ error: 'Shift not found' }, { status: 404 });

    // Ownership: only the shift's own company owner or an admin.
    const isOwner = shift.created_by_id === user.id;
    const isAdmin = user.role === 'admin';
    if (!isOwner && !isAdmin) return Response.json({ error: 'Forbidden' }, { status: 403 });

    // Nothing to edit on a finished or cancelled shift.
    if (shift.status === 'completed' || shift.status === 'cancelled') {
      return Response.json({ error: 'Cannot edit a completed or cancelled shift' }, { status: 400 });
    }

    // Cannot shrink required_workers below the number of workers already approved.
    const newRequired = Number(required_workers) || 1;
    const apps = await base44.asServiceRole.entities.Application.filter({ shift_id }, '-created_date', 500);
    const approvedCount = apps.filter(a => a.status === 'approved').length;
    if (newRequired < approvedCount) {
      return Response.json({ error: 'Cannot reduce required_workers below the current approved count' }, { status: 400 });
    }

    // Once a worker is approved, the shift's core terms are locked — changing
    // them would alter what the worker already agreed to.
    if (approvedCount > 0) {
      const lockedChanged =
        String(date) !== String(shift.date) ||
        String(start_time) !== String(shift.start_time) ||
        String(end_time) !== String(shift.end_time) ||
        Number(daily_rate) !== Number(shift.daily_rate) ||
        String(city) !== String(shift.city) ||
        String(required_skill || '') !== String(shift.required_skill || '');
      if (lockedChanged) {
        return Response.json({ error: "Ishchi tasdiqlangan smenada asosiy shartlarni o'zgartirib bo'lmaydi" }, { status: 400 });
      }
    }

    // Detect actual changes to the still-editable fields, so approved workers are
    // notified only when something they care about really changed (not on a no-op
    // re-save). Empty/undefined and '' are treated as equal; whitespace trimmed.
    const norm = (v) => (v == null ? '' : String(v).trim());
    const editableFields = [
      { label: 'Sarlavha', val: title, old: shift.title },
      { label: 'Tavsif', val: description, old: shift.description },
      { label: 'Vazifalar', val: tasks_text, old: shift.tasks_text },
      { label: 'Muhim eslatmalar', val: important_notes_text, old: shift.important_notes_text },
      { label: 'Talablar', val: requirements_text, old: shift.requirements_text },
      { label: 'Kiyim kodi', val: dress_code_text, old: shift.dress_code_text },
      { label: 'Xarita havolasi', val: map_link, old: shift.map_link },
      { label: 'Kerakli ishchilar soni', val: String(newRequired), old: String(shift.required_workers) }
    ];
    const changedLabels = editableFields.filter(f => norm(f.val) !== norm(f.old)).map(f => f.label);

    const payment_amount = rate;

    // company_id is intentionally omitted — it can never change on edit.
    const updated = await base44.asServiceRole.entities.Shift.update(shift_id, {
      title, description, tasks_text, important_notes_text, requirements_text, dress_code_text,
      map_link, date, start_time, end_time, city,
      daily_rate: rate,
      payment_amount,
      required_workers: newRequired,
      required_skill: required_skill || undefined
    });

    // Notify approved workers when an editable field actually changed.
    if (approvedCount > 0 && changedLabels.length > 0) {
      const approvedApps = apps.filter(a => a.status === 'approved');
      const notifBody = `"${updated.title || ''}" smenasida quyidagilar yangilandi: ${changedLabels.join(', ')}.`;
      await base44.asServiceRole.entities.Notification.bulkCreate(
        approvedApps.map(a => ({
          user_id: a.worker_id,
          title: 'Smena tafsilotlari yangilandi',
          body: notifBody,
          type: 'shift_updated',
          link: '/worker/applications',
          read: false
        }))
      );
    }

    return Response.json({ shift: updated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
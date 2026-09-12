import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Scheduled (hourly). Closes records that nothing else ever moves on: when
// someone skips a step, an application or shift otherwise freezes in a state
// no code path exits. Three repairs, then four one-shot email nudges.
//
// Runs on the platform scheduler with no requesting user, so every read and
// write goes through the service role.

// Same date handling as src/lib/shiftTime.js: a shift's start and end are its
// `date` plus start_time/end_time. An end_time that is not after start_time
// means the shift runs past midnight, so the end belongs to the next day.
function startOf(shift) {
  if (!shift || !shift.date || !shift.start_time) return null;
  const [y, m, d] = String(shift.date).split('-').map(Number);
  const [h, mi] = String(shift.start_time).split(':').map(Number);
  return new Date(y, m - 1, d, h || 0, mi || 0);
}

function endOf(shift) {
  if (!shift || !shift.date || !shift.end_time) return null;
  const [y, m, d] = String(shift.date).split('-').map(Number);
  const [h, mi] = String(shift.end_time).split(':').map(Number);
  const end = new Date(y, m - 1, d, h || 0, mi || 0);
  const start = startOf(shift);
  if (start && end.getTime() <= start.getTime()) end.setDate(end.getDate() + 1);
  return end;
}

function dmy(dateStr) {
  const p = String(dateStr || '').split('-');
  return p.length === 3 ? `${p[2]}.${p[1]}.${p[0]}` : String(dateStr || '');
}

// Bounded paging. If the SDK ignores the offset argument the same page comes
// back, which the `fresh === 0` check detects — so this terminates either way.
async function collect(base44, entity, query, pageSize = 200, maxPages = 10) {
  const out = [];
  const seen = new Set();
  for (let p = 0; p < maxPages; p++) {
    let batch = null;
    try {
      batch = await base44.asServiceRole.entities[entity].filter(query, '-created_date', pageSize, p * pageSize);
    } catch {
      try {
        batch = await base44.asServiceRole.entities[entity].filter(query, '-created_date', pageSize);
      } catch {
        break;
      }
    }
    if (!batch || batch.length === 0) break;
    let fresh = 0;
    for (const r of batch) {
      if (r && r.id && !seen.has(r.id)) { seen.add(r.id); out.push(r); fresh++; }
    }
    if (fresh === 0 || batch.length < pageSize) break;
  }
  return out;
}

const SKIP_STATUSES = ['cancelled', 'rejected', 'no_show', 'expired'];

const MAIL = {
  uz: {
    checkin: (t, d) => ({
      subject: 'Smenani boshlashni unutmang',
      body: `"${t}" smenasi (${d}) boshlandi. Ilovada "Ishni boshlash" tugmasini bosing. Aks holda ish vaqtingiz qayd etilmaydi.`
    }),
    hours: (t, d) => ({
      subject: 'Ish vaqtingizni kiriting',
      body: `"${t}" smenasi (${d}) tugadi. Ilovada ish vaqtingizni kiriting — to'lov shunga bog'liq.`
    }),
    employerHours: (t, d) => ({
      subject: 'Ish vaqtini tasdiqlang',
      body: `Ishchi "${t}" smenasi (${d}) uchun ish vaqtini yubordi. Iltimos, uni tasdiqlang — ishchiga to'lov shunga bog'liq.`
    }),
    employerAttendance: (t, d) => ({
      subject: 'Ishchi keldimi?',
      body: `"${t}" smenasi (${d}) tugadi. Ilovada ishchi kelgan yoki kelmaganini belgilang.`
    })
  },
  ru: {
    checkin: (t, d) => ({
      subject: 'Не забудьте начать смену',
      body: `Смена "${t}" (${d}) началась. Нажмите «Начать работу» в приложении. Иначе ваше рабочее время не будет учтено.`
    }),
    hours: (t, d) => ({
      subject: 'Укажите рабочее время',
      body: `Смена "${t}" (${d}) завершилась. Укажите рабочее время в приложении — от этого зависит оплата.`
    }),
    employerHours: (t, d) => ({
      subject: 'Подтвердите рабочее время',
      body: `Работник указал рабочее время по смене "${t}" (${d}). Пожалуйста, подтвердите его — от этого зависит оплата работника.`
    }),
    employerAttendance: (t, d) => ({
      subject: 'Работник пришёл?',
      body: `Смена "${t}" (${d}) завершилась. Отметьте в приложении, пришёл работник или нет.`
    })
  }
};

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const now = Date.now();

    const shiftCache = {};
    const getShift = async (id) => {
      if (!id) return null;
      if (!(id in shiftCache)) {
        try { shiftCache[id] = await base44.asServiceRole.entities.Shift.get(id); } catch { shiftCache[id] = null; }
      }
      return shiftCache[id];
    };

    const userCache = {};
    const getUser = async (id) => {
      if (!id) return null;
      if (!(id in userCache)) {
        try { userCache[id] = await base44.asServiceRole.entities.User.get(id); } catch { userCache[id] = null; }
      }
      return userCache[id];
    };

    const summary = { expired: 0, shifts_closed: 0, completed: 0, emails_sent: 0, email_failures: 0 };

    // --- Repair 1: pending applications whose shift already started ---------
    for (const a of await collect(base44, 'Application', { status: 'pending' })) {
      const shift = await getShift(a.shift_id);
      if (!shift) continue;
      const start = startOf(shift);
      if (!start || now < start.getTime()) continue;
      try {
        await base44.asServiceRole.entities.Application.update(a.id, { status: 'expired' });
        summary.expired++;
      } catch (e) {
        console.error('sweep: expire failed', a.id, e.message);
      }
    }

    // --- Repair 2: open/filled shifts whose end time has passed -------------
    for (const status of ['open', 'filled']) {
      for (const s of await collect(base44, 'Shift', { status })) {
        const end = endOf(s);
        if (!end || now < end.getTime()) continue;
        try {
          await base44.asServiceRole.entities.Shift.update(s.id, { status: 'completed' });
          shiftCache[s.id] = { ...s, status: 'completed' };
          summary.shifts_closed++;
        } catch (e) {
          console.error('sweep: close shift failed', s.id, e.message);
        }
      }
    }

    // --- Repair 3: hours confirmed but the application never completed ------
    // Backfills records left behind before confirmHours started setting status.
    for (const a of await collect(base44, 'Application', { hours_status: 'confirmed' })) {
      if (['completed', 'no_show', 'cancelled'].includes(a.status)) continue;
      try {
        await base44.asServiceRole.entities.Application.update(a.id, { status: 'completed' });
        summary.completed++;
      } catch (e) {
        console.error('sweep: complete failed', a.id, e.message);
      }
    }

    // --- Email nudges ------------------------------------------------------
    // Re-read after the repairs so no email is sent about a record just closed.
    const live = [];
    for (const status of ['approved', 'in_progress', 'completed']) {
      live.push(...await collect(base44, 'Application', { status }));
    }

    // One email per application per rule, flagged so a later run cannot repeat
    // it. The flag is only set after SendEmail resolves, so a failure retries.
    const send = async (app, flag, to, build, title, date) => {
      if (!to) return;
      const { subject, body } = build(title, date);
      try {
        await base44.integrations.Core.SendEmail({ to, subject, body });
        await base44.asServiceRole.entities.Application.update(app.id, { [flag]: true });
        summary.emails_sent++;
      } catch (e) {
        summary.email_failures++;
        console.error('sweep: email failed', flag, app.id, e.message);
      }
    };

    for (const a of live) {
      if (SKIP_STATUSES.includes(a.status)) continue;
      const shift = await getShift(a.shift_id);
      if (!shift) continue;
      const start = startOf(shift);
      const end = endOf(shift);
      const started = start && now >= start.getTime();
      const ended = end && now >= end.getTime();
      const title = shift.title || '';
      const date = dmy(shift.date);

      // Worker: shift started, still approved, never checked in.
      if (started && a.status === 'approved' && !a.check_in_time && !a.checkin_reminder_sent) {
        const w = await getUser(a.worker_id);
        if (w && w.email) {
          await send(a, 'checkin_reminder_sent', w.email, MAIL[w.language === 'ru' ? 'ru' : 'uz'].checkin, title, date);
        }
      }

      // Worker: shift ended and hours were never submitted. Payment depends on it.
      if (ended && a.hours_status === 'not_submitted' && !a.hours_reminder_sent) {
        const w = await getUser(a.worker_id);
        if (w && w.email) {
          await send(a, 'hours_reminder_sent', w.email, MAIL[w.language === 'ru' ? 'ru' : 'uz'].hours, title, date);
        }
      }

      // Employer: hours have been waiting on them for more than two hours.
      // check_out_time is when the worker submitted; updated_date is the fallback.
      if (a.hours_status === 'pending_confirmation' && !a.employer_hours_reminder_sent) {
        const since = new Date(a.check_out_time || a.updated_date || 0).getTime();
        if (since && now - since > 2 * 3600000) {
          const e = await getUser(a.employer_id || shift.created_by_id);
          if (e && e.email) {
            await send(a, 'employer_hours_reminder_sent', e.email, MAIL[e.language === 'ru' ? 'ru' : 'uz'].employerHours, title, date);
          }
        }
      }

      // Employer: shift ended and they never marked whether the worker came.
      if (ended && a.company_attendance_status === 'pending'
        && (a.status === 'approved' || a.status === 'in_progress')
        && !a.employer_attendance_reminder_sent) {
        const e = await getUser(a.employer_id || shift.created_by_id);
        if (e && e.email) {
          await send(a, 'employer_attendance_reminder_sent', e.email, MAIL[e.language === 'ru' ? 'ru' : 'uz'].employerAttendance, title, date);
        }
      }
    }

    console.log(
      `sweepStaleRecords: expired=${summary.expired} shifts_closed=${summary.shifts_closed} ` +
      `completed=${summary.completed} emails_sent=${summary.emails_sent} email_failures=${summary.email_failures}`
    );
    return Response.json({ ok: true, ...summary });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

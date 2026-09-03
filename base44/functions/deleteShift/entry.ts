import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Authoritative shift deletion. The Shift entity's delete RLS is service-role
// only, so this function is the ONLY path that can remove a shift — which
// guarantees the cascade below always runs. Deleting a Shift row directly used
// to leave its Application records behind pointing at a shift_id that resolves
// to nothing.
//
// Deletion is destructive and has no UI: the normal employer flow is cancelShift,
// which keeps the records and transitions applications to 'cancelled'. So this
// refuses to run once any application carries a final_payment_amount — paid work
// must stay on the record.
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

    const apps = await base44.asServiceRole.entities.Application.filter({ shift_id }, '-created_date', 500);

    // Real payment history exists — destroying it would erase what a worker was
    // paid. Cancelling keeps the record and still frees the shift.
    if (apps.some(a => a.final_payment_amount != null)) {
      return Response.json(
        { error: 'Cannot delete a shift with paid applications — cancel it instead' },
        { status: 400 }
      );
    }

    // No bulk delete in this SDK; delete each application before the shift so a
    // failure part-way cannot leave the shift gone and its applications orphaned.
    await Promise.all(apps.map(a => base44.asServiceRole.entities.Application.delete(a.id)));
    await base44.asServiceRole.entities.Shift.delete(shift_id);

    return Response.json({ ok: true, deleted_applications: apps.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { useLang } from '@/lib/i18n';
import { base44 } from '@/api/base44Client';
import { Button, Card, Skeleton } from '@/components/ui';
import StatusBadge from '@/components/StatusBadge';
import EmptyState from '@/components/EmptyState';
import { ArrowLeft, MapPin, Clock, Wallet, Users, Calendar, CheckCircle2, XCircle, User, Star, AlertTriangle, Heart } from 'lucide-react';
import { formatSom, shiftPay, shiftDurationHours } from '@/lib/format';
import RatingPrompt from '@/components/RatingPrompt';
import AbsentReasonDialog from '@/components/AbsentReasonDialog';
import { StarsDisplay } from '@/components/RatingStars';
import { isShiftStarted, isMismatch, attendanceLabel, isCheckInWindowOpen } from '@/lib/shiftTime';

export default function EmployerShiftDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();
  const [shift, setShift] = useState(null);
  const [apps, setApps] = useState(null);
  const [users, setUsers] = useState({});
  const [completedCounts, setCompletedCounts] = useState({});
  const [preferredWorkers, setPreferredWorkers] = useState(new Set());
  const [absentApp, setAbsentApp] = useState(null);

  const load = async () => {
    const s = await base44.entities.Shift.get(id);
    setShift(s);
    const a = await base44.entities.Application.filter({ shift_id: id }, '-created_date', 200);
    setApps(a);
    const u = await base44.entities.User.list('-created_date', 200, 0, ['id', 'full_name', 'profile_image', 'phone_number', 'email', 'rating_avg', 'rating_count', 'verification_status', 'account_status']);
    const map = {};
    u.forEach(x => { map[x.id] = x; });
    setUsers(map);
    const comp = await base44.entities.Application.filter({ status: 'completed', company_attendance_status: 'confirmed_present' }, '-created_date', 500);
    const cc = {};
    comp.forEach(a => { cc[a.worker_id] = (cc[a.worker_id] || 0) + 1; });
    setCompletedCounts(cc);
    const ratings = await base44.entities.Rating.filter({ rated_by: 'company', employer_id: user.id }, '-created_date', 500);
    setPreferredWorkers(new Set(ratings.filter(r => r.score >= 4).map(r => r.worker_id)));
  };

  useEffect(() => { load(); }, [id]);

  const setStatus = async (app, status) => {
    const prev = apps;
    setApps(prevApps => prevApps.map(a => a.id === app.id ? { ...a, status } : a));
    try {
      await base44.entities.Application.update(app.id, { status });
      await base44.functions.invoke('createNotificationFor', {
        notifications: [{
          user_id: app.worker_id,
          title: status === 'approved' ? t('notif.approved') : t('notif.rejected'),
          body: shift.title,
          type: status === 'approved' ? 'application_approved' : 'application_rejected',
          link: `/worker/applications`
        }]
      });
    } catch (e) {
      setApps(prev);
      console.error(e);
    }
  };

  const markCompleted = async () => {
    const prevStatus = shift.status;
    setShift({ ...shift, status: 'completed' });
    try {
      await base44.entities.Shift.update(id, { status: 'completed' });
      const approved = apps.filter(a => a.status === 'approved');
      await base44.functions.invoke('createNotificationFor', {
        notifications: approved.map(a => ({
          user_id: a.worker_id, title: t('notif.shiftDone'), body: shift.title, type: 'shift_completed', link: '/worker/applications'
        }))
      });
    } catch (e) {
      setShift({ ...shift, status: prevStatus });
      console.error(e);
    }
  };

  const markWorkerDone = async (app) => {
    const prev = apps;
    setApps(prevApps => prevApps.map(a => a.id === app.id ? { ...a, status: 'completed' } : a));
    try {
      await base44.entities.Application.update(app.id, { status: 'completed' });
      await base44.functions.invoke('createNotificationFor', {
        notifications: [{
          user_id: app.worker_id,
          title: t('notif.shiftDone'),
          body: shift.title,
          type: 'shift_completed',
          link: '/worker/applications'
        }]
      });
    } catch (e) {
      setApps(prev);
      console.error(e);
    }
  };

  const markWorkerNoShow = async (app) => {
    const prev = apps;
    const prevStatus = shift.status;
    setApps(prevApps => prevApps.map(a => a.id === app.id ? { ...a, status: 'no_show' } : a));
    const remainingApproved = apps.filter(a => a.id !== app.id && a.status === 'approved');
    if (remainingApproved.length < shift.required_workers && shift.status !== 'open') {
      setShift({ ...shift, status: 'open' });
    }
    try {
      await base44.entities.Application.update(app.id, { status: 'no_show' });
      if (remainingApproved.length < shift.required_workers && prevStatus !== 'open') {
        await base44.entities.Shift.update(id, { status: 'open' });
      }
      await base44.functions.invoke('notifyAdminsNoShow', {
        shift_id: id,
        shift_title: shift.title,
        employer_name: user?.full_name || ''
      });
      if (!app.violation_recorded) {
        await base44.functions.invoke('recordViolation', {
          application_id: app.id,
          worker_id: app.worker_id,
          source: 'no_show',
          shift_title: shift.title,
          employer_id: app.employer_id || shift.created_by_id
        });
      }
    } catch (e) {
      setApps(prev);
      setShift({ ...shift, status: prevStatus });
      console.error(e);
    }
  };

  const confirmAttendance = async (app, status) => {
    const now = new Date().toISOString();
    setApps(prevApps => prevApps.map(a => a.id === app.id ? { ...a, company_attendance_status: status, company_confirmed_at: now } : a));
    try {
      await base44.entities.Application.update(app.id, { company_attendance_status: status, company_confirmed_at: now });
      if (status === 'confirmed_absent' && !app.violation_recorded) {
        await base44.functions.invoke('recordViolation', {
          application_id: app.id,
          worker_id: app.worker_id,
          source: 'no_show',
          shift_title: shift.title,
          employer_id: app.employer_id || shift.created_by_id
        });
      }
    } catch (e) { console.error(e); }
  };

  if (!shift) return <div className="max-w-2xl mx-auto"><Skeleton className="h-48 w-full" /></div>;

  const pay = shiftPay(shift);
  const dur = shiftDurationHours(shift);
  const durLabel = Number.isInteger(dur) ? dur : dur.toFixed(1);

  return (
    <div className="max-w-2xl mx-auto">
      <button onClick={() => navigate('/employer/shifts')} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4" /> {t('back')}
      </button>

      <Card className="p-5 mb-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <h1 className="text-xl font-display font-bold text-foreground">{shift.title}</h1>
          <StatusBadge status={shift.status} label={t(`shift.${shift.status}`)} />
        </div>
        {shift.description && <p className="text-sm text-muted-foreground mb-4">{shift.description}</p>}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <Info icon={Calendar} label={t('shift.date')} value={shift.date} />
          <Info icon={Clock} label={t('shift.startTime')} value={`${shift.start_time} — ${shift.end_time}`} />
          <Info icon={Clock} label={t('shift.duration')} value={`${durLabel} ${t('shift.durationShort')}`} />
          <Info icon={MapPin} label={t('shift.location')} value={shift.location || shift.city} />
          <Info icon={Wallet} label={t('shift.hourlyRate')} value={pay.hourlyRate != null ? formatSom(pay.hourlyRate) : '—'} />
          <Info icon={Wallet} label={t('shift.totalAmount')} value={pay.total != null ? formatSom(pay.total) : '—'} />
          <Info icon={Users} label={t('shift.workers')} value={shift.required_workers} />
        </div>
        {shift.status !== 'completed' && (
          <Button variant="soft" className="mt-4" onClick={markCompleted}>
            <CheckCircle2 className="h-4 w-4" /> {t('shift.markCompleted')}
          </Button>
        )}
      </Card>

      <h2 className="font-display font-bold text-lg text-foreground mb-3">{t('app.title')} ({apps?.length || 0})</h2>
      {apps === null ? <Skeleton className="h-20 w-full" /> : apps.length === 0 ? (
        <EmptyState icon={User} title={t('app.noApps')} />
      ) : (
        <div className="space-y-3">
          {[...apps].sort((a, b) => (preferredWorkers.has(b.worker_id) ? 1 : 0) - (preferredWorkers.has(a.worker_id) ? 1 : 0)).map(a => {
            const w = users[a.worker_id];
            const booked = a.status === 'approved' || a.status === 'in_progress';
            const attLabel = attendanceLabel(a, shift);
            const mismatch = isMismatch(a);
            const preferred = preferredWorkers.has(a.worker_id);
            const attPending = booked && a.company_attendance_status === 'pending' && isCheckInWindowOpen(shift);
            const rateEligible = a.company_attendance_status === 'confirmed_present' && (a.status === 'completed' || a.check_out_time);
            return (
              <Card key={a.id} className="p-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                    {(w?.full_name || '?').trim().split(/\s+/).slice(0,2).map(s=>s[0]?.toUpperCase()).join('')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground truncate">{w?.full_name || '—'}</p>
                      {preferred && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-semibold px-2 py-0.5"><Heart className="h-3 w-3" /> {t('att.goodWorker')}</span>}
                    </div>
                    <p className="text-xs text-muted-foreground">{w?.phone_number || w?.email}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <StarsDisplay avg={w?.rating_avg} count={w?.rating_count} />
                      <span className="text-xs text-muted-foreground">{completedCounts[a.worker_id] || 0} {t('rating.completedShifts')}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <StatusBadge status={a.status} label={t(`app.status${a.status.charAt(0).toUpperCase()}${a.status.slice(1)}`)} />
                    {mismatch && <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 text-rose-700 text-[10px] font-semibold px-2 py-0.5"><AlertTriangle className="h-3 w-3" /> {t('att.mismatch')}</span>}
                  </div>
                </div>
                {booked && (
                  <div className="flex items-center gap-2 mt-2 text-xs">
                    <span className="text-muted-foreground">{t('att.attendance')}:</span>
                    <span className="font-semibold text-foreground">{t(`att.${attLabel}`)}</span>
                  </div>
                )}
                {a.cancellation_reason && (
                  <p className="text-xs text-muted-foreground mt-2"><span className="font-semibold">{t('att.cancellationReason')}:</span> {a.cancellation_reason}</p>
                )}
                {attPending && (
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" variant="soft" onClick={() => confirmAttendance(a, 'confirmed_present')}><CheckCircle2 className="h-4 w-4" /> {t('att.came')}</Button>
                    <Button size="sm" variant="outline" onClick={() => setAbsentApp(a)}><XCircle className="h-4 w-4" /> {t('att.notCame')}</Button>
                  </div>
                )}
                {rateEligible && (
                  <div className="mt-3 border-t border-border pt-3">
                    <div className="flex items-center gap-1.5 mb-2 text-sm font-semibold text-foreground"><Star className="h-4 w-4 text-primary" /> {t('rating.rateWorker')}</div>
                    <RatingPrompt applicationId={a.id} shiftId={shift.id} workerId={a.worker_id} companyId={shift.company_id} employerId={user.id} ratedBy="company" />
                  </div>
                )}
                {a.status === 'pending' && (
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" onClick={() => setStatus(a, 'approved')}><CheckCircle2 className="h-4 w-4" /> {t('app.approve')}</Button>
                    <Button size="sm" variant="outline" onClick={() => setStatus(a, 'rejected')}><XCircle className="h-4 w-4" /> {t('app.reject')}</Button>
                  </div>
                )}
                {a.status === 'approved' && (
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" variant="soft" onClick={() => markWorkerDone(a)}><CheckCircle2 className="h-4 w-4" /> {t('app.markDone')}</Button>
                    <Button size="sm" variant="outline" onClick={() => markWorkerNoShow(a)}><XCircle className="h-4 w-4" /> {t('app.markNoShow')}</Button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
      <AbsentReasonDialog
        open={!!absentApp}
        onOpenChange={(o) => { if (!o) setAbsentApp(null); }}
        app={absentApp}
        shift={shift}
        workerName={users[absentApp?.worker_id]?.full_name}
        onConfirmed={(appId) => setApps(prev => prev.map(x => x.id === appId ? { ...x, company_attendance_status: 'confirmed_absent' } : x))}
      />
    </div>
  );
}

function Info({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5" />
      <div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="font-medium text-foreground">{value}</div>
      </div>
    </div>
  );
}
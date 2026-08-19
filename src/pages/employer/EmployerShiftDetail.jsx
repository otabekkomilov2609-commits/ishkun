import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { useLang } from '@/lib/i18n';
import { base44 } from '@/api/base44Client';
import { Button, Card, Skeleton } from '@/components/ui';
import StatusBadge from '@/components/StatusBadge';
import EmptyState from '@/components/EmptyState';
import { ArrowLeft, MapPin, Clock, Wallet, Users, Calendar, CheckCircle2, XCircle, User } from 'lucide-react';
import { formatSom } from '@/lib/format';

export default function EmployerShiftDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();
  const [shift, setShift] = useState(null);
  const [apps, setApps] = useState(null);
  const [users, setUsers] = useState({});

  const load = async () => {
    const s = await base44.entities.Shift.get(id);
    setShift(s);
    const a = await base44.entities.Application.filter({ shift_id: id }, '-created_date', 200);
    setApps(a);
    const u = await base44.entities.User.list('-created_date', 200);
    const map = {};
    u.forEach(x => { map[x.id] = x; });
    setUsers(map);
  };

  useEffect(() => { load(); }, [id]);

  const setStatus = async (app, status) => {
    const prev = apps;
    setApps(prevApps => prevApps.map(a => a.id === app.id ? { ...a, status } : a));
    try {
      await base44.entities.Application.update(app.id, { status });
      await base44.entities.Notification.create({
        user_id: app.worker_id,
        title: status === 'approved' ? t('notif.approved') : t('notif.rejected'),
        body: shift.title,
        type: status === 'approved' ? 'application_approved' : 'application_rejected',
        link: `/worker/applications`
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
      await base44.entities.Notification.bulkCreate(approved.map(a => ({
        user_id: a.worker_id, title: t('notif.shiftDone'), body: shift.title, type: 'shift_completed', link: '/worker/applications'
      })));
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
      await base44.entities.Notification.create({
        user_id: app.worker_id,
        title: t('notif.shiftDone'),
        body: shift.title,
        type: 'shift_completed',
        link: '/worker/applications'
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
    } catch (e) {
      setApps(prev);
      setShift({ ...shift, status: prevStatus });
      console.error(e);
    }
  };

  if (!shift) return <div className="max-w-2xl mx-auto"><Skeleton className="h-48 w-full" /></div>;

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
          <Info icon={MapPin} label={t('shift.location')} value={shift.location || shift.city} />
          <Info icon={Wallet} label={t('shift.payment')} value={formatSom(shift.payment_amount)} />
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
          {apps.map(a => {
            const w = users[a.worker_id];
            return (
              <Card key={a.id} className="p-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                    {(w?.full_name || '?').trim().split(/\s+/).slice(0,2).map(s=>s[0]?.toUpperCase()).join('')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{w?.full_name || '—'}</p>
                    <p className="text-xs text-muted-foreground">{w?.phone_number || w?.email}</p>
                  </div>
                  <StatusBadge status={a.status} label={t(`app.status${a.status.charAt(0).toUpperCase()}${a.status.slice(1)}`)} />
                </div>
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
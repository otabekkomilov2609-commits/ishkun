import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { useLang } from '@/lib/i18n';
import { base44 } from '@/api/base44Client';
import { Button, Card, Skeleton } from '@/components/ui';
import { queryClientInstance } from '@/lib/query-client';
import { ArrowLeft, MapPin, Clock, Wallet, Users, Calendar, Building2 } from 'lucide-react';
import { formatSom, formatDateDMY, shiftPay, shiftDurationHours } from '@/lib/format';
import { getWorkerShiftState, STATE_STYLES } from '@/lib/shiftStatus';
import { cn } from '@/lib/utils';

export default function WorkerShiftDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();
  const [shift, setShift] = useState(null);
  const [company, setCompany] = useState(null);
  const [myApp, setMyApp] = useState(null);
  const [applying, setApplying] = useState(false);
  const [sameDayConflict, setSameDayConflict] = useState(null);

  useEffect(() => {
    (async () => {
      const s = await base44.entities.Shift.get(id);
      setShift(s);
      if (s.company_id) {
        try { setCompany(await base44.entities.Company.get(s.company_id)); } catch {}
      }
      if (user) {
        const a = await base44.entities.Application.filter({ worker_id: user.id, shift_id: id });
        const active = a.find(x => x.status !== 'cancelled') || a[0] || null;
        setMyApp(active);
        const allApps = await base44.entities.Application.filter({ worker_id: user.id });
        const approvedApps = allApps.filter(x => x.status === 'approved');
        const otherShiftIds = [...new Set(approvedApps.map(x => x.shift_id).filter(sid => sid !== id))];
        const otherShifts = await Promise.all(otherShiftIds.map(async sid => {
          try { return await base44.entities.Shift.get(sid); } catch { return null; }
        }));
        const conflict = otherShifts.find(os => os && os.date === s.date);
        setSameDayConflict(conflict || null);
      }
    })();
  }, [id, user]);

  const verified = user?.verification_status === 'verified';
  const state = getWorkerShiftState(myApp, shift);
  const pay = shift ? shiftPay(shift) : null;
  const dur = shift ? shiftDurationHours(shift) : 0;
  const durLabel = Number.isInteger(dur) ? dur : dur.toFixed(1);

  const apply = async () => {
    if (!verified || sameDayConflict) return;
    setApplying(true);
    setMyApp({ status: 'pending', worker_id: user.id, shift_id: id });
    try {
      await base44.entities.Application.create({
        worker_id: user.id,
        employer_id: shift.created_by_id,
        shift_id: id,
        status: 'pending',
        application_date: new Date().toISOString()
      });
      await base44.entities.Notification.create({
        user_id: shift.created_by_id,
        title: 'Yangi arizachi',
        body: `${user.full_name || 'Ishchi'} sizning '${shift.title}' e'loningizga ariza topshirdi.`,
        type: 'new_application',
        link: `/employer/shifts/${id}`
      });
      queryClientInstance.invalidateQueries({ queryKey: ['myApps'] });
    } catch (e) {
      setMyApp(null);
      console.error(e);
    }
    setApplying(false);
  };

  if (!shift) return <div className="max-w-2xl mx-auto"><Skeleton className="h-64 w-full" /></div>;

  return (
    <div className="max-w-2xl mx-auto">
      <button onClick={() => navigate('/worker')} className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors mb-4" aria-label={t('back')}>
        <ArrowLeft className="h-5 w-5" />
      </button>

      <Card className="p-5 mb-4">
        <h1 className="text-xl font-display font-bold text-foreground mb-1">{shift.title}</h1>
        <div className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
          <MapPin className="h-3.5 w-3.5" /> {shift.location || shift.city}
        </div>
        {shift.description && <p className="text-sm text-muted-foreground mb-4">{shift.description}</p>}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <Info icon={Calendar} label={t('shift.date')} value={formatDateDMY(shift.date)} />
          <Info icon={Clock} label={t('shift.startTime')} value={shift.start_time} />
          <Info icon={Clock} label={t('shift.endTime')} value={shift.end_time} />
          <Info icon={Clock} label={t('shift.duration')} value={`${durLabel} ${t('shift.durationShort')}`} />
          <Info icon={Wallet} label={t('shift.hourlyRate')} value={pay.hourlyRate != null ? formatSom(pay.hourlyRate) : '—'} />
          <Info icon={Wallet} label={t('shift.totalAmount')} value={pay.total != null ? formatSom(pay.total) : '—'} />
          <Info icon={Users} label={t('shift.workers')} value={shift.required_workers} />
        </div>
      </Card>

      {company && (
        <Card className="p-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary"><Building2 className="h-5 w-5" /></div>
            <div>
              <div className="text-xs text-muted-foreground">{t('wrk.company')}</div>
              <div className="font-semibold text-foreground">{company.name}</div>
              {company.address && <div className="text-xs text-muted-foreground">{company.address}</div>}
            </div>
          </div>
        </Card>
      )}

      <div className="sticky bottom-20">
        {state.key === 'apply' && verified && !sameDayConflict ? (
          <Button size="lg" className="w-full" disabled={applying} onClick={apply}>
            {t('wstat.apply')}
          </Button>
        ) : state.key === 'apply' && !verified ? (
          <div className="space-y-2">
            <div className="rounded-xl bg-amber-50 text-amber-700 text-sm font-medium px-4 py-3 text-center">{t('kyc.mustVerify')}</div>
            <Button size="lg" className="w-full" onClick={() => navigate('/verification')}>{t('kyc.verifyNow')}</Button>
          </div>
        ) : state.key === 'apply' && sameDayConflict ? (
          <div className="rounded-xl bg-rose-50 text-rose-700 text-sm font-medium px-4 py-3 text-center">{t('wrk.sameDayConflict')}</div>
        ) : (
          <div className={cn('rounded-xl px-4 py-3 text-center text-sm font-semibold', STATE_STYLES[state.kind])}>
            {state.key === 'completed' ? <span className="inline-flex items-center gap-1.5 justify-center">✓ {t(state.labelKey)}</span> : t(state.labelKey)}
          </div>
        )}
      </div>
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
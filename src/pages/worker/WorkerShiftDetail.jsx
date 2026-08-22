import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { useLang } from '@/lib/i18n';
import { base44 } from '@/api/base44Client';
import { Button, Card, Skeleton } from '@/components/ui';
import { queryClientInstance } from '@/lib/query-client';
import { ArrowLeft, MapPin, Clock, Wallet, Users, Calendar, Building2, Navigation, ListChecks, AlertCircle, ClipboardCheck, Shirt, Star, AlertTriangle } from 'lucide-react';
import { formatSom, formatDateDMY, shiftPay, shiftDurationHours } from '@/lib/format';
import RatingPrompt from '@/components/RatingPrompt';
import CancelBookingDialog from '@/components/CancelBookingDialog';
import { StarsDisplay } from '@/components/RatingStars';
import { isMismatch, isShiftEnded } from '@/lib/shiftTime';
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
  const [cancelOpen, setCancelOpen] = useState(false);

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
  const afterEnd = shift ? isShiftEnded(shift) : false;

  const apply = async () => {
    if (!verified || sameDayConflict || ['blocked', 'paused'].includes(user?.account_status)) return;
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
      await base44.functions.invoke('createNotificationFor', {
        notifications: [{
          user_id: shift.created_by_id,
          title: 'Yangi arizachi',
          body: `${user.full_name || 'Ishchi'} sizning '${shift.title}' e'loningizga ariza topshirdi.`,
          type: 'new_application',
          link: `/employer/shifts/${id}`
        }]
      });
      queryClientInstance.invalidateQueries({ queryKey: ['myApps'] });
    } catch (e) {
      setMyApp(null);
      console.error(e);
    }
    setApplying(false);
  };

  if (!shift) return <div className="max-w-2xl mx-auto"><Skeleton className="h-64 w-full" /></div>;

  const mapUrl = shift.map_link
    || ((shift.geo_lat != null && shift.geo_lng != null)
      ? `https://yandex.com/maps/?pt=${shift.geo_lng},${shift.geo_lat}&z=16&l=map`
      : `https://yandex.com/maps/?text=${encodeURIComponent([shift.location, shift.city].filter(Boolean).join(', '))}`);

  const tasksList = (shift.tasks_text || '').split('\n').map(s => s.trim()).filter(Boolean);

  return (
    <div className="max-w-2xl mx-auto">
      <button onClick={() => navigate('/worker')} className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors mb-4" aria-label={t('back')}>
        <ArrowLeft className="h-5 w-5" />
      </button>

      <h1 className="text-xl font-display font-bold text-foreground mb-4">{shift.title}</h1>

      {isMismatch(myApp) && (
        <div className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-rose-50 text-rose-700 text-xs font-semibold px-3 py-1">
          <AlertTriangle className="h-3.5 w-3.5" /> {t('att.mismatch')}
        </div>
      )}

      {myApp?.status === 'cancelled' && myApp?.cancellation_reason && (
        <Card className="p-4 mb-4">
          <p className="text-sm text-muted-foreground"><span className="font-semibold text-foreground">{t('att.cancellationReason')}:</span> {myApp.cancellation_reason}</p>
        </Card>
      )}

      {/* Manzil */}
      <SectionCard icon={MapPin} title={t('sdetail.address')}>
        <div className="text-sm text-foreground">{[shift.location, shift.city].filter(Boolean).join(', ')}</div>
        <a href={mapUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex">
          <Button variant="soft" size="sm"><Navigation className="h-4 w-4" /> {t('sdetail.viewMap')}</Button>
        </a>
      </SectionCard>

      {/* Narx va vaqt */}
      <SectionCard icon={Wallet} title={t('sdetail.payTime')}>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-emerald-700 font-extrabold text-lg">{pay.total != null ? formatSom(pay.total) : '—'}</span>
          {pay.hourlyRate != null && <span className="text-xs text-muted-foreground">· {formatSom(pay.hourlyRate)}/{t('shift.hourShort')}</span>}
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <Info icon={Calendar} label={t('shift.date')} value={formatDateDMY(shift.date)} />
          <Info icon={Clock} label={t('shift.duration')} value={`${durLabel} ${t('shift.durationShort')}`} />
          <Info icon={Clock} label={t('shift.startTime')} value={shift.start_time} />
          <Info icon={Clock} label={t('shift.endTime')} value={shift.end_time} />
          <Info icon={Users} label={t('shift.workers')} value={shift.required_workers} />
        </div>
      </SectionCard>

      {/* Tavsif */}
      {(shift.description || tasksList.length > 0) && (
        <SectionCard icon={ClipboardCheck} title={t('sdetail.description')}>
          {shift.description && <p className="text-sm text-muted-foreground whitespace-pre-line">{shift.description}</p>}
          {tasksList.length > 0 && (
            <div className={shift.description ? 'mt-4' : ''}>
              <div className="flex items-center gap-1.5 mb-2 text-sm font-semibold text-foreground"><ListChecks className="h-4 w-4 text-primary" /> {t('sdetail.tasksHeading')}</div>
              <ul className="space-y-1.5">
                {tasksList.map((task, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    <span>{task}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </SectionCard>
      )}

      {/* Muhim eslatmalar */}
      {shift.important_notes_text && (
        <SectionCard icon={AlertCircle} title={t('sdetail.important')}>
          <p className="text-sm text-muted-foreground whitespace-pre-line">{shift.important_notes_text}</p>
        </SectionCard>
      )}

      {/* Talablar */}
      {(shift.requirements_text || shift.dress_code_text) && (
        <SectionCard icon={ClipboardCheck} title={t('sdetail.requirements')}>
          {shift.requirements_text && <p className="text-sm text-muted-foreground whitespace-pre-line">{shift.requirements_text}</p>}
          {shift.dress_code_text && (
            <div className={shift.requirements_text ? 'mt-4' : ''}>
              <div className="flex items-center gap-1.5 mb-1.5 text-sm font-semibold text-foreground"><Shirt className="h-4 w-4 text-primary" /> {t('sdetail.dressCode')}</div>
              <p className="text-sm text-muted-foreground">{shift.dress_code_text}</p>
            </div>
          )}
        </SectionCard>
      )}

      {/* Kompaniya */}
      {company && (
        <Card className="p-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary"><Building2 className="h-5 w-5" /></div>
            <div>
              <div className="text-xs text-muted-foreground">{t('wrk.company')}</div>
              <div className="font-semibold text-foreground flex items-center gap-2">{company.name} <StarsDisplay avg={company.rating_avg} count={company.rating_count} /></div>
              {company.address && <div className="text-xs text-muted-foreground">{company.address}</div>}
            </div>
          </div>
        </Card>
      )}

      {state.key === 'completed' && myApp && (
        <Card className="p-4 mb-4">
          <div className="flex items-center gap-1.5 mb-3">
            <Star className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold text-foreground">{t('rating.rateCompany')}</h2>
          </div>
          <RatingPrompt
            applicationId={myApp.id}
            shiftId={shift.id}
            workerId={user.id}
            companyId={shift.company_id}
            employerId={shift.created_by_id}
            ratedBy="worker"
          />
        </Card>
      )}

      {myApp && myApp.status === 'approved' && !myApp.check_in_time && (
        <Button variant="outline" className="w-full mb-4" onClick={() => setCancelOpen(true)}>
          {afterEnd ? t('cancelDialog.cannotComePast') : t('cancelDialog.cannotCome')}
        </Button>
      )}
      <CancelBookingDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        app={myApp}
        shift={shift}
        workerName={user?.full_name}
        onCancelled={() => setMyApp(prev => prev ? { ...prev, status: 'cancelled' } : prev)}
      />

      <div className="sticky bottom-20">
        {state.key === 'apply' && verified && !sameDayConflict ? (
          ['blocked', 'paused'].includes(user?.account_status) ? (
            <div className="rounded-xl bg-rose-50 text-rose-700 text-sm font-medium px-4 py-3 text-center">{t('cancelDialog.blockedMsg')}</div>
          ) : (
            <Button size="lg" className="w-full" disabled={applying} onClick={apply}>
              {t('wstat.apply')}
            </Button>
          )
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

function SectionCard({ icon: Icon, title, children }) {
  return (
    <Card className="p-4 mb-4">
      <div className="flex items-center gap-1.5 mb-3">
        <Icon className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-bold text-foreground">{title}</h2>
      </div>
      {children}
    </Card>
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
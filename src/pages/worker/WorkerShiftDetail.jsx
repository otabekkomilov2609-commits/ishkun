import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { useLang } from '@/lib/i18n';
import { base44 } from '@/api/base44Client';
import { Button, Card, Skeleton } from '@/components/ui';
import { ArrowLeft, MapPin, Clock, Wallet, Users, Calendar, Building2, CheckCircle2 } from 'lucide-react';
import { formatSom } from '@/lib/format';

export default function WorkerShiftDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();
  const [shift, setShift] = useState(null);
  const [company, setCompany] = useState(null);
  const [applied, setApplied] = useState(false);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    (async () => {
      const s = await base44.entities.Shift.get(id);
      setShift(s);
      if (s.company_id) {
        try { setCompany(await base44.entities.Company.get(s.company_id)); } catch {}
      }
      if (user) {
        const a = await base44.entities.Application.filter({ worker_id: user.id, shift_id: id });
        setApplied(a.length > 0);
      }
    })();
  }, [id, user]);

  const apply = async () => {
    setApplying(true);
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
      setApplied(true);
    } catch (e) { console.error(e); }
    setApplying(false);
  };

  if (!shift) return <div className="max-w-2xl mx-auto"><Skeleton className="h-64 w-full" /></div>;

  return (
    <div className="max-w-2xl mx-auto">
      <button onClick={() => navigate('/worker')} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4" /> {t('wrk.backToShifts')}
      </button>

      <Card className="p-5 mb-4">
        <h1 className="text-xl font-display font-bold text-foreground mb-1">{shift.title}</h1>
        <div className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
          <MapPin className="h-3.5 w-3.5" /> {shift.location || shift.city}
        </div>
        {shift.description && <p className="text-sm text-muted-foreground mb-4">{shift.description}</p>}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <Info icon={Calendar} label={t('shift.date')} value={shift.date} />
          <Info icon={Clock} label={t('shift.startTime')} value={`${shift.start_time} — ${shift.end_time}`} />
          <Info icon={Wallet} label={t('shift.payment')} value={formatSom(shift.payment_amount)} />
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
        {applied ? (
          <Button size="lg" className="w-full" disabled>
            <CheckCircle2 className="h-5 w-5" /> {t('wrk.applied')}
          </Button>
        ) : (
          <Button size="lg" className="w-full" disabled={applying} onClick={apply}>
            {t('wrk.applyNow')}
          </Button>
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
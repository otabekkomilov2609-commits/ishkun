import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { useLang } from '@/lib/i18n';
import { base44 } from '@/api/base44Client';
import { CITIES } from '@/lib/format';
import { Button, Input, Textarea, Select, Field, Card } from '@/components/ui';
import { useToast } from '@/components/ui/use-toast';
import { PlusCircle, Check, Building2 } from 'lucide-react';

export default function CreateShift() {
  const { user } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();
  const [company, setCompany] = useState(undefined);
  const [form, setForm] = useState({
    title: '', description: '', date: '', start_time: '', end_time: '',
    location: '', city: user?.city || '', payment_amount: '', required_workers: 1
  });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!user) return;
    (async () => {
      const comps = await base44.entities.Company.filter({ created_by_id: user.id });
      setCompany(comps[0] || null);
    })();
  }, [user]);

  const submit = async () => {
    if (!form.title || !form.date || !form.start_time || !form.end_time || !form.payment_amount || !form.city) {
      toast({ title: t('required'), variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      await base44.entities.Shift.create({
        ...form,
        payment_amount: Number(form.payment_amount),
        required_workers: Number(form.required_workers) || 1,
        company_id: company.id,
        status: 'open',
        moderation: 'approved'
      });
      toast({ title: t('shift.created') });
      navigate('/employer/shifts');
    } catch (e) {
      console.error(e);
      toast({ title: e?.message || 'Xatolik', description: 'Shift e\'lon qilinmadi', variant: 'destructive' });
      setSaving(false);
    }
  };

  if (company === undefined) return null;
  if (company === null) {
    return (
      <div className="max-w-md mx-auto pt-10">
        <Card className="p-6 text-center">
          <div className="grid h-12 w-12 mx-auto place-items-center rounded-xl bg-primary text-primary-foreground mb-3"><Building2 className="h-6 w-6" /></div>
          <h2 className="font-semibold text-foreground">{t('emp.companyNeeded')}</h2>
          <p className="text-sm text-muted-foreground mt-1 mb-4">{t('emp.companyNeededHint')}</p>
          <Button onClick={() => navigate('/employer/company')}><Building2 className="h-4 w-4" /> {t('emp.createCompany')}</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-2 mb-5">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground"><PlusCircle className="h-5 w-5" /></div>
        <h1 className="text-2xl font-display font-bold tracking-tight text-foreground">{t('shift.create')}</h1>
      </div>

      <Card className="p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Field label={t('shift.titleLabel')} required>
              <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Ofitsiant — kechki smena" />
            </Field>
          </div>
          <Field label={t('shift.date')} required>
            <Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
          </Field>
          <Field label={t('shift.payment')} required>
            <Input type="number" value={form.payment_amount} onChange={e => setForm({ ...form, payment_amount: e.target.value })} placeholder="150000" />
          </Field>
          <Field label={t('shift.startTime')} required>
            <Input type="time" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} />
          </Field>
          <Field label={t('shift.endTime')} required>
            <Input type="time" value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })} />
          </Field>
          <Field label={t('shift.location')}>
            <Input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="Chilonzor tumani" />
          </Field>
          <Field label={t('city')} required>
            <Select value={form.city} onChange={e => setForm({ ...form, city: e.target.value })}>
              <option value="">{t('allCities')}</option>
              {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
            </Select>
          </Field>
          <div className="sm:col-span-2">
            <Field label={t('shift.workers')}>
              <Input type="number" min="1" value={form.required_workers} onChange={e => setForm({ ...form, required_workers: e.target.value })} />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label={t('shift.description')}>
              <Textarea rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </Field>
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <Button onClick={submit} disabled={saving}>
            <Check className="h-4 w-4" /> {t('shift.submit')}
          </Button>
          <Button variant="outline" onClick={() => navigate('/employer/shifts')}>{t('cancel')}</Button>
        </div>
      </Card>
    </div>
  );
}
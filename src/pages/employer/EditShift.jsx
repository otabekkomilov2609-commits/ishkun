import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLang } from '@/lib/i18n';
import { base44 } from '@/api/base44Client';
import { CITIES } from '@/lib/format';
import { Button, Input, Textarea, Select, Field, Card, Skeleton } from '@/components/ui';
import { useToast } from '@/components/ui/use-toast';
import { Pencil, Check } from 'lucide-react';

// Edit an existing shift. Mirrors CreateShift's form, but loads the shift by id,
// prefills current values, and persists through the updateShift backend function
// (which recomputes payment_amount server-side and enforces ownership / status /
// required_workers integrity — see base44/functions/updateShift/entry.ts).
export default function EditShift() {
  const { id } = useParams();
  const { t } = useLang();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [shift, setShift] = useState(undefined);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const s = await base44.entities.Shift.get(id);
        setShift(s);
        setForm({
          title: s.title || '',
          description: s.description || '',
          tasks_text: s.tasks_text || '',
          important_notes_text: s.important_notes_text || '',
          requirements_text: s.requirements_text || '',
          dress_code_text: s.dress_code_text || '',
          map_link: s.map_link || '',
          date: s.date || '',
          start_time: s.start_time || '',
          end_time: s.end_time || '',
          location: s.location || '',
          city: s.city || '',
          hourly_rate: s.hourly_rate != null ? String(s.hourly_rate) : '',
          required_workers: s.required_workers || 1,
          required_skill: s.required_skill || ''
        });
      } catch (e) {
        console.error(e);
        setShift(null);
      }
    })();
  }, [id]);

  const submit = async () => {
    if (!form.title || !form.date || !form.start_time || !form.end_time || !form.hourly_rate || !form.city || !form.location || !form.map_link) {
      toast({ title: t('required'), variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      await base44.functions.invoke('updateShift', {
        shift_id: id,
        title: form.title,
        description: form.description,
        tasks_text: form.tasks_text || undefined,
        important_notes_text: form.important_notes_text || undefined,
        requirements_text: form.requirements_text || undefined,
        dress_code_text: form.dress_code_text || undefined,
        map_link: form.map_link,
        date: form.date,
        start_time: form.start_time,
        end_time: form.end_time,
        location: form.location,
        city: form.city,
        hourly_rate: Number(form.hourly_rate),
        required_workers: Number(form.required_workers) || 1,
        required_skill: form.required_skill || undefined
      });
      toast({ title: t('shift.updated') });
      navigate(`/employer/shifts/${id}`);
    } catch (e) {
      console.error(e);
      toast({ title: e?.message || 'Xatolik', description: 'Shift yangilanmadi', variant: 'destructive' });
      setSaving(false);
    }
  };

  if (form === null) return <div className="max-w-2xl mx-auto"><Skeleton className="h-64 w-full" /></div>;
  if (shift === null) {
    return (
      <div className="max-w-md mx-auto pt-10">
        <Card className="p-6 text-center">
          <p className="text-sm text-muted-foreground">Shift topilmadi.</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate('/employer/shifts')}>{t('back')}</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-2 mb-5">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground"><Pencil className="h-5 w-5" /></div>
        <h1 className="text-2xl font-display font-bold tracking-tight text-foreground">{t('shift.edit')}</h1>
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
          <Field label={t('shift.hourlyRate')} required hint={t('shift.hourlyRateHint')}>
            <Input type="number" value={form.hourly_rate} onChange={e => setForm({ ...form, hourly_rate: e.target.value })} placeholder="25000" />
          </Field>
          <Field label={t('shift.startTime')} required>
            <Input type="time" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} />
          </Field>
          <Field label={t('shift.endTime')} required>
            <Input type="time" value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })} />
          </Field>
          <Field label={t('shift.location')} required>
            <Input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="Chilonzor tumani" />
          </Field>
          <Field label={t('city')} required>
            <Select value={form.city} onChange={e => setForm({ ...form, city: e.target.value })}>
              <option value="">{t('allCities')}</option>
              {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
            </Select>
          </Field>
          <div className="sm:col-span-2">
            <Field label={t('shift.mapLink')} required hint={t('shift.mapLinkHint')}>
              <Input value={form.map_link} onChange={e => setForm({ ...form, map_link: e.target.value })} placeholder="https://yandex.com/maps/..." />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label={t('shift.skill')}>
              <Select value={form.required_skill} onChange={e => setForm({ ...form, required_skill: e.target.value })}>
                <option value="">{t('shift.skillAny')}</option>
                <option value="warehouse">{t('skill.warehouse')}</option>
                <option value="waiter">{t('skill.waiter')}</option>
                <option value="cashier">{t('skill.cashier')}</option>
                <option value="courier">{t('skill.courier')}</option>
                <option value="promoter">{t('skill.promoter')}</option>
                <option value="event_staff">{t('skill.event_staff')}</option>
                <option value="cleaner">{t('skill.cleaner')}</option>
              </Select>
            </Field>
          </div>
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
          <div className="sm:col-span-2">
            <Field label={t('sdetail.tasksLabel')} hint="Har bir qator alohida vazifa sifatida ko'rinadi">
              <Textarea rows={4} value={form.tasks_text} onChange={e => setForm({ ...form, tasks_text: e.target.value })} placeholder={"Mijozlarni kutib olish\nMahsulotlarni javonga joylash\nHisobot tayyorlash"} />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label={t('sdetail.importantLabel')}>
              <Textarea rows={3} value={form.important_notes_text} onChange={e => setForm({ ...form, important_notes_text: e.target.value })} placeholder="Vaqtida kelish, aloqa uchun telefon raqami" />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label={t('sdetail.requirementsLabel')}>
              <Textarea rows={3} value={form.requirements_text} onChange={e => setForm({ ...form, requirements_text: e.target.value })} placeholder="Joyga kelganda davomat varaqasini imzolang" />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label={t('sdetail.dressCodeLabel')}>
              <Input value={form.dress_code_text} onChange={e => setForm({ ...form, dress_code_text: e.target.value })} placeholder="Qora shim, oq ko'ylak, qora poyabzal" />
            </Field>
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <Button onClick={submit} disabled={saving}>
            <Check className="h-4 w-4" /> {t('shift.update')}
          </Button>
          <Button variant="outline" onClick={() => navigate(`/employer/shifts/${id}`)}>{t('cancel')}</Button>
        </div>
      </Card>
    </div>
  );
}
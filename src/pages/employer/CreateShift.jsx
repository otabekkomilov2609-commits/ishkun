import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { useLang } from '@/lib/i18n';
import { base44 } from '@/api/base44Client';
import { CITIES, isValidMapLink, RATE_MAX, groupDigits, toYMD } from '@/lib/format';
import { Button, Input, Textarea, Select, Field, Card } from '@/components/ui';
import { useToast } from '@/components/ui/use-toast';
import TemplatePickerDrawer from '@/components/TemplatePickerDrawer';
import ShiftPreviewSheet from '@/components/ShiftPreviewSheet';
import { PlusCircle, Check, Building2, X, CalendarPlus, Navigation, LayoutTemplate } from 'lucide-react';

export default function CreateShift() {
  const { user } = useAuth();
  const { t, tCity } = useLang();
  const navigate = useNavigate();
  const [company, setCompany] = useState(undefined);
  const [form, setForm] = useState({
    title: '', description: '', tasks_text: '', important_notes_text: '', requirements_text: '', dress_code_text: '',
    map_link: '',
    date: '', start_time: '', end_time: '',
    location: '', city: user?.city || '', daily_rate: '', required_workers: 1, required_skill: ''
  });
  const [saving, setSaving] = useState(false);
  const [rateTooBig, setRateTooBig] = useState(false);
  const todayStr = toYMD();

  const onRateChange = (v) => {
    const digits = v.replace(/\D/g, '');
    const over = digits !== '' && Number(digits) > RATE_MAX;
    setRateTooBig(over);
    setForm(prev => ({ ...prev, daily_rate: over ? String(RATE_MAX) : digits }));
  };
  const [posted, setPosted] = useState(false);
  const [dupHintDismissed, setDupHintDismissed] = useState(false);
  const [hintText, setHintText] = useState('');
  const [templates, setTemplates] = useState([]);
  const [recentShifts, setRecentShifts] = useState([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [showTemplateSave, setShowTemplateSave] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateSaved, setTemplateSaved] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!user) return;
    (async () => {
      const comps = await base44.entities.Company.filter({ created_by_id: user.id });
      setCompany(comps[0] || null);
    })();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const tpls = await base44.entities.ShiftTemplate.filter({ created_by_id: user.id }, '-created_date', 20);
        setTemplates(tpls);
        const recents = await base44.entities.Shift.filter({ created_by_id: user.id }, '-created_date', 20);
        setRecentShifts(recents);
      } catch (e) { console.error(e); }
    })();
  }, [user]);

  const submit = () => {
    if (!form.title || !form.date || !form.start_time || !form.end_time || !form.daily_rate || !form.city || !form.map_link) {
      toast({ title: t('required'), variant: 'destructive' });
      return;
    }
    if (!isValidMapLink(form.map_link)) {
      toast({ title: t('shift.mapLinkFormatError'), variant: 'destructive' });
      return;
    }
    setPreviewOpen(true);
  };

  const confirmPublish = async () => {
    setSaving(true);
    try {
      await base44.functions.invoke('createShift', {
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
        city: form.city,
        daily_rate: Number(form.daily_rate),
        required_workers: Number(form.required_workers) || 1,
        required_skill: form.required_skill || undefined
      });
      setSaving(false);
      setPreviewOpen(false);
      setPosted(true);
    } catch (e) {
      console.error(e);
      toast({ title: e?.message || 'Xatolik', description: 'Shift e\'lon qilinmadi', variant: 'destructive' });
      setSaving(false);
    }
  };

  const postAnotherDay = () => {
    setForm(prev => ({ ...prev, date: '' }));
    setPosted(false);
    setSaving(false);
  };

  const pickTemplate = (tpl) => {
    setForm(prev => ({
      ...prev,
      title: tpl.title || '',
      description: tpl.description || '',
      tasks_text: tpl.tasks_text || '',
      important_notes_text: tpl.important_notes_text || '',
      requirements_text: tpl.requirements_text || '',
      dress_code_text: tpl.dress_code_text || '',
      map_link: tpl.map_link || '',
      city: tpl.city || prev.city || '',
      daily_rate: tpl.daily_rate != null ? String(tpl.daily_rate) : '',
      required_workers: tpl.required_workers || 1,
      required_skill: tpl.required_skill || '',
      date: '',
      start_time: '',
      end_time: ''
    }));
    setDupHintDismissed(false);
    setHintText(t('shift.templateApplied'));
  };

  const pickShift = (shift) => {
    setForm(prev => ({
      ...prev,
      title: shift.title || '',
      description: shift.description || '',
      tasks_text: shift.tasks_text || '',
      important_notes_text: shift.important_notes_text || '',
      requirements_text: shift.requirements_text || '',
      dress_code_text: shift.dress_code_text || '',
      map_link: shift.map_link || '',
      city: shift.city || prev.city || '',
      daily_rate: shift.daily_rate != null ? String(shift.daily_rate) : '',
      required_workers: shift.required_workers || 1,
      required_skill: shift.required_skill || '',
      date: '',
      start_time: '',
      end_time: ''
    }));
    setDupHintDismissed(false);
    setHintText(t('shift.shiftApplied'));
  };

  const deleteTemplate = async (tpl) => {
    try {
      await base44.entities.ShiftTemplate.delete(tpl.id);
      setTemplates(prev => prev.filter(x => x.id !== tpl.id));
    } catch (e) { console.error(e); }
  };

  const saveAsTemplate = async () => {
    try {
      await base44.entities.ShiftTemplate.create({
        name: templateName.trim() || form.title,
        title: form.title,
        description: form.description,
        tasks_text: form.tasks_text,
        important_notes_text: form.important_notes_text,
        requirements_text: form.requirements_text,
        dress_code_text: form.dress_code_text,
        map_link: form.map_link,
        city: form.city,
        daily_rate: Number(form.daily_rate),
        required_workers: Number(form.required_workers) || 1,
        required_skill: form.required_skill || undefined,
        company_id: company.id
      });
      setShowTemplateSave(false);
      setTemplateSaved(true);
      setTimeout(() => setTemplateSaved(false), 2000);
    } catch (e) {
      console.error(e);
      toast({ title: e?.message || 'Xatolik', variant: 'destructive' });
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

  if (posted) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="p-6 text-center">
          <div className="grid h-12 w-12 mx-auto place-items-center rounded-xl bg-emerald-50 text-emerald-600 mb-3"><Check className="h-6 w-6" /></div>
          <h2 className="font-semibold text-foreground">{t('shift.created')}</h2>
          <p className="text-sm text-muted-foreground mt-1 mb-4">{t('shift.postedSuccessDesc')}</p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Button onClick={() => navigate('/employer/shifts')}>{t('shift.backToList')}</Button>
            <Button variant="outline" onClick={postAnotherDay}><CalendarPlus className="h-4 w-4" /> {t('shift.postAnotherDay')}</Button>
            <Button variant="outline" onClick={() => { setTemplateName(form.title); setShowTemplateSave(true); }}><LayoutTemplate className="h-4 w-4" /> {t('shift.saveAsTemplate')}</Button>
          </div>
          {showTemplateSave && (
            <div className="mt-4 flex flex-col sm:flex-row gap-2 items-stretch sm:items-center justify-center">
              <Input
                value={templateName}
                onChange={e => setTemplateName(e.target.value)}
                placeholder={t('shift.templateName')}
                className="sm:max-w-xs"
              />
              <Button onClick={saveAsTemplate}><Check className="h-4 w-4" /> {t('save')}</Button>
            </div>
          )}
          {templateSaved && (
            <p className="mt-3 inline-flex items-center gap-1 text-sm text-emerald-600 font-medium"><Check className="h-4 w-4" /> {t('shift.templateSaved')}</p>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-2 mb-5">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground"><PlusCircle className="h-5 w-5" /></div>
        <h1 className="text-2xl font-display font-bold tracking-tight text-foreground">{t('shift.create')}</h1>
        {(templates.length > 0 || recentShifts.length > 0) && (
          <Button variant="outline" size="sm" className="ml-auto" onClick={() => setPickerOpen(true)}><LayoutTemplate className="h-4 w-4" /> {t('shift.useTemplate')}</Button>
        )}
      </div>

      {hintText && !dupHintDismissed && (
        <div className="mb-4 flex items-start gap-3 rounded-xl bg-primary/10 px-4 py-3 text-sm text-primary">
          <p className="flex-1">{hintText}</p>
          <button type="button" onClick={() => setDupHintDismissed(true)} className="shrink-0 text-primary/70 hover:text-primary" aria-label={t('cancel')}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <Card className="p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Field label={t('shift.titleLabel')} required>
              <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Ofitsiant — kechki smena" />
            </Field>
          </div>
          <Field label={t('shift.date')} required>
            <Input type="date" min={todayStr} value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
          </Field>
          <Field label={t('shift.dailyRate')} required hint={t('shift.dailyRateHint')}>
            <Input inputMode="numeric" value={groupDigits(form.daily_rate)} onChange={e => onRateChange(e.target.value)} placeholder="25 000" />
            {rateTooBig && <p className="mt-1.5 text-xs text-destructive">{t('shift.rateTooBig')}</p>}
          </Field>
          <Field label={t('shift.startTime')} required>
            <Input type="time" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} />
          </Field>
          <Field label={t('shift.endTime')} required>
            <Input type="time" value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })} />
          </Field>
          <Field label={t('city')} required>
            <Select value={form.city} onChange={e => setForm({ ...form, city: e.target.value })}>
              <option value="">{t('allCities')}</option>
              {CITIES.map(c => <option key={c} value={c}>{tCity(c)}</option>)}
            </Select>
          </Field>
          <div className="sm:col-span-2">
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-semibold text-foreground">{t('shift.mapLink')} <span className="text-destructive">*</span></label>
              <a href={`https://yandex.com/maps/?text=${encodeURIComponent(form.city || '')}`} target="_blank" rel="noreferrer">
                <Button type="button" variant="soft" size="sm"><Navigation className="h-4 w-4" /> {t('shift.mapPickBtn')}</Button>
              </a>
            </div>
            <p className="text-xs text-muted-foreground mb-2">{t('shift.mapHint')}</p>
            <Input value={form.map_link} onChange={e => setForm({ ...form, map_link: e.target.value })} placeholder="https://yandex.com/maps/..." />
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
            <Check className="h-4 w-4" /> {t('shift.reviewBeforePublish')}
          </Button>
          <Button variant="outline" onClick={() => navigate('/employer/shifts')}>{t('cancel')}</Button>
        </div>
      </Card>

      <TemplatePickerDrawer
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        templates={templates}
        onPick={pickTemplate}
        onDelete={deleteTemplate}
        recentShifts={recentShifts}
        onPickShift={pickShift}
      />

      <ShiftPreviewSheet
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        form={form}
        company={company}
        onConfirm={confirmPublish}
        publishing={saving}
      />
    </div>
  );
}
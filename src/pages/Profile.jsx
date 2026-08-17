import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { useLang } from '@/lib/i18n';
import { base44 } from '@/api/base44Client';
import { CITIES } from '@/lib/format';
import { Button, Input, Select, Field, Card } from '@/components/ui';
import { Briefcase, Building2, Phone, MapPin, Globe, Check, ArrowLeftRight } from 'lucide-react';

export default function Profile() {
  const { user, checkUserAuth } = useAuth();
  const { t, lang, setLang } = useLang();
  const navigate = useNavigate();
  const [form, setForm] = useState({ phone_number: '', city: '', profile_image: '', account_type: '', language: 'uz' });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({
        phone_number: user.phone_number || '',
        city: user.city || '',
        profile_image: user.profile_image || '',
        account_type: user.account_type || '',
        language: user.language || lang
      });
    }
  }, [user]);

  const save = async () => {
    setSaving(true);
    try {
      await base44.auth.updateMe({
        phone_number: form.phone_number,
        city: form.city,
        profile_image: form.profile_image,
        account_type: form.account_type,
        language: form.language
      });
      if (form.language !== lang) setLang(form.language);
      await checkUserAuth();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const switchRole = async () => {
    const next = form.account_type === 'employer' ? 'worker' : 'employer';
    setSaving(true);
    try {
      await base44.auth.updateMe({ account_type: next });
      await checkUserAuth();
      navigate(next === 'employer' ? '/employer' : '/worker');
    } catch (e) { console.error(e); setSaving(false); }
  };

  if (!user) return null;

  const initials = (user.full_name || '?').trim().split(/\s+/).slice(0, 2).map(s => s[0]?.toUpperCase()).join('');

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <div className="grid h-16 w-16 place-items-center rounded-2xl bg-primary text-primary-foreground text-lg font-bold shadow-sm">
          {initials}
        </div>
        <div>
          <h1 className="text-xl font-display font-bold text-foreground">{user.full_name || '—'}</h1>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>
      </div>

      <Card className="p-5 mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label={t('prf.phone')}>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" value={form.phone_number} onChange={e => setForm({ ...form, phone_number: e.target.value })} placeholder="+998 90 123 45 67" />
            </div>
          </Field>
          <Field label={t('prf.city')}>
            <Select value={form.city} onChange={e => setForm({ ...form, city: e.target.value })}>
              <option value="">{t('allCities')}</option>
              {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
            </Select>
          </Field>
          <Field label={t('prf.image')}>
            <Input value={form.profile_image} onChange={e => setForm({ ...form, profile_image: e.target.value })} placeholder="https://…" />
          </Field>
          <Field label={t('language')}>
            <Select value={form.language} onChange={e => setForm({ ...form, language: e.target.value })}>
              <option value="uz">O'zbekcha</option>
              <option value="ru">Русский</option>
            </Select>
          </Field>
        </div>
        <div className="flex items-center gap-3 mt-5">
          <Button onClick={save} disabled={saving}>
            {saved ? <><Check className="h-4 w-4" /> {t('prf.saved')}</> : t('save')}
          </Button>
          {user.role !== 'admin' && form.account_type && (
            <Button variant="outline" onClick={switchRole} disabled={saving}>
              <ArrowLeftRight className="h-4 w-4" />
              {form.account_type === 'employer' ? <span className="inline-flex items-center gap-1"><Briefcase className="h-4 w-4" /> {t('worker')}</span> : <span className="inline-flex items-center gap-1"><Building2 className="h-4 w-4" /> {t('employer')}</span>}
            </Button>
          )}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{t('prf.changeRoleHint')}</p>
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{t('prf.role')}</span>
          <span className="font-semibold text-foreground">
            {user.role === 'admin' ? t('admin') : (form.account_type === 'employer' ? t('employer') : t('worker'))}
          </span>
        </div>
      </Card>
    </div>
  );
}
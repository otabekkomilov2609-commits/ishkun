import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { useLang } from '@/lib/i18n';
import { base44 } from '@/api/base44Client';
import { Button, Input, Textarea, Select, Field, Card } from '@/components/ui';
import { Building2, Check } from 'lucide-react';

export default function CompanyProfile() {
  const { user } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();
  const [company, setCompany] = useState(undefined);
  const [form, setForm] = useState({ name: '', industry: 'savdo', address: '', description: '', logo: '' });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const comps = await base44.entities.Company.filter({ created_by_id: user.id });
      const c = comps[0];
      setCompany(c || null);
      if (c) setForm({ name: c.name || '', industry: c.industry || 'savdo', address: c.address || '', description: c.description || '', logo: c.logo || '' });
    })();
  }, [user]);

  const save = async () => {
    if (!form.name) return;
    setSaving(true);
    try {
      if (company) {
        await base44.entities.Company.update(company.id, form);
      } else {
        await base44.entities.Company.create(form);
      }
      setSaved(true);
      setTimeout(() => { setSaved(false); navigate('/employer'); }, 900);
    } catch (e) { console.error(e); setSaving(false); }
  };

  if (company === undefined) return null;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-2 mb-5">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground"><Building2 className="h-5 w-5" /></div>
        <h1 className="text-2xl font-display font-bold tracking-tight text-foreground">{company ? t('co.editTitle') : t('co.createTitle')}</h1>
      </div>

      <Card className="p-5">
        <div className="grid grid-cols-1 gap-4">
          <Field label={t('co.name')} required>
            <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Cafe Toshkent" />
          </Field>
          <Field label={t('co.industry')} required>
            <Select value={form.industry} onChange={e => setForm({ ...form, industry: e.target.value })}>
              {['savdo', 'restoran', 'logistika', 'event'].map(i => <option key={i} value={i}>{t(`ind.${i}`)}</option>)}
            </Select>
          </Field>
          <Field label={t('co.address')}>
            <Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Amir Temur ko'chasi 12" />
          </Field>
          <Field label={t('co.logo')}>
            <Input value={form.logo} onChange={e => setForm({ ...form, logo: e.target.value })} placeholder="https://…" />
          </Field>
          <Field label={t('co.description')}>
            <Textarea rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </Field>
        </div>
        <div className="flex gap-3 mt-5">
          <Button onClick={save} disabled={saving || !form.name}>
            {saved ? <><Check className="h-4 w-4" /> {t('co.saved')}</> : t('save')}
          </Button>
          <Button variant="outline" onClick={() => navigate('/employer')}>{t('back')}</Button>
        </div>
      </Card>
    </div>
  );
}
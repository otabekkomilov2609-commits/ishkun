import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { useLang } from '@/lib/i18n';
import { base44 } from '@/api/base44Client';
import { Button, Input, Textarea, Select, Field, Card } from '@/components/ui';
import FileUploadField from '@/components/FileUploadField';
import { Building2, Check, User, Navigation } from 'lucide-react';
import { cn } from '@/lib/utils';

const ENTITY_TYPES = [
  { id: 'legal', icon: Building2, title: 'co.legalEntity', desc: 'co.legalEntityDesc', accent: 'from-indigo-500 to-violet-600' },
  { id: 'individual', icon: User, title: 'co.individualEntity', desc: 'co.individualEntityDesc', accent: 'from-emerald-500 to-teal-600' }
];

export default function CompanyProfile() {
  const { user } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();
  const [company, setCompany] = useState(undefined);
  const [form, setForm] = useState({
    name: '', industry: 'savdo', address: '', description: '', logo: '',
    entity_type: '', stir: '', certificate: '', phone_number: '', map_link: ''
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const comps = await base44.entities.Company.filter({ created_by_id: user.id });
      const c = comps[0];
      setCompany(c || null);
      if (c) setForm({
        name: c.name || '', industry: c.industry || 'savdo', address: c.address || '',
        description: c.description || '', logo: c.logo || '',
        entity_type: c.entity_type || '', stir: c.stir || '', certificate: c.certificate || '',
        phone_number: c.phone_number || '', map_link: c.map_link || ''
      });
    })();
  }, [user]);

  const isNew = company === null;
  const isLegal = form.entity_type === 'legal';
  const mapPickUrl = `https://yandex.com/maps/?text=${encodeURIComponent(form.address || user?.city || '')}`;

  const save = async () => {
    if (!form.name) return;
    if (isNew && !form.entity_type) return;
    if (!form.phone_number) return;
    if (isLegal && (!form.stir || !form.certificate)) return;
    setSaving(true);
    try {
      const payload = { ...form };
      if (company) {
        // entity_type is locked after first creation
        delete payload.entity_type;
        await base44.entities.Company.update(company.id, payload);
      } else {
        await base44.entities.Company.create(payload);
      }
      setSaved(true);
      setTimeout(() => { setSaved(false); navigate('/employer'); }, 900);
    } catch (e) { console.error(e); setSaving(false); }
  };

  if (company === undefined) return null;

  const canSubmit = form.name && (!isNew || form.entity_type) && form.phone_number && (!isLegal || (form.stir && form.certificate));

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-2 mb-5">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground"><Building2 className="h-5 w-5" /></div>
        <h1 className="text-2xl font-display font-bold tracking-tight text-foreground">{company ? t('co.editTitle') : t('co.createTitle')}</h1>
      </div>

      <Card className="p-5">
        <div className="grid grid-cols-1 gap-4">
          {isNew ? (
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">{t('co.entityType')} <span className="text-destructive">*</span></label>
              <div className="grid grid-cols-1 gap-3">
                {ENTITY_TYPES.map(r => {
                  const Icon = r.icon;
                  const active = form.entity_type === r.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setForm({ ...form, entity_type: r.id })}
                      className={cn(
                        'relative flex items-start gap-4 rounded-2xl border-2 p-4 text-left transition-all',
                        active ? 'border-primary bg-primary/5 shadow-sm' : 'border-border bg-card hover:border-primary/40'
                      )}
                    >
                      <div className={cn('grid h-12 w-12 flex-shrink-0 place-items-center rounded-xl bg-gradient-to-br text-white shadow-sm', r.accent)}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-foreground">{t(r.title)}</div>
                        <p className="text-sm text-muted-foreground mt-0.5 leading-snug">{t(r.desc)}</p>
                      </div>
                      {active && (
                        <div className="grid h-6 w-6 place-items-center rounded-full bg-primary text-primary-foreground">
                          <Check className="h-4 w-4" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="rounded-xl bg-muted/40 px-4 py-3 text-sm">
              <span className="text-muted-foreground">{t('co.entityType')}: </span>
              <span className="font-semibold text-foreground">
                {form.entity_type === 'legal' ? t('co.legalEntity') : form.entity_type === 'individual' ? t('co.individualEntity') : '—'}
              </span>
            </div>
          )}

          <Field label={t('co.name')} required>
            <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Cafe Toshkent" />
          </Field>
          <Field label={t('co.industry')} required>
            <Select value={form.industry} onChange={e => setForm({ ...form, industry: e.target.value })}>
              {['savdo', 'restoran', 'logistika', 'event'].map(i => <option key={i} value={i}>{t(`ind.${i}`)}</option>)}
            </Select>
          </Field>
          <Field label={t('co.phoneNumber')} required>
            <Input value={form.phone_number} onChange={e => setForm({ ...form, phone_number: e.target.value })} placeholder="+998 90 123 45 67" />
          </Field>

          {isLegal && (
            <>
              <Field label={t('co.stir')} required hint={t('co.stirHint')}>
                <Input value={form.stir} onChange={e => setForm({ ...form, stir: e.target.value.replace(/\D/g, '').slice(0, 9) })} placeholder="123456789" />
              </Field>
              <FileUploadField label={t('co.certificate')} value={form.certificate} onChange={v => setForm({ ...form, certificate: v })} />
            </>
          )}

          {form.entity_type === 'individual' && (
            <div className="rounded-xl bg-muted/40 px-4 py-3 text-sm text-muted-foreground">{t('co.individualHint')}</div>
          )}

          <Field label={t('co.address')}>
            <Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Amir Temur ko'chasi 12" />
          </Field>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-semibold text-foreground">{t('co.mapLink')}</label>
              <a href={mapPickUrl} target="_blank" rel="noreferrer">
                <Button type="button" variant="soft" size="sm"><Navigation className="h-4 w-4" /> {t('co.mapPickBtn')}</Button>
              </a>
            </div>
            <p className="text-xs text-muted-foreground mb-2">{t('co.mapHint')}</p>
            <Input value={form.map_link} onChange={e => setForm({ ...form, map_link: e.target.value })} placeholder="https://yandex.com/maps/..." />
          </div>

          <Field label={t('co.logo')}>
            <Input value={form.logo} onChange={e => setForm({ ...form, logo: e.target.value })} placeholder="https://…" />
          </Field>
          <Field label={t('co.description')}>
            <Textarea rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </Field>
        </div>
        <div className="flex gap-3 mt-5">
          <Button onClick={save} disabled={saving || !canSubmit}>
            {saved ? <><Check className="h-4 w-4" /> {t('co.saved')}</> : t('save')}
          </Button>
          <Button variant="outline" onClick={() => navigate('/employer')}>{t('back')}</Button>
        </div>
      </Card>
    </div>
  );
}
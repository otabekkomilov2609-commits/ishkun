import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { useLang } from '@/lib/i18n';
import { base44 } from '@/api/base44Client';
import { Button, Input, Select, Field, Card } from '@/components/ui';
import { isValidUzPhone, formatUzPhoneInput } from '@/lib/format';
import { Building2, Check, Star } from 'lucide-react';
import { StarsDisplay } from '@/components/RatingStars';

export default function LegalCompanyProfile() {
  const { user } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();
  const [company, setCompany] = useState(undefined);
  const [form, setForm] = useState({ name: '', industry: 'savdo', phone_number: '' });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    (async () => {
      const comps = await base44.entities.Company.filter({ created_by_id: user.id });
      const c = comps[0];
      if (c && c.entity_type === 'individual') {
        navigate('/employer/company/individual', { replace: true });
        return;
      }
      setCompany(c || null);
      if (c) setForm({ name: c.name || '', industry: c.industry || 'savdo', phone_number: c.phone_number || '' });
    })();
  }, [user, navigate]);

  const save = async () => {
    setError('');
    if (!form.name) return;
    if (!form.phone_number) return;
    if (!isValidUzPhone(form.phone_number)) { setError(t('co.phoneFormatError')); return; }
    setSaving(true);
    try {
      const payload = { name: form.name, industry: form.industry, phone_number: form.phone_number, entity_type: 'legal' };
      if (company) {
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

  const canSubmit = form.name && form.phone_number && isValidUzPhone(form.phone_number);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-2 mb-5">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground"><Building2 className="h-5 w-5" /></div>
        <h1 className="text-2xl font-display font-bold tracking-tight text-foreground">{company ? t('co.editTitle') : t('co.createTitle')}</h1>
      </div>

      {company && (
        <Card className="p-4 mb-4 flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-amber-50 text-amber-500">
            <Star className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-foreground">{t('prf.companyRating')}</p>
            {company.rating_count > 0 ? (
              <div className="mt-0.5"><StarsDisplay avg={company.rating_avg} count={company.rating_count} size="md" /></div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">{t('prf.notRatedYet')}</p>
                <p className="text-xs text-muted-foreground/70">{t('prf.companyNotRatedHint')}</p>
              </>
            )}
          </div>
        </Card>
      )}

      <Card className="p-5">
        {error && <div className="mb-3 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}
        <div className="grid grid-cols-1 gap-4">
          <Field label={t('co.name')} required>
            <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Cafe Toshkent" />
          </Field>
          <Field label={t('co.industry')} required>
            <Select value={form.industry} onChange={e => setForm({ ...form, industry: e.target.value })}>
              {['savdo', 'restoran', 'logistika', 'event'].map(i => <option key={i} value={i}>{t(`ind.${i}`)}</option>)}
            </Select>
          </Field>
          <Field label={t('co.phoneNumber')} required>
            <Input value={form.phone_number} onChange={e => setForm({ ...form, phone_number: formatUzPhoneInput(e.target.value) })} placeholder="+998 90 123 45 67" />
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
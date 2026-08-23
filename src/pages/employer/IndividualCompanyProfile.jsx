import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { useLang } from '@/lib/i18n';
import { base44 } from '@/api/base44Client';
import { Button, Input, Field, Card } from '@/components/ui';
import { isValidUzPhone, formatUzPhoneInput } from '@/lib/format';
import { User, Check } from 'lucide-react';

export default function IndividualCompanyProfile() {
  const { user } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();
  const [company, setCompany] = useState(undefined);
  const [form, setForm] = useState({ name: '', phone_number: '' });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    (async () => {
      const comps = await base44.entities.Company.filter({ created_by_id: user.id });
      const c = comps[0];
      if (c && c.entity_type === 'legal') {
        navigate('/employer/company/legal', { replace: true });
        return;
      }
      setCompany(c || null);
      if (c) setForm({ name: c.name || '', phone_number: c.phone_number || '' });
    })();
  }, [user, navigate]);

  const save = async () => {
    setError('');
    if (!form.name) return;
    if (!form.phone_number) return;
    if (!isValidUzPhone(form.phone_number)) { setError(t('co.phoneFormatError')); return; }
    setSaving(true);
    try {
      const payload = { name: form.name, phone_number: form.phone_number, entity_type: 'individual', industry: 'savdo' };
      if (company) {
        delete payload.entity_type;
        delete payload.industry;
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
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground"><User className="h-5 w-5" /></div>
        <h1 className="text-2xl font-display font-bold tracking-tight text-foreground">{company ? t('co.editTitle') : t('co.createTitle')}</h1>
      </div>

      <Card className="p-5">
        {error && <div className="mb-3 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}
        <div className="grid grid-cols-1 gap-4">
          <Field label={t('co.indivNameLabel')} required>
            <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Aziz Karimov" />
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
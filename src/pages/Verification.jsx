import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useLang } from '@/lib/i18n';
import { base44 } from '@/api/base44Client';
import { Button, Input, Field, Card, Skeleton } from '@/components/ui';
import FileUploadField from '@/components/FileUploadField';
import { ShieldCheck, AlertCircle, CheckCircle2, Clock } from 'lucide-react';

export default function Verification() {
  const { user, checkUserAuth } = useAuth();
  const { t } = useLang();
  const [form, setForm] = useState({
    phone_number: '', jshshir: '', date_of_birth: '', address: '',
    passport_front: '', passport_back: '',
    bank_card_number: '', self_employed: false, self_employed_cert: ''
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      setForm(f => ({
        ...f,
        phone_number: user.phone_number || '',
        jshshir: user.jshshir || '', date_of_birth: user.date_of_birth || '', address: user.address || '',
        passport_front: user.passport_front || '', passport_back: user.passport_back || '',
        bank_card_number: user.bank_card_number || '', self_employed: user.self_employed || false,
        self_employed_cert: user.self_employed_cert || ''
      }));
    }
  }, [user]);

  const status = user?.verification_status || 'pending';

  const submit = async () => {
    setError('');
    if (!/^\d{14}$/.test(form.jshshir)) { setError(t('kyc.jshshirError')); return; }
    if (!form.phone_number.trim() || !form.date_of_birth || !form.address.trim()) { setError(t('kyc.requiredError')); return; }
    if (!form.passport_front || !form.passport_back) { setError(t('kyc.docsError')); return; }
    if (!form.bank_card_number || form.bank_card_number.replace(/\s/g, '').length < 16) { setError(t('kyc.cardError')); return; }
    setSaving(true);
    try {
      await base44.auth.updateMe({
        phone_number: form.phone_number,
        jshshir: form.jshshir,
        date_of_birth: form.date_of_birth,
        address: form.address,
        passport_front: form.passport_front,
        passport_back: form.passport_back,
        bank_card_number: form.bank_card_number,
        self_employed: form.self_employed,
        self_employed_cert: form.self_employed ? form.self_employed_cert : '',
        verification_status: 'submitted',
        verification_note: ''
      });
      await checkUserAuth();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) { setError(e.message || t('kyc.submitError')); }
    setSaving(false);
  };

  if (!user) return <div className="max-w-2xl mx-auto"><Skeleton className="h-64 w-full" /></div>;

  const isVerified = status === 'verified';
  const isSubmitted = status === 'submitted';
  const isRejected = status === 'rejected';

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-2 mb-5">
        <ShieldCheck className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-display font-bold tracking-tight text-primary">{t('kyc.title')}</h1>
      </div>

      <Card className="p-4 mb-4">
        {isVerified ? (
          <div className="flex items-center gap-3 text-emerald-700">
            <CheckCircle2 className="h-5 w-5" /><span className="font-semibold">{t('kyc.verified')}</span>
          </div>
        ) : isSubmitted ? (
          <div className="flex items-center gap-3 text-amber-700">
            <Clock className="h-5 w-5" /><span className="font-semibold">{t('kyc.submitted')}</span>
          </div>
        ) : isRejected ? (
          <div className="flex items-start gap-3 text-rose-700">
            <AlertCircle className="h-5 w-5 mt-0.5" />
            <div>
              <p className="font-semibold">{t('kyc.rejected')}</p>
              {user.verification_note && <p className="text-sm mt-0.5">{user.verification_note}</p>}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 text-muted-foreground">
            <Clock className="h-5 w-5" /><span className="font-semibold">{t('kyc.pending')}</span>
          </div>
        )}
      </Card>

      {isVerified ? (
        <Card className="p-5 text-sm text-muted-foreground">{t('kyc.verifiedMsg')}</Card>
      ) : (
        <div className="space-y-4">
          {error && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}

          <Card className="p-5 space-y-4">
            <h2 className="font-display font-bold text-foreground">{t('kyc.personalInfo')}</h2>
            <Field label={t('kyc.phone')} required hint={t('kyc.phoneHint')}>
              <Input value={form.phone_number} onChange={e => setForm({ ...form, phone_number: e.target.value })} placeholder="+998 90 123 45 67" />
            </Field>
            <Field label={t('kyc.jshshir')} required hint={t('kyc.jshshirHint')}>
              <Input value={form.jshshir} onChange={e => setForm({ ...form, jshshir: e.target.value.replace(/\D/g, '').slice(0, 14) })} placeholder="12345678901234" />
            </Field>
            <Field label={t('kyc.dob')} required>
              <Input type="date" value={form.date_of_birth} onChange={e => setForm({ ...form, date_of_birth: e.target.value })} />
            </Field>
            <Field label={t('kyc.address')} required>
              <Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder={t('kyc.addressPh')} />
            </Field>
          </Card>

          <Card className="p-5 space-y-4">
            <h2 className="font-display font-bold text-foreground">{t('kyc.documents')}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FileUploadField label={t('kyc.passportFront')} value={form.passport_front} onChange={v => setForm({ ...form, passport_front: v })} />
              <FileUploadField label={t('kyc.passportBack')} value={form.passport_back} onChange={v => setForm({ ...form, passport_back: v })} />
            </div>
            <p className="text-sm text-muted-foreground">{t('kyc.passportHint')}</p>
          </Card>

          <Card className="p-5 space-y-4">
            <h2 className="font-display font-bold text-foreground">{t('kyc.financial')}</h2>
            <Field label={t('kyc.bankCard')} required hint={t('kyc.bankCardHint')}>
              <Input value={form.bank_card_number} onChange={e => setForm({ ...form, bank_card_number: e.target.value })} placeholder="8600 1234 5678 9012" />
            </Field>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.self_employed} onChange={e => setForm({ ...form, self_employed: e.target.checked })} className="h-4 w-4 rounded border-border" />
              <span className="text-sm font-medium text-foreground">{t('kyc.selfEmployed')}</span>
            </label>
            {form.self_employed && (
              <FileUploadField label={t('kyc.selfEmployedCert')} value={form.self_employed_cert} onChange={v => setForm({ ...form, self_employed_cert: v })} />
            )}
          </Card>

          <Button onClick={submit} disabled={saving} className="w-full">
            {saved ? <><CheckCircle2 className="h-4 w-4" /> {t('kyc.submitted')}</> : t('kyc.submit')}
          </Button>
        </div>
      )}
    </div>
  );
}
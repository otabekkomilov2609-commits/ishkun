import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { useLang } from '@/lib/i18n';
import { base44 } from '@/api/base44Client';
import { CITIES, isValidUzPhone, formatUzPhoneInput } from '@/lib/format';
import { Button, Select, Input } from '@/components/ui';
import Brand from '@/components/Brand';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { Briefcase, Building2, MapPin, ArrowRight, ArrowLeft, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Onboarding() {
  const { user, checkUserAuth } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [type, setType] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [city, setCity] = useState(user?.city || '');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const finish = async () => {
    setError('');
    if (!type || !city || !phone || !dob || !firstName.trim() || !lastName.trim()) return;
    if (firstName.trim().length < 2 || lastName.trim().length < 2) { setError(t('onb.nameError')); return; }
    if (!isValidUzPhone(phone)) { setError(t('kyc.phoneFormatError')); return; }
    {
      const d = new Date(dob);
      const today = new Date();
      let age = today.getFullYear() - d.getFullYear();
      const m = today.getMonth() - d.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
      if (age < 18) { setError(t('kyc.ageError')); return; }
    }
    setSaving(true);
    try {
      await base44.functions.invoke('updateMyProfile', { account_type: type, full_name: `${firstName.trim()} ${lastName.trim()}`, city, phone_number: phone, date_of_birth: dob, onboarded: true });
      await checkUserAuth();
      navigate(type === 'employer' ? '/employer/company' : '/worker');
    } catch (e) {
      setError(e?.message || t('errUpdate'));
      setSaving(false);
    }
  };

  const roles = [
    { id: 'worker', icon: Briefcase, title: t('worker'), desc: t('onb.workerDesc'), accent: 'from-emerald-500 to-teal-600' },
    { id: 'employer', icon: Building2, title: t('employer'), desc: t('onb.employerDesc'), accent: 'from-indigo-500 to-violet-600' }
  ];

  const RoleIcon = type === 'employer' ? Building2 : Briefcase;

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 via-background to-background flex flex-col">
      <header className="flex items-center justify-between px-5 h-16">
        <Brand />
        <LanguageSwitcher />
      </header>
      <div className="flex-1 flex items-center justify-center px-5 py-8">
        <div className="w-full max-w-md">
          <div className="flex gap-1.5 mb-6">
            <div className="flex-1 h-1 rounded-full bg-primary" />
            <div className={cn('flex-1 h-1 rounded-full', step === 2 ? 'bg-primary' : 'bg-border')} />
          </div>

          {step === 1 && (
            <>
              <div className="text-center mb-8">
                <h1 className="text-3xl font-display font-extrabold tracking-tight text-foreground">{t('onb.title')}</h1>
                <p className="text-muted-foreground mt-2">{t('onb.subtitle')}</p>
              </div>

              <div className="grid grid-cols-1 gap-3 mb-6">
                {roles.map(r => {
                  const Icon = r.icon;
                  const active = type === r.id;
                  return (
                    <button
                      key={r.id}
                      onClick={() => setType(r.id)}
                      className={cn(
                        'relative flex items-start gap-4 rounded-2xl border-2 p-4 text-left transition-all',
                        active ? 'border-primary bg-primary/5 shadow-sm' : 'border-border bg-card hover:border-primary/40'
                      )}
                    >
                      <div className={cn('grid h-12 w-12 flex-shrink-0 place-items-center rounded-xl bg-gradient-to-br text-white shadow-sm', r.accent)}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-foreground">{r.title}</div>
                        <p className="text-sm text-muted-foreground mt-0.5 leading-snug">{r.desc}</p>
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

              <Button size="lg" className="w-full" disabled={!type} onClick={() => setStep(2)}>
                {t('onb.continueBtn')} <ArrowRight className="h-4 w-4" />
              </Button>
            </>
          )}

          {step === 2 && (
            <>
              <button
                onClick={() => { setError(''); setStep(1); }}
                className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors mb-4"
                aria-label={t('back')}
              >
                <ArrowLeft className="h-5 w-5" />
              </button>

              <div className="mb-8">
                <h1 className="text-3xl font-display font-extrabold tracking-tight text-foreground">{t('onb.aboutTitle')}</h1>
                <p className="text-muted-foreground mt-2">{t('onb.aboutSubtitle')}</p>
                <div className="inline-flex items-center gap-1.5 mt-3 rounded-full bg-primary/10 text-primary px-3 py-1.5 text-xs font-semibold">
                  <RoleIcon className="h-3.5 w-3.5" />
                  {t(type === 'employer' ? 'onb.asEmployer' : 'onb.asWorker')}
                </div>
              </div>

              <div className="mb-6 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-1.5">{t('onb.firstName')}</label>
                    <Input value={firstName} onChange={e => setFirstName(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-1.5">{t('onb.lastName')}</label>
                    <Input value={lastName} onChange={e => setLastName(e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">{t('kyc.phone')}</label>
                  <Input value={phone} onChange={e => setPhone(formatUzPhoneInput(e.target.value))} placeholder="+998 90 123 45 67" inputMode="tel" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">{t('kyc.dob')}</label>
                  <Input type="date" value={dob} onChange={e => setDob(e.target.value)} />
                </div>
              </div>

              <div className="mb-6">
                <label className="flex items-center gap-1.5 text-sm font-semibold text-foreground mb-2">
                  <MapPin className="h-4 w-4 text-primary" /> {t('onb.chooseCity')}
                </label>
                <Select value={city} onChange={(e) => setCity(e.target.value)}>
                  <option value="" disabled>{t('allCities')}</option>
                  {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                </Select>
                <p className="mt-1.5 text-xs text-muted-foreground">{t('onb.cityHint')}</p>
              </div>

              {error && <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}

              <Button size="lg" className="w-full" disabled={!city || !phone || !dob || !firstName.trim() || !lastName.trim() || saving} onClick={finish}>
                {t('confirm')} <ArrowRight className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

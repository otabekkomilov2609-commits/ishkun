import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { useLang } from '@/lib/i18n';
import { base44 } from '@/api/base44Client';
import { CITIES } from '@/lib/format';
import { Button, Select } from '@/components/ui';
import Brand from '@/components/Brand';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { Briefcase, Building2, MapPin, ArrowRight, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Onboarding() {
  const { user, checkUserAuth } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();
  const [type, setType] = useState('');
  const [city, setCity] = useState(user?.city || '');
  const [saving, setSaving] = useState(false);

  const finish = async () => {
    if (!type || !city) return;
    setSaving(true);
    try {
      await base44.functions.invoke('updateMyProfile', { account_type: type, city, onboarded: true });
      await checkUserAuth();
      navigate(type === 'employer' ? '/employer' : '/worker');
    } catch (e) {
      console.error(e);
      setSaving(false);
    }
  };

  const roles = [
    { id: 'worker', icon: Briefcase, title: t('worker'), desc: t('onb.workerDesc'), accent: 'from-emerald-500 to-teal-600' },
    { id: 'employer', icon: Building2, title: t('employer'), desc: t('onb.employerDesc'), accent: 'from-indigo-500 to-violet-600' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 via-background to-background flex flex-col">
      <header className="flex items-center justify-between px-5 h-16">
        <Brand />
        <LanguageSwitcher />
      </header>
      <div className="flex-1 flex items-center justify-center px-5 py-8">
        <div className="w-full max-w-md">
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

          <Button size="lg" className="w-full" disabled={!type || !city || saving} onClick={finish}>
            {t('confirm')} <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
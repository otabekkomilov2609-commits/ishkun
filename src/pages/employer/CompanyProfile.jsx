import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { useLang } from '@/lib/i18n';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui';
import { Building2, Check, User, ArrowRight } from 'lucide-react';
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
  const [selected, setSelected] = useState('');

  useEffect(() => {
    if (!user) return;
    (async () => {
      const comps = await base44.entities.Company.filter({ created_by_id: user.id });
      const c = comps[0];
      setCompany(c || null);
      if (c) {
        navigate(c.entity_type === 'individual' ? '/employer/company/individual' : '/employer/company/legal', { replace: true });
      }
    })();
  }, [user, navigate]);

  if (company === undefined || company) return null;

  const confirm = () => {
    if (!selected) return;
    navigate(selected === 'individual' ? '/employer/company/individual' : '/employer/company/legal');
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-2 mb-5">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground"><Building2 className="h-5 w-5" /></div>
        <h1 className="text-2xl font-display font-bold tracking-tight text-foreground">{t('co.chooseTypeTitle')}</h1>
      </div>

      <p className="text-sm text-muted-foreground mb-5">{t('co.chooseTypeSubtitle')}</p>

      <div className="grid grid-cols-1 gap-3 mb-6">
        {ENTITY_TYPES.map(r => {
          const Icon = r.icon;
          const active = selected === r.id;
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => setSelected(r.id)}
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

      <Button size="lg" className="w-full" disabled={!selected} onClick={confirm}>
        {t('co.continueBtn')} <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
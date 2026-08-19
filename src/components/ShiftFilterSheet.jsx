import React, { useState, useMemo, useEffect } from 'react';
import { useLang } from '@/lib/i18n';
import { Button } from '@/components/ui';
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter
} from '@/components/ui/drawer';
import { cn } from '@/lib/utils';
import { Filter as FilterIcon, X } from 'lucide-react';

export const SKILL_OPTIONS = ['warehouse', 'waiter', 'cashier', 'courier', 'promoter', 'event_staff', 'cleaner'];

function Pill({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full px-3.5 py-2 text-sm font-medium transition-colors border',
        active
          ? 'bg-primary text-primary-foreground border-primary'
          : 'bg-card text-foreground border-border hover:bg-muted'
      )}
    >
      {children}
    </button>
  );
}

export default function ShiftFilterSheet({ open, onOpenChange, companies, onApply, countFor, initialFilters }) {
  const { t } = useLang();
  const [dateOption, setDateOption] = useState(initialFilters?.dateOption || null); // 'today' | 'tomorrow' | 'custom' | null
  const [dateFrom, setDateFrom] = useState(initialFilters?.dateFrom || '');
  const [dateTo, setDateTo] = useState(initialFilters?.dateTo || '');
  const [skills, setSkills] = useState(initialFilters?.skills || []);
  const [selectedCompanies, setSelectedCompanies] = useState(initialFilters?.companies || []);

  // Sync when sheet opens
  useEffect(() => {
    if (open) {
      setDateOption(initialFilters?.dateOption || null);
      setDateFrom(initialFilters?.dateFrom || '');
      setDateTo(initialFilters?.dateTo || '');
      setSkills(initialFilters?.skills || []);
      setSelectedCompanies(initialFilters?.companies || []);
    }
  }, [open]);

  const toggle = (list, setList, val) => {
    setList(list.includes(val) ? list.filter(x => x !== val) : [...list, val]);
  };

  const reset = () => {
    setDateOption(null);
    setDateFrom('');
    setDateTo('');
    setSkills([]);
    setSelectedCompanies([]);
  };

  const buildFilters = () => ({
    dateOption,
    dateFrom: dateOption === 'custom' ? dateFrom : '',
    dateTo: dateOption === 'custom' ? dateTo : '',
    skills,
    companies: selectedCompanies
  });

  const draftFilters = { dateOption, dateFrom: dateOption === 'custom' ? dateFrom : '', dateTo: dateOption === 'custom' ? dateTo : '', skills, companies: selectedCompanies };

  const previewCount = useMemo(() => {
    if (typeof countFor !== 'function') return null;
    return countFor(draftFilters);
  }, [draftFilters, countFor]);

  const apply = () => {
    onApply(buildFilters());
    onOpenChange(false);
  };

  const hasAny = dateOption || dateFrom || dateTo || skills.length || selectedCompanies.length;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[88vh]">
        <DrawerHeader className="pb-2">
          <DrawerTitle className="flex items-center gap-2 text-left">
            <FilterIcon className="h-5 w-5 text-primary" />
            {t('filter.title')}
          </DrawerTitle>
        </DrawerHeader>

        <div className="px-4 pb-2 overflow-y-auto">
          {/* SANA */}
          <section className="py-3 border-b border-border">
            <h3 className="text-xs font-bold tracking-wider text-muted-foreground mb-3">{t('filter.date')}</h3>
            <div className="flex flex-wrap gap-2">
              <Pill active={dateOption === 'today'} onClick={() => setDateOption(dateOption === 'today' ? null : 'today')}>{t('filter.today')}</Pill>
              <Pill active={dateOption === 'tomorrow'} onClick={() => setDateOption(dateOption === 'tomorrow' ? null : 'tomorrow')}>{t('filter.tomorrow')}</Pill>
              <Pill active={dateOption === 'custom'} onClick={() => setDateOption(dateOption === 'custom' ? null : 'custom')}>{t('filter.customRange')}</Pill>
            </div>
            {dateOption === 'custom' && (
              <div className="grid grid-cols-2 gap-2 mt-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">{t('filter.dateFrom')}</label>
                  <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-11 w-full rounded-xl border border-input bg-card px-3 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">{t('filter.dateTo')}</label>
                  <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-11 w-full rounded-xl border border-input bg-card px-3 text-sm" />
                </div>
              </div>
            )}
          </section>

          {/* LAVOZIM TURI */}
          <section className="py-3 border-b border-border">
            <h3 className="text-xs font-bold tracking-wider text-muted-foreground mb-3">{t('filter.skill')}</h3>
            <div className="flex flex-wrap gap-2">
              {SKILL_OPTIONS.map(s => (
                <Pill key={s} active={skills.includes(s)} onClick={() => toggle(skills, setSkills, s)}>
                  {t(`skill.${s}`)}
                </Pill>
              ))}
            </div>
          </section>

          {/* KOMPANIYA */}
          <section className="py-3">
            <h3 className="text-xs font-bold tracking-wider text-muted-foreground mb-3">{t('filter.company')}</h3>
            {companies.length === 0 ? (
              <p className="text-sm text-muted-foreground">—</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {companies.map(c => (
                  <Pill key={c} active={selectedCompanies.includes(c)} onClick={() => toggle(selectedCompanies, setSelectedCompanies, c)}>
                    {c}
                  </Pill>
                ))}
              </div>
            )}
          </section>
        </div>

        <DrawerFooter className="flex-row gap-2 border-t border-border bg-background">
          <Button variant="outline" onClick={reset} disabled={!hasAny} className="flex-1">
            <X className="h-4 w-4" /> {t('filter.reset')}
          </Button>
          <Button onClick={apply} className="flex-[2]">
            {t('filter.showResults').replace('{n}', previewCount != null ? previewCount : '')}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
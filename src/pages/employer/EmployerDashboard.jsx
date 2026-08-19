import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { useLang } from '@/lib/i18n';
import { base44 } from '@/api/base44Client';
import { Button, Card, Skeleton } from '@/components/ui';
import ShiftCard from '@/components/ShiftCard';
import EmptyState from '@/components/EmptyState';
import { PlusCircle, Building2, CalendarDays, ClipboardList, CheckCircle2 } from 'lucide-react';

export default function EmployerDashboard() {
  const { user } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();

  const companyQ = useQuery({
    queryKey: ['myCompany', user?.id],
    queryFn: async () => {
      const comps = await base44.entities.Company.filter({ created_by_id: user.id });
      return comps[0] || null;
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  const shiftsQ = useQuery({
    queryKey: ['myShifts', user?.id],
    queryFn: () => base44.entities.Shift.filter({ created_by_id: user.id }, '-created_date', 50),
    enabled: !!user,
    staleTime: 60_000,
  });

  const shifts = shiftsQ.data;
  const hasShifts = (shifts?.length || 0) > 0;

  const appsQ = useQuery({
    queryKey: ['employerApps', user?.id],
    queryFn: () => base44.entities.Application.filter({ employer_id: user.id }, '-created_date', 200),
    enabled: !!user && hasShifts,
    staleTime: 30_000,
  });

  const company = companyQ.data;
  const apps = appsQ.data || [];

  const activeShifts = useMemo(() => (shifts || []).filter(s => s.status !== 'completed' && s.moderation !== 'blocked').length, [shifts]);
  const approvedApps = useMemo(() => apps.filter(a => a.status === 'approved').length, [apps]);

  const stats = [
    { key: 'activeShifts', icon: CalendarDays, value: activeShifts, color: 'text-emerald-600 bg-emerald-50' },
    { key: 'totalApps', icon: ClipboardList, value: apps.length, color: 'text-blue-600 bg-blue-50' },
    { key: 'approved', icon: CheckCircle2, value: approvedApps, color: 'text-violet-600 bg-violet-50' }
  ];

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-5">
        <h1 className="text-2xl font-display font-bold tracking-tight text-foreground">{t('emp.welcome')}, {user?.full_name?.split(' ')[0] || ''} 👋</h1>
      </div>

      {companyQ.isLoading ? (
        <Skeleton className="h-24 w-full mb-5" />
      ) : company === null && (
        <Card className="p-6 mb-5 border-primary/30 bg-primary/5">
          <div className="flex items-start gap-4">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary text-primary-foreground flex-shrink-0"><Building2 className="h-6 w-6" /></div>
            <div className="flex-1">
              <h2 className="font-semibold text-foreground">{t('emp.companyNeeded')}</h2>
              <p className="text-sm text-muted-foreground mt-1">{t('emp.companyNeededHint')}</p>
            </div>
            <Button onClick={() => navigate('/employer/company')}><Building2 className="h-4 w-4" /> {t('emp.createCompany')}</Button>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-3 gap-3 mb-6">
        {stats.map(c => {
          const Icon = c.icon;
          return (
            <Card key={c.key} className="p-4">
              <div className={`grid h-9 w-9 place-items-center rounded-xl mb-2 ${c.color}`}><Icon className="h-5 w-5" /></div>
              <div className="text-2xl font-display font-bold text-foreground">{shiftsQ.isLoading ? <Skeleton className="h-7 w-8" /> : c.value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{t(`emp.${c.key}`)}</div>
            </Card>
          );
        })}
      </div>

      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display font-bold text-lg text-foreground">{t('emp.recentShifts')}</h2>
        {company && <Button size="sm" onClick={() => navigate('/employer/shifts/new')}><PlusCircle className="h-4 w-4" /> {t('nav.newShift')}</Button>}
      </div>

      {shiftsQ.isLoading ? (
        <div className="space-y-3">{[0,1].map(i => <Skeleton key={i} className="h-28 w-full" />)}</div>
      ) : !shifts || shifts.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title={t('emp.noShifts')}
          description={t('emp.createFirstHint')}
          action={company ? <Button onClick={() => navigate('/employer/shifts/new')}><PlusCircle className="h-4 w-4" /> {t('emp.createFirst')}</Button> : null}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {shifts.slice(0, 6).map(s => {
            const count = apps.filter(a => a.shift_id === s.id).length;
            return (
              <div key={s.id} className="relative">
                <ShiftCard shift={s} to={`/employer/shifts/${s.id}`} showStatus statusLabel={t(`shift.${s.status}`)} />
                {count > 0 && (
                  <span className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-primary text-primary-foreground text-xs font-semibold px-2 py-0.5">
                    <ClipboardList className="h-3 w-3" /> {count}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
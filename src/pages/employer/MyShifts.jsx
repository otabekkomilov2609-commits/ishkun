import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { useLang } from '@/lib/i18n';
import { base44 } from '@/api/base44Client';
import { Button, Card, Skeleton } from '@/components/ui';
import ShiftCard from '@/components/ShiftCard';
import EmptyState from '@/components/EmptyState';
import TabsNav from '@/components/TabsNav';
import PullToRefresh from '@/components/PullToRefresh';
import AttendanceReminderSection from '@/components/AttendanceReminderSection';
import { PlusCircle, CalendarDays, ClipboardList, Building2 } from 'lucide-react';
import { isShiftClosed, shiftStatusKey } from '@/lib/shiftTime';

export default function MyShifts() {
  const { user } = useAuth();
  const { t, tp } = useLang();
  const navigate = useNavigate();
  const [tab, setTab] = useState('active');

  const shiftsQ = useQuery({
    queryKey: ['myShifts', user?.id],
    queryFn: () => base44.entities.Shift.filter({ created_by_id: user.id }, '-created_date', 100),
    enabled: !!user,
    staleTime: 60_000,
  });

  const shifts = shiftsQ.data;
  const hasShifts = (shifts?.length || 0) > 0;

  const appsQ = useQuery({
    queryKey: ['employerApps', user?.id],
    queryFn: () => base44.entities.Application.filter({ employer_id: user.id }, '-created_date', 300),
    enabled: !!user && hasShifts,
    staleTime: 30_000,
  });

  const apps = appsQ.data || [];

  const companyQ = useQuery({
    queryKey: ['myCompany', user?.id],
    queryFn: async () => {
      const comps = await base44.entities.Company.filter({ created_by_id: user.id });
      return comps[0] || null;
    },
    enabled: !!user,
    staleTime: 60_000,
  });
  const company = companyQ.data;

  const refresh = async () => {
    await Promise.all([shiftsQ.refetch(), appsQ.refetch()]);
  };

  // A shift leaves the active tab once its end time has passed, whether or not
  // its stored status was ever moved off 'open'.
  const notCancelled = (shifts || []).filter(s => s.status !== 'cancelled');
  const activeShifts = notCancelled.filter(s => !isShiftClosed(s));
  const upcoming = [...activeShifts].sort((a, b) => a.date.localeCompare(b.date));
  const completed = notCancelled.filter(s => isShiftClosed(s)).sort((a, b) => b.date.localeCompare(a.date));
  const cancelled = (shifts || []).filter(s => s.status === 'cancelled').sort((a, b) => b.date.localeCompare(a.date));

  const tabs = [
    { id: 'active', label: t('emp.tabActive'), count: activeShifts.length },
    { id: 'completed', label: t('emp.tabCompleted'), count: completed.length },
    { id: 'cancelled', label: t('emp.tabCancelled'), count: cancelled.length },
  ];

  const renderCard = (s) => {
    const count = apps.filter(a => a.shift_id === s.id && a.status !== 'cancelled' && a.status !== 'rejected').length;
    return (
      <div key={s.id} className="relative">
        <ShiftCard shift={s} to={`/employer/shifts/${s.id}`} showStatus statusLabel={t(shiftStatusKey(s))} />
        {count > 0 && (
          <span className="absolute top-14 right-3 pointer-events-none inline-flex items-center gap-1 rounded-full bg-primary text-primary-foreground text-xs font-semibold px-2 py-0.5">
            <ClipboardList className="h-3 w-3" /> {count} {tp('shift.applicants', count)}
          </span>
        )}
      </div>
    );
  };

  const renderGrid = (list) =>
    list.length === 0 ? (
      <EmptyState icon={CalendarDays} title={t('emp.tabEmpty')} />
    ) : (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {list.map(s => renderCard(s))}
      </div>
    );

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-display font-bold tracking-tight text-foreground">{t('nav.shifts')}</h1>
        {company && <Button size="sm" onClick={() => navigate('/employer/shifts/new')}><PlusCircle className="h-4 w-4" /> {t('nav.newShift')}</Button>}
      </div>

      {!companyQ.isLoading && company === null && (
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

      <AttendanceReminderSection />

      <PullToRefresh onRefresh={refresh}>
        {shiftsQ.isLoading ? (
          <div className="space-y-3">{[0, 1, 2].map(i => <Skeleton key={i} className="h-28 w-full" />)}</div>
        ) : !shifts || shifts.length === 0 ? (
          <EmptyState icon={CalendarDays} title={t('emp.noShifts')} action={company ? <Button onClick={() => navigate('/employer/shifts/new')}><PlusCircle className="h-4 w-4" /> {t('emp.createFirst')}</Button> : null} />
        ) : (
          <>
            <TabsNav tabs={tabs} active={tab} onChange={setTab} className="mb-4" />

            {tab === 'active' && (
              upcoming.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {upcoming.map(s => renderCard(s))}
                </div>
              ) : (
                <EmptyState icon={CalendarDays} title={t('emp.tabEmpty')} />
              )
            )}

            {tab === 'completed' && renderGrid(completed)}

            {tab === 'cancelled' && renderGrid(cancelled)}
          </>
        )}
      </PullToRefresh>
    </div>
  );
}
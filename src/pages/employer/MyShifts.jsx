import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { useLang } from '@/lib/i18n';
import { base44 } from '@/api/base44Client';
import { Button, Skeleton } from '@/components/ui';
import ShiftCard from '@/components/ShiftCard';
import EmptyState from '@/components/EmptyState';
import PullToRefresh from '@/components/PullToRefresh';
import { PlusCircle, CalendarDays, ClipboardList } from 'lucide-react';

export default function MyShifts() {
  const { user } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();

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

  const refresh = async () => {
    await Promise.all([shiftsQ.refetch(), appsQ.refetch()]);
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-display font-bold tracking-tight text-foreground">{t('nav.shifts')}</h1>
        <Button size="sm" onClick={() => navigate('/employer/shifts/new')}><PlusCircle className="h-4 w-4" /> {t('nav.newShift')}</Button>
      </div>

      <PullToRefresh onRefresh={refresh}>
        {shiftsQ.isLoading ? (
          <div className="space-y-3">{[0,1,2].map(i => <Skeleton key={i} className="h-28 w-full" />)}</div>
        ) : !shifts || shifts.length === 0 ? (
          <EmptyState icon={CalendarDays} title={t('emp.noShifts')} action={<Button onClick={() => navigate('/employer/shifts/new')}><PlusCircle className="h-4 w-4" /> {t('emp.createFirst')}</Button>} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {shifts.map(s => {
              const count = apps.filter(a => a.shift_id === s.id).length;
              return (
                <div key={s.id} className="relative">
                  <ShiftCard shift={s} to={`/employer/shifts/${s.id}`} showStatus statusLabel={t(`shift.${s.status}`)} />
                  {count > 0 && (
                    <span className="absolute top-14 right-3 inline-flex items-center gap-1 rounded-full bg-primary text-primary-foreground text-xs font-semibold px-2 py-0.5">
                      <ClipboardList className="h-3 w-3" /> {count} {t('shift.applicants')}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </PullToRefresh>
    </div>
  );
}
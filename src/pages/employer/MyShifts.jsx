import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { useLang } from '@/lib/i18n';
import { base44 } from '@/api/base44Client';
import { Button, Skeleton } from '@/components/ui';
import ShiftCard from '@/components/ShiftCard';
import EmptyState from '@/components/EmptyState';
import { PlusCircle, CalendarDays, ClipboardList } from 'lucide-react';

export default function MyShifts() {
  const { user } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();
  const [shifts, setShifts] = useState(null);
  const [apps, setApps] = useState([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const s = await base44.entities.Shift.filter({ created_by_id: user.id }, '-created_date', 100);
      setShifts(s);
      if (s.length) {
        const a = await base44.entities.Application.filter({ employer_id: user.id }, '-created_date', 300);
        setApps(a);
      }
    })();
  }, [user]);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-display font-bold tracking-tight text-foreground">{t('nav.shifts')}</h1>
        <Button size="sm" onClick={() => navigate('/employer/shifts/new')}><PlusCircle className="h-4 w-4" /> {t('nav.newShift')}</Button>
      </div>

      {shifts === null ? (
        <div className="space-y-3">{[0,1,2].map(i => <Skeleton key={i} className="h-28 w-full" />)}</div>
      ) : shifts.length === 0 ? (
        <EmptyState icon={CalendarDays} title={t('emp.noShifts')} action={<Button onClick={() => navigate('/employer/shifts/new')}><PlusCircle className="h-4 w-4" /> {t('emp.createFirst')}</Button>} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {shifts.map(s => {
            const count = apps.filter(a => a.shift_id === s.id).length;
            return (
              <div key={s.id} className="relative">
                <ShiftCard shift={s} to={`/employer/shifts/${s.id}`} showStatus statusLabel={t(`shift.${s.status}`)} />
                {count > 0 && (
                  <span className="absolute top-11 right-3 inline-flex items-center gap-1 rounded-full bg-primary text-primary-foreground text-xs font-semibold px-2 py-0.5">
                    <ClipboardList className="h-3 w-3" /> {count} {t('shift.applicants')}
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
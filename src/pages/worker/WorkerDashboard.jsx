import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useLang } from '@/lib/i18n';
import { base44 } from '@/api/base44Client';
import { CITIES } from '@/lib/format';
import { Input, Select, Skeleton } from '@/components/ui';
import ShiftCard from '@/components/ShiftCard';
import EmptyState from '@/components/EmptyState';
import { Search, CalendarDays } from 'lucide-react';

export default function WorkerDashboard() {
  const { user } = useAuth();
  const { t } = useLang();
  const [shifts, setShifts] = useState(null);
  const [apps, setApps] = useState([]);
  const [q, setQ] = useState('');
  const [city, setCity] = useState(user?.city || '');
  const [date, setDate] = useState('');

  useEffect(() => {
    (async () => {
      const s = await base44.entities.Shift.filter({ status: 'open', moderation: 'approved' }, 'date', 100);
      setShifts(s);
      if (user) {
        const a = await base44.entities.Application.filter({ worker_id: user.id }, '-created_date', 200);
        setApps(a);
      }
    })();
  }, [user]);

  const filtered = useMemo(() => {
    if (!shifts) return [];
    return shifts.filter(s => {
      if (user && s.created_by_id === user.id) return false;
      if (city && s.city !== city) return false;
      if (date && s.date !== date) return false;
      if (q) {
        const hay = `${s.title} ${s.description || ''} ${s.location || ''} ${s.city || ''}`.toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      return true;
    });
  }, [shifts, city, date, q, user]);

  const appliedIds = new Set(apps.map(a => a.shift_id));

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-5">
        <h1 className="text-2xl font-display font-bold tracking-tight text-primary">{t('wrk.browseTitle')}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t('tagline')}</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder={t('wrk.searchPlaceholder')} value={q} onChange={e => setQ(e.target.value)} />
        </div>
        <Select value={city} onChange={e => setCity(e.target.value)} className="sm:w-44">
          <option value="">{t('allCities')}</option>
          {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
        </Select>
        <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="sm:w-44" />
      </div>

      {shifts === null ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{[0,1,2,3].map(i => <Skeleton key={i} className="h-28 w-full" />)}</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={CalendarDays} title={t('wrk.noShifts')} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtered.map(s => {
            const applied = appliedIds.has(s.id);
            return (
              <div key={s.id} className="relative">
                <ShiftCard shift={s} />
                {applied && (
                  <span className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold px-2 py-0.5">
                    {t('wrk.applied')}
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
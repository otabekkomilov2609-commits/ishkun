import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { useLang } from '@/lib/i18n';
import { base44 } from '@/api/base44Client';
import { CITIES } from '@/lib/format';
import { Input, Select, Skeleton, Button } from '@/components/ui';
import ShiftCard from '@/components/ShiftCard';
import EmptyState from '@/components/EmptyState';
import PullToRefresh from '@/components/PullToRefresh';
import ShiftFilterSheet from '@/components/ShiftFilterSheet';
import AttendanceBanner from '@/components/AttendanceBanner';
import { getWorkerShiftState } from '@/lib/shiftStatus';
import { Search, CalendarDays, SlidersHorizontal } from 'lucide-react';
import { Link } from 'react-router-dom';

function todayStr() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
}
function tomorrowStr() {
  const n = new Date(); n.setDate(n.getDate() + 1);
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
}

const EMPTY_FILTERS = { dateOption: null, dateFrom: '', dateTo: '', skills: [], companies: [] };

export default function WorkerDashboard() {
  const { user } = useAuth();
  const { t } = useLang();
  const [q, setQ] = useState('');
  const [city, setCity] = useState(user?.city || '');
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [sheetOpen, setSheetOpen] = useState(false);

  const shiftsQ = useQuery({
    queryKey: ['workerShifts'],
    queryFn: () => base44.entities.Shift.filter({ status: 'open', moderation: 'approved' }, 'date', 100),
    staleTime: 60_000,
  });

  const appsQ = useQuery({
    queryKey: ['myApps', user?.id],
    queryFn: () => base44.entities.Application.filter({ worker_id: user.id }, '-created_date', 200),
    enabled: !!user,
    staleTime: 30_000,
  });

  const apps = appsQ.data || [];
  const approvedShiftIds = useMemo(() => new Set(apps.filter(x => x.status === 'approved').map(x => x.shift_id)), [apps]);

  const busyQ = useQuery({
    queryKey: ['busyShifts', [...approvedShiftIds]],
    queryFn: async () => {
      const res = await Promise.all([...approvedShiftIds].map(async sid => {
        try { return await base44.entities.Shift.get(sid); } catch { return null; }
      }));
      return res.filter(Boolean);
    },
    enabled: approvedShiftIds.size > 0,
    staleTime: 30_000,
  });

  const busyDates = useMemo(() => new Set((busyQ.data || []).map(s => s.date)), [busyQ.data]);

  const shifts = shiftsQ.data;
  const loading = shiftsQ.isLoading;

  // Company names for open shifts
  const companyIds = useMemo(() => [...new Set((shifts || []).map(s => s.company_id).filter(Boolean))], [shifts]);
  const companiesQ = useQuery({
    queryKey: ['filterCompanies', [...companyIds]],
    queryFn: async () => {
      const res = await Promise.all(companyIds.map(async cid => {
        try { return await base44.entities.Company.get(cid); } catch { return null; }
      }));
      const map = {};
      res.forEach(c => { if (c) map[c.id] = c; });
      return map;
    },
    enabled: companyIds.length > 0,
    staleTime: 60_000,
  });
  const companyById = companiesQ.data || {};
  const companyNames = useMemo(() => [...new Set(Object.values(companyById).map(c => c.name))].sort(), [companyById]);

  const likedQ = useQuery({
    queryKey: ['likedCompanies', user?.id],
    queryFn: () => base44.entities.Rating.filter({ rated_by: 'worker', worker_id: user.id }, '-created_date', 200),
    enabled: !!user,
    staleTime: 60_000,
  });
  const likedCompanies = useMemo(() => new Set((likedQ.data || []).filter(r => r.score >= 4).map(r => r.company_id)), [likedQ.data]);

  const appByShift = useMemo(() => {
    const m = {};
    apps.forEach(a => { if (a.status !== 'cancelled' && !m[a.shift_id]) m[a.shift_id] = a; });
    return m;
  }, [apps]);

  const matchFilters = (list, f) => {
    return (list || []).filter(s => {
      if (busyDates.has(s.date)) return false;
      if (appByShift[s.id]) return false;
      if (user && s.created_by_id === user.id) return false;
      if (city && s.city !== city) return false;
      if (f.dateOption === 'today' && s.date !== todayStr()) return false;
      if (f.dateOption === 'tomorrow' && s.date !== tomorrowStr()) return false;
      if (f.dateOption === 'custom') {
        if (f.dateFrom && s.date < f.dateFrom) return false;
        if (f.dateTo && s.date > f.dateTo) return false;
      }
      if (f.skills.length > 0 && !f.skills.includes(s.required_skill)) return false;
      if (f.companies.length > 0 && !f.companies.includes(companyById[s.company_id]?.name)) return false;
      if (q) {
        const hay = `${s.title} ${s.description || ''} ${s.location || ''} ${s.city || ''}`.toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      return true;
    });
  };

  const filtered = useMemo(() => {
    const list = matchFilters(shifts, filters);
    return [...list].sort((a, b) => (likedCompanies.has(b.company_id) ? 1 : 0) - (likedCompanies.has(a.company_id) ? 1 : 0));
  }, [shifts, filters, city, q, user, busyDates, companyById, likedCompanies]);

  const countFor = (draft) => matchFilters(shifts, draft).length;

  const refresh = async () => {
    await Promise.all([shiftsQ.refetch(), appsQ.refetch(), busyQ.refetch(), companiesQ.refetch()]);
  };

  const activeFilterCount = (filters.dateOption ? 1 : 0) + filters.skills.length + filters.companies.length;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-5">
        <h1 className="text-2xl font-display font-bold tracking-tight text-primary">{t('wrk.browseTitle')}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t('tagline')}</p>
      </div>

      {user?.account_type === 'worker' && user.verification_status !== 'verified' && (
        <Link to="/verification" className="block mb-4 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 hover:bg-amber-100 transition-colors">
          {user.verification_status === 'rejected' ? t('kyc.rejected') : user.verification_status === 'submitted' ? t('kyc.submitted') : t('kyc.mustVerify')} → {t('kyc.verifyNow')}
        </Link>
      )}

      <AttendanceBanner apps={apps} onRefresh={refresh} />

      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder={t('wrk.searchPlaceholder')} value={q} onChange={e => setQ(e.target.value)} />
        </div>
        <Select value={city} onChange={e => setCity(e.target.value)} className="w-36">
          <option value="">{t('allCities')}</option>
          {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
        </Select>
        <Button variant="outline" size="md" onClick={() => setSheetOpen(true)} className="relative">
          <SlidersHorizontal className="h-4 w-4" />
          {activeFilterCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 grid h-5 w-5 place-items-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold">{activeFilterCount}</span>
          )}
        </Button>
      </div>

      <PullToRefresh onRefresh={refresh}>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{[0,1,2,3].map(i => <Skeleton key={i} className="h-32 w-full" />)}</div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={CalendarDays} title={t('wrk.noShifts')} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filtered.map(s => (
              <ShiftCard key={s.id} shift={s} workerState={getWorkerShiftState(appByShift[s.id], s)} liked={likedCompanies.has(s.company_id)} />
            ))}
          </div>
        )}
      </PullToRefresh>

      <ShiftFilterSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        companies={companyNames}
        countFor={countFor}
        initialFilters={filters}
        onApply={setFilters}
      />
    </div>
  );
}
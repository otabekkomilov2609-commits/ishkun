import React, { useEffect, useRef } from 'react';
import { Outlet, NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import { Search, ClipboardList, LayoutDashboard, CalendarDays, PlusCircle, User, Shield, ShieldCheck, LogOut, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { useLang } from '@/lib/i18n';
import Brand from './Brand';
import LanguageSwitcher from './LanguageSwitcher';
import NotificationsBell from './NotificationsBell';
import AnimatedOutlet from './AnimatedOutlet';
import { cn } from '@/lib/utils';

function initials(name) {
  if (!name) return '?';
  return name.trim().split(/\s+/).slice(0, 2).map(s => s[0]?.toUpperCase()).join('');
}

export default function Layout() {
  const { user, logout } = useAuth();
  const { t } = useLang();
  const location = useLocation();
  const navigate = useNavigate();
  const scrollMap = useRef({});

  const role = user?.role || 'worker';

  const navByRole = {
    worker: [
      { to: '/worker', key: 'nav.browse', icon: Search, end: true },
      { to: '/worker/applications', key: 'nav.applications', icon: ClipboardList },
      { to: '/profile', key: 'profile', icon: User }
    ],
    employer: [
      { to: '/employer', key: 'nav.dashboard', icon: LayoutDashboard, end: true },
      { to: '/employer/shifts', key: 'nav.shifts', icon: CalendarDays },
      { to: '/employer/shifts/new', key: 'nav.newShift', icon: PlusCircle },
      { to: '/profile', key: 'profile', icon: User }
    ],
    admin: [
      { to: '/admin', key: 'nav.admin', icon: Shield, end: true },
      { to: '/profile', key: 'profile', icon: User }
    ]
  };

  const nav = navByRole[role] || navByRole.worker;

  // Scroll memory: save scroll offset per path, restore on return
  useEffect(() => {
    return () => {
      scrollMap.current[location.pathname] = window.scrollY;
    };
  }, [location.pathname]);

  useEffect(() => {
    const y = scrollMap.current[location.pathname] || 0;
    if (y > 0) setTimeout(() => window.scrollTo(0, y), 280);
  }, [location.pathname]);

  // Back button shows on subpages (not tab roots)
  const tabRoots = new Set(nav.map(n => n.to));
  const isSubpage = !tabRoots.has(location.pathname);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="mx-auto max-w-5xl px-4 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            {isSubpage && (
              <button
                onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}
                className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors flex-shrink-0"
                aria-label={t('back')}
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}
            <Brand />
          </div>
          <div className="flex items-center gap-1.5">
            <LanguageSwitcher />
            <NotificationsBell />
            <Link to="/profile" className="grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground text-xs font-bold ring-2 ring-background shadow-sm">
              {initials(user?.full_name)}
            </Link>
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 mx-auto w-full max-w-5xl px-4 pb-28 pt-4 sm:pt-8">
        <AnimatedOutlet />
      </main>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/90 backdrop-blur-md" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="mx-auto max-w-5xl px-2 flex items-stretch justify-around">
          {nav.map(item => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => cn(
                  'flex flex-col items-center gap-0.5 px-3 py-2.5 text-[11px] font-medium transition-colors flex-1 min-w-0',
                  isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {({ isActive }) => (
                  <>
                    <span className={cn('grid h-9 w-9 place-items-center rounded-full transition-colors', isActive && 'bg-primary/10')}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="truncate max-w-full">{t(item.key)}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
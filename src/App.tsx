import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Film,
  Wallet,
  TrendingUp,
  BarChart3,
  Users,
  Clapperboard,
  Sun,
  Moon,
  LogIn,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider, useToast } from './context/ToastContext';
import { AuthModal } from './components/auth/AuthModal';
import { DashboardPage } from './pages/DashboardPage';
import { MoviesPage } from './pages/MoviesPage';
import { MovieDetailPage } from './pages/MovieDetailPage';
import { BudgetsPage } from './pages/BudgetsPage';
import { CollectionsPage } from './pages/CollectionsPage';
import { ReportsPage } from './pages/ReportsPage';
import { CatalogEntitiesPage } from './pages/CatalogEntitiesPage';
import { UsersPage } from './pages/UsersPage';

type NavSection =
  | 'dashboard'
  | 'movies'
  | 'budgets'
  | 'collections'
  | 'reports'
  | 'catalog'
  | 'users';

function AppShell() {
  const { user, isAdmin, logout } = useAuth();
  const { showToast } = useToast();

  const [section, setSection] = useState<NavSection>('dashboard');
  const [selectedMovieId, setSelectedMovieId] = useState<number | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('mbms_theme');
    if (saved) return saved === 'dark';
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
      localStorage.setItem('mbms_theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('mbms_theme', 'light');
    }
  }, [darkMode]);

  useEffect(() => {
    if (section === 'users' && !isAdmin) {
      setSection('dashboard');
    }
  }, [section, isAdmin]);

  const navigateTo = (target: NavSection) => {
    setSection(target);
    setSelectedMovieId(null);
    setMobileMenuOpen(false);
  };

  const openMovieDetail = (movieId: number) => {
    setSection('movies');
    setSelectedMovieId(movieId);
    setMobileMenuOpen(false);
  };

  const navItems: Array<{
    id: NavSection;
    label: string;
    icon: typeof LayoutDashboard;
    adminOnly?: boolean;
  }> = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'movies', label: 'Movies', icon: Film },
    { id: 'budgets', label: 'Budgets', icon: Wallet },
    { id: 'collections', label: 'Collections', icon: TrendingUp },
    { id: 'reports', label: 'Profitability Reports', icon: BarChart3 },
    { id: 'catalog', label: 'Directors, Cast & Genres', icon: Clapperboard },
    { id: 'users', label: 'User Accounts', icon: Users, adminOnly: true },
  ];

  const sectionTitles: Record<NavSection, string> = {
    dashboard: 'Executive Dashboard',
    movies: selectedMovieId ? 'Movie Financial Dossier' : 'Movie Catalog',
    budgets: 'Production & Marketing Budgets',
    collections: 'Weekly Box-Office Collections',
    reports: 'Profitability & ROI Reports',
    catalog: 'Directors, Cast & Genres',
    users: 'User Access Management',
  };

  const handleLogout = () => {
    logout();
    showToast('Signed out.', 'info');
  };

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-40 h-screen w-64 shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col transition-transform duration-200 lg:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-16 px-5 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => navigateTo('dashboard')}
            className="text-base font-display font-bold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap shrink-0 text-left"
          >
            Movie Budget Ledger
          </button>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden p-1.5 rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Close navigation"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto" aria-label="Primary Navigation">
          {navItems
            .filter((item) => !item.adminOnly || isAdmin)
            .map((item) => {
              const Icon = item.icon;
              const active = section === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigateTo(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                    active
                      ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
          {user ? (
            <div className="space-y-2.5">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                  {user.name}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {user.role} · {user.email}
                </p>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Browsing in read-only mode
              </p>
              <button
                type="button"
                onClick={() => setAuthModalOpen(true)}
                className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-slate-950 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
              >
                <LogIn className="w-3.5 h-3.5" />
                Sign In / Register
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 h-16 px-4 sm:px-6 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
              aria-label="Open navigation"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-display font-bold truncate">
                {sectionTitles[section]}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setDarkMode((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
              aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {darkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{darkMode ? 'Light' : 'Dark'}</span>
            </button>

            {!user ? (
              <button
                type="button"
                onClick={() => setAuthModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors whitespace-nowrap shrink-0"
              >
                <LogIn className="w-3.5 h-3.5" />
                Sign In
              </button>
            ) : (
              <span className="hidden sm:inline-block text-xs font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap shrink-0">
                {user.name} ({user.role})
              </span>
            )}
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 max-w-[1440px] w-full mx-auto">
          {section === 'dashboard' && <DashboardPage onSelectMovie={openMovieDetail} />}
          {section === 'movies' && !selectedMovieId && (
            <MoviesPage onSelectMovie={openMovieDetail} />
          )}
          {section === 'movies' && selectedMovieId && (
            <MovieDetailPage
              movieId={selectedMovieId}
              onBack={() => setSelectedMovieId(null)}
              onOpenAuth={() => setAuthModalOpen(true)}
            />
          )}
          {section === 'budgets' && <BudgetsPage onSelectMovie={openMovieDetail} />}
          {section === 'collections' && <CollectionsPage onSelectMovie={openMovieDetail} />}
          {section === 'reports' && <ReportsPage onSelectMovie={openMovieDetail} />}
          {section === 'catalog' && <CatalogEntitiesPage />}
          {section === 'users' && isAdmin && <UsersPage />}
        </main>
      </div>

      <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </ToastProvider>
  );
}

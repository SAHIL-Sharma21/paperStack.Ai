import { Flame, LogOut, Search, Upload } from 'lucide-react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { logout } from '../modules/auth/store/authSlice';
import { selectCurrentUser, selectIsAuthenticated } from '../modules/auth/store/selectors';
import { Button } from './ui/button';
import { cn } from '../lib/utils';

export function Layout() {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectCurrentUser);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);

  const navItem = ({ isActive }: { isActive: boolean }) =>
    cn(
      'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
      isActive
        ? 'bg-orange-500/20 text-orange-200 ring-1 ring-orange-500/40'
        : 'text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100',
    );

  return (
    <div className="mx-auto min-h-screen w-full max-w-6xl px-4 py-6 md:px-8">
      <header className="sticky top-4 z-50 mb-6 rounded-2xl border border-zinc-800 bg-zinc-900/70 px-4 py-3 backdrop-blur">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link to="/" className="inline-flex items-center gap-2 text-lg font-semibold text-zinc-100">
            <Flame className="h-5 w-5 text-orange-300" />
            PaperStack
          </Link>

          <nav className="flex flex-wrap items-center gap-2">
            {isAuthenticated ? (
              <>
                <NavLink to="/documents" className={navItem}>
                  <Upload className="h-4 w-4" /> Documents
                </NavLink>
                <NavLink to="/search" className={navItem}>
                  <Search className="h-4 w-4" /> Search
                </NavLink>
                <Button type="button" variant="ghost" size="sm" onClick={() => dispatch(logout())}>
                  <LogOut className="mr-2 h-4 w-4" /> Logout
                </Button>
              </>
            ) : (
              <>
                <NavLink to="/login" className={navItem}>
                  Login
                </NavLink>
                <NavLink to="/signup" className={navItem}>
                  Signup
                </NavLink>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="space-y-4">
        {isAuthenticated && user ? (
          <p className="text-sm text-zinc-400">
            Signed in as <span className="text-zinc-200">{user.username}</span>
          </p>
        ) : null}
        <Outlet />
      </main>
    </div>
  );
}

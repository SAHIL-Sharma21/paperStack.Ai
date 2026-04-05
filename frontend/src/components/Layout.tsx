import { Flame, FolderOpen, Search, UploadCloud } from 'lucide-react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { logout } from '../modules/auth/store/authSlice';
import { selectCurrentUser, selectIsAuthenticated } from '../modules/auth/store/selectors';
import { ProfileMenu } from './ProfileMenu';
import { cn } from '../lib/utils';

export function Layout() {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const location = useLocation();
  const user = useAppSelector(selectCurrentUser);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);

  const navItem = ({ isActive }: { isActive: boolean }) =>
    cn(
      'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
      isActive
        ? 'bg-orange-500/20 text-orange-200 ring-1 ring-orange-500/40'
        : 'text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100',
    );

    const handleLogout = () => {
      queryClient.clear();
      dispatch(logout());
    }


  return (
    <div className="mx-auto min-h-screen w-full max-w-6xl px-4 py-6 md:px-8">
      <header className="sticky top-4 z-50 mb-6 rounded-2xl border border-zinc-800 bg-zinc-900/70 px-4 py-3 backdrop-blur">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link to="/" className="inline-flex items-center gap-2 text-lg font-semibold text-zinc-100">
            <Flame className="h-5 w-5 text-orange-300" />
            PaperStack.Ai
          </Link>

          <nav className="flex flex-wrap items-center gap-2 sm:gap-3">
            {isAuthenticated ? (
              <>
                <NavLink to="/documents" className={navItem}>
                  <FolderOpen className="h-4 w-4" /> Library
                </NavLink>
                {location.pathname === '/documents' ? (
                  <NavLink to="/" className={navItem}>
                    <UploadCloud className="h-4 w-4" /> Upload
                  </NavLink>
                ) : null}
                <NavLink to="/search" className={navItem}>
                  <Search className="h-4 w-4" /> Search
                </NavLink>
                {user ? <ProfileMenu user={user} onLogout={handleLogout} /> : null}
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
        <Outlet />
      </main>
    </div>
  );
}

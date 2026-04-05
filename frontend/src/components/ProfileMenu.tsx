import { LogOut } from 'lucide-react';
import type { AuthUser } from '../lib/types';
import { cn } from '../lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

function initialsFromUsername(username: string): string {
  const parts = username.trim().split(/[\s._-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
  }
  const compact = username.replace(/[^a-zA-Z0-9]/g, '');
  if (compact.length >= 2) return compact.slice(0, 2).toUpperCase();
  return (username.slice(0, 2) || '?').toUpperCase();
}

type ProfileMenuProps = {
  user: AuthUser;
  onLogout: () => void;
};

export function ProfileMenu({ user, onLogout }: ProfileMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
            'bg-linear-to-br from-orange-400 to-amber-600 text-sm font-semibold text-zinc-950 shadow-inner',
            'ring-2 ring-zinc-800 ring-offset-2 ring-offset-[#121214]',
            'transition hover:ring-orange-400/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/70',
          )}
          aria-label="Open account menu"
        >
          <span className="select-none" aria-hidden>
            {initialsFromUsername(user.username)}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-64">
        <DropdownMenuLabel className="px-3 py-2 font-normal">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Signed in as
            </span>
            <span className="truncate text-sm font-semibold text-zinc-100">{user.username}</span>
            <span className="truncate text-xs text-zinc-500">{user.email}</span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="mx-0.5 mb-0.5 cursor-pointer gap-2 text-rose-300 focus:bg-rose-500/15 focus:text-rose-200"
          onSelect={() => onLogout()}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

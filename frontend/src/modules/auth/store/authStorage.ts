import type { AuthUser } from '../../../lib/types';
import { TOKEN_KEY, USER_KEY } from './constatnt';

export type StoredAuth = {
  token: string | null;
  user: AuthUser | null;
};

export function loadAuthState(): StoredAuth {
  let token = localStorage.getItem(TOKEN_KEY);
  const rawUser = localStorage.getItem(USER_KEY);

  let user: AuthUser | null = null;
  if (rawUser) {
    try {
      user = JSON.parse(rawUser) as AuthUser;
    } catch {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      token = null;
    }
  }

  return { token, user };
}

export function persistAuthState(token: string, user: AuthUser): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearStoredAuthState(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

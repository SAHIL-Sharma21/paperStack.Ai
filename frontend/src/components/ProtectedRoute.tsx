import type { ReactElement } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAppSelector } from '../app/hooks';
import { selectIsAuthenticated } from '../modules/auth/store/selectors';

export function ProtectedRoute({ children }: { children: ReactElement }) {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const location = useLocation();

  if (!isAuthenticated) {
    return (
      <Navigate 
        to="/login"
        replace
        state={{from: `${location.pathname}${location.search}${location.hash}`}}
      />
    )
  }

  return children;
}

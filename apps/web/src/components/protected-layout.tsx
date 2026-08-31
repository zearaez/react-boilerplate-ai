import { Navigate, Outlet } from 'react-router';

import { useSession, useTranslation } from '@repo/core';

/**
 * Route guard. Reads the session store, nothing else.
 *
 * This is the web half of a deliberately symmetric pair — apps/mobile does the
 * same job with <Stack.Protected guard={...}>. Because both react to
 * useAuthStore, the 401 interceptor in @repo/core only has to call signOut();
 * it never needs a navigator injected into it.
 */
export function ProtectedLayout() {
  const { isAuthenticated, isLoading } = useSession();
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <output
        aria-busy="true"
        className="flex min-h-dvh items-center justify-center text-muted-foreground"
      >
        {t('common.loading')}
      </output>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return <Outlet />;
}

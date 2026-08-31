import { isRouteErrorResponse, useNavigate, useRouteError } from 'react-router';

import { isApiError, logger, useTranslation } from '@repo/core';

import { Button } from '@/components/ui/button';

/**
 * Router-level errorElement. Catches anything a route or loader throws.
 *
 * Deliberately maps ApiError.kind to a message rather than printing
 * error.message: a raw server string is not something to render at users, and a
 * schema failure needs different wording from a dropped connection.
 */
export function RouteError() {
  const error = useRouteError();
  const navigate = useNavigate();
  const { t } = useTranslation();

  logger.error('Route error boundary caught an error', { error: String(error) });

  const message = (() => {
    if (isApiError(error)) {
      if (error.kind === 'network') return t('common.offline');
      if (error.kind === 'notFound') return t('common.notFound');
      return error.message;
    }
    if (isRouteErrorResponse(error)) {
      return error.status === 404 ? t('common.notFound') : t('common.somethingWentWrong');
    }
    return t('common.somethingWentWrong');
  })();

  return (
    <div role="alert" className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-16">
      <h1 className="text-lg font-semibold">{t('common.somethingWentWrong')}</h1>
      <p className="text-center text-sm text-muted-foreground">{message}</p>
      <Button
        onClick={() => {
          void navigate(0);
        }}
      >
        {t('common.retry')}
      </Button>
    </div>
  );
}

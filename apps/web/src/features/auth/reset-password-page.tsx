import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, useSearchParams } from 'react-router';

import {
  type ResetPasswordInput,
  resetPasswordInputSchema,
  useResetPassword,
  useTranslation,
} from '@repo/core';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';

/**
 * Step two: spend the code on a new password.
 *
 * Two decisions worth keeping:
 *
 *  - The code is a normal, visible, validated field, prefilled from `?token=`.
 *    A hidden input would be tidier for the email-link path and useless for
 *    everything else — a link mangled by an email client, or the mobile app,
 *    which has no deep link. One field covers both platforms, and the "missing
 *    code" message comes from the shared schema.
 *  - Success does NOT sign the user in; see resetPassword in @repo/core. The
 *    panel below sends them to the login form instead.
 *
 * Counterpart: apps/mobile/app/(auth)/reset-password.tsx.
 */
export function ResetPasswordPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const reset = useResetPassword();

  const form = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordInputSchema),
    // Re-validate as the user fixes things: with a cross-field rule the default
    // 'onSubmit' mode leaves "passwords do not match" on screen after they do.
    mode: 'onBlur',
    defaultValues: {
      token: searchParams.get('token') ?? '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = (values: ResetPasswordInput) => {
    reset.mutate(values, {
      onError: (error) => {
        // The mock rejects an unknown or expired code with a field error on
        // `token`, so this path is reachable — and the message lands on the field
        // the user can actually do something about.
        if (error.fieldErrors) {
          for (const [field, messages] of Object.entries(error.fieldErrors)) {
            form.setError(field as keyof ResetPasswordInput, { message: messages.join(' ') });
          }
          return;
        }
        form.setError('root', { message: error.message });
      },
    });
  };

  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <h1 className="text-2xl font-semibold leading-none tracking-tight">
            {reset.isSuccess ? t('auth.resetDoneTitle') : t('auth.resetPasswordTitle')}
          </h1>
          <CardDescription>
            {reset.isSuccess ? t('auth.resetDone') : t('auth.resetPasswordSubtitle')}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {reset.isSuccess ? (
            <Button asChild className="w-full">
              <Link to="/login">{t('auth.signIn')}</Link>
            </Button>
          ) : (
            <Form {...form}>
              <form
                onSubmit={(event) => {
                  void form.handleSubmit(onSubmit)(event);
                }}
                className="space-y-4"
                noValidate
              >
                <FormField
                  control={form.control}
                  name="token"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('auth.resetCode')}</FormLabel>
                      <FormControl>
                        <Input autoComplete="one-time-code" {...field} />
                      </FormControl>
                      <FormDescription>{t('auth.resetDemoHint')}</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('auth.newPassword')}</FormLabel>
                      <FormControl>
                        <Input type="password" autoComplete="new-password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('auth.confirmPassword')}</FormLabel>
                      <FormControl>
                        <Input type="password" autoComplete="new-password" {...field} />
                      </FormControl>
                      {/* The mismatch error is attached to this field by
                          superRefine, so it renders here rather than at the root. */}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {form.formState.errors.root ? (
                  <p role="alert" className="text-sm font-medium text-destructive">
                    {form.formState.errors.root.message}
                  </p>
                ) : null}

                <Button type="submit" className="w-full" disabled={reset.isPending}>
                  {reset.isPending ? t('auth.updatingPassword') : t('auth.updatePassword')}
                </Button>

                <p className="text-center text-sm">
                  <Link
                    to="/login"
                    className="font-medium text-primary underline-offset-4 hover:underline"
                  >
                    {t('auth.backToSignIn')}
                  </Link>
                </p>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

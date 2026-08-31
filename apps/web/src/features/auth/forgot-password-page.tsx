import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router';

import {
  type ForgotPasswordInput,
  forgotPasswordInputSchema,
  useRequestPasswordReset,
  useTranslation,
} from '@repo/core';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';

/**
 * Step one of the reset flow: ask for a code.
 *
 * The success state is the part worth reading. It says "if an account exists for
 * this address" rather than "we sent you an email", because the endpoint answers
 * identically for an address with no account — see passwordResetRequestedSchema.
 * Copy that confirms delivery would leak exactly what the endpoint refuses to.
 *
 * Counterpart: apps/mobile/app/(auth)/forgot-password.tsx.
 */
export function ForgotPasswordPage() {
  const { t } = useTranslation();
  const request = useRequestPasswordReset();

  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordInputSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = (values: ForgotPasswordInput) => {
    request.mutate(values, {
      onError: (error) => {
        if (error.fieldErrors) {
          for (const [field, messages] of Object.entries(error.fieldErrors)) {
            form.setError(field as keyof ForgotPasswordInput, { message: messages.join(' ') });
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
          {/* A real <h1>, for the reason documented on the login page. */}
          <h1 className="text-2xl font-semibold leading-none tracking-tight">
            {t('auth.forgotPasswordTitle')}
          </h1>
          <CardDescription>{t('auth.forgotPasswordSubtitle')}</CardDescription>
        </CardHeader>

        <CardContent>
          {request.isSuccess ? (
            <div className="space-y-4">
              <div role="status" className="space-y-2">
                <p className="font-medium">{t('auth.resetSentTitle')}</p>
                <p className="text-sm text-muted-foreground">
                  {/* `variables` is the submitted input, so the address shown is
                      the one actually sent rather than whatever is in the field
                      now. */}
                  {t('auth.resetSent', { email: request.variables.email })}
                </p>
              </div>

              <Button asChild className="w-full">
                <Link to="/reset-password">{t('auth.enterResetCode')}</Link>
              </Button>

              <p className="text-center text-sm">
                <Link
                  to="/login"
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  {t('auth.backToSignIn')}
                </Link>
              </p>
            </div>
          ) : (
            <Form {...form}>
              {/* `void` because handleSubmit returns a promise and onSubmit expects void. */}
              <form
                onSubmit={(event) => {
                  void form.handleSubmit(onSubmit)(event);
                }}
                className="space-y-4"
                noValidate
              >
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('auth.email')}</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          autoComplete="email"
                          placeholder={t('auth.emailPlaceholder')}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {form.formState.errors.root ? (
                  <p role="alert" className="text-sm font-medium text-destructive">
                    {form.formState.errors.root.message}
                  </p>
                ) : null}

                <Button type="submit" className="w-full" disabled={request.isPending}>
                  {request.isPending ? t('auth.sendingResetCode') : t('auth.sendResetCode')}
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

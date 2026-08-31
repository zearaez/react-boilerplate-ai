import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, Navigate } from 'react-router';

import {
  type LoginInput,
  loginInputSchema,
  useLogin,
  useSession,
  useTranslation,
} from '@repo/core';

import { BrandMark } from '@/components/brand-mark';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { mocksEnabled } from '@/mocks/browser';

/**
 * Sign-in: a full-bleed brand panel beside the form.
 *
 * Two things it deliberately does NOT do:
 *
 *  - **No role picker.** The role comes from `GET /users/me` and is the server's
 *    to decide — offering a choice would imply the client can grant itself
 *    privileges.
 *  - **The brand panel is desktop-only.** A login screen gets opened on a phone,
 *    where 50% of the width spent on a headline is 50% less room for the form.
 *
 * Note what is NOT here: validation rules. `loginInputSchema` comes from
 * @repo/core and is the same object the mobile login screen and the api layer
 * use. That is how two hand-written forms stay in agreement.
 */
export function LoginPage() {
  const { t } = useTranslation();
  const { isAuthenticated } = useSession();
  const login = useLogin();

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginInputSchema),
    defaultValues: { email: '', password: '' },
  });

  if (isAuthenticated) return <Navigate to="/" replace />;

  const onSubmit = (values: LoginInput) => {
    login.mutate(values, {
      onError: (error) => {
        // Server-side field errors land on the right inputs; anything else
        // becomes a form-level message.
        if (error.fieldErrors) {
          for (const [field, messages] of Object.entries(error.fieldErrors)) {
            form.setError(field as keyof LoginInput, { message: messages.join(' ') });
          }
          return;
        }
        form.setError('root', { message: error.message });
      },
    });
  };

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_28rem]">
      {/*
        Decorative and desktop-only, so it is hidden from assistive tech as well
        as from small screens — the wordmark and headline repeat nothing the form
        side does not already say.
      */}
      <aside
        aria-hidden="true"
        className="hidden flex-col justify-between bg-primary p-14 text-primary-foreground lg:flex"
      >
        <div className="flex items-center gap-3">
          <BrandMark onPrimary className="size-9" />
          <span className="text-xl font-extrabold tracking-tight">{t('common.appName')}</span>
        </div>

        <div>
          <p className="max-w-sm text-3xl font-extrabold leading-tight tracking-tight">
            {t('auth.consoleTitle')}
          </p>
          {/* /80 rather than a second token: this is the same ink at lower
              emphasis, which is exactly what an opacity modifier is for. */}
          <p className="mt-4 max-w-sm text-base leading-relaxed text-primary-foreground/80">
            {t('auth.consoleSubtitle')}
          </p>
        </div>
      </aside>

      <main className="flex flex-col justify-center px-6 py-12 sm:px-12">
        <div className="mx-auto w-full max-w-sm">
          <BrandMark className="mb-8 size-10 lg:hidden" />

          <h1 className="text-2xl font-semibold tracking-tight">{t('auth.welcomeTitle')}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t('auth.welcomeSubtitle')}</p>

          <Form {...form}>
            {/* `void` because handleSubmit returns a promise and onSubmit expects void. */}
            <form
              onSubmit={(event) => {
                void form.handleSubmit(onSubmit)(event);
              }}
              className="mt-8 space-y-4"
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

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('auth.password')}</FormLabel>
                    <FormControl>
                      <Input type="password" autoComplete="current-password" {...field} />
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

              <Button type="submit" className="w-full" disabled={login.isPending}>
                {login.isPending ? t('auth.signingIn') : t('auth.signIn')}
              </Button>

              <p className="text-center text-sm">
                <Link
                  to="/forgot-password"
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  {t('auth.forgotPassword')}
                </Link>
              </p>

              {/*
                Only shown when the app is running on MSW. The hint names the mock
                backend's fixture account, which is true of nothing else — printing
                it in front of a real API would be advice that cannot work, and
                printing REAL credentials here would put them in the bundle and on
                the screen for every visitor.
              */}
              {mocksEnabled() ? (
                <p className="text-center text-xs text-muted-foreground">{t('auth.demoHint')}</p>
              ) : null}
            </form>
          </Form>
        </div>
      </main>
    </div>
  );
}

import { useEffect } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';

import {
  NOTIFICATION_CHANNELS,
  type UpdateProfileInput,
  isPhoneRelevant,
  updateProfileInputSchema,
  useProfileQuery,
  useTranslation,
  useUpdateProfile,
} from '@repo/core';

import { Button } from '@/components/ui/button';
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
import { Skeleton } from '@/components/ui/skeleton';

/**
 * REFERENCE: a single-resource form.
 *
 * Structurally different from the posts pages, and worth reading before writing
 * any settings-style screen:
 *
 *  - There is no list and no route param. The resource is implicit.
 *  - The form is populated from a QUERY, so it must be reset once the data lands
 *    (see the effect below) — `defaultValues` alone runs before the fetch resolves.
 *  - Which fields are shown depends on another field's value, and the rule for
 *    that lives in @repo/core (`isPhoneRelevant`) so both platforms agree.
 *  - Validation spans fields, via superRefine, so the error attaches to the field
 *    the user has to fix.
 *
 * Counterpart: apps/mobile/app/(app)/profile.tsx — keep the field set in sync.
 */
export function ProfilePage() {
  const { t } = useTranslation();
  const { data: profile, isPending, isError, error } = useProfileQuery();
  const update = useUpdateProfile();

  const form = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileInputSchema),
    // Re-validate as the user fixes things: with cross-field rules, the default
    // 'onSubmit' mode leaves a resolved error visible until the next submit.
    mode: 'onBlur',
    defaultValues: {
      displayName: '',
      phone: '',
      notificationChannel: 'email',
      marketingOptIn: false,
    },
  });

  /**
   * Populate the form once the query resolves.
   *
   * `defaultValues` is captured on first render, when `profile` is still
   * undefined — so without this the form stays empty on a cold load. `reset` also
   * clears dirty state, which is what makes "did the user actually change
   * anything" meaningful.
   */
  useEffect(() => {
    if (!profile) return;
    form.reset({
      displayName: profile.displayName,
      phone: profile.phone,
      notificationChannel: profile.notificationChannel,
      marketingOptIn: profile.marketingOptIn,
    });
  }, [profile, form]);

  // Watching one field to decide what to render is the conditional-field pattern.
  //
  // `useWatch`, not `form.watch(...)`: watch() is a function handed back by
  // useForm(), and react-hooks 7 flags it (`incompatible-library`) because a
  // memoizing compiler cannot see through it — it would cache stale UI. useWatch is
  // a real hook subscribing to one field, so it is compiler-safe, and it re-renders
  // only this component instead of the whole form on every keystroke.
  const channel = useWatch({ control: form.control, name: 'notificationChannel' });

  if (isPending) {
    return (
      <output aria-busy="true" className="block space-y-4">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-64 w-full" />
      </output>
    );
  }

  if (isError) {
    return (
      <div role="alert" className="space-y-2">
        <h1 className="text-lg font-semibold">{t('common.somethingWentWrong')}</h1>
        <p className="text-sm text-muted-foreground">
          {error.kind === 'network' ? t('common.offline') : error.message}
        </p>
      </div>
    );
  }

  const onSubmit = (values: UpdateProfileInput) => {
    update.mutate(values, {
      onError: (mutationError) => {
        // Server-side field errors land on the matching inputs. The mock enforces
        // the same cross-field rule, so this path is reachable.
        if (mutationError.fieldErrors) {
          for (const [field, messages] of Object.entries(mutationError.fieldErrors)) {
            form.setError(field as keyof UpdateProfileInput, { message: messages.join(' ') });
          }
          return;
        }
        form.setError('root', { message: mutationError.message });
      },
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t('profile.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('profile.subtitle')}</p>
      </div>

      <Form {...form}>
        <form
          onSubmit={(event) => {
            void form.handleSubmit(onSubmit)(event);
          }}
          className="max-w-md space-y-6"
          noValidate
        >
          <FormField
            control={form.control}
            name="displayName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('profile.displayName')}</FormLabel>
                <FormControl>
                  <Input autoComplete="name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/*
            Read-only, and disabled rather than hidden: people look for their own
            email to confirm they are editing the right account.

            Plain <label>/<p> here, NOT FormLabel/FormDescription. Those call
            useFormField() and throw "useFormField should be used within
            <FormField>" outside a FormField — which is correct of them, since there
            is no form field to describe. shadcn's Form primitives are for
            registered fields only.
          */}
          <div className="space-y-2">
            <label htmlFor="profile-email" className="text-sm font-medium leading-none">
              {t('profile.email')}
            </label>
            <Input id="profile-email" value={profile.email} readOnly disabled />
            <p className="text-sm text-muted-foreground">{t('profile.emailHint')}</p>
          </div>

          <FormField
            control={form.control}
            name="notificationChannel"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="profile-channel">{t('profile.notificationChannel')}</FormLabel>
                <FormControl>
                  {/* A native select, not a Radix one: it is keyboard- and
                      screen-reader-correct for free, and the mobile counterpart is
                      a set of buttons anyway, so a shared abstraction would buy
                      nothing. */}
                  <select
                    id="profile-channel"
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    name={field.name}
                    ref={field.ref}
                  >
                    {NOTIFICATION_CHANNELS.map((value) => (
                      <option key={value} value={value}>
                        {t(`profile.channel.${value}`)}
                      </option>
                    ))}
                  </select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* THE CONDITIONAL FIELD. The predicate comes from @repo/core so mobile
              shows and hides it under exactly the same condition. */}
          {isPhoneRelevant(channel) ? (
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('profile.phone')}</FormLabel>
                  <FormControl>
                    <Input type="tel" autoComplete="tel" {...field} />
                  </FormControl>
                  <FormDescription>{t('profile.phoneHint')}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : null}

          <FormField
            control={form.control}
            name="marketingOptIn"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center gap-2">
                  <FormControl>
                    <input
                      type="checkbox"
                      id="profile-marketing"
                      className="size-4 rounded border-input"
                      checked={field.value}
                      onChange={(event) => {
                        field.onChange(event.target.checked);
                      }}
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                    />
                  </FormControl>
                  <FormLabel htmlFor="profile-marketing" className="font-normal">
                    {t('profile.marketingOptIn')}
                  </FormLabel>
                </div>
                {/* The cross-field error (opted in with channel 'none') is attached
                    to notificationChannel, so it renders up there, next to the
                    field the user has to change. */}
                <FormMessage />
              </FormItem>
            )}
          />

          {form.formState.errors.root ? (
            <p role="alert" className="text-sm font-medium text-destructive">
              {form.formState.errors.root.message}
            </p>
          ) : null}

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={update.isPending || !form.formState.isDirty}>
              {update.isPending ? t('common.saving') : t('profile.save')}
            </Button>
            {update.isSuccess && !form.formState.isDirty ? (
              <span aria-live="polite" className="text-sm text-muted-foreground">
                {t('profile.savedJustNow')}
              </span>
            ) : null}
          </div>
        </form>
      </Form>
    </div>
  );
}

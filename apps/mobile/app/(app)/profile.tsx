import { useEffect } from 'react';

import { Pressable, ScrollView, View } from 'react-native';

import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm, useWatch } from 'react-hook-form';

import {
  NOTIFICATION_CHANNELS,
  type NotificationChannel,
  type UpdateProfileInput,
  isPhoneRelevant,
  updateProfileInputSchema,
  useProfileQuery,
  useTranslation,
  useUpdateProfile,
} from '@repo/core';

import { Screen } from '~/components/screen';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Skeleton } from '~/components/ui/skeleton';
import { Text } from '~/components/ui/text';
import { cn } from '~/lib/utils';

/**
 * Counterpart: apps/web/src/features/profile/profile-page.tsx.
 *
 * Same fields, same validation, same conditional rule — all three come from
 * @repo/core. What differs is only the controls: a native <select> on web, a row
 * of Pressables here, because that is what each platform does well. Read the web
 * file for the annotated explanation of the reset-from-query effect and the
 * conditional field.
 */
export default function ProfileScreen() {
  const { t } = useTranslation();
  const { data: profile, isPending, isError, error } = useProfileQuery();
  const update = useUpdateProfile();

  const { control, handleSubmit, reset, setError, formState } = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileInputSchema),
    mode: 'onBlur',
    defaultValues: {
      displayName: '',
      phone: '',
      notificationChannel: 'email',
      marketingOptIn: false,
    },
  });

  // defaultValues is captured before the query resolves, so the form must be reset
  // once data lands or it stays empty on a cold load.
  useEffect(() => {
    if (!profile) return;
    reset({
      displayName: profile.displayName,
      phone: profile.phone,
      notificationChannel: profile.notificationChannel,
      marketingOptIn: profile.marketingOptIn,
    });
  }, [profile, reset]);

  // useWatch, not the watch() returned by useForm(): see the web counterpart for
  // why (react-hooks 7 flags watch() as unmemoizable, and this re-renders less).
  const channel = useWatch({ control, name: 'notificationChannel' });

  if (isPending) {
    return (
      <Screen className="gap-4 p-4">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-64 w-full" />
      </Screen>
    );
  }

  if (isError) {
    return (
      <Screen className="items-center justify-center p-6">
        <Text className="text-center text-sm text-muted-foreground">
          {error.kind === 'network' ? t('common.offline') : error.message}
        </Text>
      </Screen>
    );
  }

  const onSubmit = (values: UpdateProfileInput) => {
    update.mutate(values, {
      onError: (mutationError) => {
        if (mutationError.fieldErrors) {
          for (const [field, messages] of Object.entries(mutationError.fieldErrors)) {
            setError(field as keyof UpdateProfileInput, { message: messages.join(' ') });
          }
          return;
        }
        setError('root', { message: mutationError.message });
      },
    });
  };

  return (
    <Screen>
      <ScrollView contentContainerClassName="gap-6 p-4" keyboardShouldPersistTaps="handled">
        <Text className="text-muted-foreground">{t('profile.subtitle')}</Text>

        <Controller
          control={control}
          name="displayName"
          render={({ field, fieldState }) => (
            <View className="gap-1.5">
              <Text nativeID="profile-name-label" className="text-sm font-medium">
                {t('profile.displayName')}
              </Text>
              <Input
                accessibilityLabelledBy="profile-name-label"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
              />
              {fieldState.error ? (
                <Text className="text-sm text-destructive">{fieldState.error.message}</Text>
              ) : null}
            </View>
          )}
        />

        <View className="gap-1.5">
          <Text className="text-sm font-medium">{t('profile.email')}</Text>
          <Input value={profile.email} editable={false} />
          <Text className="text-xs text-muted-foreground">{t('profile.emailHint')}</Text>
        </View>

        <Controller
          control={control}
          name="notificationChannel"
          render={({ field, fieldState }) => (
            <View className="gap-2">
              <Text className="text-sm font-medium">{t('profile.notificationChannel')}</Text>
              {/* A segmented row of Pressables rather than a picker: it needs no
                  native module and reads well at this option count. */}
              <View className="flex-row gap-2">
                {NOTIFICATION_CHANNELS.map((value: NotificationChannel) => {
                  const selected = field.value === value;
                  return (
                    <Pressable
                      key={value}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                      onPress={() => {
                        field.onChange(value);
                      }}
                      className={cn(
                        'flex-1 items-center rounded-md border px-3 py-2',
                        selected ? 'border-primary bg-primary' : 'border-input bg-background',
                      )}
                    >
                      <Text
                        className={cn(
                          'text-sm',
                          selected ? 'text-primary-foreground' : 'text-foreground',
                        )}
                      >
                        {t(`profile.channel.${value}`)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              {fieldState.error ? (
                <Text className="text-sm text-destructive">{fieldState.error.message}</Text>
              ) : null}
            </View>
          )}
        />

        {/* The conditional field. Predicate from @repo/core, so web hides it under
            exactly the same condition. */}
        {isPhoneRelevant(channel) ? (
          <Controller
            control={control}
            name="phone"
            render={({ field, fieldState }) => (
              <View className="gap-1.5">
                <Text nativeID="profile-phone-label" className="text-sm font-medium">
                  {t('profile.phone')}
                </Text>
                <Input
                  accessibilityLabelledBy="profile-phone-label"
                  keyboardType="phone-pad"
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                />
                <Text className="text-xs text-muted-foreground">{t('profile.phoneHint')}</Text>
                {fieldState.error ? (
                  <Text className="text-sm text-destructive">{fieldState.error.message}</Text>
                ) : null}
              </View>
            )}
          />
        ) : null}

        <Controller
          control={control}
          name="marketingOptIn"
          render={({ field }) => (
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: field.value }}
              className="flex-row items-center gap-3"
              onPress={() => {
                field.onChange(!field.value);
              }}
            >
              <View
                className={
                  field.value
                    ? 'h-5 w-5 items-center justify-center rounded border border-primary bg-primary'
                    : 'h-5 w-5 rounded border border-input'
                }
              >
                {field.value ? <Text className="text-xs text-primary-foreground">✓</Text> : null}
              </View>
              <Text className="text-sm">{t('profile.marketingOptIn')}</Text>
            </Pressable>
          )}
        />

        {formState.errors.root ? (
          <Text accessibilityLiveRegion="polite" className="text-sm text-destructive">
            {formState.errors.root.message}
          </Text>
        ) : null}

        <Button
          disabled={update.isPending || !formState.isDirty}
          onPress={() => {
            void handleSubmit(onSubmit)();
          }}
        >
          <Text>{update.isPending ? t('common.saving') : t('profile.save')}</Text>
        </Button>

        {update.isSuccess && !formState.isDirty ? (
          <Text
            accessibilityLiveRegion="polite"
            className="text-center text-sm text-muted-foreground"
          >
            {t('profile.savedJustNow')}
          </Text>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

import { KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';

import { Link, useLocalSearchParams } from 'expo-router';

import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';

import {
  type ResetPasswordInput,
  resetPasswordInputSchema,
  useResetPassword,
  useTranslation,
} from '@repo/core';

import { Screen } from '~/components/screen';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Text } from '~/components/ui/text';

/**
 * Step two: spend the code on a new password.
 *
 * The code is a visible, pasteable field for the reason given on the web
 * counterpart — there is no inbox in the app, so a hidden input would leave this
 * screen unusable. `token` is still read from the route params so a future deep
 * link can prefill it without touching this file.
 *
 * Success does NOT sign anyone in; see resetPassword in @repo/core. The user
 * goes back to the login screen and uses the password they just chose.
 *
 * Counterpart: apps/web/src/features/auth/reset-password-page.tsx.
 */
export default function ResetPasswordScreen() {
  const { t } = useTranslation();
  const { token } = useLocalSearchParams<{ token?: string }>();
  const reset = useResetPassword();

  const { control, handleSubmit, setError, formState } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordInputSchema),
    // Re-validate as the user fixes things: with a cross-field rule the default
    // 'onSubmit' mode leaves "passwords do not match" on screen after they do.
    mode: 'onBlur',
    defaultValues: { token: token ?? '', password: '', confirmPassword: '' },
  });

  const onSubmit = (values: ResetPasswordInput) => {
    reset.mutate(values, {
      onError: (error) => {
        // An unknown or expired code comes back as a field error on `token`, so
        // the message lands on the field the user can do something about.
        if (error.fieldErrors) {
          for (const [field, messages] of Object.entries(error.fieldErrors)) {
            setError(field as keyof ResetPasswordInput, { message: messages.join(' ') });
          }
          return;
        }
        setError('root', { message: error.message });
      },
    });
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 justify-center p-6"
      >
        <View className="gap-2">
          <Text className="text-2xl font-semibold">
            {reset.isSuccess ? t('auth.resetDoneTitle') : t('auth.resetPasswordTitle')}
          </Text>
          <Text className="text-muted-foreground">
            {reset.isSuccess ? t('auth.resetDone') : t('auth.resetPasswordSubtitle')}
          </Text>
        </View>

        {reset.isSuccess ? (
          <View className="mt-8">
            {/* `replace`, so the back gesture cannot return to a spent code. */}
            <Link href="/login" replace asChild>
              <Button>
                <Text>{t('auth.signIn')}</Text>
              </Button>
            </Link>
          </View>
        ) : (
          <View className="mt-8 gap-4">
            <Controller
              control={control}
              name="token"
              render={({ field, fieldState }) => (
                <View className="gap-1.5">
                  <Text nativeID="token-label" className="text-sm font-medium">
                    {t('auth.resetCode')}
                  </Text>
                  <Input
                    accessibilityLabelledBy="token-label"
                    autoCapitalize="none"
                    autoComplete="one-time-code"
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

            <Controller
              control={control}
              name="password"
              render={({ field, fieldState }) => (
                <View className="gap-1.5">
                  <Text nativeID="new-password-label" className="text-sm font-medium">
                    {t('auth.newPassword')}
                  </Text>
                  <Input
                    accessibilityLabelledBy="new-password-label"
                    autoCapitalize="none"
                    autoComplete="new-password"
                    secureTextEntry
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

            <Controller
              control={control}
              name="confirmPassword"
              render={({ field, fieldState }) => (
                <View className="gap-1.5">
                  <Text nativeID="confirm-password-label" className="text-sm font-medium">
                    {t('auth.confirmPassword')}
                  </Text>
                  <Input
                    accessibilityLabelledBy="confirm-password-label"
                    autoCapitalize="none"
                    autoComplete="new-password"
                    secureTextEntry
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                  />
                  {/* The mismatch error is attached to this field by superRefine,
                      so it renders here rather than at the form root. */}
                  {fieldState.error ? (
                    <Text className="text-sm text-destructive">{fieldState.error.message}</Text>
                  ) : null}
                </View>
              )}
            />

            {formState.errors.root ? (
              <Text accessibilityLiveRegion="polite" className="text-sm text-destructive">
                {formState.errors.root.message}
              </Text>
            ) : null}

            <Button
              disabled={reset.isPending}
              onPress={() => {
                void handleSubmit(onSubmit)();
              }}
            >
              <Text>{reset.isPending ? t('auth.updatingPassword') : t('auth.updatePassword')}</Text>
            </Button>

            <Text className="text-center text-xs text-muted-foreground">
              {t('auth.resetDemoHint')}
            </Text>

            <Link href="/login" asChild>
              <Pressable accessibilityRole="link" hitSlop={8}>
                <Text className="text-center text-sm text-primary">{t('auth.backToSignIn')}</Text>
              </Pressable>
            </Link>
          </View>
        )}
      </KeyboardAvoidingView>
    </Screen>
  );
}

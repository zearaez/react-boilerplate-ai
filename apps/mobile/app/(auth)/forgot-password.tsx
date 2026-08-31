import { KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';

import { Link } from 'expo-router';

import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';

import {
  type ForgotPasswordInput,
  forgotPasswordInputSchema,
  useRequestPasswordReset,
  useTranslation,
} from '@repo/core';

import { Screen } from '~/components/screen';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Text } from '~/components/ui/text';

/**
 * Step one of the reset flow, sharing `forgotPasswordInputSchema` and
 * `useRequestPasswordReset` with the web page — so the email rule and the
 * request itself cannot drift between platforms.
 *
 * The success copy is deliberately conditional ("if an account exists"): the
 * endpoint answers the same way for an address with no account, and saying an
 * email was sent would leak what the endpoint refuses to.
 *
 * Counterpart: apps/web/src/features/auth/forgot-password-page.tsx.
 */
export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const request = useRequestPasswordReset();

  const { control, handleSubmit, setError, formState } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordInputSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = (values: ForgotPasswordInput) => {
    request.mutate(values, {
      onError: (error) => {
        if (error.fieldErrors) {
          for (const [field, messages] of Object.entries(error.fieldErrors)) {
            setError(field as keyof ForgotPasswordInput, { message: messages.join(' ') });
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
            {request.isSuccess ? t('auth.resetSentTitle') : t('auth.forgotPasswordTitle')}
          </Text>
          <Text className="text-muted-foreground">
            {request.isSuccess
              ? // `variables` is the submitted input, so this shows the address
                // actually sent rather than whatever is in the field now.
                t('auth.resetSent', { email: request.variables.email })
              : t('auth.forgotPasswordSubtitle')}
          </Text>
        </View>

        {request.isSuccess ? (
          <View className="mt-8 gap-4">
            <Link href="/reset-password" asChild>
              <Button>
                <Text>{t('auth.enterResetCode')}</Text>
              </Button>
            </Link>

            <Link href="/login" asChild>
              <Pressable accessibilityRole="link" hitSlop={8}>
                <Text className="text-center text-sm text-primary">{t('auth.backToSignIn')}</Text>
              </Pressable>
            </Link>
          </View>
        ) : (
          <View className="mt-8 gap-4">
            <Controller
              control={control}
              name="email"
              render={({ field, fieldState }) => (
                <View className="gap-1.5">
                  <Text nativeID="email-label" className="text-sm font-medium">
                    {t('auth.email')}
                  </Text>
                  <Input
                    accessibilityLabelledBy="email-label"
                    autoCapitalize="none"
                    autoComplete="email"
                    keyboardType="email-address"
                    placeholder={t('auth.emailPlaceholder')}
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

            {formState.errors.root ? (
              <Text accessibilityLiveRegion="polite" className="text-sm text-destructive">
                {formState.errors.root.message}
              </Text>
            ) : null}

            <Button
              disabled={request.isPending}
              onPress={() => {
                void handleSubmit(onSubmit)();
              }}
            >
              <Text>
                {request.isPending ? t('auth.sendingResetCode') : t('auth.sendResetCode')}
              </Text>
            </Button>

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

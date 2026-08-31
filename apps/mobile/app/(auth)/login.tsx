import { KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';

import { Link } from 'expo-router';

import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';

import { type LoginInput, loginInputSchema, useLogin, useTranslation } from '@repo/core';

import { Screen } from '~/components/screen';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Text } from '~/components/ui/text';

/**
 * Uses the SAME `loginInputSchema` as apps/web's login page, so the email rule
 * and the 8-character minimum cannot drift between platforms.
 *
 * No navigation on success: signing in flips useAuthStore.status, and
 * <Stack.Protected> in app/_layout.tsx swaps the stack. Calling router.replace()
 * here as well would fight the guard.
 */
export default function LoginScreen() {
  const { t } = useTranslation();
  const login = useLogin();

  const { control, handleSubmit, setError, formState } = useForm<LoginInput>({
    resolver: zodResolver(loginInputSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = (values: LoginInput) => {
    login.mutate(values, {
      onError: (error) => {
        if (error.fieldErrors) {
          for (const [field, messages] of Object.entries(error.fieldErrors)) {
            setError(field as keyof LoginInput, { message: messages.join(' ') });
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
          <Text className="text-2xl font-semibold">{t('auth.welcomeTitle')}</Text>
          <Text className="text-muted-foreground">{t('auth.welcomeSubtitle')}</Text>
        </View>

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

          <Controller
            control={control}
            name="password"
            render={({ field, fieldState }) => (
              <View className="gap-1.5">
                <Text nativeID="password-label" className="text-sm font-medium">
                  {t('auth.password')}
                </Text>
                <Input
                  accessibilityLabelledBy="password-label"
                  autoCapitalize="none"
                  autoComplete="current-password"
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

          {formState.errors.root ? (
            <Text accessibilityLiveRegion="polite" className="text-sm text-destructive">
              {formState.errors.root.message}
            </Text>
          ) : null}

          <Button
            disabled={login.isPending}
            onPress={() => {
              void handleSubmit(onSubmit)();
            }}
          >
            <Text>{login.isPending ? t('auth.signingIn') : t('auth.signIn')}</Text>
          </Button>

          <Link href="/forgot-password" asChild>
            <Pressable accessibilityRole="link" hitSlop={8}>
              <Text className="text-center text-sm text-primary">{t('auth.forgotPassword')}</Text>
            </Pressable>
          </Link>

          <Text className="text-center text-xs text-muted-foreground">{t('auth.demoHint')}</Text>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

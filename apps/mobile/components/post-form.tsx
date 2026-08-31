import { Pressable, View } from 'react-native';

import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';

import {
  type ApiError,
  type CreatePostInput,
  createPostInputSchema,
  useTranslation,
} from '@repo/core';

import { Button } from '~/components/ui/button';
import { Input, Textarea } from '~/components/ui/input';
import { Text } from '~/components/ui/text';

/**
 * Counterpart: apps/web/src/features/posts/post-form.tsx — keep props in sync.
 *
 * Driven by `createPostInputSchema` from @repo/core, exactly like the web form,
 * so the two cannot disagree about what is valid or about the wording of an error
 * even though the markup is written twice.
 */
export interface PostFormProps {
  defaultValues?: Partial<CreatePostInput>;
  submitLabel: string;
  isSubmitting: boolean;
  error?: ApiError | null;
  onSubmit: (values: CreatePostInput) => void;
  onCancel?: () => void;
}

export function PostForm({
  defaultValues,
  submitLabel,
  isSubmitting,
  error,
  onSubmit,
  onCancel,
}: PostFormProps) {
  const { t } = useTranslation();

  const { control, handleSubmit, formState } = useForm<CreatePostInput>({
    resolver: zodResolver(createPostInputSchema),
    defaultValues: {
      title: defaultValues?.title ?? '',
      body: defaultValues?.body ?? '',
      published: defaultValues?.published ?? false,
    },
  });

  return (
    <View className="gap-6">
      <Controller
        control={control}
        name="title"
        render={({ field, fieldState }) => (
          <View className="gap-1.5">
            <Text nativeID="title-label" className="text-sm font-medium">
              {t('posts.fields.title')}
            </Text>
            <Input
              accessibilityLabelledBy="title-label"
              placeholder={t('posts.fields.titlePlaceholder')}
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
        name="body"
        render={({ field, fieldState }) => (
          <View className="gap-1.5">
            <Text nativeID="body-label" className="text-sm font-medium">
              {t('posts.fields.body')}
            </Text>
            <Textarea
              accessibilityLabelledBy="body-label"
              placeholder={t('posts.fields.bodyPlaceholder')}
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
        name="published"
        render={({ field }) => (
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: field.value ?? false }}
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
            <Text className="text-sm">{t('posts.fields.published')}</Text>
          </Pressable>
        )}
      />

      {error ? (
        <Text accessibilityLiveRegion="polite" className="text-sm text-destructive">
          {error.message}
        </Text>
      ) : null}

      <View className="gap-2">
        <Button
          disabled={isSubmitting || formState.isSubmitting}
          onPress={() => {
            void handleSubmit(onSubmit)();
          }}
        >
          <Text>{isSubmitting ? t('common.saving') : submitLabel}</Text>
        </Button>

        {onCancel ? (
          <Button variant="ghost" onPress={onCancel}>
            <Text>{t('common.cancel')}</Text>
          </Button>
        ) : null}
      </View>
    </View>
  );
}

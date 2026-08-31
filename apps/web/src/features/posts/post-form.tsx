import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import {
  type ApiError,
  type CreatePostInput,
  createPostInputSchema,
  useTranslation,
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
import { Textarea } from '@/components/ui/textarea';

/**
 * Counterpart: apps/mobile/components/post-form.tsx — keep props in sync.
 *
 * Both forms are driven by `createPostInputSchema` from @repo/core, so the
 * validation rules and messages cannot drift between platforms even though the
 * markup is written twice.
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

  const form = useForm<CreatePostInput>({
    resolver: zodResolver(createPostInputSchema),
    defaultValues: {
      title: defaultValues?.title ?? '',
      body: defaultValues?.body ?? '',
      published: defaultValues?.published ?? false,
    },
  });

  return (
    <Form {...form}>
      {/* `void` because handleSubmit returns a promise and onSubmit expects void. */}
      <form
        onSubmit={(event) => {
          void form.handleSubmit(onSubmit)(event);
        }}
        className="space-y-6"
        noValidate
      >
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('posts.fields.title')}</FormLabel>
              <FormControl>
                <Input placeholder={t('posts.fields.titlePlaceholder')} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="body"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('posts.fields.body')}</FormLabel>
              <FormControl>
                <Textarea rows={8} placeholder={t('posts.fields.bodyPlaceholder')} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="published"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center gap-2">
                <FormControl>
                  <input
                    type="checkbox"
                    className="size-4 rounded border-input"
                    checked={field.value ?? false}
                    onChange={(event) => {
                      field.onChange(event.target.checked);
                    }}
                    onBlur={field.onBlur}
                    name={field.name}
                    ref={field.ref}
                  />
                </FormControl>
                <FormLabel className="font-normal">{t('posts.fields.published')}</FormLabel>
              </div>
              <FormDescription>{t('posts.draft')}</FormDescription>
            </FormItem>
          )}
        />

        {error ? (
          <p role="alert" className="text-sm font-medium text-destructive">
            {error.message}
          </p>
        ) : null}

        <div className="flex gap-2">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? t('common.saving') : submitLabel}
          </Button>
          {onCancel ? (
            <Button type="button" variant="ghost" onClick={onCancel}>
              {t('common.cancel')}
            </Button>
          ) : null}
        </div>
      </form>
    </Form>
  );
}

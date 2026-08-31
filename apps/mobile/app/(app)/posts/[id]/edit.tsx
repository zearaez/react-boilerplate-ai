import { ScrollView } from 'react-native';

import { useLocalSearchParams, useRouter } from 'expo-router';

import { usePostQuery, useTranslation, useUpdatePost } from '@repo/core';

import { PostForm } from '~/components/post-form';
import { Screen } from '~/components/screen';
import { Skeleton } from '~/components/ui/skeleton';
import { Text } from '~/components/ui/text';

export default function EditPostScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const router = useRouter();

  const { data: post, isPending, isError, error } = usePostQuery(id);
  const updatePost = useUpdatePost();

  if (isPending) {
    return (
      <Screen className="gap-4 p-4">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-64 w-full" />
      </Screen>
    );
  }

  if (isError) {
    return (
      <Screen className="items-center justify-center p-6">
        <Text className="text-center text-sm text-muted-foreground">
          {error.kind === 'notFound' ? t('posts.notFound') : error.message}
        </Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerClassName="p-4" keyboardShouldPersistTaps="handled">
        <PostForm
          defaultValues={{ title: post.title, body: post.body, published: post.published }}
          submitLabel={t('common.save')}
          isSubmitting={updatePost.isPending}
          error={updatePost.error}
          onCancel={() => {
            router.back();
          }}
          onSubmit={(values) => {
            // Editing the seeded 'post-fail' record shows the optimistic update
            // in useUpdatePost apply instantly and then roll back.
            updatePost.mutate(
              { id: post.id, data: values },
              {
                onSuccess: () => {
                  router.replace(`/posts/${post.id}`);
                },
              },
            );
          }}
        />
      </ScrollView>
    </Screen>
  );
}

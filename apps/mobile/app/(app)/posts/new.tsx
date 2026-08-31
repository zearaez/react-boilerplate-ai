import { ScrollView } from 'react-native';

import { useRouter } from 'expo-router';

import { useCreatePost, useTranslation } from '@repo/core';

import { PostForm } from '~/components/post-form';
import { Screen } from '~/components/screen';

export default function NewPostScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const createPost = useCreatePost();

  return (
    <Screen>
      <ScrollView contentContainerClassName="p-4" keyboardShouldPersistTaps="handled">
        <PostForm
          submitLabel={t('posts.create')}
          isSubmitting={createPost.isPending}
          error={createPost.error}
          onCancel={() => {
            router.back();
          }}
          onSubmit={(values) => {
            createPost.mutate(values, {
              onSuccess: (created) => {
                router.replace(`/posts/${created.id}`);
              },
            });
          }}
        />
      </ScrollView>
    </Screen>
  );
}

import { useNavigate } from 'react-router';

import { useCreatePost, useTranslation } from '@repo/core';

import { PostForm } from './post-form';

export function PostCreatePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const createPost = useCreatePost();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">{t('posts.new')}</h1>

      <PostForm
        submitLabel={t('posts.create')}
        isSubmitting={createPost.isPending}
        error={createPost.error}
        onCancel={() => {
          void navigate(-1);
        }}
        onSubmit={(values) => {
          createPost.mutate(values, {
            onSuccess: (created) => {
              void navigate(`/posts/${created.id}`, { replace: true });
            },
          });
        }}
      />
    </div>
  );
}

import { useNavigate, useParams } from 'react-router';

import { usePostQuery, useTranslation, useUpdatePost } from '@repo/core';

import { Skeleton } from '@/components/ui/skeleton';

import { PostForm } from './post-form';

export function PostEditPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { data: post, isPending, isError, error } = usePostQuery(id);
  const updatePost = useUpdatePost();

  if (isPending) {
    return (
      <output aria-busy="true" className="block space-y-4">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-64 w-full" />
      </output>
    );
  }

  if (isError) {
    return (
      <p role="alert" className="text-sm text-muted-foreground">
        {error.kind === 'notFound' ? t('posts.notFound') : error.message}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">{t('posts.editTitle')}</h1>

      <PostForm
        defaultValues={{ title: post.title, body: post.body, published: post.published }}
        submitLabel={t('common.save')}
        isSubmitting={updatePost.isPending}
        error={updatePost.error}
        onCancel={() => {
          void navigate(-1);
        }}
        onSubmit={(values) => {
          // Try editing the seeded 'post-fail' record to watch the optimistic
          // update in useUpdatePost apply and then roll back.
          updatePost.mutate(
            { id: post.id, data: values },
            {
              onSuccess: () => {
                void navigate(`/posts/${post.id}`, { replace: true });
              },
            },
          );
        }}
      />
    </div>
  );
}

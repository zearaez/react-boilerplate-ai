import { Pencil, Trash2 } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router';

import { useDeletePost, usePostQuery, useTranslation } from '@repo/core';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';

export function PostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { data: post, isPending, isError, error } = usePostQuery(id);
  const deletePost = useDeletePost();

  if (isPending) {
    return (
      <output aria-busy="true" className="block space-y-4">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-40 w-full" />
      </output>
    );
  }

  if (isError) {
    return (
      <div role="alert" className="space-y-2">
        <h1 className="text-lg font-semibold">{t('common.somethingWentWrong')}</h1>
        <p className="text-sm text-muted-foreground">
          {error.kind === 'notFound' ? t('posts.notFound') : error.message}
        </p>
      </div>
    );
  }

  return (
    <article className="space-y-6">
      <header className="space-y-2">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-semibold tracking-tight">{post.title}</h1>
          <Badge variant={post.published ? 'default' : 'secondary'}>
            {post.published ? t('posts.published') : t('posts.draft')}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {t('posts.byAuthor', { name: post.authorName })}
        </p>
      </header>

      <p className="whitespace-pre-wrap leading-relaxed">{post.body}</p>

      <div className="flex gap-2">
        <Button asChild variant="outline" size="sm">
          <Link to={`/posts/${post.id}/edit`}>
            <Pencil aria-hidden="true" />
            {t('common.edit')}
          </Link>
        </Button>

        <Dialog>
          <DialogTrigger asChild>
            <Button variant="destructive" size="sm">
              <Trash2 aria-hidden="true" />
              {t('common.delete')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('common.delete')}</DialogTitle>
              <DialogDescription>{t('posts.deleteConfirm')}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="destructive"
                disabled={deletePost.isPending}
                onClick={() => {
                  deletePost.mutate(post.id, {
                    onSuccess: () => {
                      void navigate('/', { replace: true });
                    },
                  });
                }}
              >
                {deletePost.isPending ? t('common.saving') : t('common.delete')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </article>
  );
}

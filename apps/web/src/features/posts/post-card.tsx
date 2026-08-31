import { Link } from 'react-router';

import { type Post, useTranslation } from '@repo/core';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Counterpart: apps/mobile/components/post-card.tsx — keep props in sync.
 *
 * The two files render differently but take the SAME props and show the same
 * information in the same order. When you change one, change the other in the
 * same commit.
 */
export interface PostCardProps {
  post: Post;
}

export function PostCard({ post }: PostCardProps) {
  const { t } = useTranslation();

  return (
    <Card className="transition-colors hover:bg-accent/50">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-base leading-snug">
            <Link to={`/posts/${post.id}`} className="hover:underline">
              {post.title}
            </Link>
          </CardTitle>
          <Badge variant={post.published ? 'default' : 'secondary'}>
            {post.published ? t('posts.published') : t('posts.draft')}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-2">
        <p className="line-clamp-2 text-sm text-muted-foreground">{post.body}</p>
        <p className="text-xs text-muted-foreground">
          {t('posts.byAuthor', { name: post.authorName })}
        </p>
      </CardContent>
    </Card>
  );
}

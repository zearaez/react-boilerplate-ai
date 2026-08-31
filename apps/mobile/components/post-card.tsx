import { Pressable, View } from 'react-native';

import { Link } from 'expo-router';

import { type Post, useTranslation } from '@repo/core';

import { Badge } from '~/components/ui/badge';
import { Card, CardContent, CardHeader } from '~/components/ui/card';
import { Text } from '~/components/ui/text';

/**
 * Counterpart: apps/web/src/features/posts/post-card.tsx — keep props in sync.
 *
 * Same props, same information, same order. Different markup, because the
 * platforms are different. When you change one, change the other in the same
 * commit.
 */
export interface PostCardProps {
  post: Post;
}

export function PostCard({ post }: PostCardProps) {
  const { t } = useTranslation();

  return (
    <Link href={`/posts/${post.id}`} asChild>
      <Pressable accessibilityRole="link">
        <Card>
          <CardHeader>
            <View className="flex-row items-start justify-between gap-3">
              <Text className="flex-1 font-semibold leading-snug">{post.title}</Text>
              <Badge variant={post.published ? 'default' : 'secondary'}>
                <Text>{post.published ? t('posts.published') : t('posts.draft')}</Text>
              </Badge>
            </View>
          </CardHeader>

          <CardContent>
            <Text numberOfLines={2} className="text-sm text-muted-foreground">
              {post.body}
            </Text>
            <Text className="text-xs text-muted-foreground">
              {t('posts.byAuthor', { name: post.authorName })}
            </Text>
          </CardContent>
        </Card>
      </Pressable>
    </Link>
  );
}

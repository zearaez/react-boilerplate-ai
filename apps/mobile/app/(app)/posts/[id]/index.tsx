import { Alert, ScrollView, View } from 'react-native';

import { Link, useLocalSearchParams, useRouter } from 'expo-router';

import { Pencil, Trash2 } from 'lucide-react-native';

import { useDeletePost, usePostQuery, useTranslation } from '@repo/core';

import { Screen } from '~/components/screen';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Skeleton } from '~/components/ui/skeleton';
import { Text } from '~/components/ui/text';

/**
 * Note the directory form: app/(app)/posts/[id]/index.tsx, not
 * app/(app)/posts/[id].tsx. Both would match /posts/123, and having both is a
 * route collision expo-router resolves unpredictably. Since this route needs a
 * sibling (edit.tsx), the directory form is the one to use.
 */
export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const router = useRouter();

  const { data: post, isPending, isError, error } = usePostQuery(id);
  const deletePost = useDeletePost();

  const confirmDelete = () => {
    Alert.alert(t('common.delete'), t('posts.deleteConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => {
          if (!post) return;
          deletePost.mutate(post.id, {
            onSuccess: () => {
              router.replace('/');
            },
          });
        },
      },
    ]);
  };

  if (isPending) {
    return (
      <Screen className="gap-4 p-4">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-40 w-full" />
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
      <ScrollView contentContainerClassName="gap-6 p-4">
        <View className="gap-2">
          <View className="flex-row items-start justify-between gap-3">
            <Text className="flex-1 text-2xl font-semibold">{post.title}</Text>
            <Badge variant={post.published ? 'default' : 'secondary'}>
              <Text>{post.published ? t('posts.published') : t('posts.draft')}</Text>
            </Badge>
          </View>
          <Text className="text-sm text-muted-foreground">
            {t('posts.byAuthor', { name: post.authorName })}
          </Text>
        </View>

        <Text className="leading-relaxed">{post.body}</Text>

        <View className="gap-2">
          <Link href={`/posts/${post.id}/edit`} asChild>
            <Button variant="outline">
              <Pencil size={18} className="text-foreground" />
              <Text>{t('common.edit')}</Text>
            </Button>
          </Link>

          <Button variant="destructive" disabled={deletePost.isPending} onPress={confirmDelete}>
            <Trash2 size={18} className="text-destructive-foreground" />
            <Text>{deletePost.isPending ? t('common.saving') : t('common.delete')}</Text>
          </Button>
        </View>
      </ScrollView>
    </Screen>
  );
}

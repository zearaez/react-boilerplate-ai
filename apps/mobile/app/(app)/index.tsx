import { FlatList, View } from 'react-native';

import { Link } from 'expo-router';

import { Plus } from 'lucide-react-native';

import { type Post, useDebouncedValue, usePostsQuery, useTranslation } from '@repo/core';

import { PostCard } from '~/components/post-card';
import { Screen } from '~/components/screen';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Skeleton } from '~/components/ui/skeleton';
import { Text } from '~/components/ui/text';
import { useUiStore } from '~/stores/ui-store';

/**
 * Counterpart: apps/web/src/features/posts/posts-list-page.tsx.
 *
 * Same five states in the same order — loading skeleton, error, empty, items,
 * load more — driven by the same usePostsQuery hook from @repo/core. Web renders
 * a "Load more" button; native uses onEndReached. That is the only difference.
 */
export default function PostsListScreen() {
  const { t } = useTranslation();

  // Same three parts as web: raw term in the UI store (so it survives navigation
  // and the field stays instant), debounced value into the query, keepPreviousData
  // in postsListOptions. See the comment in apps/web's counterpart.
  const search = useUiStore((state) => state.postsSearch);
  const setSearch = useUiStore((state) => state.setPostsSearch);
  const debouncedSearch = useDebouncedValue(search);

  const {
    posts,
    total,
    isPending,
    isError,
    error,
    refetch,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    isSearching,
  } = usePostsQuery({ search: debouncedSearch });

  if (isPending) {
    return (
      <Screen className="gap-3 p-4">
        {[0, 1, 2, 3].map((key) => (
          <Skeleton key={key} className="h-28 w-full" />
        ))}
      </Screen>
    );
  }

  if (isError) {
    return (
      <Screen className="items-center justify-center gap-4 p-6">
        <Text className="text-center text-sm text-muted-foreground">
          {error.kind === 'network' ? t('common.offline') : error.message}
        </Text>
        <Button
          variant="outline"
          onPress={() => {
            void refetch();
          }}
        >
          <Text>{t('common.retry')}</Text>
        </Button>
      </Screen>
    );
  }

  return (
    <Screen>
      <FlatList
        data={posts}
        keyExtractor={(post: Post) => post.id}
        contentContainerClassName="gap-3 p-4"
        renderItem={({ item }: { item: Post }) => <PostCard post={item} />}
        ListHeaderComponent={
          <View className="gap-3 pb-1">
            <Input
              aria-label={t('common.search')}
              placeholder={t('common.searchPlaceholder')}
              autoCapitalize="none"
              autoCorrect={false}
              clearButtonMode="while-editing"
              value={search}
              onChangeText={setSearch}
            />
            {total > 0 ? (
              <Text className="text-sm text-muted-foreground">
                {t('posts.countLabel', { count: total })}
              </Text>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <View className="items-center rounded-lg border border-dashed border-border p-10">
            {/* Two distinct empty states, same rule as web. */}
            <Text className="text-center text-sm text-muted-foreground">
              {isSearching ? t('common.noResults', { query: debouncedSearch }) : t('posts.empty')}
            </Text>
          </View>
        }
        ListFooterComponent={
          isFetchingNextPage ? (
            <Skeleton className="h-28 w-full" />
          ) : (
            <Link href="/posts/new" asChild>
              <Button className="mt-2">
                <Plus size={18} className="text-primary-foreground" />
                <Text>{t('posts.new')}</Text>
              </Button>
            </Link>
          )
        }
        onEndReachedThreshold={0.5}
        onEndReached={() => {
          // The guard matters: onEndReached fires repeatedly while scrolling, and
          // without it you queue a fetch per frame.
          if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
        }}
      />
    </Screen>
  );
}

import { Plus, Search } from 'lucide-react';
import { Link } from 'react-router';

import { useDebouncedValue, usePostsQuery, useTranslation } from '@repo/core';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useUiStore } from '@/stores/ui-store';

import { PostCard } from './post-card';

/**
 * Counterpart: apps/mobile/app/(app)/index.tsx — keep the state order in sync.
 *
 * Every list screen in this repo renders the same five states in the same order:
 *   loading skeleton -> error -> empty -> items -> load more
 * An agent reading either file should recognise the other immediately.
 */
export function PostsListPage() {
  const { t } = useTranslation();

  /**
   * THE SEARCH PATTERN. Three moving parts, and all three are needed:
   *
   *  1. The raw term lives in the UI store, so it survives navigating to a post
   *     and back. The INPUT is bound to this value, so typing is instant.
   *  2. `useDebouncedValue` is what the query sees, so a burst of keystrokes is one
   *     request rather than one per character.
   *  3. `keepPreviousData` in postsListOptions keeps the old list on screen while
   *     the new term loads; `isPlaceholderData` lets us dim it instead of blanking.
   *
   * Bind the input to the debounced value instead and the field feels broken.
   */
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
    isPlaceholderData,
    isSearching,
  } = usePostsQuery({ search: debouncedSearch });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('posts.listTitle')}</h1>
          {total > 0 ? (
            <p className="text-sm text-muted-foreground">
              {t('posts.countLabel', { count: total })}
            </p>
          ) : null}
        </div>

        <Button asChild size="sm">
          <Link to="/posts/new">
            <Plus aria-hidden="true" />
            {t('posts.new')}
          </Link>
        </Button>
      </div>

      <div className="relative">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          type="search"
          aria-label={t('common.search')}
          placeholder={t('common.searchPlaceholder')}
          className="pl-9"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
          }}
        />
      </div>

      {isPending ? (
        <output aria-busy="true" className="block space-y-3">
          {[0, 1, 2].map((key) => (
            <Skeleton key={key} className="h-28 w-full" />
          ))}
        </output>
      ) : isError ? (
        <div role="alert" className="space-y-3 rounded-lg border border-destructive/50 p-6">
          <p className="text-sm">
            {error.kind === 'network' ? t('common.offline') : error.message}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void refetch();
            }}
          >
            {t('common.retry')}
          </Button>
        </div>
      ) : posts.length === 0 ? (
        <p className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          {/* Two different empty states. Telling someone to "create the first post"
              when they simply mistyped a search term is the kind of small wrongness
              that makes an app feel careless. */}
          {isSearching ? t('common.noResults', { query: debouncedSearch }) : t('posts.empty')}
        </p>
      ) : (
        <>
          {/* Dimmed, not replaced: keepPreviousData means these are the previous
              term's results still on screen while the new ones load. */}
          <ul className={cn('space-y-3', isPlaceholderData && 'opacity-60 transition-opacity')}>
            {posts.map((post) => (
              <li key={post.id}>
                <PostCard post={post} />
              </li>
            ))}
          </ul>

          {hasNextPage ? (
            <Button
              variant="outline"
              className="w-full"
              disabled={isFetchingNextPage}
              onClick={() => {
                void fetchNextPage();
              }}
            >
              {isFetchingNextPage ? t('common.loading') : t('common.loadMore')}
            </Button>
          ) : null}
        </>
      )}
    </div>
  );
}

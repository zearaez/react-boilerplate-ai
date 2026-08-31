import { create } from 'zustand';

/**
 * REFERENCE: app-local client state.
 *
 * This is the other half of the rule in AGENTS.md. `useAuthStore` lives in
 * `@repo/core` because both apps need the same session with the same semantics.
 * THIS store lives in the app, because it is about how this particular UI is
 * arranged — and web and mobile have no reason to agree about that.
 *
 * How to decide where a piece of state goes:
 *
 *   Does the server own it?              -> not a store at all. TanStack Query.
 *   Do BOTH apps need identical rules?   -> a store in @repo/core.
 *   Is it about this UI's arrangement?   -> here.
 *   Does only one screen care?           -> useState in that screen.
 *
 * That last line matters most. This store exists only because the search term must
 * survive navigating to a post and back; a value one screen owns should stay in
 * `useState`, and moving it here would make it global for no reason.
 *
 * Note there is deliberately no `persist` middleware — see the comment in
 * @repo/core's auth store for why reading storage at module-evaluation time is a
 * trap. Session-lifetime memory is the right scope for a filter anyway.
 */
export type PostsDensity = 'comfortable' | 'compact';

interface UiState {
  /** Search term for the posts list, kept so it survives navigation. */
  postsSearch: string;
  setPostsSearch: (search: string) => void;
  clearPostsSearch: () => void;

  postsDensity: PostsDensity;
  togglePostsDensity: () => void;
}

export const useUiStore = create<UiState>()((set) => ({
  postsSearch: '',
  setPostsSearch: (postsSearch) => {
    set({ postsSearch });
  },
  clearPostsSearch: () => {
    set({ postsSearch: '' });
  },

  postsDensity: 'comfortable',
  togglePostsDensity: () => {
    set((state) => ({
      postsDensity: state.postsDensity === 'comfortable' ? 'compact' : 'comfortable',
    }));
  },
}));

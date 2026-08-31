import { screen } from '@testing-library/react-native';

import { renderScreen } from '~/test/render';

import { PostCard } from '../post-card';

import type { Post } from '@repo/core';

const post: Post = {
  id: 'post-001',
  title: 'Notes on shipping small',
  body: 'A body long enough to be worth truncating in the card layout.',
  authorId: 'user-1',
  authorName: 'Anisha Shrestha',
  published: true,
  createdAt: '2026-01-01T09:00:00.000Z',
};

/**
 * Mirrors apps/web/src/features/posts/__tests__/post-card.test.tsx.
 *
 * NOTE: `render` is AWAITED. React Native Testing Library 14 made render,
 * fireEvent, renderHook and act asynchronous — an un-awaited render is a floating
 * promise that lint catches, and silencing it would let the assertions race the
 * mount. Every RNTL 13-era snippet you find online omits the await.
 *
 * Asserting on rendered English ("Published") rather than the i18n key proves the
 * key actually exists in en.json.
 */
describe('PostCard', () => {
  it('renders the title, body and author', async () => {
    await renderScreen(<PostCard post={post} />);

    expect(screen.getByText(post.title)).toBeTruthy();
    expect(screen.getByText(post.body)).toBeTruthy();
    expect(screen.getByText(/Anisha Shrestha/)).toBeTruthy();
  });

  it('labels a published post', async () => {
    await renderScreen(<PostCard post={post} />);

    expect(screen.getByText('Published')).toBeTruthy();
  });

  it('labels an unpublished post as a draft', async () => {
    await renderScreen(<PostCard post={{ ...post, published: false }} />);

    expect(screen.getByText('Draft')).toBeTruthy();
  });

  it('exposes the card as a link for screen readers', async () => {
    await renderScreen(<PostCard post={post} />);

    expect(screen.getByRole('link')).toBeTruthy();
  });
});

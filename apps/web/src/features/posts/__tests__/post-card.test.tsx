import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderWithProviders } from '@/test/render';

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

describe('PostCard', () => {
  it('renders the title as a link to the detail route', () => {
    renderWithProviders(<PostCard post={post} />);

    const link = screen.getByRole('link', { name: post.title });
    expect(link).toHaveAttribute('href', '/posts/post-001');
  });

  it('shows the author and body', () => {
    renderWithProviders(<PostCard post={post} />);

    expect(screen.getByText(/Anisha Shrestha/)).toBeInTheDocument();
    expect(screen.getByText(post.body)).toBeInTheDocument();
  });

  it('labels a published post', () => {
    renderWithProviders(<PostCard post={post} />);

    // Asserting on the rendered English proves the i18n key exists. Asserting on
    // 'posts.published' would pass even with the key missing from en.json.
    expect(screen.getByText('Published')).toBeInTheDocument();
  });

  it('labels an unpublished post as a draft', () => {
    renderWithProviders(<PostCard post={{ ...post, published: false }} />);

    expect(screen.getByText('Draft')).toBeInTheDocument();
  });
});

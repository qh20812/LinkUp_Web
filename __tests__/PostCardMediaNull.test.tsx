import React from 'react'
import { renderWithProviders, screen, buildFeedPost } from './test-utils'
import type { FeedMedia } from '@/types'
import PostCard from '@/components/PostCard'

// Mock next/navigation (PostCard dùng useRouter)
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), refresh: jest.fn() }),
  usePathname: () => '/',
}))
// Mock next/link (renderPostContent render hashtag thành Link)
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}))
// Mock ExternalImage để render <img> thường
jest.mock('@/components/ExternalImage', () => ({
  __esModule: true,
  default: function MockExternalImage(props: React.ImgHTMLAttributes<HTMLImageElement>) {
    return <img {...props} />
  },
}))

const NULL_MEDIA = null as unknown as FeedMedia[]

describe('PostCard null media (regression: hashtag page crash)', () => {
  it('renders a text post whose media is null instead of crashing', () => {
    const post = buildFeedPost({ title: 'Hello', content: 'world', media: NULL_MEDIA })
    renderWithProviders(<PostCard post={post} />)

    expect(screen.getByText('Hello')).toBeInTheDocument()
    expect(screen.getByText('world')).toBeInTheDocument()
  })

  it('renders the empty-body fallback when title/content/media are all missing', () => {
    const post = buildFeedPost({ title: '', content: '', media: NULL_MEDIA })
    const { container } = renderWithProviders(<PostCard post={post} />)

    // Không crash + không render media grid
    expect(container.querySelector('[class*="mediaGrid"]')).not.toBeInTheDocument()
  })

  it('renders the author header (regression: hashtag page showed no username/avatar)', () => {
    const post = buildFeedPost({
      title: 'Hello',
      content: 'world',
      media: NULL_MEDIA,
      username: 'tagauthor',
      display_name: 'Tag Author',
      avatar_uri: 'https://cdn.example.com/a.png',
    })
    const { container } = renderWithProviders(<PostCard post={post} />)

    expect(screen.getByText('Tag Author')).toBeInTheDocument()
    expect(screen.getByText(/@tagauthor/)).toBeInTheDocument()
    expect(
      container.querySelector('img[src="https://cdn.example.com/a.png"]'),
    ).not.toBeNull()
  })

  it('renders a repost whose embedded shared_post media is null', () => {
    const shared = buildFeedPost({ title: 'Orig', content: 'orig content', media: NULL_MEDIA })
    const post = buildFeedPost({
      title: '',
      content: '',
      media: [],
      share_content: 'check this out',
      shared_from_post_id: shared.id,
      shared_post: shared,
    })
    renderWithProviders(<PostCard post={post} />)

    expect(screen.getByText('Orig')).toBeInTheDocument()
  })
})

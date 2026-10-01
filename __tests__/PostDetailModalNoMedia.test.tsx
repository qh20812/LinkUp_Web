import React from 'react'
import fs from 'node:fs'
import path from 'node:path'
import { renderWithProviders, screen, buildFeedPost, mockFetch, restoreFetch } from './test-utils'
import type { FeedMedia } from '@/types'
import { FollowedUserIdsProvider } from '@/contexts/FollowContext'
import PostDetailModal from '@/components/PostDetailModal'

// Mock next/navigation + link
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), refresh: jest.fn() }),
  usePathname: () => '/',
}))
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}))
// Mock ExternalImage + VideoPlayer (nặng, không cần cho test layout)
jest.mock('@/components/ExternalImage', () => ({
  __esModule: true,
  default: function MockExternalImage(props: React.ImgHTMLAttributes<HTMLImageElement>) {
    return <img {...props} />
  },
}))
jest.mock('@/components/VideoPlayer', () => ({
  __esModule: true,
  default: () => <div data-testid="video-mock" />,
}))

const NULL_MEDIA = null as unknown as FeedMedia[]

function renderModal(post: Parameters<typeof PostDetailModal>[0]['post']) {
  return renderWithProviders(
    <FollowedUserIdsProvider>
      <PostDetailModal post={post} open onClose={jest.fn()} />
    </FollowedUserIdsProvider>,
  )
}

describe('PostDetailModal text-only layout + null media', () => {
  beforeEach(() => {
    mockFetch({ body: { data: [] } })
    window.localStorage.clear()
  })

  afterEach(() => {
    restoreFetch()
  })

  it('renders no media pane for a text-only post', () => {
    const post = buildFeedPost({ title: 'Text only', content: 'hello world', media: [] })
    const { container } = renderModal(post)

    expect(screen.getByText('Text only')).toBeInTheDocument()
    expect(container.querySelector('img')).toBeNull()
    expect(screen.queryByTestId('video-mock')).toBeNull()
  })

  it('renders the media pane for a post with an image', () => {
    const post = buildFeedPost({
      title: 'With media',
      content: 'see pic',
      media: [{ id: 'm1', user_id: 'user-1', file_uri: 'https://example.com/a.jpg', file_type: 'image/jpeg' }],
    })
    const { container } = renderModal(post)

    expect(screen.getByText('With media')).toBeInTheDocument()
    expect(container.querySelector('img[src="https://example.com/a.jpg"]')).not.toBeNull()
  })

  it('does not crash when media is null', () => {
    const post = buildFeedPost({ title: 'Null media', content: 'no media here', media: NULL_MEDIA })
    const { container } = renderModal(post)

    expect(screen.getByText('Null media')).toBeInTheDocument()
    expect(container.querySelector('img')).toBeNull()
  })

  it('defines the compact no-media modal style (680px, height auto)', () => {
    const css = fs.readFileSync(
      path.join(__dirname, '..', 'components', 'PostDetailModal.module.css'),
      'utf-8',
    )
    expect(css).toMatch(/\.modalNoMedia\s*\{[^}]*width:\s*min\(680px,\s*100%\)[^}]*height:\s*auto[^}]*\}/)
  })
})

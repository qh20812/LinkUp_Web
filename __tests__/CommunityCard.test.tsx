import React from 'react'
import {
  renderWithProviders,
  screen,
  buildCommunity,
  buildCommunityDetail,
} from './test-utils'

// Mock next/navigation (Link renders <a>, useRouter unused by card now but kept safe)
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}))

// Mock ExternalImage to render a simple <img>
jest.mock('@/components/ExternalImage', () => {
  return function MockExternalImage(props: React.ImgHTMLAttributes<HTMLImageElement>) {
    return <img {...props} />
  }
})

import CommunityCard from '@/components/communities/CommunityCard'

describe('CommunityCard', () => {
  it('renders community name', () => {
    const community = buildCommunity({ name: 'Go Developers' })
    renderWithProviders(<CommunityCard community={community} />)

    expect(screen.getByText('Go Developers')).toBeInTheDocument()
  })

  it('renders description when provided', () => {
    const community = buildCommunity({ description: 'A place for Go devs' })
    renderWithProviders(<CommunityCard community={community} />)

    expect(screen.getByText('A place for Go devs')).toBeInTheDocument()
  })

  it('does not render description when empty', () => {
    const community = buildCommunity({ description: '' })
    const { container } = renderWithProviders(<CommunityCard community={community} />)

    expect(container.querySelector('[class*="description"]')).not.toBeInTheDocument()
  })

  it('renders member count', () => {
    const community = buildCommunity({ member_count: 1234 })
    renderWithProviders(<CommunityCard community={community} />)

    expect(screen.getByText(/1\.234/)).toBeInTheDocument()
  })

  it('renders privacy badge for public', () => {
    const community = buildCommunity({ privacy: 'public' })
    renderWithProviders(<CommunityCard community={community} />)

    expect(screen.getByText(/communities\.privacyPublic/)).toBeInTheDocument()
  })

  it('renders privacy badge for invitation_only', () => {
    const community = buildCommunity({ privacy: 'invitation_only' })
    renderWithProviders(<CommunityCard community={community} />)

    expect(screen.getByText(/communities\.privacyInvitation/)).toBeInTheDocument()
  })

  it('renders avatar image when avatar_uri is provided', () => {
    const community = buildCommunity({ avatar_uri: 'https://example.com/avatar.jpg' })
    renderWithProviders(<CommunityCard community={community} />)

    const img = screen.getByAltText(community.name)
    expect(img).toHaveAttribute('src', 'https://example.com/avatar.jpg')
  })

  it('renders fallback icon when no avatar_uri', () => {
    const community = buildCommunity({ avatar_uri: '' })
    const { container } = renderWithProviders(<CommunityCard community={community} />)

    expect(container.querySelector('.bx.bx-group')).toBeInTheDocument()
  })

  it('renders as a link to the detail page', () => {
    const community = buildCommunity()
    renderWithProviders(<CommunityCard community={community} />)

    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', `/communities/${community.id}`)
  })

  it('shows enter-code action for invitation_only communities', () => {
    const community = buildCommunity({ privacy: 'invitation_only' })
    renderWithProviders(<CommunityCard community={community} />)

    expect(screen.getByText(/communities\.enterCode/)).toBeInTheDocument()
  })

  it('shows manage action for owned communities', () => {
    const community = buildCommunity({ is_creator: true })
    renderWithProviders(<CommunityCard community={community} />)

    expect(screen.getByText(/communities\.manage/)).toBeInTheDocument()
  })

  it('renders cover image when background_uri is provided', () => {
    const community = buildCommunity({ background_uri: 'https://example.com/cover.jpg' })
    const { container } = renderWithProviders(<CommunityCard community={community} />)

    const imgs = container.querySelectorAll('img')
    const srcs = Array.from(imgs).map((img) => img.getAttribute('src'))
    expect(srcs).toContain('https://example.com/cover.jpg')
  })

  it('keeps buildCommunityDetail helper in sync', () => {
    const detail = buildCommunityDetail()
    expect(detail.background_uri).toBeDefined()
  })
})

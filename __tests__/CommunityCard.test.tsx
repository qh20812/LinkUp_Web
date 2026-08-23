import React from 'react'
import {
  renderWithProviders,
  screen,
  buildCommunity,
  buildCommunityDetail,
} from './test-utils'

// Mock next/navigation
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

  it('renders privacy badge for code', () => {
    const community = buildCommunity({ privacy: 'code' })
    renderWithProviders(<CommunityCard community={community} />)

    expect(screen.getByText(/communities\.privacyCode/)).toBeInTheDocument()
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

    expect(container.querySelector('.bx.bxs-chat')).toBeInTheDocument()
  })

  it('has role="link" for accessibility', () => {
    const community = buildCommunity()
    renderWithProviders(<CommunityCard community={community} />)

    expect(screen.getByRole('link')).toBeInTheDocument()
  })
})

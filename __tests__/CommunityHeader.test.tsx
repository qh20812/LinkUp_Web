import React from 'react'
import {
  renderWithProviders,
  screen,
  buildCommunityDetail,
} from './test-utils'

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}))

jest.mock('next/link', () => {
  return function MockLink({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
    return <a href={href} {...props}>{children}</a>
  }
})

jest.mock('@/components/ExternalImage', () => {
  return function MockExternalImage(props: React.ImgHTMLAttributes<HTMLImageElement>) {
    return <img {...props} />
  }
})

jest.mock('@/components/communities/JoinButton', () => {
  return function MockJoinButton({ status, onStatusChange }: { status: string; onStatusChange: (s: string) => void }) {
    return <button data-testid="join-button" onClick={() => onStatusChange('member')}>{status}</button>
  }
})

import CommunityHeader from '@/components/communities/CommunityHeader'

describe('CommunityHeader', () => {
  it('renders community name', () => {
    const community = buildCommunityDetail({ name: 'React Vietnam' })
    renderWithProviders(<CommunityHeader community={community} onStatusChange={jest.fn()} />)

    expect(screen.getByText('React Vietnam')).toBeInTheDocument()
  })

  it('renders description when provided', () => {
    const community = buildCommunityDetail({ description: 'React community in VN' })
    renderWithProviders(<CommunityHeader community={community} onStatusChange={jest.fn()} />)

    expect(screen.getByText('React community in VN')).toBeInTheDocument()
  })

  it('does not render description when empty', () => {
    const community = buildCommunityDetail({ description: '' })
    renderWithProviders(<CommunityHeader community={community} onStatusChange={jest.fn()} />)

    expect(screen.queryByText(/React community/)).not.toBeInTheDocument()
  })

  it('renders member count', () => {
    const community = buildCommunityDetail({ member_count: 5432 })
    renderWithProviders(<CommunityHeader community={community} onStatusChange={jest.fn()} />)

    expect(screen.getByText(/5,432/)).toBeInTheDocument()
  })

  it('renders privacy label', () => {
    const community = buildCommunityDetail({ privacy: 'code' })
    renderWithProviders(<CommunityHeader community={community} onStatusChange={jest.fn()} />)

    expect(screen.getByText(/communities\.privacyCode/)).toBeInTheDocument()
  })

  it('renders creator link with correct href', () => {
    const community = buildCommunityDetail({ creator_id: 'user-99', creator_name: 'alice' })
    renderWithProviders(<CommunityHeader community={community} onStatusChange={jest.fn()} />)

    const link = screen.getByText('@alice')
    expect(link).toHaveAttribute('href', '/profile/user-99')
  })

  it('renders JoinButton with correct props', () => {
    const community = buildCommunityDetail({ id: 'comm-1', membership_status: 'none', privacy: 'public' })
    const onStatusChange = jest.fn()
    renderWithProviders(<CommunityHeader community={community} onStatusChange={onStatusChange} />)

    const btn = screen.getByTestId('join-button')
    expect(btn).toHaveTextContent('none')
  })

  it('renders background image when background_uri is provided', () => {
    const community = buildCommunityDetail({ background_uri: 'https://example.com/bg.jpg' })
    renderWithProviders(<CommunityHeader community={community} onStatusChange={jest.fn()} />)

    const img = screen.getByAltText(community.name)
    expect(img).toHaveAttribute('src', 'https://example.com/bg.jpg')
  })

  it('renders avatar image when avatar_uri is provided', () => {
    const community = buildCommunityDetail({ avatar_uri: 'https://example.com/avatar.jpg' })
    renderWithProviders(<CommunityHeader community={community} onStatusChange={jest.fn()} />)

    const avatars = screen.getAllByAltText(community.name)
    expect(avatars.length).toBeGreaterThanOrEqual(1)
  })
})

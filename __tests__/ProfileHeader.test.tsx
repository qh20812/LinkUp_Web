import React from 'react'
import { renderWithProviders, screen, userEvent } from './test-utils'

// ProfileHeader cần PresenceProvider (không nằm trong AllProviders của test-utils).
jest.mock('@/contexts/PresenceContext', () => ({
  usePresence: () => ({ isOnline: () => false, prefetchPresence: () => {} }),
}))

jest.mock('next/link', () => {
  return function MockLink({
    children,
    href,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
    return <a href={href} {...props}>{children}</a>
  }
})

jest.mock('@/components/ExternalImage', () => {
  return function MockExternalImage(props: React.ImgHTMLAttributes<HTMLImageElement>) {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text -- mock trong test, alt đi qua props
    return <img {...props} />
  }
})

import ProfileHeader from '@/components/profile/ProfileHeader'
import type { ViewProfileResponse } from '@/types'

function buildProfile(overrides: Partial<ViewProfileResponse> = {}): ViewProfileResponse {
  return {
    display_name: 'Minh Anh',
    phone_number: '0987654321',
    avatar_uri: 'https://example.com/avatar.jpg',
    cover_uri: '',
    username: 'minhanh',
    post_count: 12,
    friend_count: 0,
    created_at: '2024-01-01T00:00:00Z',
    bio: '',
    location: 'Hà Nội',
    hometown_province: '',
    current_province: '',
    current_ward: '',
    work: '',
    education: '',
    work_other: '',
    website: '',
    is_private_profile: false,
    is_private_posts: false,
    allow_stranger_friend_request: true,
    ...overrides,
  }
}

describe('ProfileHeader — avatar', () => {
  it('opens the lightbox directly when the target user has no story', async () => {
    const user = userEvent.setup()
    const onViewAvatar = jest.fn()
    renderWithProviders(
      <ProfileHeader
        profile={buildProfile()}
        stats={null}
        isSelf={false}
        isPrivate={false}
        showActions={false}
        hasStory={false}
        onViewAvatar={onViewAvatar}
      />,
    )

    await user.click(screen.getByTestId('profile-avatar'))

    expect(onViewAvatar).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('shows a 2-item menu when the target user has a story', async () => {
    const user = userEvent.setup()
    const onViewAvatar = jest.fn()
    const onViewStory = jest.fn()
    renderWithProviders(
      <ProfileHeader
        profile={buildProfile()}
        stats={null}
        isSelf={false}
        isPrivate={false}
        showActions={false}
        hasStory
        onViewAvatar={onViewAvatar}
        onViewStory={onViewStory}
      />,
    )

    await user.click(screen.getByTestId('profile-avatar'))

    const items = screen.getAllByRole('menuitem')
    expect(items).toHaveLength(2)
    expect(onViewAvatar).not.toHaveBeenCalled()

    // Thứ tự cố định: xem story trước, xem ảnh sau.
    await user.click(items[1])
    expect(onViewAvatar).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('keeps the menu for your own profile without a story (view + change)', async () => {
    const user = userEvent.setup()
    renderWithProviders(
      <ProfileHeader
        profile={buildProfile()}
        stats={null}
        isSelf
        isPrivate={false}
        hasStory={false}
        onViewAvatar={jest.fn()}
        onAvatarChange={jest.fn()}
      />,
    )

    await user.click(screen.getByTestId('profile-avatar'))

    expect(screen.getAllByRole('menuitem')).toHaveLength(2)
  })

  it('adds the story item to your own menu when you have a story', async () => {
    const user = userEvent.setup()
    renderWithProviders(
      <ProfileHeader
        profile={buildProfile()}
        stats={null}
        isSelf
        isPrivate={false}
        hasStory
        onViewAvatar={jest.fn()}
        onAvatarChange={jest.fn()}
        onViewStory={jest.fn()}
      />,
    )

    await user.click(screen.getByTestId('profile-avatar'))

    expect(screen.getAllByRole('menuitem')).toHaveLength(3)
  })

  it('opens the file picker straight away when you have no avatar yet', async () => {
    const user = userEvent.setup()
    const clickSpy = jest.spyOn(HTMLInputElement.prototype, 'click')
    renderWithProviders(
      <ProfileHeader
        profile={buildProfile({ avatar_uri: '' })}
        stats={null}
        isSelf
        isPrivate={false}
        onViewAvatar={jest.fn()}
        onAvatarChange={jest.fn()}
      />,
    )

    await user.click(screen.getByTestId('profile-avatar'))

    // Chỉ còn "đổi ảnh" nên không mở menu, chạy thẳng hộp chọn tệp.
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(clickSpy).toHaveBeenCalledTimes(1)
    clickSpy.mockRestore()
  })

  it('does nothing when another user has no avatar', async () => {
    const onViewAvatar = jest.fn()
    renderWithProviders(
      <ProfileHeader
        profile={buildProfile({ avatar_uri: '' })}
        stats={null}
        isSelf={false}
        isPrivate={false}
        showActions={false}
        onViewAvatar={onViewAvatar}
      />,
    )

    // Không có hành động nào nên avatar không được render thành nút bấm.
    expect(screen.queryByTestId('profile-avatar')).not.toBeInTheDocument()
    expect(onViewAvatar).not.toHaveBeenCalled()
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('closes the menu with Escape', async () => {
    const user = userEvent.setup()
    renderWithProviders(
      <ProfileHeader
        profile={buildProfile()}
        stats={null}
        isSelf={false}
        isPrivate={false}
        showActions={false}
        hasStory
        onViewAvatar={jest.fn()}
        onViewStory={jest.fn()}
      />,
    )

    await user.click(screen.getByTestId('profile-avatar'))
    expect(screen.getByRole('menu')).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })
})

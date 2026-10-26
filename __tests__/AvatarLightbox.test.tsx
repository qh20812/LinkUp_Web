import React from 'react'
import { renderWithProviders, screen, userEvent } from './test-utils'

jest.mock('@/components/ExternalImage', () => {
  return function MockExternalImage(props: React.ImgHTMLAttributes<HTMLImageElement>) {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text -- mock trong test, alt đi qua props
    return <img {...props} />
  }
})

import AvatarLightbox from '@/components/profile/AvatarLightbox'

const AVATAR = 'https://example.com/avatar.jpg'

describe('AvatarLightbox', () => {
  it('renders the avatar and its owner', () => {
    renderWithProviders(
      <AvatarLightbox src={AVATAR} name="Minh Anh" username="minhanh" onClose={jest.fn()} />,
    )

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByAltText('Minh Anh')).toHaveAttribute('src', AVATAR)
    expect(screen.getByText('@minhanh')).toBeInTheDocument()
  })

  it('closes on Escape', async () => {
    const user = userEvent.setup()
    const onClose = jest.fn()
    renderWithProviders(<AvatarLightbox src={AVATAR} name="Minh Anh" onClose={onClose} />)

    await user.keyboard('{Escape}')

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('closes on backdrop click but not when clicking the photo', async () => {
    const user = userEvent.setup()
    const onClose = jest.fn()
    renderWithProviders(<AvatarLightbox src={AVATAR} name="Minh Anh" onClose={onClose} />)

    await user.click(screen.getByAltText('Minh Anh'))
    expect(onClose).not.toHaveBeenCalled()

    await user.click(screen.getByRole('dialog'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('closes once from the close button', async () => {
    const user = userEvent.setup()
    const onClose = jest.fn()
    renderWithProviders(<AvatarLightbox src={AVATAR} name="Minh Anh" onClose={onClose} />)

    await user.click(screen.getByRole('button'))

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('locks page scroll while open and restores it on unmount', () => {
    const { unmount } = renderWithProviders(
      <AvatarLightbox src={AVATAR} name="Minh Anh" onClose={jest.fn()} />,
    )

    expect(document.documentElement.style.overflow).toBe('hidden')

    unmount()

    expect(document.documentElement.style.overflow).toBe('')
  })
})

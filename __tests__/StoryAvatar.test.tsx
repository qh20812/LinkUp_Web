import React from 'react'
import { render, screen } from '@testing-library/react'

jest.mock('@/components/ExternalImage', () => {
  return function MockExternalImage(props: React.ImgHTMLAttributes<HTMLImageElement>) {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text -- mock trong test, alt đi qua props
    return <img {...props} />
  }
})

import StoryAvatar from '@/components/story/StoryAvatar'

describe('StoryAvatar', () => {
  it('dùng kích thước pixel cố định khi không bật fluid (story bar)', () => {
    render(<StoryAvatar src="https://example.com/a.jpg" name="Minh Anh" hasStory size={48} />)

    expect(screen.getByAltText('Minh Anh')).toHaveStyle({ width: '48px', height: '48px' })
  })

  it('bỏ kích thước inline khi bật fluid để CSS khung cha quyết định', () => {
    render(<StoryAvatar src="https://example.com/a.jpg" name="Minh Anh" hasStory fluid />)

    const img = screen.getByAltText('Minh Anh')
    // Không còn width/height inline — nếu còn, vành story sẽ tràn khung khi
    // ProfileHeader thu 120px → 96px ở mobile.
    expect(img.style.width).toBe('')
    expect(img.style.height).toBe('')
  })

  it('áp dụng fluid cho cả nhánh không có story', () => {
    render(<StoryAvatar src="https://example.com/a.jpg" name="Minh Anh" hasStory={false} fluid />)

    const img = screen.getByAltText('Minh Anh')
    expect(img.style.width).toBe('')
    expect(img.style.height).toBe('')
  })

  it('bỏ font-size inline của icon placeholder khi bật fluid', () => {
    const { container } = render(<StoryAvatar src="" name="Minh Anh" hasStory={false} fluid />)

    const icon = container.querySelector('i') as HTMLElement
    expect(icon.style.fontSize).toBe('')
  })
})

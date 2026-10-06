import React from 'react'
import {
  renderWithProviders,
  screen,
  waitFor,
  userEvent,
  mockFetch,
  mockLocalStorage,
} from './test-utils'
import PostComposer from '@/components/PostComposer'
import CreatePostModal from '@/components/CreatePostModal'

jest.mock('@/components/ExternalImage', () => ({
  __esModule: true,
  default: function MockExternalImage(props: React.ImgHTMLAttributes<HTMLImageElement>) {
    return <img {...props} />
  },
}))

describe('PostComposer (teaser → modal)', () => {
  beforeEach(() => {
    mockFetch({ body: {} })
    window.localStorage.clear()
  })

  it('renders the teaser with placeholder and photo button', async () => {
    renderWithProviders(<PostComposer />)

    expect(await screen.findByText('Bạn đang nghĩ gì thế?')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ảnh/video' })).toBeInTheDocument()
  })

  it('opens the composer modal when the placeholder is clicked', async () => {
    const user = userEvent.setup()
    renderWithProviders(<PostComposer />)

    await user.click(await screen.findByText('Bạn đang nghĩ gì thế?'))

    expect(await screen.findByRole('button', { name: 'Đăng bài' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Đóng' })).toBeInTheDocument()
    expect(screen.getByText('Công khai')).toBeInTheDocument()
  })

  it('restores a saved draft into the modal', async () => {
    const store = mockLocalStorage()
    store.setItem(
      'linkup.composer.draft',
      JSON.stringify({
        title: 'Bản nháp cũ',
        content: 'Nội dung :smile:',
        privacy: 'public',
        commentsDisabled: true,
        gif: null,
        savedAt: Date.now(),
      }),
    )

    renderWithProviders(<CreatePostModal open onClose={jest.fn()} />)

    expect(await screen.findByText('Đã khôi phục bản nháp')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Bản nháp cũ')).toBeInTheDocument()
    await waitFor(() => {
      const editor = document.querySelector('[role="textbox"]')
      // Token :code: cũ trong draft được khôi phục thành ký tự native (không <img>).
      expect(editor?.innerHTML).toContain('😄')
      expect(editor?.innerHTML).not.toContain('data-code=')
    })
  })

  it('shows the audience row and comments switch defaults', async () => {
    renderWithProviders(<CreatePostModal open onClose={jest.fn()} />)

    expect(await screen.findByRole('button', { name: /Công khai/ })).toBeInTheDocument()
    const commentsToggle = screen.getByRole('checkbox', { name: 'Bình luận' })
    expect(commentsToggle).toBeChecked()
    // Regression: thumb must be nested INSIDE the track (not a sibling),
    // otherwise the absolute-positioned dot escapes the switch.
    const label = commentsToggle.closest('label')
    expect(label).not.toBeNull()
    const spans = Array.from(label!.querySelectorAll('span'))
    expect(spans).toHaveLength(2)
    expect(spans.some((s) => s.querySelector('span'))).toBe(true)
  })
})

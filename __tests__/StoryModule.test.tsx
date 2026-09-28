import React from 'react'
import { fireEvent } from '@testing-library/react'
import {
  renderWithProviders,
  screen,
  waitFor,
  userEvent,
  mockFetch,
  getFetchCalls,
  getLastFetchPath,
} from './test-utils'
import StoryBar from '@/components/story/StoryBar'
import StoryEditorModal from '@/components/story/StoryEditorModal'
import type { StoryFeedItem, StoryItem } from '@/types'

jest.mock('@/components/ExternalImage', () => ({
  __esModule: true,
  default: function MockExternalImage(props: {
    src?: string
    alt?: string
    className?: string
  }) {
    return (
      <span
        role="img"
        aria-label={props.alt ?? ''}
        className={props.className}
        data-src={props.src}
      />
    )
  },
}))

jest.mock('@/components/story/StoryCanvas', () => ({
  __esModule: true,
  default: function MockStoryCanvas() {
    return <div data-testid="story-canvas" />
  },
}))

jest.mock('@/components/story/editor/canvasHelpers', () => ({
  DEFAULT_TEXT_STYLE: {
    fontSize: 32,
    fontWeight: 'normal',
    fontStyle: 'normal',
    underline: false,
    textAlign: 'center',
    fill: '#FFFFFF',
    fontFamily: 'Arial',
    gradient: null,
    stroke: null,
    strokeWidth: 0,
    highlight: null,
  },
  DEFAULT_BRUSH_GRADIENT: { from: '#12A5A1', to: '#0A84FF' },
  DEFAULT_TEXT_STORY_GRADIENT: { from: '#6A5AE0', to: '#12A5A1' },
  TEXT_STORY_GRADIENTS: [{ from: '#6A5AE0', to: '#12A5A1' }],
  COLOR_PRESETS: ['#FFFFFF', '#000000', '#12A5A1'],
  FONT_OPTIONS: [{ family: 'Arial', label: 'Arial' }],
  TYPE_PRESETS: [{ id: 'plain', label: 'Đơn giản', style: {} }],
  FILTER_PRESETS: [],
  STICKERS: [],
  BRUSH_SIZE_MIN: 2,
  BRUSH_SIZE_MAX: 40,
  TEXT_SIZE_MIN: 12,
  TEXT_SIZE_MAX: 96,
}))

const story: StoryItem = {
  id: 's1',
  user_id: 'u1',
  display_name: 'An Nguyễn',
  avatar_uri: 'https://cdn.test/u1.jpg',
  media_uri: 'https://cdn.test/s1.jpg',
  media_type: 'image',
  caption: 'Chào buổi sáng',
  created_at: new Date().toISOString(),
  has_viewed: false,
}

const feedItem: StoryFeedItem = {
  user: { id: 'u1', display_name: 'An Nguyễn', avatar_uri: 'https://cdn.test/u1.jpg' },
  stories: [story],
}

describe('StoryBar', () => {
  it('renders the create tile and story preview cards', async () => {
    renderWithProviders(
      <StoryBar
        stories={[feedItem]}
        currentUserId="me"
        onSelectStory={jest.fn()}
        onCreateStory={jest.fn()}
        onMuteUser={jest.fn()}
      />,
    )

    expect(await screen.findByRole('button', { name: 'Thêm tin' })).toBeInTheDocument()
    const card = screen.getByRole('button', { name: 'Xem tin: An Nguyễn' })
    expect(card).toBeInTheDocument()
  })

  it('opens a story on Enter and creates one from the tile', async () => {
    const user = userEvent.setup()
    const onSelectStory = jest.fn()
    const onCreateStory = jest.fn()
    renderWithProviders(
      <StoryBar
        stories={[feedItem]}
        currentUserId="me"
        onSelectStory={onSelectStory}
        onCreateStory={onCreateStory}
        onMuteUser={jest.fn()}
      />,
    )

    const card = await screen.findByRole('button', { name: 'Xem tin: An Nguyễn' })
    card.focus()
    await user.keyboard('{Enter}')
    expect(onSelectStory).toHaveBeenCalledWith('u1', [story])

    const tile = screen.getByRole('button', { name: 'Thêm tin' })
    tile.focus()
    await user.keyboard(' ')
    expect(onCreateStory).toHaveBeenCalledTimes(1)
  })

  it('shows the avatar variant of the create tile when avatarUri is set', async () => {
    const { container } = renderWithProviders(
      <StoryBar
        stories={[feedItem]}
        currentUserId="me"
        avatarUri="https://cdn.test/me.jpg"
        onSelectStory={jest.fn()}
        onCreateStory={jest.fn()}
        onMuteUser={jest.fn()}
      />,
    )

    expect(await screen.findByRole('button', { name: 'Thêm tin' })).toBeInTheDocument()
    expect(container.querySelector('[data-src="https://cdn.test/me.jpg"]')).not.toBeNull()
  })
})

describe('StoryEditorModal (2-step flow)', () => {
  beforeAll(() => {
    let counter = 0
    ;(URL as unknown as { createObjectURL: (b: Blob) => string }).createObjectURL = jest.fn(
      () => `blob:story-${++counter}`,
    )
    ;(URL as unknown as { revokeObjectURL: (u: string) => void }).revokeObjectURL = jest.fn()
  })

  beforeEach(() => {
    mockFetch({ body: {} })
  })

  const pickImage = () => {
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, {
      target: {
        files: [new File(['fake'], 'story.jpg', { type: 'image/jpeg' })],
      },
    })
  }

  it('closes immediately on cancel when nothing was picked', async () => {
    const user = userEvent.setup()
    const onClose = jest.fn()
    renderWithProviders(<StoryEditorModal open onClose={onClose} />)

    expect(await screen.findByText('Tạo tin mới')).toBeInTheDocument()
    await user.click((await screen.findAllByRole('button', { name: 'Hủy' }))[0])

    expect(onClose).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('Rời khỏi bản nháp?')).toBeNull()
  })

  it('picks a file, enters the editor, and confirms before losing edits', async () => {
    const user = userEvent.setup()
    const onClose = jest.fn()
    renderWithProviders(<StoryEditorModal open onClose={onClose} />)

    await screen.findByText('Tạo tin mới')
    pickImage()

    expect(await screen.findByTestId('story-canvas')).toBeInTheDocument()
    expect(screen.getByText('Chỉnh sửa tin')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Quay lại' }))
    expect(await screen.findByText('Tạo tin mới')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Chỉnh sửa/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Thêm ảnh\/video/ })).toBeInTheDocument()

    const cancelButtons = await screen.findAllByRole('button', { name: 'Hủy' })
    await user.click(cancelButtons[0])

    expect(await screen.findByText('Rời khỏi bản nháp?')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Ở lại' }))
    expect(onClose).not.toHaveBeenCalled()

    await user.click((await screen.findAllByRole('button', { name: 'Hủy' }))[0])
    await user.click(await screen.findByRole('button', { name: 'Rời đi' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('opens the post sheet from the editor and submits with a caption', async () => {
    const user = userEvent.setup()
    const onClose = jest.fn()
    const onCreated = jest.fn()
    renderWithProviders(<StoryEditorModal open onClose={onClose} onCreated={onCreated} />)

    await screen.findByText('Tạo tin mới')
    pickImage()
    await screen.findByTestId('story-canvas')

    await user.click(screen.getByRole('button', { name: 'Đăng' }))

    expect(await screen.findByText('Chia sẻ tin')).toBeInTheDocument()
    const caption = screen.getByPlaceholderText('Nhập mô tả...')
    await user.type(caption, 'Hôm nay trời đẹp')

    expect(getFetchCalls()).toHaveLength(0)
    await user.click(screen.getByRole('button', { name: 'Đăng' }))

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
    expect(onCreated).toHaveBeenCalledTimes(1)
    expect(getLastFetchPath()).toBe('/api/stories')
  })

  it('returns from the post sheet back to the editor', async () => {
    const user = userEvent.setup()
    const onClose = jest.fn()
    renderWithProviders(<StoryEditorModal open onClose={onClose} />)

    await screen.findByText('Tạo tin mới')
    pickImage()
    await screen.findByTestId('story-canvas')

    await user.click(screen.getByRole('button', { name: 'Đăng' }))
    expect(await screen.findByText('Chia sẻ tin')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Quay lại' }))
    expect(await screen.findByText('Chỉnh sửa tin')).toBeInTheDocument()
    expect(screen.getByTestId('story-canvas')).toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
  })
})

import { mediaPreviewKind, mediaPreviewKey } from '../utils/chatMediaPreview'

describe('mediaPreviewKind', () => {
  it('classifies GIF by media_type', () => {
    expect(mediaPreviewKind({ media_type: 'image/gif' })).toBe('gif')
    expect(mediaPreviewKind({ media_type: 'image/gif' })).toBe('gif')
  })

  it('classifies video by media_type', () => {
    expect(mediaPreviewKind({ media_type: 'video/mp4' })).toBe('video')
    expect(mediaPreviewKind({ media_type: 'VIDEO/WebM' })).toBe('video')
  })

  it('classifies image by media_type', () => {
    expect(mediaPreviewKind({ media_type: 'image/jpeg' })).toBe('image')
    expect(mediaPreviewKind({ media_type: 'image/png' })).toBe('image')
  })

  it('falls back to URL extension when media_type is missing', () => {
    expect(mediaPreviewKind({ media_uri: 'https://cdn.example.com/a.gif' })).toBe('gif')
    expect(mediaPreviewKind({ media_uri: 'https://cdn.example.com/b.MP4' })).toBe('video')
    expect(mediaPreviewKind({ media_uri: 'https://cdn.example.com/c.jpg?t=1' })).toBe('image')
    expect(mediaPreviewKind({ media_uri: 'https://cdn.example.com/c.PNG#frag' })).toBe('image')
  })

  it('returns null for non-media messages', () => {
    expect(mediaPreviewKind({ content: 'hello' })).toBeNull()
    expect(mediaPreviewKind({ content: '' })).toBeNull()
    expect(mediaPreviewKind({ media_type: '' })).toBeNull()
  })

  it('returns null for unrecognized media_type with no URI signal', () => {
    expect(mediaPreviewKind({ media_type: 'application/pdf' })).toBeNull()
  })
})

describe('mediaPreviewKey', () => {
  it('maps kinds to chat translation keys', () => {
    expect(mediaPreviewKey({ media_type: 'image/gif' })).toBe('chat.mediaGif')
    expect(mediaPreviewKey({ media_type: 'video/mp4' })).toBe('chat.mediaVideo')
    expect(mediaPreviewKey({ media_type: 'image/png' })).toBe('chat.mediaImage')
  })

  it('returns null when no media detected', () => {
    expect(mediaPreviewKey({ content: 'hello' })).toBeNull()
  })
})
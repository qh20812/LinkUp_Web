import { renderToStaticMarkup } from 'react-dom/server'

import { giphyMediaUrl, giphyStillUrl, isGiphyUrl, isSingleGiphyUrl, firstGiphyUrl, stripGiphyUrls } from '@/utils/giphy'
import { giphyEmojiSrc } from '@/utils/emojis'
import { renderEmojiContent } from '@/components/messages/EmojiImage'
import { serializeContent } from '@/components/messages/Composer'
import { truncateAvoidingUrl } from '@/components/PostCard'
import type { EmojiItem } from '@/types'

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), refresh: jest.fn() }),
  usePathname: () => '/',
}))
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children }: { children?: React.ReactNode }) => children ?? null,
}))

const GIPHY_URL = 'https://media.giphy.com/media/QM3VscCkwB54O6lSee/200w.gif'

describe('giphy url utils', () => {
  test('giphyMediaUrl builds canonical url', () => {
    expect(giphyMediaUrl('abc')).toBe('https://media.giphy.com/media/abc/200w_s.gif')
    expect(giphyMediaUrl('abc', 'giphy.gif')).toBe('https://media.giphy.com/media/abc/giphy.gif')
  })

  test('giphyStillUrl rewrites legacy animated emoji urls to still', () => {
    expect(giphyStillUrl('https://media.giphy.com/media/QM3VscCkwB54O6lSee/200w.gif')).toBe(
      'https://media.giphy.com/media/QM3VscCkwB54O6lSee/200w_s.gif',
    )
    expect(giphyStillUrl('https://media0.giphy.com/media/abc/giphy.gif')).toBe(
      'https://media0.giphy.com/media/abc/giphy_s.gif',
    )
    // đã là bản still / có token / không phải GIPHY -> giữ nguyên
    expect(giphyStillUrl('https://media.giphy.com/media/abc/200w_s.gif')).toBe(
      'https://media.giphy.com/media/abc/200w_s.gif',
    )
    expect(
      giphyStillUrl('https://media2.giphy.com/media/v1.Y2lkTOKEN/abc/giphy.gif'),
    ).toBe('https://media2.giphy.com/media/v1.Y2lkTOKEN/abc/giphy.gif')
    expect(giphyStillUrl('https://example.com/a.png')).toBe('https://example.com/a.png')
  })

  test('isGiphyUrl recognizes giphy media hosts only', () => {
    expect(isGiphyUrl(GIPHY_URL)).toBe(true)
    expect(isGiphyUrl('https://media0.giphy.com/media/x/200w.gif')).toBe(true)
    expect(isGiphyUrl('https://i.giphy.com/media/x.gif')).toBe(true)
    expect(isGiphyUrl('https://example.com/image.png')).toBe(false)
    expect(isGiphyUrl('just text')).toBe(false)
  })

  test('stripGiphyUrls / firstGiphyUrl extract urls from text', () => {
    const text = `emoji ${GIPHY_URL} done`
    expect(stripGiphyUrls(text)).toBe('emoji done')
    expect(firstGiphyUrl(text)).toBe(GIPHY_URL)
    expect(firstGiphyUrl('no url here')).toBeNull()
  })

  test('isSingleGiphyUrl only when content is exactly one giphy url', () => {
    expect(isSingleGiphyUrl(GIPHY_URL)).toBe(true)
    expect(isSingleGiphyUrl(`  ${GIPHY_URL}  `)).toBe(true)
    expect(isSingleGiphyUrl(`text ${GIPHY_URL}`)).toBe(false)
    expect(isSingleGiphyUrl('https://example.com/a.png')).toBe(false)
    expect(isSingleGiphyUrl('')).toBe(false)
  })
})

describe('renderEmojiContent', () => {
  const like: EmojiItem = { id: 'e1', code: ':like:', image_uri: 'https://media.giphy.com/media/like-id/200w.gif' }
  const map = new Map<string, EmojiItem>([[':like:', like]])

  test('renders giphy url as inline img (legacy animated -> still)', () => {
    const markup = renderToStaticMarkup(
      <>{renderEmojiContent(`hi ${GIPHY_URL} bye`, new Map(), 'k')}</>,
    )
    expect(markup).toContain(`<img`)
    expect(markup).toContain('src="https://media.giphy.com/media/QM3VscCkwB54O6lSee/200w_s.gif"')
    expect(markup).not.toContain('src="https://media.giphy.com/media/QM3VscCkwB54O6lSee/200w.gif"')
    expect(markup).toContain('alt="emoji"')
    expect(markup).toContain('hi ')
    expect(markup).toContain(' bye')
  })

  test('does not turn non-giphy urls into images', () => {
    const markup = renderToStaticMarkup(
      <>{renderEmojiContent('see https://example.com/a.png', new Map(), 'k')}</>,
    )
    expect(markup).not.toContain('<img')
    expect(markup).toContain('https://example.com/a.png')
  })

  test('renders legacy :code: as emoji image when mapped', () => {
    const markup = renderToStaticMarkup(<>{renderEmojiContent('go :like:', map, 'k')}</>)
    expect(markup).toContain('<img')
    expect(markup).toContain('src="https://media.giphy.com/media/like-id/200w.gif"')
    expect(markup).toContain('alt=":like:"')
  })

  test('keeps unknown :code: as plain text', () => {
    const markup = renderToStaticMarkup(<>{renderEmojiContent('x :unknown:', map, 'k')}</>)
    expect(markup).not.toContain('<img')
    expect(markup).toContain(':unknown:')
  })
})

describe('serializeContent', () => {
  test('serializes text, giphy span and code span', () => {
    const el = document.createElement('div')
    el.appendChild(document.createTextNode('hello '))
    const giphy = document.createElement('span')
    giphy.dataset.giphy = GIPHY_URL
    el.appendChild(giphy)
    el.appendChild(document.createElement('br'))
    const code = document.createElement('span')
    code.dataset.code = ':like:'
    el.appendChild(code)
    expect(serializeContent(el)).toBe(`hello ${GIPHY_URL}\n:like:\n`)
  })

  test('serializes div blocks with newlines', () => {
    const el = document.createElement('div')
    const line = document.createElement('div')
    line.appendChild(document.createTextNode('line one'))
    el.appendChild(line)
    const line2 = document.createElement('div')
    line2.appendChild(document.createTextNode('line two'))
    el.appendChild(line2)
    expect(serializeContent(el)).toBe('line one\nline two\n')
  })
})

describe('giphyEmojiSrc (reaction tin nhắn)', () => {
  const serverItem = (code: string, imageUri = 'https://cdn.example.com/emoji.png'): EmojiItem => ({
    id: `server-${code}`,
    code,
    image_uri: imageUri,
  })

  test('map toàn bộ code của backend seed sang GIPHY', () => {
    expect(giphyEmojiSrc(serverItem(':like:'))).toBe(giphyMediaUrl('QM3VscCkwB54O6lSee'))
    expect(giphyEmojiSrc(serverItem(':haha:'))).toBe(giphyMediaUrl('hVlZnRT6QW1DeYj6We'))
    expect(giphyEmojiSrc(serverItem(':rocket:'))).toBe(giphyMediaUrl('pcyoWXeoHCapjCvCTQ'))
    expect(giphyEmojiSrc(serverItem(':fire:'))).toBe(giphyMediaUrl('Ply2vUaRg3Swc100lk'))
    expect(giphyEmojiSrc(serverItem(':heart:'))).toBe(giphyMediaUrl('cRLI5pM8yg3tIqZARZ'))
  })

  test('giữ image_uri (twemoji) khi chưa có map GIPHY', () => {
    expect(giphyEmojiSrc(serverItem(':unknown:'))).toBe('https://cdn.example.com/emoji.png')
  })
})

describe('truncateAvoidingUrl', () => {
  test('returns content untouched when short enough', () => {
    expect(truncateAvoidingUrl('short', 200)).toBe('short')
  })

  test('appends ellipsis on plain text', () => {
    expect(truncateAvoidingUrl('a'.repeat(50), 10)).toBe(`${'a'.repeat(10)}...`)
  })

  test('never cuts in the middle of a url', () => {
    const url = 'https://media.giphy.com/media/abcdefgh/200w.gif'
    const content = 'word '.repeat(10) + url
    // max cắt ngay phần đầu của URL -> phải cắt về trước URL
    const out = truncateAvoidingUrl(content, 60)
    expect(out.endsWith('...')).toBe(true)
    expect(out).not.toContain('http')
  })

  test('keeps url fully when it fits before max', () => {
    const url = 'https://media.giphy.com/media/abcdefgh/200w.gif'
    const content = `word ${url}`
    expect(truncateAvoidingUrl(content, 100)).toBe(content)
  })
})

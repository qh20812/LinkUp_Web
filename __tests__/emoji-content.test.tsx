import { renderToStaticMarkup } from 'react-dom/server'

import { giphyMediaUrl, giphyStillUrl, isGiphyUrl, isSingleGiphyUrl, firstGiphyUrl, stripGiphyUrls, separateGiphyUrls } from '@/utils/giphy'
import { emojifyiImageUrl, isEmojifyiUrl, isSingleEmojifyiUrl, stripEmojifyiUrls } from '@/utils/emojifyi'
import { emojiSrc } from '@/utils/emojis'
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
const EMOJIFYI_URL = 'https://cdn.emojifyi.com/images/platforms/noto/emoji_u1f600.png'
const EMOJIFYI_URL2 = 'https://cdn.emojifyi.com/images/platforms/noto/emoji_u1f60d.png'

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

  test('separateGiphyUrls splits merged giphy urls (legacy content)', () => {
    const url2 = 'https://media.giphy.com/media/adv74AcNdtP0tj9hLj/200w_s.gif'
    // serializer cũ nối URL không separator -> tách lại
    expect(separateGiphyUrls(`${GIPHY_URL}${url2}`)).toBe(`${GIPHY_URL} ${url2}`)
    // idempotent — đã tách thì giữ nguyên
    expect(separateGiphyUrls(`${GIPHY_URL} ${url2}`)).toBe(`${GIPHY_URL} ${url2}`)
    expect(separateGiphyUrls(GIPHY_URL)).toBe(GIPHY_URL)
    // text dính liền trước URL cũng được tách
    expect(separateGiphyUrls(`abc${GIPHY_URL}`)).toBe(`abc ${GIPHY_URL}`)
    // không đổi text thuần / URL thường
    expect(separateGiphyUrls('no url here')).toBe('no url here')
    expect(separateGiphyUrls('see https://example.com/a.png')).toBe('see https://example.com/a.png')
  })
})

describe('emojifyi url utils', () => {
  test('emojifyiImageUrl sinh URL CDN (noto, bỏ fe0f, pad >= 4 hex)', () => {
    expect(emojifyiImageUrl('\u{1F600}')).toBe(EMOJIFYI_URL)
    // CDN không có file kèm fe0f -> phải bỏ nó (verify thực tế: ..._fe0f.png trả 404)
    expect(emojifyiImageUrl('\u{2764}\u{FE0F}')).toBe(
      'https://cdn.emojifyi.com/images/platforms/noto/emoji_u2764.png',
    )
    // codepoint < 0x1000 zero-pad (vd keycap # -> 0023)
    expect(emojifyiImageUrl('#\u{FE0F}\u{20E3}')).toBe(
      'https://cdn.emojifyi.com/images/platforms/noto/emoji_u0023_20e3.png',
    )
    // chuỗi nhiều codepoint (ZWJ) nối bằng _
    expect(emojifyiImageUrl('\u{1F469}\u{200D}\u{1F4BB}')).toBe(
      'https://cdn.emojifyi.com/images/platforms/noto/emoji_u1f469_200d_1f4bb.png',
    )
  })

  test('isEmojifyiUrl chỉ nhận CDN emojifyi', () => {
    expect(isEmojifyiUrl(EMOJIFYI_URL)).toBe(true)
    expect(isEmojifyiUrl('https://cdn.emojifyi.com/images/platforms/noto/emoji_u1f600.png')).toBe(true)
    expect(isEmojifyiUrl(GIPHY_URL)).toBe(false)
    expect(isEmojifyiUrl('https://example.com/1f600.png')).toBe(false)
  })

  test('isSingleEmojifyiUrl / stripEmojifyiUrls', () => {
    expect(isSingleEmojifyiUrl(EMOJIFYI_URL)).toBe(true)
    expect(isSingleEmojifyiUrl(`  ${EMOJIFYI_URL}  `)).toBe(true)
    expect(isSingleEmojifyiUrl(`text ${EMOJIFYI_URL}`)).toBe(false)
    expect(isSingleEmojifyiUrl('')).toBe(false)
    expect(stripEmojifyiUrls(`hi ${EMOJIFYI_URL} bye`)).toBe('hi bye')
    expect(stripEmojifyiUrls('no url here')).toBe('no url here')
  })

  test('renderEmojiContent render URL emojifyi thành ảnh inline', () => {
    const markup = renderToStaticMarkup(
      <>{renderEmojiContent(`hi ${EMOJIFYI_URL} bye`, new Map(), 'k')}</>,
    )
    expect(markup).toContain(`<img`)
    expect(markup).toContain(`src="${EMOJIFYI_URL}"`)
    expect(markup).toContain('alt="emoji"')
    expect(markup).toContain('hi ')
    expect(markup).toContain(' bye')
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

  test('renders merged giphy urls (legacy content) as separate images', () => {
    const url2 = 'https://media.giphy.com/media/adv74AcNdtP0tj9hLj/200w.gif'
    const markup = renderToStaticMarkup(
      <>{renderEmojiContent(`${GIPHY_URL}${url2}`, new Map(), 'k')}</>,
    )
    expect(markup.match(/<img/g) ?? []).toHaveLength(2)
    expect(markup).toContain('src="https://media.giphy.com/media/QM3VscCkwB54O6lSee/200w_s.gif"')
    expect(markup).toContain('src="https://media.giphy.com/media/adv74AcNdtP0tj9hLj/200w_s.gif"')
  })

  test('renders text glued before a giphy url without swallowing it', () => {
    const markup = renderToStaticMarkup(
      <>{renderEmojiContent(`abc${GIPHY_URL}`, new Map(), 'k')}</>,
    )
    expect(markup).toContain('<img')
    expect(markup).toContain('src="https://media.giphy.com/media/QM3VscCkwB54O6lSee/200w_s.gif"')
    expect(markup).toContain('abc')
  })
})

describe('serializeContent', () => {
  test('serializes text, emoji span and code span', () => {
    const el = document.createElement('div')
    el.appendChild(document.createTextNode('hello '))
    const emoji = document.createElement('span')
    emoji.dataset.emoji = EMOJIFYI_URL
    el.appendChild(emoji)
    el.appendChild(document.createElement('br'))
    const code = document.createElement('span')
    code.dataset.code = ':like:'
    el.appendChild(code)
    expect(serializeContent(el)).toBe(`hello ${EMOJIFYI_URL}\n:like:\n`)
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

  test('serializes adjacent emoji elements with space between urls', () => {
    const el = document.createElement('div')
    const a = document.createElement('span')
    a.dataset.emoji = EMOJIFYI_URL
    const b = document.createElement('span')
    b.dataset.emoji = EMOJIFYI_URL2
    el.appendChild(a)
    el.appendChild(b)
    expect(serializeContent(el)).toBe(`${EMOJIFYI_URL} ${EMOJIFYI_URL2}\n`)
  })

  test('keeps space between emoji url and following text', () => {
    const el = document.createElement('div')
    const emoji = document.createElement('span')
    emoji.dataset.emoji = EMOJIFYI_URL
    el.appendChild(emoji)
    el.appendChild(document.createTextNode('after'))
    expect(serializeContent(el)).toBe(`${EMOJIFYI_URL} after\n`)
  })
})

describe('emojiSrc (reaction tin nhắn)', () => {
  const serverItem = (code: string, imageUri = 'https://cdn.example.com/emoji.png'): EmojiItem => ({
    id: `server-${code}`,
    code,
    image_uri: imageUri,
  })

  test('map code backend/emotion sang ảnh emojifyi (noto)', () => {
    const cdn = 'https://cdn.emojifyi.com/images/platforms/noto/emoji_u'
    expect(emojiSrc(serverItem(':like:'))).toBe(`${cdn}1f44d.png`)
    expect(emojiSrc(serverItem(':haha:'))).toBe(`${cdn}1f602.png`)
    expect(emojiSrc(serverItem(':rocket:'))).toBe(`${cdn}1f680.png`)
    expect(emojiSrc(serverItem(':fire:'))).toBe(`${cdn}1f525.png`)
    expect(emojiSrc(serverItem(':heart:'))).toBe(`${cdn}2764.png`)
    expect(emojiSrc(serverItem(':wow:'))).toBe(`${cdn}1f62e.png`)
    expect(emojiSrc(serverItem(':clap:'))).toBe(`${cdn}1f44f.png`)
    expect(emojiSrc(serverItem(':sad:'))).toBe(`${cdn}1f622.png`)
    expect(emojiSrc(serverItem(':angry:'))).toBe(`${cdn}1f621.png`)
    expect(emojiSrc(serverItem(':love:'))).toBe(`${cdn}1f496.png`)
  })

  test('giữ image_uri (twemoji CDN của server) khi chưa có map ký tự', () => {
    expect(emojiSrc(serverItem(':unknown:'))).toBe('https://cdn.example.com/emoji.png')
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

  test('truncates repaired merged-giphy content instead of only ellipsis', () => {
    const url = 'https://media.giphy.com/media/abcdefgh/200w_s.gif'
    const merged = url.repeat(10)
    // chuỗi URL dính nhau không có space -> bug cũ trả về '...' (mất trắng nội dung)
    expect(truncateAvoidingUrl(merged, 200)).toBe('...')
    // sau khi tách (như PostCard làm) -> cắt đúng, giữ nguyên URL
    const out = truncateAvoidingUrl(separateGiphyUrls(merged), 200)
    expect(out).not.toBe('...')
    expect(out.endsWith('...')).toBe(true)
    expect(out).toContain(url)
  })
})

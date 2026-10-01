import { mockFetch, restoreFetch, getFetchCalls } from './test-utils'
import { getPostsByHashtag } from '@/api/posts'

describe('getPostsByHashtag', () => {
  beforeEach(() => {
    mockFetch({ body: { hashtag: 'bongda', page: 1, page_size: 10, data: [] } })
    window.localStorage.clear()
  })

  afterEach(() => {
    restoreFetch()
  })

  it('calls the hashtag endpoint with pagination', async () => {
    await getPostsByHashtag('bongda', 2, 5)
    const calls = getFetchCalls()
    expect(calls).toHaveLength(1)
    const url = new URL(calls[0][0] as string, 'http://localhost')
    expect(url.pathname).toBe('/api/posts/hashtag/bongda')
    expect(url.searchParams.get('page')).toBe('2')
    expect(url.searchParams.get('page_size')).toBe('5')
  })

  it('URL-encodes unicode tag names', async () => {
    await getPostsByHashtag('bóng đá')
    const calls = getFetchCalls()
    const url = new URL(calls[0][0] as string, 'http://localhost')
    expect(url.pathname).toBe('/api/posts/hashtag/b%C3%B3ng%20%C4%91%C3%A1')
  })
})

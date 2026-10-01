import { mockFetch, restoreFetch, getFetchCalls } from './test-utils'
import { trackPostView } from '@/api/posts'

function lastFetchPath() {
  const calls = getFetchCalls()
  if (calls.length === 0) return null
  const url = new URL(calls[calls.length - 1][0] as string, 'http://localhost')
  return url.pathname + url.search
}

describe('trackPostView', () => {
  beforeEach(() => {
    mockFetch({ body: { counted: true } })
    window.localStorage.clear()
  })

  afterEach(() => {
    restoreFetch()
  })

  it('POSTs to /posts/:id/view with source=feed by default', async () => {
    await trackPostView('post-1')
    expect(lastFetchPath()).toBe('/api/posts/post-1/view')
  })

  it('sends each post only once per page load (client dedup)', async () => {
    await trackPostView('post-dedup')
    await trackPostView('post-dedup')
    const calls = getFetchCalls().filter(([url]) =>
      String(url).includes('/posts/post-dedup/view'),
    )
    expect(calls).toHaveLength(1)
  })

  it('tracks feed and detail sources independently', async () => {
    await trackPostView('post-both', 'feed')
    await trackPostView('post-both', 'detail')
    const calls = getFetchCalls().filter(([url]) =>
      String(url).includes('/posts/post-both/view'),
    )
    expect(calls).toHaveLength(2)
  })

  it('resolves { counted: false } instead of throwing on network error', async () => {
    restoreFetch()
    jest.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'))
    await expect(trackPostView('post-offline')).resolves.toEqual({ counted: false })
  })
})

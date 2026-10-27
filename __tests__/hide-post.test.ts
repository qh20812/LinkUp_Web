import { mockFetch, restoreFetch, getLastFetchPath, getLastFetchOptions } from './test-utils'
import { hidePost, unhidePost } from '@/api/posts'

describe('hidePost / unhidePost', () => {
  beforeEach(() => {
    mockFetch({ body: { hidden: true } })
    window.localStorage.clear()
  })

  afterEach(() => {
    restoreFetch()
  })

  it('POST /posts/:id/hide', async () => {
    await hidePost('post-1')

    expect(getLastFetchPath()).toBe('/api/posts/post-1/hide')
    expect(getLastFetchOptions()?.method).toBe('POST')
  })

  it('DELETE /posts/:id/hide khi hoàn tác', async () => {
    mockFetch({ body: { hidden: false } })
    await unhidePost('post-2')

    expect(getLastFetchPath()).toBe('/api/posts/post-2/hide')
    expect(getLastFetchOptions()?.method).toBe('DELETE')
  })

  it('gửi kèm Bearer token từ localStorage', async () => {
    window.localStorage.setItem('token', 'test-token')
    await hidePost('post-3')

    const headers = getLastFetchOptions()?.headers as Record<string, string>
    expect(headers.Authorization).toBe('Bearer test-token')
  })

  it('ném lỗi khi server trả 4xx để UI hoàn tác được', async () => {
    mockFetch({ status: 400, body: { message: 'Không thể ẩn' } })
    await expect(hidePost('post-4')).rejects.toBeTruthy()
  })
})

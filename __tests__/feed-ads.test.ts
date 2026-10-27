import { adIndexForPost, feedAdImageUrl, AD_EVERY_N_POSTS } from '@/lib/feed-ads'

describe('adIndexForPost', () => {
  it('không chèn quảng cáo ở các bài đầu tiên', () => {
    for (let idx = 0; idx < AD_EVERY_N_POSTS - 1; idx++) {
      expect(adIndexForPost(idx, 3)).toBeNull()
    }
  })

  it('chèn sau mỗi 6 bài, bắt đầu từ bài thứ 6', () => {
    expect(adIndexForPost(5, 3)).toBe(0)
    expect(adIndexForPost(11, 3)).toBe(1)
    expect(adIndexForPost(17, 3)).toBe(2)
  })

  it('quay vòng khi hết danh sách quảng cáo', () => {
    expect(adIndexForPost(23, 3)).toBe(0)
  })

  it('không trả index âm hoặc vượt quá danh sách', () => {
    for (let idx = 0; idx <= 60; idx++) {
      const slot = adIndexForPost(idx, 2)
      if (slot !== null) {
        expect(slot).toBeGreaterThanOrEqual(0)
        expect(slot).toBeLessThan(2)
      }
    }
  })

  it('trả null khi chưa có quảng cáo nào', () => {
    expect(adIndexForPost(5, 0)).toBeNull()
  })

  it('không phụ thuộc thứ tự render (cùng idx luôn cùng kết quả)', () => {
    const first = adIndexForPost(11, 4)
    const second = adIndexForPost(11, 4)
    expect(first).toBe(second)
  })
})

describe('feedAdImageUrl', () => {
  it('lấy ảnh đầu tiên từ media_list (shape server trả về)', () => {
    expect(
      feedAdImageUrl({ media_list: [{ url: 'https://cdn/a.png' }, { url: 'https://cdn/b.png' }] }),
    ).toBe('https://cdn/a.png')
  })

  it('fallback sang media_uri khi không có media_list', () => {
    expect(feedAdImageUrl({ media_uri: 'https://cdn/legacy.png' })).toBe('https://cdn/legacy.png')
  })

  it('bỏ qua media_list chứa url rỗng', () => {
    expect(feedAdImageUrl({ media_list: [{ url: '' }, { url: 'https://cdn/c.png' }] })).toBe('https://cdn/c.png')
  })

  it('trả null khi quảng cáo không có ảnh', () => {
    expect(feedAdImageUrl({ media_list: [] })).toBeNull()
    expect(feedAdImageUrl(null)).toBeNull()
    expect(feedAdImageUrl(undefined)).toBeNull()
  })
})

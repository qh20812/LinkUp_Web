import { removePostById, insertPostAt } from '@/lib/feed-hide'
import { buildFeedPost } from './test-utils'

function posts(...ids: string[]) {
  return ids.map((id) => buildFeedPost({ id }))
}

describe('removePostById', () => {
  it('bỏ đúng bài và trả về vị trí cũ', () => {
    const list = posts('p1', 'p2', 'p3')
    const result = removePostById(list, 'p2')

    expect(result.post?.id).toBe('p2')
    expect(result.index).toBe(1)
    expect(result.posts.map((p) => p.id)).toEqual(['p1', 'p3'])
  })

  it('không sửa mảng gốc', () => {
    const list = posts('p1', 'p2')
    removePostById(list, 'p1')

    expect(list.map((p) => p.id)).toEqual(['p1', 'p2'])
  })

  it('bài không có trong danh sách thì trả nguyên trạng', () => {
    const list = posts('p1')
    const result = removePostById(list, 'missing')

    expect(result.post).toBeNull()
    expect(result.index).toBe(-1)
    expect(result.posts).toBe(list)
  })
})

describe('insertPostAt', () => {
  it('chèn lại đúng vị trí cũ (hoàn tác)', () => {
    const list = posts('p1', 'p3')
    const restored = insertPostAt(list, 1, buildFeedPost({ id: 'p2' }))

    expect(restored.map((p) => p.id)).toEqual(['p1', 'p2', 'p3'])
  })

  it('index vượt độ dài thì thêm vào cuối', () => {
    const list = posts('p1')
    const restored = insertPostAt(list, 99, buildFeedPost({ id: 'p2' }))

    expect(restored.map((p) => p.id)).toEqual(['p1', 'p2'])
  })

  it('index âm thì thêm vào cuối', () => {
    const list = posts('p1')
    const restored = insertPostAt(list, -1, buildFeedPost({ id: 'p2' }))

    expect(restored.map((p) => p.id)).toEqual(['p1', 'p2'])
  })

  it('bài đã tồn tại thì không nhân đôi', () => {
    const list = posts('p1', 'p2')
    const restored = insertPostAt(list, 0, buildFeedPost({ id: 'p2' }))

    expect(restored).toBe(list)
    expect(restored.filter((p) => p.id === 'p2')).toHaveLength(1)
  })
})

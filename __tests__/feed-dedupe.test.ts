import { dedupeRepostOriginals } from '@/lib/feed-dedupe'
import { buildFeedPost } from './test-utils'

function original(id: string) {
  return buildFeedPost({ id, title: `Post ${id}` })
}

function repost(id: string, sharedFrom: string) {
  return buildFeedPost({
    id,
    title: '',
    shared_from_post_id: sharedFrom,
    shared_post: original(sharedFrom),
  })
}

describe('dedupeRepostOriginals', () => {
  it('drops the original when a repost of it is present', () => {
    const posts = [repost('r1', 'p1'), original('p1'), original('p2')]

    expect(dedupeRepostOriginals(posts).map((p) => p.id)).toEqual(['r1', 'p2'])
  })

  it('keeps the original when no repost of it is present', () => {
    const posts = [original('p1'), repost('r1', 'p2')]

    expect(dedupeRepostOriginals(posts).map((p) => p.id)).toEqual(['p1', 'r1'])
  })

  it('keeps reposts from different users of the same original', () => {
    const posts = [repost('r1', 'p1'), repost('r2', 'p1'), original('p1')]

    expect(dedupeRepostOriginals(posts).map((p) => p.id)).toEqual(['r1', 'r2'])
  })

  it('keeps post order and unrelated posts untouched', () => {
    const posts = [original('p1'), original('p2'), repost('r1', 'p3'), original('p3'), original('p4')]

    expect(dedupeRepostOriginals(posts).map((p) => p.id)).toEqual(['p1', 'p2', 'r1', 'p4'])
  })

  it('returns the same list when there is nothing to dedupe', () => {
    const posts = [original('p1'), original('p2')]

    expect(dedupeRepostOriginals(posts)).toBe(posts)
    expect(dedupeRepostOriginals([])).toEqual([])
  })
})

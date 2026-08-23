import { feedReducer, initialState, PAGE_SIZE } from '@/lib/feed-reducer'
import type { FeedState, FeedAction } from '@/lib/feed-reducer'
import { buildFeedPost } from './test-utils'

function makePost(id: string) {
  return buildFeedPost({ id, title: `Post ${id}` })
}

function makePosts(count: number, startId = 1) {
  return Array.from({ length: count }, (_, i) => makePost(`p${startId + i}`))
}

describe('feedReducer', () => {
  describe('INIT', () => {
    it('sets posts from empty state', () => {
      const posts = makePosts(3)
      const result = feedReducer(initialState, { type: 'INIT', posts })

      expect(result.posts).toEqual(posts)
      expect(result.cursor).toBe('p3')
      expect(result.hasMore).toBe(false)
    })

    it('sets hasMore=true when posts.length >= PAGE_SIZE', () => {
      const posts = makePosts(PAGE_SIZE)
      const result = feedReducer(initialState, { type: 'INIT', posts })

      expect(result.hasMore).toBe(true)
      expect(result.cursor).toBe(`p${PAGE_SIZE}`)
    })

    it('sets hasMore=false when posts.length < PAGE_SIZE', () => {
      const posts = makePosts(PAGE_SIZE - 1)
      const result = feedReducer(initialState, { type: 'INIT', posts })

      expect(result.hasMore).toBe(false)
    })

    it('sets cursor=null for empty posts', () => {
      const result = feedReducer(initialState, { type: 'INIT', posts: [] })

      expect(result.posts).toEqual([])
      expect(result.cursor).toBeNull()
      expect(result.hasMore).toBe(false)
    })

    it('replaces any existing state', () => {
      const prev: FeedState = {
        posts: makePosts(5),
        cursor: 'old-cursor',
        hasMore: true,
      }
      const newPosts = makePosts(2, 100)
      const result = feedReducer(prev, { type: 'INIT', posts: newPosts })

      expect(result.posts).toEqual(newPosts)
      expect(result.cursor).toBe('p101')
      expect(result.hasMore).toBe(false)
    })
  })

  describe('APPEND', () => {
    it('appends new posts to existing', () => {
      const prev: FeedState = {
        posts: makePosts(2),
        cursor: 'p2',
        hasMore: true,
      }
      const newPosts = makePosts(2, 10)
      const result = feedReducer(prev, { type: 'APPEND', posts: newPosts, cursor: 'p12' })

      expect(result.posts).toHaveLength(4)
      expect(result.posts.map((p) => p.id)).toEqual(['p1', 'p2', 'p10', 'p11'])
      expect(result.cursor).toBe('p12')
    })

    it('deduplicates posts by id', () => {
      const prev: FeedState = {
        posts: makePosts(3),
        cursor: 'p3',
        hasMore: true,
      }
      // Include p2 again — should be filtered out
      const newPosts = [makePost('p2'), makePost('p4')]
      const result = feedReducer(prev, { type: 'APPEND', posts: newPosts, cursor: 'p4' })

      expect(result.posts).toHaveLength(4)
      expect(result.posts.map((p) => p.id)).toEqual(['p1', 'p2', 'p3', 'p4'])
    })

    it('sets hasMore based on incoming posts length', () => {
      const prev: FeedState = { posts: makePosts(2), cursor: 'p2', hasMore: true }

      // Incoming < PAGE_SIZE → hasMore false
      const result = feedReducer(prev, { type: 'APPEND', posts: makePosts(5), cursor: 'p7' })
      expect(result.hasMore).toBe(false)
    })

    it('sets hasMore=true when incoming full page', () => {
      const prev: FeedState = { posts: makePosts(2), cursor: 'p2', hasMore: true }

      const result = feedReducer(prev, { type: 'APPEND', posts: makePosts(PAGE_SIZE), cursor: `p${2 + PAGE_SIZE}` })
      expect(result.hasMore).toBe(true)
    })

    it('handles all-duplicate batch (no new posts added)', () => {
      const prev: FeedState = {
        posts: makePosts(3),
        cursor: 'p3',
        hasMore: true,
      }
      const newPosts = makePosts(3) // all duplicates
      const result = feedReducer(prev, { type: 'APPEND', posts: newPosts, cursor: 'p3' })

      expect(result.posts).toHaveLength(3)
      expect(result.hasMore).toBe(false) // 3 < PAGE_SIZE
    })

    it('preserves other state fields', () => {
      const prev: FeedState = { posts: makePosts(1), cursor: 'p1', hasMore: true }
      const result = feedReducer(prev, { type: 'APPEND', posts: [], cursor: null })

      expect(result.cursor).toBeNull()
      expect(result.hasMore).toBe(false)
    })
  })

  describe('UPDATE', () => {
    it('replaces all posts', () => {
      const prev: FeedState = {
        posts: makePosts(5),
        cursor: 'p5',
        hasMore: true,
      }
      const newPosts = makePosts(2, 100)
      const result = feedReducer(prev, { type: 'UPDATE', posts: newPosts })

      expect(result.posts).toEqual(newPosts)
    })

    it('preserves cursor and hasMore', () => {
      const prev: FeedState = {
        posts: makePosts(3),
        cursor: 'p3',
        hasMore: true,
      }
      const result = feedReducer(prev, { type: 'UPDATE', posts: makePosts(1, 50) })

      expect(result.cursor).toBe('p3')
      expect(result.hasMore).toBe(true)
    })

    it('can update a single post in-place', () => {
      const posts = makePosts(3)
      posts[1] = { ...posts[1], is_liked: false, likes_count: 5 }

      const prev: FeedState = { posts, cursor: 'p3', hasMore: false }

      // Simulate like toggle
      const updated = prev.posts.map((p) =>
        p.id === 'p2' ? { ...p, is_liked: true, likes_count: 6 } : p,
      )
      const result = feedReducer(prev, { type: 'UPDATE', posts: updated })

      expect(result.posts[1].is_liked).toBe(true)
      expect(result.posts[1].likes_count).toBe(6)
      expect(result.posts[0]).toEqual(posts[0])
      expect(result.posts[2]).toEqual(posts[2])
    })

    it('can set posts to empty', () => {
      const prev: FeedState = {
        posts: makePosts(3),
        cursor: 'p3',
        hasMore: true,
      }
      const result = feedReducer(prev, { type: 'UPDATE', posts: [] })

      expect(result.posts).toEqual([])
      expect(result.cursor).toBe('p3') // cursor preserved
      expect(result.hasMore).toBe(true) // hasMore preserved
    })
  })

  describe('unknown action', () => {
    it('returns current state for unknown action', () => {
      const prev: FeedState = { posts: makePosts(2), cursor: 'p2', hasMore: true }
      const result = feedReducer(prev, { type: 'UNKNOWN' } as unknown as FeedAction)

      expect(result).toBe(prev) // same reference
    })
  })

  describe('initialState', () => {
    it('has correct defaults', () => {
      expect(initialState.posts).toEqual([])
      expect(initialState.cursor).toBeNull()
      expect(initialState.hasMore).toBe(true)
    })
  })

  describe('PAGE_SIZE', () => {
    it('is 10', () => {
      expect(PAGE_SIZE).toBe(10)
    })
  })
})

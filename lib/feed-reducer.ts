import type { FeedPost } from '@/types'

export const PAGE_SIZE = 10

export interface FeedState {
  posts: FeedPost[]
  cursor: string | null
  hasMore: boolean
}

export type FeedAction =
  | { type: 'INIT'; posts: FeedPost[] }
  | { type: 'APPEND'; posts: FeedPost[]; cursor: string | null }
  | { type: 'UPDATE'; posts: FeedPost[] }

export function feedReducer(state: FeedState, action: FeedAction): FeedState {
  switch (action.type) {
    case 'INIT':
      return {
        posts: action.posts,
        cursor: action.posts.length > 0 ? action.posts[action.posts.length - 1].id : null,
        hasMore: action.posts.length >= PAGE_SIZE,
      }
    case 'APPEND': {
      const seen = new Set(state.posts.map((p) => p.id))
      const newPosts = action.posts.filter((p) => !seen.has(p.id))
      return { ...state, posts: [...state.posts, ...newPosts], cursor: action.cursor, hasMore: action.posts.length >= PAGE_SIZE }
    }
    case 'UPDATE':
      return { ...state, posts: action.posts }
    default:
      return state
  }
}

export const initialState: FeedState = { posts: [], cursor: null, hasMore: true }

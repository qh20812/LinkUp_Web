import React, { type ReactElement } from 'react'
import { render, type RenderOptions } from '@testing-library/react'
import { ToastProvider } from '@/contexts/ToastContext'
import { LanguageProvider } from '@/contexts/LanguageContext'
import { ThemeProvider } from '@/contexts/ThemeContext'

// ─── Custom render with providers ──────────────────────────────────────────

function AllProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <ToastProvider>{children}</ToastProvider>
      </LanguageProvider>
    </ThemeProvider>
  )
}

export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) {
  return render(ui, { wrapper: AllProviders, ...options })
}

export { screen, within, waitFor, act } from '@testing-library/react'
export { userEvent } from '@testing-library/user-event'

// ─── Mock fetch helpers ────────────────────────────────────────────────────

export interface MockFetchOptions {
  status?: number
  body?: unknown
  headers?: Record<string, string>
}

let mockFetchFn: jest.SpyInstance | null = null

function createMockResponse(status: number, body: unknown, headers: Record<string, string> = {}) {
  const jsonBody = JSON.stringify(body)
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: new Map(Object.entries({ 'Content-Type': 'application/json', ...headers })),
    json: jest.fn().mockResolvedValue(body),
    text: jest.fn().mockResolvedValue(jsonBody),
    clone: jest.fn().mockReturnThis(),
  } as unknown as Response
}

function ensureFetchExists() {
  if (typeof globalThis.fetch === 'undefined') {
    ;(globalThis as Record<string, unknown>).fetch = jest.fn()
  }
}

export function mockFetch(options: MockFetchOptions = {}) {
  const { status = 200, body = {}, headers = {} } = options

  ensureFetchExists()
  if (mockFetchFn) mockFetchFn.mockRestore()

  mockFetchFn = jest
    .spyOn(globalThis, 'fetch')
    .mockResolvedValue(createMockResponse(status, body, headers))

  return mockFetchFn
}

export function mockFetchSequence(responses: MockFetchOptions[]) {
  ensureFetchExists()
  if (mockFetchFn) mockFetchFn.mockRestore()

  let callIndex = 0
  mockFetchFn = jest.spyOn(globalThis, 'fetch').mockImplementation(() => {
    const res = responses[callIndex] ?? responses[responses.length - 1]
    callIndex++
    return Promise.resolve(createMockResponse(res.status ?? 200, res.body ?? {}, res.headers))
  })

  return mockFetchFn
}

export function getFetchCalls() {
  return mockFetchFn?.mock.calls ?? []
}

export function getLastFetchPath() {
  const calls = getFetchCalls()
  if (calls.length === 0) return null
  const url = new URL(calls[calls.length - 1][0] as string, 'http://localhost')
  return url.pathname + url.search
}

export function getLastFetchOptions() {
  const calls = getFetchCalls()
  if (calls.length === 0) return null
  return calls[calls.length - 1][1] as RequestInit | undefined
}

export function restoreFetch() {
  mockFetchFn?.mockRestore()
  mockFetchFn = null
}

// ─── Mock localStorage ─────────────────────────────────────────────────────

export function mockLocalStorage() {
  const store: Record<string, string> = {}
  const localStorageMock = {
    getItem: jest.fn((key: string) => store[key] ?? null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key]
    }),
    clear: jest.fn(() => {
      Object.keys(store).forEach((k) => delete store[k])
    }),
    get length() {
      return Object.keys(store).length
    },
    key: jest.fn((index: number) => Object.keys(store)[index] ?? null),
  }

  Object.defineProperty(window, 'localStorage', { value: localStorageMock })
  return localStorageMock
}

// ─── ID generator ──────────────────────────────────────────────────────────

let idCounter = 0
export function uniqueId(prefix = 'id') {
  idCounter++
  return `${prefix}_${idCounter}`
}

export function resetIdCounter() {
  idCounter = 0
}

// ─── Mock data factories ───────────────────────────────────────────────────

import type {
  CommunityListItem,
  CommunityDetailResponse,
  CommunityMember,
  CommunityRule,
  FeedPost,
  FeedMedia,
  NotificationItem,
  AdminUserListItem,
} from '@/types'

export function buildCommunity(overrides?: Partial<CommunityListItem>): CommunityListItem {
  const id = uniqueId('community')
  return {
    id,
    name: `Community ${id}`,
    description: 'A test community',
    avatar_uri: '',
    privacy: 'public',
    member_count: 10,
    created_at: new Date().toISOString(),
    ...overrides,
  }
}

export function buildCommunityDetail(
  overrides?: Partial<CommunityDetailResponse>,
): CommunityDetailResponse {
  const id = uniqueId('community')
  return {
    id,
    name: `Community ${id}`,
    description: 'A test community',
    avatar_uri: '',
    background_uri: '',
    creator_id: 'user-1',
    creator_name: 'Creator',
    privacy: 'public',
    auto_approve: true,
    member_count: 10,
    membership_status: 'none',
    created_at: new Date().toISOString(),
    ...overrides,
  }
}

export function buildCommunityMember(
  overrides?: Partial<CommunityMember>,
): CommunityMember {
  return {
    user_id: uniqueId('user'),
    display_name: 'Test User',
    avatar_uri: '',
    role: 'member',
    joined_at: new Date().toISOString(),
    contribution_score: 0,
    ...overrides,
  }
}

export function buildCommunityRule(
  overrides?: Partial<CommunityRule>,
): CommunityRule {
  return {
    id: uniqueId('rule'),
    community_id: 'community-1',
    category: 'general',
    title: 'Test Rule',
    content: 'Be nice',
    position: 0,
    created_at: new Date().toISOString(),
    ...overrides,
  }
}

export function buildFeedMedia(overrides?: Partial<FeedMedia>): FeedMedia {
  return {
    id: uniqueId('media'),
    user_id: 'user-1',
    file_uri: 'https://example.com/image.jpg',
    file_type: 'image/jpeg',
    ...overrides,
  }
}

export function buildFeedPost(overrides?: Partial<FeedPost>): FeedPost {
  const id = uniqueId('post')
  return {
    id,
    user_id: 'user-1',
    username: 'testuser',
    display_name: 'Test User',
    avatar_uri: '',
    title: 'Test Post',
    content: 'Hello world',
    views_count: 0,
    likes_count: 0,
    comments_count: 0,
    shares_count: 0,
    status: 'public',
    created_at: new Date().toISOString(),
    media: [],
    is_liked: false,
    is_saved: false,
    is_shared: false,
    is_following: false,
    is_pinned: false,
    ...overrides,
  }
}

export function buildNotification(
  overrides?: Partial<NotificationItem>,
): NotificationItem {
  return {
    id: uniqueId('notif'),
    type: 'like',
    content: 'liked your post',
    is_read: false,
    created_at: new Date().toISOString(),
    ...overrides,
  }
}

export function buildAdminUser(
  overrides?: Partial<AdminUserListItem>,
): AdminUserListItem {
  return {
    id: uniqueId('user'),
    username: 'testuser',
    email: 'test@example.com',
    status: 'active',
    display_name: 'Test User',
    avatar_uri: '',
    created_at: new Date().toISOString(),
    ...overrides,
  }
}

// ─── Response builders ─────────────────────────────────────────────────────

export function buildCommunityListResponse(count = 3) {
  return {
    communities: Array.from({ length: count }, () => buildCommunity()),
    total: count,
    page: 1,
    page_size: 12,
  }
}

export function buildFeedResponse(posts?: FeedPost[]) {
  return {
    page_size: 10,
    next_cursor: null as string | null,
    data: posts ?? Array.from({ length: 3 }, () => buildFeedPost()),
  }
}

export function buildNotificationListResponse(count = 3) {
  return {
    data: Array.from({ length: count }, () => buildNotification()),
    total: count,
    page: 1,
  }
}

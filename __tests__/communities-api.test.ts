import {
  mockFetch,
  restoreFetch,
  getLastFetchPath,
  getLastFetchOptions,
  mockLocalStorage,
  buildCommunityListResponse,
  buildCommunityDetail,
  buildCommunityMember,
  buildCommunityRule,
  buildFeedPost,
} from './test-utils'

// Mock localStorage before importing the module under test
mockLocalStorage()

import {
  listCommunities,
  listJoinedCommunities,
  listCreatedCommunities,
  getCommunityDetail,
  getCommunityPosts,
  joinCommunity,
  leaveCommunity,
  getCommunityMembers,
  getCommunityRules,
  createCommunityRule,
  updateCommunityRule,
  deleteCommunityRule,
} from '@/api/communities'

afterEach(() => {
  restoreFetch()
})

// ─── listCommunities ───────────────────────────────────────────────────────

describe('listCommunities', () => {
  it('fetches with default pagination', async () => {
    const body = buildCommunityListResponse(2)
    mockFetch({ body })

    const result = await listCommunities()

    expect(result).toEqual(body)
    expect(getLastFetchPath()).toBe('/api/communities?page=1&page_size=12')
    expect(getLastFetchOptions()?.method).toBeUndefined()
  })

  it('includes keyword when provided', async () => {
    mockFetch({ body: buildCommunityListResponse() })

    await listCommunities('gaming', 2, 20)

    expect(getLastFetchPath()).toBe('/api/communities?page=2&page_size=20&keyword=gaming')
  })

  it('omits keyword when undefined', async () => {
    mockFetch({ body: buildCommunityListResponse() })

    await listCommunities(undefined, 3, 24)

    expect(getLastFetchPath()).toBe('/api/communities?page=3&page_size=24')
  })
})

// ─── listJoinedCommunities ─────────────────────────────────────────────────

describe('listJoinedCommunities', () => {
  it('fetches joined communities with defaults', async () => {
    const body = buildCommunityListResponse(1)
    mockFetch({ body })

    const result = await listJoinedCommunities()

    expect(result).toEqual(body)
    expect(getLastFetchPath()).toBe('/api/communities/joined?page=1&page_size=20')
  })

  it('includes keyword', async () => {
    mockFetch({ body: buildCommunityListResponse() })

    await listJoinedCommunities('react')

    expect(getLastFetchPath()).toBe('/api/communities/joined?page=1&page_size=20&keyword=react')
  })
})

// ─── listCreatedCommunities ────────────────────────────────────────────────

describe('listCreatedCommunities', () => {
  it('fetches created communities with defaults', async () => {
    const body = buildCommunityListResponse(1)
    mockFetch({ body })

    const result = await listCreatedCommunities()

    expect(result).toEqual(body)
    expect(getLastFetchPath()).toBe('/api/communities/created?page=1&page_size=20')
  })

  it('includes keyword and custom pagination', async () => {
    mockFetch({ body: buildCommunityListResponse() })

    await listCreatedCommunities('design', 2, 5)

    expect(getLastFetchPath()).toBe('/api/communities/created?page=2&page_size=5&keyword=design')
  })
})

// ─── getCommunityDetail ────────────────────────────────────────────────────

describe('getCommunityDetail', () => {
  it('fetches detail by ID', async () => {
    const body = buildCommunityDetail({ id: 'comm-123', name: 'Go Lang' })
    mockFetch({ body })

    const result = await getCommunityDetail('comm-123')

    expect(result).toEqual(body)
    expect(result.name).toBe('Go Lang')
    expect(getLastFetchPath()).toBe('/api/communities/comm-123')
  })
})

// ─── getCommunityPosts ─────────────────────────────────────────────────────

describe('getCommunityPosts', () => {
  it('fetches posts with default pageSize', async () => {
    const posts = [buildFeedPost({ id: 'p1' }), buildFeedPost({ id: 'p2' })]
    mockFetch({ body: { posts } })

    const result = await getCommunityPosts('comm-1')

    expect(result.posts).toHaveLength(2)
    expect(getLastFetchPath()).toBe('/api/communities/comm-1/posts?page_size=10')
  })

  it('includes cursor when provided', async () => {
    mockFetch({ body: { posts: [] } })

    await getCommunityPosts('comm-1', 'cursor-abc', 5)

    expect(getLastFetchPath()).toBe(
      '/api/communities/comm-1/posts?page_size=5&cursor=cursor-abc',
    )
  })

  it('omits cursor when undefined', async () => {
    mockFetch({ body: { posts: [] } })

    await getCommunityPosts('comm-1', undefined, 20)

    expect(getLastFetchPath()).toBe('/api/communities/comm-1/posts?page_size=20')
  })
})

// ─── joinCommunity ─────────────────────────────────────────────────────────

describe('joinCommunity', () => {
  it('sends POST with empty body when no code/invitationID', async () => {
    mockFetch({ body: { message: 'joined' } })

    const result = await joinCommunity('comm-1')

    expect(result.message).toBe('joined')
    expect(getLastFetchPath()).toBe('/api/communities/comm-1/join')
    expect(getLastFetchOptions()?.method).toBe('POST')
    expect(JSON.parse(getLastFetchOptions()?.body as string)).toEqual({})
  })

  it('includes code in body', async () => {
    mockFetch({ body: { message: 'joined' } })

    await joinCommunity('comm-1', 'ABC123')

    const sentBody = JSON.parse(getLastFetchOptions()?.body as string)
    expect(sentBody).toEqual({ code: 'ABC123' })
  })

  it('includes invitation_id in body', async () => {
    mockFetch({ body: { message: 'joined' } })

    await joinCommunity('comm-1', undefined, 'inv-456')

    const sentBody = JSON.parse(getLastFetchOptions()?.body as string)
    expect(sentBody).toEqual({ invitation_id: 'inv-456' })
  })

  it('includes both code and invitation_id', async () => {
    mockFetch({ body: { message: 'joined' } })

    await joinCommunity('comm-1', 'CODE', 'INV')

    const sentBody = JSON.parse(getLastFetchOptions()?.body as string)
    expect(sentBody).toEqual({ code: 'CODE', invitation_id: 'INV' })
  })
})

// ─── leaveCommunity ────────────────────────────────────────────────────────

describe('leaveCommunity', () => {
  it('sends DELETE request', async () => {
    mockFetch({ body: { message: 'left' } })

    const result = await leaveCommunity('comm-1')

    expect(result.message).toBe('left')
    expect(getLastFetchPath()).toBe('/api/communities/comm-1/leave')
    expect(getLastFetchOptions()?.method).toBe('DELETE')
  })
})

// ─── getCommunityMembers ───────────────────────────────────────────────────

describe('getCommunityMembers', () => {
  it('fetches members list', async () => {
    const members = [
      buildCommunityMember({ user_id: 'u1', display_name: 'Alice' }),
      buildCommunityMember({ user_id: 'u2', display_name: 'Bob' }),
    ]
    mockFetch({ body: { members } })

    const result = await getCommunityMembers('comm-1')

    expect(result.members).toHaveLength(2)
    expect(result.members[0].display_name).toBe('Alice')
    expect(getLastFetchPath()).toBe('/api/communities/comm-1/members')
  })
})

// ─── getCommunityRules ─────────────────────────────────────────────────────

describe('getCommunityRules', () => {
  it('fetches rules list', async () => {
    const rules = [
      buildCommunityRule({ id: 'r1', title: 'Rule 1' }),
      buildCommunityRule({ id: 'r2', title: 'Rule 2' }),
    ]
    mockFetch({ body: { rules } })

    const result = await getCommunityRules('comm-1')

    expect(result.rules).toHaveLength(2)
    expect(result.rules[0].title).toBe('Rule 1')
    expect(getLastFetchPath()).toBe('/api/communities/comm-1/rules')
  })
})

// ─── createCommunityRule ───────────────────────────────────────────────────

describe('createCommunityRule', () => {
  it('sends POST with rule data', async () => {
    mockFetch({ body: { rule_id: 'new-rule-1' } })

    const result = await createCommunityRule('comm-1', {
      category: 'conduct',
      title: 'Be respectful',
      content: 'No harassment',
      position: 1,
    })

    expect(result.rule_id).toBe('new-rule-1')
    expect(getLastFetchPath()).toBe('/api/communities/comm-1/rules')
    expect(getLastFetchOptions()?.method).toBe('POST')

    const sentBody = JSON.parse(getLastFetchOptions()?.body as string)
    expect(sentBody).toEqual({
      category: 'conduct',
      title: 'Be respectful',
      content: 'No harassment',
      position: 1,
    })
  })

  it('sends POST with minimal data (no optional fields)', async () => {
    mockFetch({ body: { rule_id: 'r2' } })

    await createCommunityRule('comm-1', {
      category: 'general',
      title: 'General rule',
    })

    const sentBody = JSON.parse(getLastFetchOptions()?.body as string)
    expect(sentBody).toEqual({ category: 'general', title: 'General rule' })
  })
})

// ─── updateCommunityRule ───────────────────────────────────────────────────

describe('updateCommunityRule', () => {
  it('sends PUT with partial data', async () => {
    mockFetch({ body: { rule_id: 'r1' } })

    const result = await updateCommunityRule('comm-1', 'r1', {
      title: 'Updated title',
    })

    expect(result.rule_id).toBe('r1')
    expect(getLastFetchPath()).toBe('/api/communities/comm-1/rules/r1')
    expect(getLastFetchOptions()?.method).toBe('PUT')

    const sentBody = JSON.parse(getLastFetchOptions()?.body as string)
    expect(sentBody).toEqual({ title: 'Updated title' })
  })

  it('sends PUT with all fields', async () => {
    mockFetch({ body: { rule_id: 'r1' } })

    await updateCommunityRule('comm-1', 'r1', {
      category: 'new-cat',
      title: 'New title',
      content: 'New content',
      position: 5,
    })

    const sentBody = JSON.parse(getLastFetchOptions()?.body as string)
    expect(sentBody).toEqual({
      category: 'new-cat',
      title: 'New title',
      content: 'New content',
      position: 5,
    })
  })
})

// ─── deleteCommunityRule ───────────────────────────────────────────────────

describe('deleteCommunityRule', () => {
  it('sends DELETE request', async () => {
    mockFetch({ body: { message: 'deleted' } })

    const result = await deleteCommunityRule('comm-1', 'r1')

    expect(result.message).toBe('deleted')
    expect(getLastFetchPath()).toBe('/api/communities/comm-1/rules/r1')
    expect(getLastFetchOptions()?.method).toBe('DELETE')
  })
})

// ─── Error handling ────────────────────────────────────────────────────────

describe('error handling', () => {
  it('throws on non-ok response', async () => {
    mockFetch({ status: 404, body: { error: 'community.NOT_FOUND' } })

    await expect(getCommunityDetail('missing')).rejects.toThrow()
  })

  it('throws on 500', async () => {
    mockFetch({ status: 500, body: { error: 'Internal Server Error' } })

    await expect(listCommunities()).rejects.toThrow()
  })
})

// ─── Authorization header ──────────────────────────────────────────────────

describe('authorization', () => {
  it('includes Bearer token when set in localStorage', async () => {
    window.localStorage.setItem('token', 'test-jwt-token')
    mockFetch({ body: buildCommunityListResponse() })

    await listCommunities()

    const opts = getLastFetchOptions()
    expect(opts?.headers).toEqual(
      expect.objectContaining({
        Authorization: 'Bearer test-jwt-token',
      }),
    )
  })

  it('omits Authorization header when no token', async () => {
    window.localStorage.removeItem('token')
    mockFetch({ body: buildCommunityListResponse() })

    await listCommunities()

    const opts = getLastFetchOptions()
    const headers = opts?.headers as Record<string, string> | undefined
    expect(headers?.Authorization).toBeUndefined()
  })
})

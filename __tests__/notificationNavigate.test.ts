import { notificationHref } from '@/utils/notificationNavigate'
import type { NotificationType } from '@/types'

function item(type: NotificationType, extra: Record<string, string> = {}) {
  return { type, ...extra }
}

describe('notificationHref', () => {
  it('routes report notifications to the reported post or user', () => {
    expect(notificationHref(item('report_result', { redirect_post_id: 'post-1' }))).toBe('/posts/post-1')
    expect(notificationHref(item('report_result', { redirect_user_id: 'user-1' }))).toBe('/profile/user-1')
    expect(notificationHref(item('report_submitted', { redirect_post_id: 'post-1' }))).toBe('/posts/post-1')
    expect(notificationHref(item('report_submitted', { redirect_user_id: 'user-1' }))).toBe('/profile/user-1')
  })

  it('does not route report notifications to the chat page when there is no target', () => {
    expect(notificationHref(item('report_result'))).toBeNull()
    expect(notificationHref(item('report_submitted'))).toBeNull()
  })

  it('keeps chat notifications on the messages page', () => {
    expect(notificationHref(item('message', { redirect_comment_id: 'chat-1' }))).toBe('/messages?chat_id=chat-1')
    expect(notificationHref(item('message'))).toBe('/messages')
  })

  it('routes non-chat message notifications to their target instead of messages', () => {
    expect(notificationHref(item('message', { redirect_post_id: 'post-1' }))).toBe('/posts/post-1')
    expect(notificationHref(item('message', { redirect_user_id: 'user-1' }))).toBe('/profile/user-1')
  })

  it('routes message reactions back to the chat', () => {
    expect(notificationHref(item('message_react', { redirect_comment_id: 'chat-1' }))).toBe('/messages?chat_id=chat-1')
    expect(notificationHref(item('message_react'))).toBe('/messages')
  })

  it('routes community notifications to the community page', () => {
    expect(notificationHref(item('community_role_changed', { redirect_community_id: 'community-1' }))).toBe('/communities/community-1')
    expect(notificationHref(item('community_member_left', { redirect_community_id: 'community-1' }))).toBe('/communities/community-1')
    expect(notificationHref(item('community_invitation_received'))).toBe('/communities')
  })

  it('routes moderation notifications by target priority', () => {
    expect(notificationHref(item('moderation', { redirect_post_id: 'post-1' }))).toBe('/posts/post-1')
    expect(notificationHref(item('moderation', { redirect_community_id: 'community-1' }))).toBe('/communities/community-1')
    expect(notificationHref(item('moderation', { redirect_ad_id: 'ad-1' }))).toBe('/partner/ads/ad-1')
    expect(notificationHref(item('moderation', { redirect_comment_id: 'chat-1' }))).toBe('/messages?chat_id=chat-1')
    expect(notificationHref(item('moderation', { redirect_user_id: 'user-1' }))).toBe('/profile/user-1')
    expect(notificationHref(item('moderation'))).toBeNull()
  })

  it('routes wallet, package and call notifications', () => {
    expect(notificationHref(item('wallet'))).toBe('/wallet')
    expect(notificationHref(item('package'))).toBe('/partner/packages')
    expect(notificationHref(item('voice_call', { redirect_user_id: 'caller-1' }))).toBe('/messages')
  })

  it('routes story notifications to the interactor profile', () => {
    expect(notificationHref(item('story_react', { redirect_user_id: 'user-1' }))).toBe('/profile/user-1')
    expect(notificationHref(item('comment', { redirect_user_id: 'user-1' }))).toBe('/profile/user-1')
    expect(notificationHref(item('share', { redirect_user_id: 'user-1' }))).toBe('/profile/user-1')
  })
})

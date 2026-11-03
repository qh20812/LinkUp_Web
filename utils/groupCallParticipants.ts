import type { GroupCallProfile } from '../types/groupCall'

/**
 * Danh tính hiển thị của một người trong cuộc gọi nhóm.
 *
 * Bất biến: KHÔNG BAO GIỜ trả về user_id làm tên hiển thị. Trước đây payload
 * call không kèm profile nên UI in thẳng UUID ra tile, modal reo máy và modal
 * duyệt yêu cầu.
 */
export function participantIdentity(
  userId: string,
  myUserId: string,
  profile: GroupCallProfile | undefined,
  labels: { you: string; member: string },
): { display_name: string; avatar_uri: string } {
  const profileName = profile?.display_name?.trim() ?? ''
  const display_name =
    userId === myUserId ? labels.you : profileName || labels.member
  return {
    display_name,
    avatar_uri: profile?.avatar_uri?.trim() ?? '',
  }
}

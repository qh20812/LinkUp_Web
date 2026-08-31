import type { ChatMessage } from '../types'
import { extractVideoUrls } from './videoLink'

export interface MediaGroupItem {
  kind: 'media_group'
  msgs: ChatMessage[]
  created: number
}

export const MEDIA_GROUP_WINDOW_MS = 3000

// Một message được coi là media nếu có media_id/media_uri và không thuộc các
// loại đặc biệt (emoji, shared_post, deleted, decrypt_failed, hệ thống, video
// URL thô). Lưu ý: message media bình thường có thể có type === 'text' hoặc
// type trống (message từ server đọc từ DB có type mặc định 'text'), nên KHÔNG
// được loại bỏ dựa trên type — chỉ loại các type đặc biệt.
export function isMediaMessage(msg: ChatMessage): boolean {
  if (msg.deleted || msg.decrypt_failed || msg.emoji_id || msg.shared_post_id) return false
  const mt = msg.type || 'text'
  if (mt !== 'text') return false
  if (!(msg.media_id || msg.media_uri)) return false
  if (extractVideoUrls(msg.content ?? '').length) return false
  return true
}

interface LooseItem {
  kind: string
  msg?: ChatMessage
  created?: number
}

export function groupMediaTimeline<TItem extends { kind: string }>(
  items: TItem[],
): (TItem | MediaGroupItem)[] {
  const result: (TItem | MediaGroupItem)[] = []
  let i = 0

  while (i < items.length) {
    const item = items[i] as TItem & LooseItem

    // Chỉ nhóm message kind
    if (item.kind !== 'message' || !item.msg || !isMediaMessage(item.msg)) {
      result.push(item as TItem)
      i++
      continue
    }

    // Thu thập các media message liền kề từ cùng sender.
    // Ưu tiên nhóm theo media_group_id (đáng tin cậy, tồn tại sau reload);
    // nếu không có (message cũ) thì fallback cửa sổ thời gian.
    const groupID = item.msg.media_group_id
    const itemCreated = item.created ?? 0

    const group: ChatMessage[] = [item.msg]
    let j = i + 1
    while (j < items.length) {
      const next = items[j] as TItem & LooseItem
      if (next.kind !== 'message' || !next.msg || !isMediaMessage(next.msg)) break
      if (next.msg.sender_id !== item.msg.sender_id) break
      if (groupID) {
        if (next.msg.media_group_id !== groupID) break
      } else {
        const gap = (next.created ?? 0) - itemCreated
        if (gap > MEDIA_GROUP_WINDOW_MS) break
      }
      // Chỉ nhóm nếu tin hiện tại là media-only hoặc tin đầu tiên có content
      if (next.msg.content?.trim() && group.length > 0) break
      group.push(next.msg)
      j++
    }

    if (group.length >= 2) {
      result.push({ kind: 'media_group', msgs: group, created: itemCreated })
    } else {
      result.push(item as TItem)
    }
    i = j
  }

  return result
}

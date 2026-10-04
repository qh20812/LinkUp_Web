import { deleteChatKey, setChatKey } from '../utils/idb'
import {
  decryptChat,
  encryptMessage,
  generateChatKeyBase64,
  invalidateChatKeyCache,
} from '../utils/e2ee'

// Regression cho bug: userA (legacy, chưa có key) nhận tin live mã hóa bằng key
// K_B mà userB vừa setup → live decrypt thất bại (keyCount=0). Sau khi adopt
// key từ server + xóa cache, decrypt lại PHẢI thành công — thay vì kẹt
// "Không thể giải mã tin nhắn" đến khi F5.

describe('live decrypt failure then adopt + retry (E2E key setup race)', () => {
  it('fails live with no key, then decrypts after adopting the new key', async () => {
    const chatId = 'live-retry-adopt'
    const keyB = generateChatKeyBase64()
    const cipher = await encryptMessage(keyB, 'bạn tên gì?')

    // 1. Máy A chưa có key (legacy) → live decrypt thất bại như message:new.
    await expect(decryptChat(chatId, cipher)).rejects.toThrow()

    // 2. Adopt key mới từ server (ensureChatKey/refreshKeys làm việc này) +
    //    xóa cache — mô phỏng đúng thứ tự fix trong useChatRoom.
    await setChatKey(chatId, keyB)
    invalidateChatKeyCache(chatId)

    // 3. Retry decrypt lại cùng ciphertext → phải ra bản rõ.
    await expect(decryptChat(chatId, cipher)).resolves.toBe('bạn tên gì?')
    await deleteChatKey(chatId)
  })

  it('stays failed without cache invalidation (locks the cache-stale bug)', async () => {
    const chatId = 'live-retry-stale-cache'
    const keyB = generateChatKeyBase64()
    const cipher = await encryptMessage(keyB, 'still locked')

    // Lần đầu không key → cache ghi null.
    await expect(decryptChat(chatId, cipher)).rejects.toThrow()

    // Key đã về IDB NHƯNG quên xóa cache → vẫn thất bại (đây chính là lỗi cũ
    // nếu retry mà không invalidate).
    await setChatKey(chatId, keyB)
    await expect(decryptChat(chatId, cipher)).rejects.toThrow()

    // Có invalidate → khỏi.
    invalidateChatKeyCache(chatId)
    await expect(decryptChat(chatId, cipher)).resolves.toBe('still locked')
    await deleteChatKey(chatId)
  })
})

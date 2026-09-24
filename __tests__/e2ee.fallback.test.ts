import {
  addChatAltKey,
  deleteChatKey,
  setChatKey,
} from '../utils/idb'
import { decryptChat, encryptMessage, generateChatKeyBase64 } from '../utils/e2ee'

// C.4b: decryptChat phải thử canonical (chat_keys) trước, rồi fallback qua các
// khóa chat_alt_keys. Chạy trên fake-indexeddb + idb.ts THẬT (không mock) để
// cover luôn đường đọc/cache khóa.

describe('decryptChat alt-key fallback (C.4b)', () => {
  it('decrypts with the canonical key', async () => {
    const chatId = 'fb-canonical'
    const key = generateChatKeyBase64()
    await setChatKey(chatId, key)
    const cipher = await encryptMessage(key, 'hello canonical')

    expect(await decryptChat(chatId, cipher)).toBe('hello canonical')
    await deleteChatKey(chatId)
  })

  it('falls back to an alt key when the canonical key is wrong', async () => {
    const chatId = 'fb-alt-fallback'
    const wrongCanonical = generateChatKeyBase64()
    const altKey = generateChatKeyBase64()
    await setChatKey(chatId, wrongCanonical)
    await addChatAltKey(chatId, altKey)

    const cipher = await encryptMessage(altKey, 'decrypted via alt key')
    expect(await decryptChat(chatId, cipher)).toBe('decrypted via alt key')
    await deleteChatKey(chatId)
  })

  it('throws when neither canonical nor alt keys can decrypt', async () => {
    const chatId = 'fb-no-key'
    const known = generateChatKeyBase64()
    await setChatKey(chatId, known)
    await addChatAltKey(chatId, generateChatKeyBase64())

    const cipher = await encryptMessage(generateChatKeyBase64(), 'unreadable')
    await expect(decryptChat(chatId, cipher)).rejects.toThrow()
    await deleteChatKey(chatId)
  })
})
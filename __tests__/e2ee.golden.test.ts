import {
  deriveChatKey,
  decryptMessage,
  encryptMessage,
  unwrapChatKey,
  wrapChatKey,
} from '../utils/e2ee'

// Golden vector C.4: fixtures sinh offline bằng Node WebCrypto, giá trị expected
// cũng sinh offline rồi hardcode. Test này khớp đúng khi toàn bộ chuỗi mã hóa
// (ECDH P-256 → HKDF-SHA256 info "linkup-e2e-v1" → wrap bằng AES-256-GCM với IV
// cố định) giữ nguyên. E2E_INFO đổi → các giá trị golden KHÔNG khớp → test fail
// như một rào chắn regression cho mọi breaking change.
//
// Fixture ECDH P-256 (sinh 1 lần, bất biến):
const ALICE_PKCS8 = 'MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgEVCCsSAgULfnK9Pt6bYxDiNwriLA4g+LSiVhVJ2PMZqhRANCAASG2t+nJhAM8s1ce4OK9enAN2Q1JcJME1gYooGHD9RGcOFTAfL6AMOeofuHrwIHjrSKGH6uUWDk83Errq5U3Fmq'
const BOB_SPKI = 'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEiIcQvCctYRsjCa6e1qUfEyWPvcKtuprNHhhwr5qylNEjUlgwx/E0ZST01Pv1lVQ67Y8x9k6yPrg9CqhBa0OVLw=='
const CHAT_KEY_B64 = 'AxQlNkdYaXqLnK2+z+DxAhMkNUZXaHmKm6y9zt/wARI='
const FIXED_IV_B64 = 'AQIDBAUGBwgJCgsM'
const PLAIN_MSG = '🔒 golden vector message'

// Expected output (hardcode, không phụ thuộc runtime):
const GOLDEN_WRAPPED = 'AQIDBAUGBwgJCgsM06pqZnZEHFO2/AE4HsGR/CiIgOGa2R3E9vxAdc+nQpEOPcbp33nT90C6VS0qIH4d'
const GOLDEN_ENCRYPTED = 'AQIDBAUGBwgJCgsMiMk4JyI8GtEJyWymkoNR/6EqpxyQc5dUGE6FXkfM2ieO05+NuFc0wpiN'

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64)
  const out = new Uint8Array(new ArrayBuffer(bin.length))
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

// importKey('pkcs8') cần usages deriveBits — giống identity flow thật.
async function importAlicePrivate(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'pkcs8',
    b64ToBytes(ALICE_PKCS8) as BufferSource,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    ['deriveBits'],
  )
}

describe('e2ee golden vectors (C.4)', () => {
  it('deriveChatKey produces a stable shared key', async () => {
    const alice = await importAlicePrivate()
    const key1 = await deriveChatKey(alice, BOB_SPKI)
    const key2 = await deriveChatKey(alice, BOB_SPKI)
    // Không export được CryptoKey — minh chứng qua unwrap round-trip.
    const { wrapped, nonce } = await wrapChatKey(key1, CHAT_KEY_B64, b64ToBytes(FIXED_IV_B64))
    expect(await unwrapChatKey(key2, wrapped, nonce)).toBe(CHAT_KEY_B64)
  })

  it('wrapChatKey with fixed IV matches the golden wrapped value', async () => {
    const shared = await deriveChatKey(await importAlicePrivate(), BOB_SPKI)
    const { wrapped, nonce } = await wrapChatKey(
      shared,
      CHAT_KEY_B64,
      b64ToBytes(FIXED_IV_B64),
    )
    expect(wrapped).toBe(GOLDEN_WRAPPED)
    expect(nonce).toBe(FIXED_IV_B64)
  })

  it('unwrapChatKey recovers the chat key from golden ciphertext', async () => {
    const shared = await deriveChatKey(await importAlicePrivate(), BOB_SPKI)
    expect(await unwrapChatKey(shared, GOLDEN_WRAPPED)).toBe(CHAT_KEY_B64)
  })

  it('encryptMessage with fixed IV matches the golden ciphertext', async () => {
    const cipher = await encryptMessage(
      CHAT_KEY_B64,
      PLAIN_MSG,
      b64ToBytes(FIXED_IV_B64),
    )
    expect(cipher).toBe(GOLDEN_ENCRYPTED)
  })

  it('decryptMessage recovers the plaintext from golden ciphertext', async () => {
    expect(await decryptMessage(CHAT_KEY_B64, GOLDEN_ENCRYPTED)).toBe(PLAIN_MSG)
  })
})
import {
  PBKDF2_ITERATIONS,
  RECOVERY_PBKDF2_ITERATIONS,
  deriveChatKey,
  derivePinKey,
  deriveRecoveryKey,
  decryptMessage,
  decryptRecoveryBlob,
  encryptMessage,
  encryptRecoveryBlob,
  generateChatKeyBase64,
  generateRecoveryKey,
  generateRecoverySalt,
  hashCheck,
  unwrapChatKey,
  wrapChatKey,
  type RecoveryBlobPayload,
} from '../utils/e2ee'

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64)
  const out = new Uint8Array(new ArrayBuffer(bin.length))
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

function bytesToB64(bytes: Uint8Array): string {
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return btoa(bin)
}

function concat(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length + b.length)
  out.set(a, 0)
  out.set(b, a.length)
  return out
}

// ECDH pairs: a||b và b||a phải ra CÙNG shared key (tính chất ECDH).
async function makeEcdhPair(): Promise<{ privateKey: CryptoKey; publicKeyB64: string }> {
  const pair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    ['deriveBits'],
  )
  const spki = await crypto.subtle.exportKey('spki', pair.publicKey)
  return { privateKey: pair.privateKey, publicKeyB64: bytesToB64(new Uint8Array(spki)) }
}

describe('e2ee core crypto', () => {
  it('generateChatKeyBase64 returns a 32-byte key', () => {
    const key = generateChatKeyBase64()
    expect(b64ToBytes(key)).toHaveLength(32)
    expect(key).toMatch(/^[A-Za-z0-9+/]+={0,2}$/)
  })

  it('encryptMessage/decryptMessage round-trips', async () => {
    const key = generateChatKeyBase64()
    const plain = 'Xin chào! 🔒 zalo vn'
    const cipher = await encryptMessage(key, plain)
    expect(await decryptMessage(key, cipher)).toBe(plain)
  })

  it('decryptMessage throws with the wrong key', async () => {
    const cipher = await encryptMessage(generateChatKeyBase64(), 'secret')
    await expect(decryptMessage(generateChatKeyBase64(), cipher)).rejects.toThrow()
  })

  it('decryptMessage detects tampered ciphertext (AES-GCM auth)', async () => {
    const key = generateChatKeyBase64()
    const cipher = await encryptMessage(key, 'integrity')
    const blob = b64ToBytes(cipher)
    blob[blob.length - 1] = blob[blob.length - 1] ^ 0xff
    await expect(decryptMessage(key, bytesToB64(blob))).rejects.toThrow()
  })
})

describe('deriveChatKey (ECDH + HKDF)', () => {
  it('is deterministic for the same input pair', async () => {
    const mine = await makeEcdhPair()
    const theirs = await makeEcdhPair()
    const shared1 = await deriveChatKey(mine.privateKey, theirs.publicKeyB64)
    const shared2 = await deriveChatKey(mine.privateKey, theirs.publicKeyB64)

    const chatKey = generateChatKeyBase64()
    const { wrapped, nonce } = await wrapChatKey(shared1, chatKey)
    expect(await unwrapChatKey(shared2, wrapped, nonce)).toBe(chatKey)

    const wrong = await deriveChatKey(
      mine.privateKey,
      (await makeEcdhPair()).publicKeyB64,
    )
    await expect(unwrapChatKey(wrong, wrapped, nonce)).rejects.toThrow()
  })

  it('is symmetric: a||b equals b||a (ECDH property)', async () => {
    const a = await makeEcdhPair()
    const b = await makeEcdhPair()
    const sharedAB = await deriveChatKey(a.privateKey, b.publicKeyB64)
    const sharedBA = await deriveChatKey(b.privateKey, a.publicKeyB64)

    const chatKey = generateChatKeyBase64()
    const { wrapped, nonce } = await wrapChatKey(sharedBA, chatKey)
    expect(await unwrapChatKey(sharedAB, wrapped, nonce)).toBe(chatKey)
  })
})

describe('wrapChatKey / unwrapChatKey', () => {
  it('round-trips a 32-byte chat key', async () => {
    const a = await makeEcdhPair()
    const b = await makeEcdhPair()
    const shared = await deriveChatKey(a.privateKey, b.publicKeyB64)

    const chatKey = generateChatKeyBase64()
    const { wrapped, nonce } = await wrapChatKey(shared, chatKey)
    expect(await unwrapChatKey(shared, wrapped, nonce)).toBe(chatKey)
    // nonce cũng nằm ở đầu wrapped (self-describing format).
    expect(await unwrapChatKey(shared, wrapped)).toBe(chatKey)
  })
})

describe('recovery key material', () => {
  it('uses the documented PBKDF2 iteration counts', () => {
    expect(PBKDF2_ITERATIONS).toBe(600_000)
    expect(RECOVERY_PBKDF2_ITERATIONS).toBe(200_000)
  })

  it('generateRecoveryKey returns 32 chars from the safe alphabet, unique per call', () => {
    const a = generateRecoveryKey()
    const b = generateRecoveryKey()
    expect(a).toHaveLength(32)
    // Alphabet loại bỏ 0/O/1/I/L.
    expect(a).toMatch(/^[A-HJ-NP-Z2-9]{32}$/)
    expect(b).toHaveLength(32)
    expect(a).not.toBe(b)
  })

  it('generateRecoverySalt returns a 16-byte base64 salt', () => {
    expect(b64ToBytes(generateRecoverySalt())).toHaveLength(16)
  })

  it('hashCheck is deterministic and salt/secret-sensitive', async () => {
    const salt = generateRecoverySalt()
    const h1 = await hashCheck('123456', salt, PBKDF2_ITERATIONS)
    const h2 = await hashCheck('123456', salt, PBKDF2_ITERATIONS)
    expect(h1).toBe(h2)

    const otherSalt = await hashCheck('123456', generateRecoverySalt(), PBKDF2_ITERATIONS)
    expect(h1).not.toBe(otherSalt)

    const otherSecret = await hashCheck('654321', salt, PBKDF2_ITERATIONS)
    expect(h1).not.toBe(otherSecret)
  })
})

describe('PIN + recovery key backup (B.3)', () => {
  const payload: RecoveryBlobPayload = {
    version: 1,
    keys: { 'chat-1': generateChatKeyBase64(), 'chat-2': generateChatKeyBase64() },
    altKeys: { 'chat-1': [generateChatKeyBase64()] },
  }

  it('PIN and recovery key unlock the SAME blob', async () => {
    const salt = generateRecoverySalt()
    const pinKey = await derivePinKey('246810', salt)
    const recoveryKey = await deriveRecoveryKey(generateRecoveryKey(), salt)

    const blob = await encryptRecoveryBlob(payload, pinKey, recoveryKey)

    expect(await decryptRecoveryBlob(blob, pinKey)).toEqual(payload)
    expect(await decryptRecoveryBlob(blob, recoveryKey)).toEqual(payload)
  })

  it('PIN-derived and recovery-derived keys differ', async () => {
    const salt = generateRecoverySalt()
    const pinKey = await derivePinKey('246810', salt)
    const recoveryKey = await deriveRecoveryKey(generateRecoveryKey(), salt)

    const blob = await encryptRecoveryBlob(payload, pinKey, recoveryKey)
    const wrongPin = await derivePinKey('000000', salt)
    const wrongRecovery = await deriveRecoveryKey(generateRecoveryKey(), salt)
    expect(await decryptRecoveryBlob(blob, wrongPin)).toBeNull()
    expect(await decryptRecoveryBlob(blob, wrongRecovery)).toBeNull()
  })

  it('returns null on a wrong salt and tampered blob', async () => {
    const salt = generateRecoverySalt()
    const pinKey = await derivePinKey('246810', salt)
    const recoveryKey = await deriveRecoveryKey(generateRecoveryKey(), salt)

    const blob = await encryptRecoveryBlob(payload, pinKey, recoveryKey)

    // Cùng PIN nhưng dẫn khóa bằng salt khác → không unwrap được blob.
    const wrongSaltKey = await derivePinKey('246810', generateRecoverySalt())
    expect(await decryptRecoveryBlob(blob, wrongSaltKey)).toBeNull()

    // Sửa byte cuối ciphertext → AES-GCM reject → null.
    const parsed = JSON.parse(blob) as { d: string }
    const d = b64ToBytes(parsed.d)
    d[d.length - 1] = d[d.length - 1] ^ 0x01
    parsed.d = bytesToB64(d)
    expect(await decryptRecoveryBlob(JSON.stringify(parsed), pinKey)).toBeNull()
  })

  it('derivePinKey and deriveRecoveryKey are stable across calls', async () => {
    // Không thể so sánh CryptoKey trực tiếp; minh chứng qua round-trip ổn định.
    const salt = generateRecoverySalt()
    const blob = await encryptRecoveryBlob(
      payload,
      await derivePinKey('123456', salt),
      await deriveRecoveryKey(generateRecoveryKey(), salt),
    )
    expect(await decryptRecoveryBlob(blob, await derivePinKey('123456', salt))).toEqual(payload)
  })
})
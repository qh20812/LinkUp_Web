import { getIdentity, setIdentity } from './idb'

export const E2E_INFO = 'linkup-e2e-v1'

const te = new TextEncoder()
const td = new TextDecoder()

function b64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
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

function concat(a: Uint8Array, b: Uint8Array): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(new ArrayBuffer(a.length + b.length))
  out.set(a, 0)
  out.set(b, a.length)
  return out
}

export interface E2EIdentity {
  userId: string
  publicKey: string
  privateKey: CryptoKey
}

async function importAesKey(raw: Uint8Array<ArrayBuffer>, usage: KeyUsage[]): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, usage)
}

async function generateIdentity(userId: string): Promise<E2EIdentity> {
  const keyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    ['deriveBits'],
  )
  const pubRaw = await crypto.subtle.exportKey('spki', keyPair.publicKey)
  return {
    userId,
    publicKey: bytesToB64(new Uint8Array(pubRaw)),
    privateKey: keyPair.privateKey,
  }
}

export async function getOrCreateIdentity(userId: string): Promise<E2EIdentity> {
  const stored = await getIdentity(userId)
  if (stored?.private_key && stored.public_key) {
    return { userId, publicKey: stored.public_key, privateKey: stored.private_key }
  }
  const generated = await generateIdentity(userId)
  await setIdentity({
    user_id: userId,
    public_key: generated.publicKey,
    private_key: generated.privateKey,
  })
  return generated
}

// deriveChatKey tạo khóa AES-GCM chung từ private key của mình và public key
// của đối phương qua ECDH (P-256) + HKDF-SHA256. Cùng cặp khóa luôn ra cùng
// một khóa bí mật, chỉ hai đầu có thể tính được.
export async function deriveChatKey(
  privateKey: CryptoKey,
  peerPublicKeyB64: string,
): Promise<CryptoKey> {
  const peerPub = await crypto.subtle.importKey(
    'spki',
    b64ToBytes(peerPublicKeyB64),
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    [],
  )
  const sharedBits = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: peerPub },
    privateKey,
    256,
  )
  const hkdfRaw = await crypto.subtle.importKey('raw', sharedBits, 'HKDF', false, [
    'deriveKey',
  ])
  return crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(0), info: te.encode(E2E_INFO) },
    hkdfRaw,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

export function generateChatKeyBase64(): string {
  return bytesToB64(crypto.getRandomValues(new Uint8Array(32)))
}

// wrapChatKey bọc khóa chat (32 byte) bằng khóa ECDH chung, dạng b64(iv || ciphertext).
export async function wrapChatKey(
  sharedKey: CryptoKey,
  chatKeyB64: string,
): Promise<{ wrapped: string; nonce: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, sharedKey, b64ToBytes(chatKeyB64))
  return { wrapped: bytesToB64(concat(iv, new Uint8Array(ct))), nonce: bytesToB64(iv) }
}

export async function unwrapChatKey(
  sharedKey: CryptoKey,
  wrapped: string,
  nonce?: string,
): Promise<string> {
  const blob = b64ToBytes(wrapped)
  const iv = nonce ? b64ToBytes(nonce) : blob.slice(0, 12)
  const ct = blob.slice(iv.length)
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    sharedKey,
    ct as BufferSource,
  )
  return bytesToB64(new Uint8Array(plain))
}

// encryptMessage mã hóa nội dung tin nhắn bằng khóa chat, dạng b64(iv || ciphertext).
export async function encryptMessage(chatKeyB64: string, plain: string): Promise<string> {
  const key = await importAesKey(b64ToBytes(chatKeyB64), ['encrypt'])
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, te.encode(plain))
  return bytesToB64(concat(iv, new Uint8Array(ct)))
}

export async function decryptMessage(chatKeyB64: string, cipher: string): Promise<string> {
  const blob = b64ToBytes(cipher)
  const iv = blob.slice(0, 12)
  const ct = blob.slice(12)
  const key = await importAesKey(b64ToBytes(chatKeyB64), ['decrypt'])
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    ct as BufferSource,
  )
  return td.decode(plain)
}
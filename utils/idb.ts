const DB_NAME = 'linkup-e2e'
const DB_VERSION = 3
const IDENTITY_STORE = 'identity'
const CHAT_KEY_STORE = 'chat_keys'
const CHAT_ALT_KEY_STORE = 'chat_alt_keys'
const PEER_KEY_STORE = 'peer_key_versions'

interface IdentityRecord {
  user_id: string
  public_key: string
  private_key: CryptoKey
}

interface ChatKeyRecord {
  chat_id: string
  key: string
}

// Các khóa chat fallback (từng là canonical của máy này, nay thay bằng khóa
// server). Giữ để giải mã được tin TỰ GỬI cũ đã mã hóa bằng khóa phân kỳ.
interface ChatAltKeysRecord {
  chat_id: string
  keys: string[]
}

// Public key (kèm version) của đối phương khi mình wrap khóa chat lần cuối.
// Dùng để phát hiện đối phương đổi identity/thiết bị → re-key row của mình.
interface PeerKeyRecord {
  chat_id: string
  partner_user_id: string
  partner_public_key: string
  partner_key_version: number
}

let dbPromise: Promise<IDBDatabase> | null = null

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(IDENTITY_STORE)) {
        db.createObjectStore(IDENTITY_STORE, { keyPath: 'user_id' })
      }
      if (!db.objectStoreNames.contains(CHAT_KEY_STORE)) {
        db.createObjectStore(CHAT_KEY_STORE, { keyPath: 'chat_id' })
      }
      if (!db.objectStoreNames.contains(CHAT_ALT_KEY_STORE)) {
        db.createObjectStore(CHAT_ALT_KEY_STORE, { keyPath: 'chat_id' })
      }
      if (!db.objectStoreNames.contains(PEER_KEY_STORE)) {
        db.createObjectStore(PEER_KEY_STORE, { keyPath: 'chat_id' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return dbPromise
}

function tx<T>(
  storeName: string,
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(storeName, mode)
        const req = run(t.objectStore(storeName))
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
      }),
  )
}

export async function getIdentity(userId: string): Promise<IdentityRecord | undefined> {
  const record = await tx<IdentityRecord | undefined>(IDENTITY_STORE, 'readonly', (s) =>
    s.get(userId),
  )
  return record
}

export async function setIdentity(record: IdentityRecord): Promise<void> {
  await tx<IDBValidKey>(IDENTITY_STORE, 'readwrite', (s) => s.put(record))
}

export async function getChatKey(chatId: string): Promise<string | null> {
  const record = await tx<ChatKeyRecord | undefined>(CHAT_KEY_STORE, 'readonly', (s) =>
    s.get(chatId),
  )
  return record?.key ?? null
}

export async function setChatKey(chatId: string, key: string): Promise<void> {
  await tx<IDBValidKey>(CHAT_KEY_STORE, 'readwrite', (s) =>
    s.put({ chat_id: chatId, key }),
  )
}

export async function deleteChatKey(chatId: string): Promise<void> {
  await Promise.all([
    tx<undefined>(CHAT_KEY_STORE, 'readwrite', (s) => s.delete(chatId)),
    tx<undefined>(CHAT_ALT_KEY_STORE, 'readwrite', (s) => s.delete(chatId)),
  ])
}

export async function getChatAltKeys(chatId: string): Promise<string[]> {
  const record = await tx<ChatAltKeysRecord | undefined>(
    CHAT_ALT_KEY_STORE,
    'readonly',
    (s) => s.get(chatId),
  )
  return record?.keys ?? []
}

// Lưu một khóa fallback (dedupe, giới hạn 4 mới nhất).
export async function addChatAltKey(chatId: string, key: string): Promise<void> {
  if (!key) return
  await openDB().then(
    (db) =>
      new Promise<void>((resolve, reject) => {
        const t = db.transaction(CHAT_ALT_KEY_STORE, 'readwrite')
        const store = t.objectStore(CHAT_ALT_KEY_STORE)
        const req = store.get(chatId)
        req.onsuccess = () => {
          const existing = (req.result as ChatAltKeysRecord | undefined)?.keys ?? []
          const next = [...new Set([...existing, key])].slice(-4)
          store.put({ chat_id: chatId, keys: next } as ChatAltKeysRecord)
          resolve()
        }
        req.onerror = () => reject(req.error)
      }),
  )
}

export async function getPeerKey(
  chatId: string,
): Promise<PeerKeyRecord | undefined> {
  return tx<PeerKeyRecord | undefined>(PEER_KEY_STORE, 'readonly', (s) =>
    s.get(chatId),
  )
}

export async function setPeerKey(record: PeerKeyRecord): Promise<void> {
  await tx<IDBValidKey>(PEER_KEY_STORE, 'readwrite', (s) => s.put(record))
}

// getAll đọc toàn bộ record của một store (dành cho việc tổng hợp backup).
function getAll<T>(storeName: string): Promise<T[]> {
  return openDB().then(
    (db) =>
      new Promise<T[]>((resolve, reject) => {
        const t = db.transaction(storeName, 'readonly')
        const req = t.objectStore(storeName).getAll()
        req.onsuccess = () => resolve(req.result as T[])
        req.onerror = () => reject(req.error)
      }),
  )
}

// getChatKeysSnapshot đọc toàn bộ khóa chat (canonical) + fallback thành một
// map dùng làm payload cho backup khôi phục khóa trên thiết bị mới.
export interface ChatKeysSnapshot {
  keys: Record<string, string>
  altKeys: Record<string, string[]>
}

export async function getChatKeysSnapshot(): Promise<ChatKeysSnapshot> {
  const [keys, altKeys] = await Promise.all([
    getAll<ChatKeyRecord>(CHAT_KEY_STORE),
    getAll<ChatAltKeysRecord>(CHAT_ALT_KEY_STORE),
  ])
  const keyMap: Record<string, string> = {}
  for (const rec of keys) {
    keyMap[rec.chat_id] = rec.key
  }
  const altMap: Record<string, string[]> = {}
  for (const rec of altKeys) {
    altMap[rec.chat_id] = rec.keys ?? []
  }
  return { keys: keyMap, altKeys: altMap }
}

// importChatKeysSnapshot ghi khóa chat đã giải mã từ backup vào IDB — dùng trên
// thiết bị mới sau khi unlock. Ghi canonical (chat_keys) + các khóa fallback.
export async function importChatKeysSnapshot(
  snapshot: ChatKeysSnapshot,
): Promise<void> {
  await openDB().then(
    (db) =>
      new Promise<void>((resolve, reject) => {
        const t = db.transaction([CHAT_KEY_STORE, CHAT_ALT_KEY_STORE], 'readwrite')
        const keyStore = t.objectStore(CHAT_KEY_STORE)
        const altStore = t.objectStore(CHAT_ALT_KEY_STORE)
        for (const [chatId, key] of Object.entries(snapshot.keys)) {
          keyStore.put({ chat_id: chatId, key } as ChatKeyRecord)
        }
        for (const [chatId, keys] of Object.entries(snapshot.altKeys)) {
          if (keys.length > 0) {
            altStore.put({ chat_id: chatId, keys } as ChatAltKeysRecord)
          }
        }
        t.oncomplete = () => resolve()
        t.onerror = () => reject(t.error)
      }),
  )
}
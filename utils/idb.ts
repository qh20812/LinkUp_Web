const DB_NAME = 'linkup-e2e'
const DB_VERSION = 2
const IDENTITY_STORE = 'identity'
const CHAT_KEY_STORE = 'chat_keys'
const CHAT_ALT_KEY_STORE = 'chat_alt_keys'

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
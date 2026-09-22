import '@testing-library/jest-dom'
import 'fake-indexeddb/auto'
import { serialize, deserialize } from 'node:v8'
import { TextDecoder, TextEncoder } from 'node:util'
import { webcrypto } from 'node:crypto'

// fake-indexeddb dùng structuredClone để clone value; jsdom không có sẵn.
// Polyfill bằng v8.serialize/deserialize (bảo toàn ArrayBuffer/CryptoKey trong
// record IDB — key phrasing ở đây toàn string keyed nên không cần quá chi tiết).
if (typeof globalThis.structuredClone !== 'function') {
  ;(globalThis as Record<string, unknown>).structuredClone = (value: unknown) =>
    deserialize(serialize(value))
}

// jsdom không cung cấp TextEncoder/TextDecoder — cần cho e2ee.ts.
if (!globalThis.TextEncoder) {
  ;(globalThis as Record<string, unknown>).TextEncoder = TextEncoder
}
if (!globalThis.TextDecoder) {
  ;(globalThis as Record<string, unknown>).TextDecoder = TextDecoder
}

// jsdom không cung cấp WebCrypto.subtle — thay bằng webcrypto của Node.
if (!globalThis.crypto?.subtle) {
  Object.defineProperty(globalThis, 'crypto', {
    value: webcrypto,
    writable: true,
    configurable: true,
  })
}

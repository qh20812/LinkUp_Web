import '@testing-library/jest-dom'
import { TextDecoder, TextEncoder } from 'node:util'
import { webcrypto } from 'node:crypto'

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

import viErrors from '@/locales/vi.json'
import enErrors from '@/locales/en.json'

const API_BASE = '/api'

const REFRESH_PATH = '/auth/refresh'
const LOGIN_PATH = '/auth/login'

let refreshPromise: Promise<boolean> | null = null

const errorLocales: Record<string, Record<string, string>> = {
  vi: (viErrors as Record<string, unknown>).errors as Record<string, string>,
  en: (enErrors as Record<string, unknown>).errors as Record<string, string>,
}

function resolveError(code: string, params?: Record<string, string | number>): string {
  const lang = (typeof window !== 'undefined' && localStorage.getItem('language')) || 'vi'
  const messages = errorLocales[lang] || errorLocales.vi
  let msg = messages[code]
  if (!msg) {
    const fallback = errorLocales.vi
    msg = fallback[code]
  }
  if (!msg) return code
  if (!params) return msg
  return msg.replace(/\{\{(\w+)\}\}/g, (_, name) => {
    const v = params[name]
    return v !== undefined ? String(v) : `{{${name}}}`
  })
}

const DOT_CODE_RE = /^\w+\.\w+$/

export async function extractErrorMessage(res: Response): Promise<string> {
  const body = await res.json().catch(() => null)
  if (body && typeof body.error === 'string' && body.error) {
    if (DOT_CODE_RE.test(body.error)) {
      return resolveError(body.error, body.params)
    }
    return body.error
  }
  if (body && typeof body.message === 'string' && body.message) return body.message
  return `HTTP ${res.status}`
}

export function clearSession(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem('token')
  localStorage.removeItem('refresh_token')
  localStorage.removeItem('admin_profile')
}

async function refreshTokens(): Promise<boolean> {
  if (typeof window === 'undefined') return false

  const refreshToken = localStorage.getItem('refresh_token')
  if (!refreshToken) return false

  if (refreshPromise) return refreshPromise

  refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_BASE}${REFRESH_PATH}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      })
      if (!res.ok) return false

      const data = await res.json()
      if (!data.access_token) return false

      localStorage.setItem('token', data.access_token)
      if (data.refresh_token) {
        localStorage.setItem('refresh_token', data.refresh_token)
      }
      return true
    } catch {
      return false
    } finally {
      refreshPromise = null
    }
  })()

  return refreshPromise
}

function redirectToLogin(): void {
  if (window.location.pathname.startsWith('/login')) return
  window.location.href = '/login'
}

async function doFetch(path: string, options?: RequestInit): Promise<Response> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  return fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    cache: 'no-store',
  })
}

export async function request<T>(path: string, options?: RequestInit): Promise<T> {
  let res = await doFetch(path, options)

  if (res.status === 401 && typeof window !== 'undefined') {
    const skipRefresh = path === REFRESH_PATH || path === LOGIN_PATH
    if (!skipRefresh) {
      const refreshed = await refreshTokens()
      if (refreshed) {
        res = await doFetch(path, options)
      }
    }
  }

  if (!res.ok) {
    if (res.status === 401 && typeof window !== 'undefined' && path !== LOGIN_PATH) {
      clearSession()
      redirectToLogin()
    }
    throw new Error(await extractErrorMessage(res))
  }

  return res.json()
}

// rawRequest giống request nhưng trả về Response (không throw khi 4xx/5xx),
// giúp caller xử lý các trạng thái đặc biệt như 404 (e.g. chưa có khóa E2E).
export async function rawRequest(path: string, options?: RequestInit): Promise<Response> {
  let res = await doFetch(path, options)

  if (res.status === 401 && typeof window !== 'undefined') {
    const skipRefresh = path === REFRESH_PATH || path === LOGIN_PATH
    if (!skipRefresh) {
      const refreshed = await refreshTokens()
      if (refreshed) {
        res = await doFetch(path, options)
      }
    }
  }

  if (res.status === 401 && typeof window !== 'undefined' && path !== LOGIN_PATH) {
    clearSession()
    redirectToLogin()
  }

  return res
}

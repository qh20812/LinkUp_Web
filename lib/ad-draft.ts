/**
 * Lưu nháp form tạo quảng cáo vào localStorage.
 *
 * Chỉ lưu dữ liệu text/số/ngày/tỉnh — KHÔNG lưu File vì object URL không tồn
 * tại sau khi tải lại trang. Key gắn với danh tính trong JWT để nhiều tài khoản
 * dùng chung máy không thấy nháp của nhau.
 */
export const AD_DRAFT_VERSION = 1
export const AD_DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000
const KEY_PREFIX = 'ad-draft:v1:'

export interface AdDraftData {
  title: string
  content: string
  targetUrl: string
  format: string
  budget: string
  dailyBudget: string
  cpmPrice: string
  cpcPrice: string
  maxImpressions: string
  startedAt: string
  expiresAt: string
  targetGender: string
  targetAgeMin: string
  targetAgeMax: string
  targetProvinces: string[]
}

export interface AdDraft {
  version: number
  savedAt: number
  data: AdDraftData
}

function readIdentity(): string {
  if (typeof window === 'undefined') return 'anon'
  try {
    const token = localStorage.getItem('token')
    if (!token) return 'anon'
    const payload = JSON.parse(atob(token.split('.')[1] ?? '')) as Record<string, unknown>
    return String(payload.sub ?? payload.user_id ?? payload.email ?? 'anon')
  } catch {
    return 'anon'
  }
}

export function adDraftKey(identity: string = readIdentity()): string {
  return `${KEY_PREFIX}${identity}`
}

function isDraftData(value: unknown): value is AdDraftData {
  if (!value || typeof value !== 'object') return false
  const data = value as Record<string, unknown>
  const stringFields = [
    'title',
    'content',
    'targetUrl',
    'format',
    'budget',
    'dailyBudget',
    'cpmPrice',
    'cpcPrice',
    'maxImpressions',
    'startedAt',
    'expiresAt',
    'targetGender',
    'targetAgeMin',
    'targetAgeMax',
  ]
  return (
    stringFields.every((field) => typeof data[field] === 'string') &&
    Array.isArray(data.targetProvinces) &&
    (data.targetProvinces as unknown[]).every((item) => typeof item === 'string')
  )
}

export function saveAdDraft(data: AdDraftData, identity: string = readIdentity()): void {
  if (typeof window === 'undefined') return
  try {
    const draft: AdDraft = { version: AD_DRAFT_VERSION, savedAt: Date.now(), data }
    localStorage.setItem(adDraftKey(identity), JSON.stringify(draft))
  } catch {
    // localStorage đầy/bị chặn — bỏ qua, form vẫn dùng bình thường.
  }
}

export function loadAdDraft(identity: string = readIdentity()): AdDraft | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(adDraftKey(identity))
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<AdDraft>
    if (parsed.version !== AD_DRAFT_VERSION) return null
    if (typeof parsed.savedAt !== 'number') return null
    if (Date.now() - parsed.savedAt > AD_DRAFT_TTL_MS) {
      localStorage.removeItem(adDraftKey(identity))
      return null
    }
    if (!isDraftData(parsed.data)) return null
    return { version: AD_DRAFT_VERSION, savedAt: parsed.savedAt, data: parsed.data }
  } catch {
    return null
  }
}

export function clearAdDraft(identity: string = readIdentity()): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(adDraftKey(identity))
  } catch {
    // ignore
  }
}

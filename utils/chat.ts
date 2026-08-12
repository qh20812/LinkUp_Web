type TFunc = (key: string, params?: Record<string, string | number>) => string

const MS_MIN = 60_000
const MS_HOUR = 3_600_000
const MS_DAY = 86_400_000

export function formatChatTime(iso: string, t: TFunc): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const diff = Date.now() - d.getTime()
  if (diff < MS_MIN) return t('post.justNow')
  if (diff < MS_HOUR) return t('post.minutesAgo', { minutes: Math.floor(diff / MS_MIN) })
  if (diff < MS_DAY) return t('post.hoursAgo', { hours: Math.floor(diff / MS_HOUR) })
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
}

export function formatChatDate(iso: string, t: TFunc): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  const startOfDay = new Date(d)
  startOfDay.setHours(0, 0, 0, 0)
  const dayDiff = Math.round((startOfToday.getTime() - startOfDay.getTime()) / MS_DAY)
  if (dayDiff === 0) return t('chat.today')
  if (dayDiff === 1) return t('chat.yesterday')
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

/**
 * Giới hạn media cho quảng cáo.
 *
 * Đây là bản web của các hằng số trong `server/validations/ad_media.validation.go`
 * — giữ khớp để chặn sớm ở client thay vì upload xong mới bị server trả lỗi.
 * Trần cứng bám theo Cloudinary Free: ảnh 10 MB, video 100 MB.
 */
export const AD_MEDIA_LIMITS = {
  imageMaxBytes: 10 * 1024 * 1024,
  imageWarnBytes: 5 * 1024 * 1024,
  videoMaxBytes: 100 * 1024 * 1024,
  videoWarnBytes: 50 * 1024 * 1024,
  videoMaxSeconds: 60,
  videoWarnSeconds: 30,
  carouselMinFiles: 2,
  carouselMaxFiles: 6,
  carouselTotalMaxBytes: 30 * 1024 * 1024,
  carouselTotalWarnBytes: 25 * 1024 * 1024,
  carouselFileWarnBytes: 5 * 1024 * 1024,
} as const

export type AdMediaKind = 'image' | 'video' | 'unknown'

export interface AdMediaInput {
  name: string
  size: number
  type: string
  /** Chỉ có với video; null/undefined nghĩa là chưa đọc được metadata. */
  durationSeconds?: number | null
}

export type AdMediaIssueCode =
  | 'tooMany'
  | 'tooFew'
  | 'tooLarge'
  | 'tooLong'
  | 'totalTooLarge'
  | 'typeMismatch'
  | 'warnLarge'
  | 'warnLong'
  | 'warnTotal'

export interface AdMediaIssue {
  level: 'error' | 'warning'
  code: AdMediaIssueCode
  params?: Record<string, string | number>
}

export interface AdMediaCheck {
  errors: AdMediaIssue[]
  warnings: AdMediaIssue[]
}

/** Suy ra loại media từ MIME type, fallback theo phần mở rộng tên file. */
export function mediaKindOf(file: { name?: string; type?: string }): AdMediaKind {
  const type = (file.type ?? '').toLowerCase()
  if (type.startsWith('image/')) return 'image'
  if (type.startsWith('video/')) return 'video'

  const ext = (file.name ?? '').toLowerCase().match(/\.[a-z0-9]+$/)?.[0] ?? ''
  if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) return 'image'
  if (['.mp4', '.mov', '.avi', '.mkv', '.webm'].includes(ext)) return 'video'
  return 'unknown'
}

/** Định dạng file có khớp với định dạng ad không. */
export function isCompatibleMedia(file: { name?: string; type?: string }, format: string): boolean {
  const kind = mediaKindOf(file)
  if (format === 'video') return kind === 'video'
  if (format === 'image' || format === 'carousel') return kind === 'image'
  return false
}

const MB = 1024 * 1024

export function checkAdMediaFiles(files: AdMediaInput[], format: string): AdMediaCheck {
  const errors: AdMediaIssue[] = []
  const warnings: AdMediaIssue[] = []

  const maxFiles = format === 'carousel' ? AD_MEDIA_LIMITS.carouselMaxFiles : 1
  const minFiles = format === 'carousel' ? AD_MEDIA_LIMITS.carouselMinFiles : 0

  if (files.length > maxFiles) {
    errors.push({ level: 'error', code: 'tooMany', params: { max: maxFiles } })
  }
  if (files.length < minFiles) {
    errors.push({ level: 'error', code: 'tooFew', params: { min: minFiles } })
  }

  let totalBytes = 0
  for (const file of files) {
    const kind = mediaKindOf(file)
    const wantKind = format === 'video' ? 'video' : 'image'
    if (kind !== wantKind) {
      errors.push({ level: 'error', code: 'typeMismatch' })
      continue
    }

    totalBytes += file.size

    if (kind === 'image') {
      if (file.size > AD_MEDIA_LIMITS.imageMaxBytes) {
        errors.push({ level: 'error', code: 'tooLarge', params: { max: AD_MEDIA_LIMITS.imageMaxBytes / MB } })
      } else if (
        file.size >
        (format === 'carousel' ? AD_MEDIA_LIMITS.carouselFileWarnBytes : AD_MEDIA_LIMITS.imageWarnBytes)
      ) {
        warnings.push({
          level: 'warning',
          code: 'warnLarge',
          params: { max: (format === 'carousel' ? AD_MEDIA_LIMITS.carouselFileWarnBytes : AD_MEDIA_LIMITS.imageWarnBytes) / MB },
        })
      }
      continue
    }

    if (file.size > AD_MEDIA_LIMITS.videoMaxBytes) {
      errors.push({ level: 'error', code: 'tooLarge', params: { max: AD_MEDIA_LIMITS.videoMaxBytes / MB } })
    } else if (file.size > AD_MEDIA_LIMITS.videoWarnBytes) {
      warnings.push({ level: 'warning', code: 'warnLarge', params: { max: AD_MEDIA_LIMITS.videoWarnBytes / MB } })
    }

    const duration = file.durationSeconds
    if (typeof duration === 'number' && Number.isFinite(duration)) {
      if (duration > AD_MEDIA_LIMITS.videoMaxSeconds) {
        errors.push({ level: 'error', code: 'tooLong', params: { max: AD_MEDIA_LIMITS.videoMaxSeconds } })
      } else if (duration > AD_MEDIA_LIMITS.videoWarnSeconds) {
        warnings.push({ level: 'warning', code: 'warnLong', params: { max: AD_MEDIA_LIMITS.videoWarnSeconds } })
      }
    }
  }

  if (format === 'carousel') {
    if (totalBytes > AD_MEDIA_LIMITS.carouselTotalMaxBytes) {
      errors.push({
        level: 'error',
        code: 'totalTooLarge',
        params: { max: AD_MEDIA_LIMITS.carouselTotalMaxBytes / MB },
      })
    } else if (totalBytes > AD_MEDIA_LIMITS.carouselTotalWarnBytes) {
      warnings.push({
        level: 'warning',
        code: 'warnTotal',
        params: { max: AD_MEDIA_LIMITS.carouselTotalWarnBytes / MB },
      })
    }
  }

  return { errors, warnings }
}

/** Đọc duration video từ metadata trình duyệt. Trả null khi không đọc được. */
export function probeVideoDuration(file: File): Promise<number | null> {
  if (typeof document === 'undefined') return Promise.resolve(null)

  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const video = document.createElement('video')

    const finish = (duration: number | null) => {
      video.onloadedmetadata = null
      video.onerror = null
      video.removeAttribute('src')
      URL.revokeObjectURL(url)
      resolve(duration)
    }

    video.preload = 'metadata'
    video.onloadedmetadata = () => {
      const duration = video.duration
      finish(Number.isFinite(duration) && duration > 0 ? duration : null)
    }
    video.onerror = () => finish(null)
    video.src = url
  })
}

/** Định dạng dung lượng cho UI (vd "4.8 MB"). */
export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 MB'
  if (bytes < MB) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / MB).toFixed(1)} MB`
}

/** i18n key cho từng loại lỗi/cảnh báo media (dùng chung form + preflight). */
export function mediaIssueKey(code: AdMediaIssueCode): string {
  switch (code) {
    case 'tooMany':
      return 'partner.form.mediaErrTooMany'
    case 'tooFew':
      return 'partner.form.mediaErrTooFew'
    case 'tooLarge':
      return 'partner.form.mediaErrTooLarge'
    case 'tooLong':
      return 'partner.form.mediaErrTooLong'
    case 'totalTooLarge':
      return 'partner.form.mediaErrTotal'
    case 'typeMismatch':
      return 'partner.form.mediaErrType'
    case 'warnLarge':
      return 'partner.form.mediaWarnLarge'
    case 'warnLong':
      return 'partner.form.mediaWarnLong'
    case 'warnTotal':
      return 'partner.form.mediaWarnTotal'
  }
}

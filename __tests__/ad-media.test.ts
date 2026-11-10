import {
  AD_MEDIA_LIMITS,
  checkAdMediaFiles,
  formatFileSize,
  isCompatibleMedia,
  mediaKindOf,
  type AdMediaInput,
} from '@/lib/ad-media'

const MB = 1024 * 1024

function image(sizeBytes: number, name = 'a.jpg'): AdMediaInput {
  return { name, size: sizeBytes, type: 'image/jpeg' }
}

function video(sizeBytes: number, durationSeconds: number | null = null, name = 'v.mp4'): AdMediaInput {
  return { name, size: sizeBytes, type: 'video/mp4', durationSeconds }
}

describe('mediaKindOf', () => {
  it('nhận loại theo MIME type', () => {
    expect(mediaKindOf({ type: 'image/png', name: 'x' })).toBe('image')
    expect(mediaKindOf({ type: 'video/mp4', name: 'x' })).toBe('video')
  })

  it('fallback theo phần mở rộng khi thiếu MIME type', () => {
    expect(mediaKindOf({ type: '', name: 'photo.JPG' })).toBe('image')
    expect(mediaKindOf({ type: 'application/octet-stream', name: 'clip.MOV' })).toBe('video')
    expect(mediaKindOf({ type: '', name: 'notes.txt' })).toBe('unknown')
  })
})

describe('isCompatibleMedia', () => {
  it('khớp định dạng ad', () => {
    expect(isCompatibleMedia({ name: 'a.jpg', type: 'image/jpeg' }, 'image')).toBe(true)
    expect(isCompatibleMedia({ name: 'a.jpg', type: 'image/jpeg' }, 'carousel')).toBe(true)
    expect(isCompatibleMedia({ name: 'a.jpg', type: 'image/jpeg' }, 'video')).toBe(false)
    expect(isCompatibleMedia({ name: 'v.mp4', type: 'video/mp4' }, 'video')).toBe(true)
  })
})

describe('checkAdMediaFiles', () => {
  it('ảnh 5MB hợp lệ, không cảnh báo', () => {
    const result = checkAdMediaFiles([image(5 * MB)], 'image')
    expect(result.errors).toEqual([])
    expect(result.warnings).toEqual([])
  })

  it('ảnh vượt 10MB bị chặn', () => {
    const result = checkAdMediaFiles([image(10 * MB + 1)], 'image')
    expect(result.errors).toContainEqual(expect.objectContaining({ code: 'tooLarge' }))
  })

  it('ảnh 6MB chỉ cảnh báo (khuyến nghị 5MB)', () => {
    const result = checkAdMediaFiles([image(6 * MB)], 'image')
    expect(result.errors).toEqual([])
    expect(result.warnings).toContainEqual(expect.objectContaining({ code: 'warnLarge' }))
  })

  it('định dạng ảnh không nhận video', () => {
    const result = checkAdMediaFiles([video(1 * MB)], 'image')
    expect(result.errors).toContainEqual(expect.objectContaining({ code: 'typeMismatch' }))
  })

  it('ảnh đơn chỉ nhận 1 file', () => {
    const result = checkAdMediaFiles([image(MB, '1.jpg'), image(MB, '2.jpg')], 'image')
    expect(result.errors).toContainEqual(expect.objectContaining({ code: 'tooMany' }))
  })

  it('video 45 giây cảnh báo, 61 giây bị chặn', () => {
    expect(checkAdMediaFiles([video(10 * MB, 45)], 'video').warnings).toContainEqual(
      expect.objectContaining({ code: 'warnLong' }),
    )
    expect(checkAdMediaFiles([video(10 * MB, 61)], 'video').errors).toContainEqual(
      expect.objectContaining({ code: 'tooLong' }),
    )
  })

  it('video > 50MB cảnh báo, > 100MB bị chặn', () => {
    expect(checkAdMediaFiles([video(60 * MB, 10)], 'video').warnings).toContainEqual(
      expect.objectContaining({ code: 'warnLarge' }),
    )
    expect(checkAdMediaFiles([video(100 * MB + 1, 10)], 'video').errors).toContainEqual(
      expect.objectContaining({ code: 'tooLarge' }),
    )
  })

  it('carousel cần 2–6 ảnh', () => {
    expect(checkAdMediaFiles([image(MB)], 'carousel').errors).toContainEqual(
      expect.objectContaining({ code: 'tooFew' }),
    )
    const seven = Array.from({ length: 7 }, (_, i) => image(MB, `${i}.jpg`))
    expect(checkAdMediaFiles(seven, 'carousel').errors).toContainEqual(
      expect.objectContaining({ code: 'tooMany' }),
    )
  })

  it('carousel tổng > 30MB bị chặn', () => {
    const six = Array.from({ length: 6 }, (_, i) => image(6 * MB, `${i}.jpg`))
    const result = checkAdMediaFiles(six, 'carousel')
    expect(result.errors).toContainEqual(expect.objectContaining({ code: 'totalTooLarge' }))
  })

  it('carousel không nhận video', () => {
    const result = checkAdMediaFiles([image(MB, '1.jpg'), video(MB)], 'carousel')
    expect(result.errors).toContainEqual(expect.objectContaining({ code: 'typeMismatch' }))
  })

  it('giới hạn khớp hằng số đã chốt', () => {
    expect(AD_MEDIA_LIMITS.imageMaxBytes).toBe(10 * MB)
    expect(AD_MEDIA_LIMITS.videoMaxBytes).toBe(100 * MB)
    expect(AD_MEDIA_LIMITS.videoMaxSeconds).toBe(60)
    expect(AD_MEDIA_LIMITS.carouselTotalMaxBytes).toBe(30 * MB)
  })
})

describe('formatFileSize', () => {
  it('hiển thị KB/MB', () => {
    expect(formatFileSize(2048)).toBe('2 KB')
    expect(formatFileSize(5 * MB)).toBe('5.0 MB')
    expect(formatFileSize(0)).toBe('0 MB')
  })
})

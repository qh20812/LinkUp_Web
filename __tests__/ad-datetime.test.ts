import { toAdISOString, toDateTimeLocal } from '@/lib/ad-datetime'

describe('toAdISOString', () => {
  it('trả undefined khi không có giá trị', () => {
    expect(toAdISOString()).toBeUndefined()
    expect(toAdISOString('')).toBeUndefined()
  })

  it('đổi datetime-local (giờ địa phương) sang ISO đầy đủ', () => {
    const iso = toAdISOString('2026-10-27T23:30')
    expect(iso).toBe(new Date('2026-10-27T23:30').toISOString())
    expect(iso).toMatch(/Z$/)
  })

  it('chuỗi không hợp lệ được giữ nguyên để server báo lỗi rõ ràng', () => {
    expect(toAdISOString('27/10/2026')).toBe('27/10/2026')
  })
})

describe('toDateTimeLocal', () => {
  it('trả chuỗi rỗng khi không có giá trị', () => {
    expect(toDateTimeLocal()).toBe('')
    expect(toDateTimeLocal('')).toBe('')
  })

  it('đổi ISO sang giá trị cho input datetime-local', () => {
    const local = new Date(2026, 9, 27, 23, 30)
    expect(toDateTimeLocal(local.toISOString())).toBe('2026-10-27T23:30')
  })

  it('bỏ giây khi API trả về giây', () => {
    const local = new Date(2026, 0, 5, 8, 0, 45)
    expect(toDateTimeLocal(local.toISOString())).toBe('2026-01-05T08:00')
  })

  it('trả chuỗi rỗng với giá trị không hợp lệ', () => {
    expect(toDateTimeLocal('không-phải-ngày')).toBe('')
  })
})

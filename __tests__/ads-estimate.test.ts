import { estimateAdReach, formatVnd } from '@/lib/ads-estimate'

describe('estimateAdReach', () => {
  it('tính số lượt hiển thị từ ngân sách và CPM', () => {
    expect(estimateAdReach({ budget: 100000, cpm: 25000 })).toBe(4000)
    expect(estimateAdReach({ budget: 1000000, cpm: 25000 })).toBe(40000)
  })

  it('làm tròn xuống với kết quả lẻ', () => {
    expect(estimateAdReach({ budget: 99999, cpm: 25000 })).toBe(3999)
    expect(estimateAdReach({ budget: 1, cpm: 3 })).toBe(333)
  })

  it('trả null khi thiếu dữ liệu hoặc dữ liệu không hợp lệ', () => {
    expect(estimateAdReach({ budget: 0, cpm: 25000 })).toBeNull()
    expect(estimateAdReach({ budget: 100000, cpm: 0 })).toBeNull()
    expect(estimateAdReach({ budget: -100000, cpm: 25000 })).toBeNull()
    expect(estimateAdReach({ budget: 100000, cpm: -25000 })).toBeNull()
    expect(estimateAdReach({ budget: Number.NaN, cpm: 25000 })).toBeNull()
    expect(estimateAdReach({ budget: 100000, cpm: Number.POSITIVE_INFINITY })).toBeNull()
  })

  it('xử lý ngân sách rất lớn mà không tràn số', () => {
    const reach = estimateAdReach({ budget: 1_000_000_000_000, cpm: 1000 })
    expect(reach).toBe(1_000_000_000_000)
    expect(Number.isSafeInteger(reach)).toBe(true)
  })
})

describe('formatVnd', () => {
  it('định dạng tiền theo VND', () => {
    expect(formatVnd(25000).replace(/\s/g, ' ')).toContain('25.000')
    expect(formatVnd(0).replace(/\s/g, ' ')).toContain('0')
    expect(formatVnd(1234567).replace(/\s/g, ' ')).toContain('1.234.567')
  })

  it('trả dấu gạch ngang cho giá trị không hợp lệ', () => {
    expect(formatVnd(Number.NaN)).toBe('—')
  })
})

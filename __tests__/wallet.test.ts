import { canReportTransfer, formatCountdown, topupStatusKey } from '@/lib/wallet'

describe('formatCountdown', () => {
  it('định dạng mm:ss', () => {
    expect(formatCountdown(30 * 60 * 1000)).toBe('30:00')
    expect(formatCountdown(65_000)).toBe('01:05')
    expect(formatCountdown(9_000)).toBe('00:09')
  })

  it('trả 00:00 khi đã hết hạn hoặc dữ liệu không hợp lệ', () => {
    expect(formatCountdown(0)).toBe('00:00')
    expect(formatCountdown(-5000)).toBe('00:00')
    expect(formatCountdown(Number.NaN)).toBe('00:00')
  })
})

describe('topupStatusKey', () => {
  it('map trạng thái hợp lệ sang key i18n', () => {
    expect(topupStatusKey('pending')).toBe('wallet.pending')
    expect(topupStatusKey('paid')).toBe('wallet.paid')
    expect(topupStatusKey('rejected')).toBe('wallet.rejected')
    expect(topupStatusKey('expired')).toBe('wallet.expired')
    expect(topupStatusKey('cancelled')).toBe('wallet.cancelled')
  })

  it('fallback về pending với dữ liệu lạ', () => {
    expect(topupStatusKey('weird')).toBe('wallet.pending')
    expect(topupStatusKey('')).toBe('wallet.pending')
  })
})

describe('canReportTransfer', () => {
  it('chỉ cho báo khi còn hạn và chưa báo', () => {
    expect(canReportTransfer(false, false)).toBe(true)
    expect(canReportTransfer(true, false)).toBe(false)
    expect(canReportTransfer(false, true)).toBe(false)
    expect(canReportTransfer(true, true)).toBe(false)
  })
})

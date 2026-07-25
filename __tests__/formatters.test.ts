import { formatNumber, formatDateTime } from '../lib/formatters'

describe('formatNumber', () => {
  it('formats millions', () => {
    expect(formatNumber(1_500_000)).toBe('1.5M')
  })

  it('formats thousands', () => {
    expect(formatNumber(2_300)).toBe('2.3K')
  })

  it('formats small numbers', () => {
    expect(formatNumber(999)).toBe('999')
  })
})

describe('formatDateTime', () => {
  it('returns a string for valid ISO', () => {
    const result = formatDateTime('2026-07-25T10:30:00Z')
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })
})

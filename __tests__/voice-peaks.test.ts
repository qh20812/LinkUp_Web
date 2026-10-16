import { invalidateVoicePeaks, normalizePeaks, resolveTotal } from '@/components/messages/VoicePlayer'

describe('normalizePeaks', () => {
  it('floors pure silence instead of vanishing', () => {
    expect(normalizePeaks([0, 0, 0])).toEqual([0.08, 0.08, 0.08])
  })

  it('keeps the peak at full height', () => {
    const out = normalizePeaks([0, 0.25, 1])
    expect(out[2]).toBe(1)
  })

  it('expands quiet passages with a sqrt curve (more dynamic than linear)', () => {
    // Linear 0.15-floor mapping would give 0.25 here; sqrt gives 0.5.
    expect(normalizePeaks([0.01, 0.04])).toEqual([0.5, 1])
  })

  it('clamps negative buckets to the floor', () => {
    expect(normalizePeaks([-1, 0.5])).toEqual([0.08, 1])
  })

  it('handles empty input', () => {
    expect(normalizePeaks([])).toEqual([])
  })
})

describe('invalidateVoicePeaks', () => {
  it('is safe to call for unknown keys', () => {
    expect(() => invalidateVoicePeaks('no-such-key')).not.toThrow()
  })
})

describe('resolveTotal', () => {
  it('prefers the explicit prop duration', () => {
    expect(resolveTotal(8, 5.2, 5.1)).toBe(8)
  })

  it('falls back to the decoded duration when the prop is missing', () => {
    expect(resolveTotal(0, 5.2, 0)).toBe(5.2)
  })

  it('uses metadata only as a last resort', () => {
    expect(resolveTotal(0, 0, 5.1)).toBe(5.1)
    expect(resolveTotal(0, 0, 0)).toBe(0)
  })

  it('treats non-positive decoded values as missing', () => {
    expect(resolveTotal(0, -1, 4)).toBe(4)
  })
})

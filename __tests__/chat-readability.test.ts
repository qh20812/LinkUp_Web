import { backgroundClashes, baseOverlay, luminance, overlayStyle, recommendedStrength } from '@/utils/chatReadability'

describe('luminance', () => {
  it('scores white/black extremes', () => {
    expect(luminance('#ffffff')).toBeCloseTo(1, 2)
    expect(luminance('#000000')).toBeCloseTo(0, 2)
  })

  it('scores brand turquoise mid-range', () => {
    const lum = luminance('#12A5A1')
    expect(lum).toBeGreaterThan(0.2)
    expect(lum).toBeLessThan(0.6)
  })

  it('falls back neutral for garbage', () => {
    expect(luminance('not-a-color')).toBe(0.5)
  })
})

describe('baseOverlay', () => {
  it('returns zero alpha without background', () => {
    expect(baseOverlay(null).alpha).toBe(0)
    expect(baseOverlay(undefined).alpha).toBe(0)
  })

  it('darkens bright solids more than mid tones', () => {
    const bright = baseOverlay({ type: 'solid', value: '#F5F5F5' })
    const mid = baseOverlay({ type: 'solid', value: '#12A5A1' })
    expect(bright.alpha).toBeGreaterThan(mid.alpha)
  })

  it('uses a fixed scrim for images', () => {
    expect(baseOverlay({ type: 'custom', value: 'https://x/y.jpg' }).alpha).toBe(0.5)
    expect(baseOverlay({ type: 'preset', value: 'p1' }).alpha).toBe(0.5)
  })
})

describe('overlayStyle', () => {
  it('scales alpha by strength percent', () => {
    const base = overlayStyle({ type: 'solid', value: '#F5F5F5' })
    const low = overlayStyle({ type: 'solid', value: '#F5F5F5' }, 30)
    const high = overlayStyle({ type: 'solid', value: '#F5F5F5' }, 150)
    expect(low.backgroundColor).not.toBe(base.backgroundColor)
    expect(high.backgroundColor).not.toBe(base.backgroundColor)
  })

  it('scales up toward the 0.9 ceiling without exceeding it', () => {
    // Base image scrim is 0.5; max strength (150%) reaches 0.75.
    expect(overlayStyle({ type: 'custom', value: 'x' }, 150).backgroundColor).toContain('0.75)')
    expect(overlayStyle({ type: 'custom', value: 'x' }, 30).backgroundColor).toContain('0.15)')
  })

  it('defaults missing strength to 100', () => {
    const bg = { type: 'solid', value: '#F5F5F5' } as const
    expect(overlayStyle(bg)).toEqual(overlayStyle(bg, 100))
  })

  it('returns empty style without background', () => {
    expect(overlayStyle(null)).toEqual({})
  })
})

describe('backgroundClashes', () => {
  it('flags turquoise-band solids at bubble lightness', () => {
    expect(backgroundClashes({ type: 'solid', value: '#12A5A1' })).toBe(true)
    expect(backgroundClashes({ type: 'solid', value: '#0C918D' })).toBe(true)
  })

  it('passes neutrals and gradients without teal stops', () => {
    expect(backgroundClashes({ type: 'solid', value: '#F5F5F5' })).toBe(false)
    expect(backgroundClashes({ type: 'solid', value: '#0A1F44' })).toBe(false)
    // Very dark teal: light bubbles still read, no warning.
    expect(backgroundClashes({ type: 'solid', value: '#0A6E6B' })).toBe(false)
    expect(backgroundClashes({ type: 'gradient', value: 'linear-gradient(135deg, #0A1F44, #1A1A1A)' })).toBe(false)
  })

  it('flags gradients containing a teal stop', () => {
    expect(
      backgroundClashes({ type: 'gradient', value: 'linear-gradient(135deg, #12A5A1, #0A1F44)' }),
    ).toBe(true)
  })

  it('never judges images or empty backgrounds', () => {
    expect(backgroundClashes({ type: 'custom', value: 'https://x/y.jpg' })).toBe(false)
    expect(backgroundClashes(null)).toBe(false)
  })
})

describe('recommendedStrength', () => {
  it('boosts clashing turquoise themes', () => {
    expect(recommendedStrength({ type: 'solid', value: '#12A5A1' })).toBe(130)
  })

  it('keeps the designed default otherwise', () => {
    expect(recommendedStrength({ type: 'solid', value: '#F5F5F5' })).toBe(100)
    expect(recommendedStrength({ type: 'custom', value: 'https://x/y.jpg' })).toBe(100)
    expect(recommendedStrength(null)).toBe(100)
  })
})

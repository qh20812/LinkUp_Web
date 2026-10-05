import { runeLength } from '../utils/text'

describe('runeLength', () => {
  it('counts ASCII characters one by one', () => {
    expect(runeLength('hello')).toBe(5)
  })

  it('counts Vietnamese diacritics the same way as the server', () => {
    expect(runeLength('Tiếng Việt')).toBe(10)
  })

  it('counts emoji surrogate pairs as a single rune', () => {
    expect(runeLength('😀')).toBe(1)
    expect(runeLength('a😀b')).toBe(3)
  })

  it('returns 0 for empty strings', () => {
    expect(runeLength('')).toBe(0)
  })
})

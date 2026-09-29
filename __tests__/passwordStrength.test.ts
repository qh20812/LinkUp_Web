import { checkPassword, passwordStrength } from '../utils/passwordStrength'

describe('checkPassword', () => {
  it('checks each requirement independently', () => {
    expect(checkPassword('Abcdefg1!')).toEqual({
      length: true,
      upper: true,
      lower: true,
      digit: true,
      special: true,
    })
    expect(checkPassword('abc')).toEqual({
      length: false,
      upper: false,
      lower: true,
      digit: false,
      special: false,
    })
  })
})

describe('passwordStrength', () => {
  it('returns 0 for an empty password', () => {
    expect(passwordStrength('')).toBe(0)
  })

  it('scores by the number of satisfied requirements', () => {
    expect(passwordStrength('a')).toBe(0) // 1 met
    expect(passwordStrength('abcdefgh')).toBe(1) // 2 met (length + lower)
    expect(passwordStrength('abcdefg1')).toBe(2) // 3 met
    expect(passwordStrength('Abcdefg1')).toBe(3) // 4 met
    expect(passwordStrength('Abcdefg1!')).toBe(4) // all 5 met
  })

  it('never exceeds the 0-4 range', () => {
    expect(passwordStrength('Aa1!Aa1!Aa1!')).toBeGreaterThanOrEqual(0)
    expect(passwordStrength('Aa1!Aa1!Aa1!')).toBeLessThanOrEqual(4)
  })
})

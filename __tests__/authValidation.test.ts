import {
  emailError,
  loginPasswordError,
  displayNameError,
  registerPasswordError,
  confirmPasswordError,
} from '../utils/authValidation'

describe('emailError', () => {
  it('returns emailRequired for empty / whitespace', () => {
    expect(emailError('')).toBe('emailRequired')
    expect(emailError('   ')).toBe('emailRequired')
  })

  it('returns emailInvalid for malformed emails', () => {
    expect(emailError('not-an-email')).toBe('emailInvalid')
    expect(emailError('a@b')).toBe('emailInvalid')
  })

  it('accepts a valid email and trims it', () => {
    expect(emailError(' user@example.com ')).toBeUndefined()
  })
})

describe('loginPasswordError', () => {
  it('requires a password', () => {
    expect(loginPasswordError('')).toBe('passwordRequired')
  })

  it('enforces the 6-character minimum', () => {
    expect(loginPasswordError('12345')).toBe('passwordTooShort')
    expect(loginPasswordError('123456')).toBeUndefined()
  })
})

describe('displayNameError', () => {
  it('validates required, length and charset', () => {
    expect(displayNameError('')).toBe('displayNameRequired')
    expect(displayNameError('ab')).toBe('displayNameTooShort')
    expect(displayNameError('a'.repeat(56))).toBe('displayNameTooLong')
    expect(displayNameError('bad@name')).toBe('displayNameInvalid')
    expect(displayNameError('Nguyễn Văn A')).toBeUndefined()
  })
})

describe('registerPasswordError', () => {
  it('validates required / length / complexity in order', () => {
    expect(registerPasswordError('')).toBe('passwordRequired')
    expect(registerPasswordError('Ab1!')).toBe('passwordTooShort')
    expect(registerPasswordError('a'.repeat(51))).toBe('passwordTooLong')
    expect(registerPasswordError('alllowercase1!')).toBe('passwordComplexity')
    expect(registerPasswordError('Abcdefg1!')).toBeUndefined()
  })
})

describe('confirmPasswordError', () => {
  it('validates required then match', () => {
    expect(confirmPasswordError('', 'x')).toBe('confirmRequired')
    expect(confirmPasswordError('mismatch', 'x')).toBe('confirmMismatch')
    expect(confirmPasswordError('same', 'same')).toBeUndefined()
  })
})

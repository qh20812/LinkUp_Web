export const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
export const DISPLAY_NAME_REGEX = /^[\p{L}\p{M}\d ]+$/u

/**
 * Pure validation helpers for the auth forms.
 * Each returns an error *code* (not a translated message) — callers map it
 * through `t('login.<code>')` / `t('register.<code>')` so the same logic
 * serves both locales and stays unit-testable.
 */
export function emailError(email: string): 'emailRequired' | 'emailInvalid' | undefined {
  const value = email.trim()
  if (!value) return 'emailRequired'
  if (!EMAIL_REGEX.test(value)) return 'emailInvalid'
  return undefined
}

export function loginPasswordError(password: string): 'passwordRequired' | 'passwordTooShort' | undefined {
  if (!password) return 'passwordRequired'
  if (password.length < 6) return 'passwordTooShort'
  return undefined
}

export function displayNameError(
  displayName: string,
): 'displayNameRequired' | 'displayNameTooShort' | 'displayNameTooLong' | 'displayNameInvalid' | undefined {
  const value = displayName.trim()
  if (!value) return 'displayNameRequired'
  const length = Array.from(value).length
  if (length < 3) return 'displayNameTooShort'
  if (length > 55) return 'displayNameTooLong'
  if (!DISPLAY_NAME_REGEX.test(value)) return 'displayNameInvalid'
  return undefined
}

export function registerPasswordError(
  password: string,
): 'passwordRequired' | 'passwordTooShort' | 'passwordTooLong' | 'passwordComplexity' | undefined {
  if (!password) return 'passwordRequired'
  if (password.length < 8) return 'passwordTooShort'
  if (password.length > 50) return 'passwordTooLong'
  if (
    !/[A-Z]/.test(password) ||
    !/[a-z]/.test(password) ||
    !/[0-9]/.test(password) ||
    !/[^A-Za-z0-9]/.test(password)
  ) {
    return 'passwordComplexity'
  }
  return undefined
}

export function confirmPasswordError(
  confirmPassword: string,
  password: string,
): 'confirmRequired' | 'confirmMismatch' | undefined {
  if (!confirmPassword) return 'confirmRequired'
  if (confirmPassword !== password) return 'confirmMismatch'
  return undefined
}

/** Move keyboard focus to the first invalid field, in declaration order. */
export function focusFirstInvalid(ids: string[]): void {
  if (typeof document === 'undefined') return
  for (const id of ids) {
    const el = document.getElementById(id)
    if (el instanceof HTMLElement) {
      el.focus()
      return
    }
  }
}

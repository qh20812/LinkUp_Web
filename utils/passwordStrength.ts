export interface PasswordChecks {
  length: boolean
  upper: boolean
  lower: boolean
  digit: boolean
  special: boolean
}

/** 0 = very weak … 4 = strong */
export type StrengthScore = 0 | 1 | 2 | 3 | 4

export function checkPassword(password: string): PasswordChecks {
  return {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    digit: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  }
}

export function passwordStrength(password: string): StrengthScore {
  if (!password) return 0
  const checks = checkPassword(password)
  const met = Object.values(checks).filter(Boolean).length
  if (met <= 1) return 0
  if (met === 2) return 1
  if (met === 3) return 2
  if (met === 4) return 3
  return 4
}

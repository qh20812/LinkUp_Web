export interface EnumOption {
  value: string
  labelKey: string
}

export const WORK_OPTIONS: EnumOption[] = [
  { value: 'it', labelKey: 'profile.work.it' },
  { value: 'business', labelKey: 'profile.work.business' },
  { value: 'trading', labelKey: 'profile.work.trading' },
  { value: 'marketing', labelKey: 'profile.work.marketing' },
  { value: 'finance', labelKey: 'profile.work.finance' },
  { value: 'education', labelKey: 'profile.work.education' },
  { value: 'healthcare', labelKey: 'profile.work.healthcare' },
  { value: 'engineering', labelKey: 'profile.work.engineering' },
  { value: 'manufacturing', labelKey: 'profile.work.manufacturing' },
  { value: 'law', labelKey: 'profile.work.law' },
  { value: 'arts', labelKey: 'profile.work.arts' },
  { value: 'service', labelKey: 'profile.work.service' },
  { value: 'logistics', labelKey: 'profile.work.logistics' },
  { value: 'agriculture', labelKey: 'profile.work.agriculture' },
  { value: 'realestate', labelKey: 'profile.work.realestate' },
  { value: 'student', labelKey: 'profile.work.student' },
  { value: 'housewife', labelKey: 'profile.work.housewife' },
  { value: 'retired', labelKey: 'profile.work.retired' },
  { value: 'other', labelKey: 'profile.work.other' },
]

export const EDUCATION_OPTIONS: EnumOption[] = [
  { value: 'below_highschool', labelKey: 'profile.education.below_highschool' },
  { value: 'highschool', labelKey: 'profile.education.highschool' },
  { value: 'intermediate', labelKey: 'profile.education.intermediate' },
  { value: 'college', labelKey: 'profile.education.college' },
  { value: 'university', labelKey: 'profile.education.university' },
  { value: 'master', labelKey: 'profile.education.master' },
  { value: 'doctorate', labelKey: 'profile.education.doctorate' },
  { value: 'other', labelKey: 'profile.education.other' },
]

/** Resolve a work enum code to a translated label (fallback: raw code). */
export function resolveWorkLabel(code: string, t: (key: string) => string): string {
  if (!code) return ''
  const opt = WORK_OPTIONS.find(o => o.value === code)
  return opt ? t(opt.labelKey) : code
}

/** Resolve an education enum code to a translated label (fallback: raw code). */
export function resolveEducationLabel(code: string, t: (key: string) => string): string {
  if (!code) return ''
  const opt = EDUCATION_OPTIONS.find(o => o.value === code)
  return opt ? t(opt.labelKey) : code
}
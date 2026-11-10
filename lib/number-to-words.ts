/**
 * Đọc số tiền VND thành chữ cho nhãn dưới ô nhập tiền.
 *
 * Giới hạn đọc tới 999.999.999.999 (hàng nghìn tỷ) — quá ngưỡng này trả chuỗi
 * rỗng để UI ẩn nhãn thay vì đọc sai. Tiền VND là số nguyên.
 */

const VI_DIGITS = [
  'không',
  'một',
  'hai',
  'ba',
  'bốn',
  'năm',
  'sáu',
  'bảy',
  'tám',
  'chín',
]

const VI_SCALES = ['', 'nghìn', 'triệu', 'tỷ']

const EN_ONES = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
  'thirteen',
  'fourteen',
  'fifteen',
  'sixteen',
  'seventeen',
  'eighteen',
  'nineteen',
]

const EN_TENS = [
  '',
  '',
  'twenty',
  'thirty',
  'forty',
  'fifty',
  'sixty',
  'seventy',
  'eighty',
  'ninety',
]

const EN_SCALES = ['', 'thousand', 'million', 'billion', 'trillion']

const MAX_READABLE = 999_999_999_999

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

/** Đọc một nhóm 3 chữ số. `forceFull` thêm "không trăm" cho nhóm bị khuyết. */
function readThreeDigitsVi(value: number, forceFull: boolean): string {
  const hundred = Math.floor(value / 100)
  const ten = Math.floor((value % 100) / 10)
  const unit = value % 10
  const parts: string[] = []

  if (hundred > 0 || forceFull) {
    parts.push(VI_DIGITS[hundred], 'trăm')
  }

  if (ten > 1) {
    parts.push(VI_DIGITS[ten], 'mươi')
  } else if (ten === 1) {
    parts.push('mười')
  } else if (unit > 0 && (hundred > 0 || forceFull)) {
    parts.push('lẻ')
  }

  if (unit > 0) {
    if (ten >= 1 && unit === 5) {
      // 15 = mười lăm, 25 = hai mươi lăm
      parts.push('lăm')
    } else if (ten > 1 && unit === 1) {
      // 21 = hai mươi mốt
      parts.push('mốt')
    } else {
      parts.push(VI_DIGITS[unit])
    }
  }

  return parts.join(' ')
}

function readNumberVi(value: number): string {
  if (value === 0) return VI_DIGITS[0]

  const groups: number[] = []
  let rest = value
  while (rest > 0) {
    groups.push(rest % 1000)
    rest = Math.floor(rest / 1000)
  }

  const parts: string[] = []
  for (let index = groups.length - 1; index >= 0; index--) {
    const group = groups[index]
    if (group === 0) continue

    // Nhóm đứng sau một nhóm lớn hơn mà < 100 vẫn phải đọc "không trăm …".
    const forceFull = index < groups.length - 1 && group < 100
    parts.push(readThreeDigitsVi(group, forceFull))
    if (VI_SCALES[index]) parts.push(VI_SCALES[index])
  }

  return parts.join(' ')
}

function readUnderOneHundredEn(value: number): string {
  if (value < 20) return EN_ONES[value]
  const ten = Math.floor(value / 10)
  const unit = value % 10
  return unit > 0 ? `${EN_TENS[ten]}-${EN_ONES[unit]}` : EN_TENS[ten]
}

function readUnderOneThousandEn(value: number): string {
  const hundred = Math.floor(value / 100)
  const rest = value % 100
  const parts: string[] = []

  if (hundred > 0) parts.push(`${EN_ONES[hundred]} hundred`)
  if (rest > 0) parts.push(readUnderOneHundredEn(rest))

  return parts.join(' ')
}

function readNumberEn(value: number): string {
  if (value === 0) return EN_ONES[0]

  const groups: number[] = []
  let rest = value
  while (rest > 0) {
    groups.push(rest % 1000)
    rest = Math.floor(rest / 1000)
  }

  const parts: string[] = []
  for (let index = groups.length - 1; index >= 0; index--) {
    const group = groups[index]
    if (group === 0) continue

    parts.push(readUnderOneThousandEn(group))
    if (EN_SCALES[index]) parts.push(EN_SCALES[index])
  }

  return parts.join(' ')
}

/**
 * Trả câu đọc số tiền theo ngôn ngữ UI, đã viết hoa chữ đầu và kèm đơn vị.
 * Trả chuỗi rỗng khi số âm/không hữu hạn/vượt ngưỡng đọc được.
 */
export function vndInWords(amount: number, language: string): string {
  if (!Number.isFinite(amount) || amount < 0) return ''
  const rounded = Math.round(amount)
  if (rounded > MAX_READABLE) return ''

  if (language === 'en') {
    return capitalize(`${readNumberEn(rounded)} dong`)
  }
  return capitalize(`${readNumberVi(rounded)} đồng`)
}

export const numberToWordsVi = (amount: number): string => vndInWords(amount, 'vi')
export const numberToWordsEn = (amount: number): string => vndInWords(amount, 'en')

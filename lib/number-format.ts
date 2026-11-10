/**
 * Quy ước định dạng số của LinkUp:
 * - phần nguyên nhóm 3 chữ số bằng dấu chấm (`1.000.000`);
 * - phần thập phân (nếu có) ngăn bằng dấu phẩy (`1.234,56`).
 *
 * Tiền VND dùng số nguyên nên các ô tiền chỉ gọi với `maxDecimals = 0`.
 */

/** Bỏ mọi ký tự không phải số (và dấu phẩy thập phân khi được phép). */
export function normalizeNumberInput(input: string, maxDecimals = 0): string {
  const cleaned = input.replace(/[^\d,]/g, '')

  if (maxDecimals <= 0) {
    // Số nguyên: bỏ hết dấu phẩy, bỏ số 0 vô nghĩa ở đầu.
    return cleaned.replace(/,/g, '').replace(/^0+(?=\d)/, '')
  }

  const [rawInteger, ...rest] = cleaned.split(',')
  const integerPart = rawInteger.replace(/^0+(?=\d)/, '')
  if (rest.length === 0) return integerPart

  const decimalPart = rest.join('').slice(0, maxDecimals)
  return `${integerPart || '0'},${decimalPart}`
}

/** Nhóm phần nguyên bằng dấu chấm, giữ nguyên phần thập phân bằng dấu phẩy. */
export function formatGroupedNumber(raw: string): string {
  if (!raw) return ''
  const [integerPart, decimalPart] = raw.split(',')
  const grouped = (integerPart ?? '').replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return decimalPart === undefined ? grouped : `${grouped},${decimalPart}`
}

import { numberToWordsEn, numberToWordsVi, vndInWords } from '@/lib/number-to-words'

describe('numberToWordsVi', () => {
  it('đọc các mốc cơ bản', () => {
    expect(numberToWordsVi(0)).toBe('Không đồng')
    expect(numberToWordsVi(1_000)).toBe('Một nghìn đồng')
    expect(numberToWordsVi(50_000)).toBe('Năm mươi nghìn đồng')
    expect(numberToWordsVi(1_000_000)).toBe('Một triệu đồng')
    expect(numberToWordsVi(50_000_000)).toBe('Năm mươi triệu đồng')
  })

  it('xử lý mười lăm, hai mươi mốt và lẻ', () => {
    expect(numberToWordsVi(15_000)).toBe('Mười lăm nghìn đồng')
    expect(numberToWordsVi(21_000)).toBe('Hai mươi mốt nghìn đồng')
    expect(numberToWordsVi(105_000)).toBe('Một trăm lẻ năm nghìn đồng')
  })

  it('đọc số nhiều nhóm có đủ nghìn/triệu', () => {
    expect(numberToWordsVi(1_234_567)).toBe(
      'Một triệu hai trăm ba mươi bốn nghìn năm trăm sáu mươi bảy đồng',
    )
    expect(numberToWordsVi(1_000_005)).toBe('Một triệu không trăm lẻ năm đồng')
  })

  it('trả rỗng với số âm hoặc vượt ngưỡng đọc', () => {
    expect(numberToWordsVi(-1)).toBe('')
    expect(numberToWordsVi(Number.NaN)).toBe('')
    expect(numberToWordsVi(1_000_000_000_000)).toBe('')
  })
})

describe('numberToWordsEn', () => {
  it('đọc số theo tiếng Anh', () => {
    expect(numberToWordsEn(1_000)).toBe('One thousand dong')
    expect(numberToWordsEn(21_000)).toBe('Twenty-one thousand dong')
    expect(numberToWordsEn(105_000)).toBe('One hundred five thousand dong')
    expect(numberToWordsEn(1_234_567)).toBe(
      'One million two hundred thirty-four thousand five hundred sixty-seven dong',
    )
  })
})

describe('vndInWords', () => {
  it('chọn ngôn ngữ theo tham số', () => {
    expect(vndInWords(50_000, 'vi')).toBe('Năm mươi nghìn đồng')
    expect(vndInWords(50_000, 'en')).toBe('Fifty thousand dong')
  })
})

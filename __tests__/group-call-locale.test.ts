import fs from 'node:fs'
import path from 'node:path'

// Key mới thêm cho group call ở cả hai ngôn ngữ. Thiếu một bên sẽ khiến UI
// hiển thị key thô hoặc rơi vào fallback tiếng Việt.
const REQUIRED_GROUP_CALL_KEYS = [
  'you',
  'member',
  'reconnecting',
  'reconnectFailed',
  'connectTimeout',
] as const

type LocaleFile = { groupCall: Record<string, string> }

function loadLocale(locale: 'vi' | 'en'): LocaleFile {
  const file = path.join(__dirname, '..', 'locales', `${locale}.json`)
  return JSON.parse(fs.readFileSync(file, 'utf8')) as LocaleFile
}

describe('groupCall locale', () => {
  it.each(['vi', 'en'] as const)('%s có đủ key mới và không rỗng', (locale) => {
    const { groupCall } = loadLocale(locale)

    for (const key of REQUIRED_GROUP_CALL_KEYS) {
      expect(typeof groupCall[key]).toBe('string')
      expect(groupCall[key].trim().length).toBeGreaterThan(0)
    }
  })

  it('vi và en có cùng tập key group call', () => {
    const viKeys = Object.keys(loadLocale('vi').groupCall).sort()
    const enKeys = Object.keys(loadLocale('en').groupCall).sort()

    expect(enKeys).toEqual(viKeys)
  })
})

import fs from 'node:fs'
import path from 'node:path'

const webRoot = process.cwd()
const fontDir = path.join(webRoot, 'app', 'fonts')

describe('Vietnamese font configuration', () => {
  test.each([
    'BeVietnamPro-Regular.ttf',
    'BeVietnamPro-Medium.ttf',
    'BeVietnamPro-SemiBold.ttf',
    'BeVietnamPro-Bold.ttf',
  ])('%s is bundled locally', (fontFile) => {
    const filePath = path.join(fontDir, fontFile)
    expect(fs.existsSync(filePath)).toBe(true)
    expect(fs.statSync(filePath).size).toBeGreaterThan(0)
  })

  test('layout uses local Be Vietnam Pro instead of a network font', () => {
    const layout = fs.readFileSync(path.join(webRoot, 'app', 'layout.tsx'), 'utf8')
    expect(layout).toContain("from 'next/font/local'")
    expect(layout).toContain('BeVietnamPro-Regular.ttf')
    expect(layout).not.toContain("from 'next/font/google'")
  })
})

import { toErrorMessage } from '@/utils/errorMessage'

describe('toErrorMessage', () => {
  it('extracts the message from Error objects', () => {
    expect(toErrorMessage(new Error('boom'))).toBe('boom')
  })

  it('passes strings through', () => {
    expect(toErrorMessage('Lỗi mạng')).toBe('Lỗi mạng')
  })

  it('returns empty string for nullish values', () => {
    expect(toErrorMessage(null)).toBe('')
    expect(toErrorMessage(undefined)).toBe('')
  })
})

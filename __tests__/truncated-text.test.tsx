import React from 'react'
import { renderWithProviders, screen } from './test-utils'
import TruncatedText from '@/components/common/TruncatedText'

describe('TruncatedText', () => {
  it('giữ nguyên dữ liệu trong DOM và title để hover xem đầy đủ', () => {
    const value = 'LKW1A2B3C4D5E6F7G8H9J0K'

    renderWithProviders(<TruncatedText value={value} />)

    const text = screen.getByText(value)
    expect(text).toBeInTheDocument()
    expect(text).toHaveAttribute('title', value)
  })
})

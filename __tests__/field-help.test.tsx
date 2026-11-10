import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import FieldHelp from '@/components/ads/FieldHelp'

describe('FieldHelp', () => {
  it('nút ? có aria-label và nối tooltip bằng aria-describedby', () => {
    render(<FieldHelp label="Giải thích Giá CPM" text="Giá cho 1.000 lượt hiển thị" />)

    const button = screen.getByRole('button', { name: 'Giải thích Giá CPM' })
    const tooltip = screen.getByRole('tooltip')

    expect(tooltip).toHaveTextContent('Giá cho 1.000 lượt hiển thị')
    expect(button).toHaveAttribute('aria-describedby', tooltip.id)
    expect(tooltip.id).not.toBe('')
  })

  it('nhận focus bằng Tab (dùng được keyboard-only)', async () => {
    const user = userEvent.setup()
    render(<FieldHelp label="Giải thích Giá CPC" text="Giá mỗi click" />)

    const button = screen.getByRole('button', { name: 'Giải thích Giá CPC' })
    await user.tab()
    expect(button).toHaveFocus()
  })
})

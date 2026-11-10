import React, { useState } from 'react'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders, screen, userEvent, mockLocalStorage } from './test-utils'
import MoneyInput from '@/components/forms/MoneyInput'

function Harness({ error }: { error?: string }) {
  const [value, setValue] = useState('')
  return (
    <MoneyInput
      id="amount"
      value={value}
      onValueChange={setValue}
      describedBy="amount-hint"
      error={error}
    />
  )
}

beforeEach(() => {
  mockLocalStorage()
})

describe('MoneyInput', () => {
  it('tự nhóm nghìn bằng dấu chấm và đọc số bằng chữ', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Harness />)

    const input = screen.getByRole('textbox')
    await user.type(input, '1000')

    expect(input).toHaveValue('1.000')
    expect(screen.getByText('Bằng chữ: Một nghìn đồng')).toBeInTheDocument()
    expect(input).toHaveAccessibleDescription(/Bằng chữ: Một nghìn đồng/)
  })

  it('nhận chuỗi đã có dấu nhóm và bỏ ký tự không phải số', () => {
    renderWithProviders(<Harness />)

    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: '1.234a567' } })

    expect(input).toHaveValue('1.234.567')
    expect(
      screen.getByText(
        'Bằng chữ: Một triệu hai trăm ba mươi bốn nghìn năm trăm sáu mươi bảy đồng',
      ),
    ).toBeInTheDocument()
  })

  it('ẩn dòng đọc số khi ô trống và hiện lỗi validate', () => {
    renderWithProviders(<Harness error="Số tiền tối thiểu là 10.000 ₫." />)

    const input = screen.getByRole('textbox')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('alert')).toHaveTextContent('Số tiền tối thiểu là 10.000 ₫.')
    expect(screen.queryByText(/Bằng chữ:/)).not.toBeInTheDocument()
  })

  it('đọc tiếng Anh theo ngôn ngữ UI', () => {
    localStorage.setItem('language', 'en')
    renderWithProviders(<Harness />)

    fireEvent.change(screen.getByRole('textbox'), { target: { value: '50000' } })

    expect(screen.getByText('In words: Fifty thousand dong')).toBeInTheDocument()
  })
})

import React from 'react'
import { renderWithProviders, screen, userEvent } from './test-utils'
import AdTemplatePicker from '@/components/ads/AdTemplatePicker'

const onApply = jest.fn()
const onClose = jest.fn()

beforeEach(() => {
  onApply.mockReset()
  onClose.mockReset()
})

function renderPicker(hasExistingContent = false) {
  return renderWithProviders(
    <AdTemplatePicker
      open
      onClose={onClose}
      onApply={onApply}
      hasExistingContent={hasExistingContent}
    />,
  )
}

describe('AdTemplatePicker', () => {
  it('chọn mẫu điền ngay khi form đang trống', async () => {
    const user = userEvent.setup()
    renderPicker(false)

    expect(await screen.findByText('Chọn mẫu nội dung')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Cà phê mới rang/ }))

    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Cà phê mới rang — giảm 20% tuần này' }),
    )
    expect(onClose).toHaveBeenCalled()
  })

  it('hỏi ghi đè khi form đã có nội dung', async () => {
    const user = userEvent.setup()
    renderPicker(true)

    await user.click(await screen.findByRole('button', { name: /Cà phê mới rang/ }))

    expect(onApply).not.toHaveBeenCalled()
    expect(screen.getByText('Form đang có nội dung. Ghi đè bằng mẫu này?')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Ghi đè' }))

    expect(onApply).toHaveBeenCalledTimes(1)
  })

  it('quay lại không ghi đè', async () => {
    const user = userEvent.setup()
    renderPicker(true)

    await user.click(await screen.findByRole('button', { name: /Cà phê mới rang/ }))
    await user.click(screen.getByRole('button', { name: 'Quay lại' }))

    expect(onApply).not.toHaveBeenCalled()
    expect(await screen.findByText('Chọn mẫu nội dung')).toBeInTheDocument()
  })
})

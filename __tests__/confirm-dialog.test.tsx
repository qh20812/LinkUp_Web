import React from 'react'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders, screen, userEvent } from './test-utils'
import ConfirmDialog from '@/components/ConfirmDialog'

describe('ConfirmDialog', () => {
  it('không render khi open=false', () => {
    renderWithProviders(
      <ConfirmDialog open={false} title="Tiêu đề" onConfirm={jest.fn()} onClose={jest.fn()} />,
    )
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('render title/description và gọi đúng callback', async () => {
    const onConfirm = jest.fn()
    const onClose = jest.fn()

    renderWithProviders(
      <ConfirmDialog
        open
        title="Huỷ yêu cầu"
        description="Bạn chắc chắn muốn huỷ?"
        onConfirm={onConfirm}
        onClose={onClose}
      />,
    )

    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    expect(screen.getByText('Bạn chắc chắn muốn huỷ?')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Hủy' }))
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(onConfirm).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('button', { name: 'Xác nhận' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('khi loading: khoá confirm và không cho đóng bằng Escape', () => {
    const onClose = jest.fn()
    const onConfirm = jest.fn()

    renderWithProviders(
      <ConfirmDialog
        open
        title="Huỷ yêu cầu"
        description="Đang xử lý"
        loading
        onConfirm={onConfirm}
        onClose={onClose}
      />,
    )

    expect(screen.getByRole('button', { name: 'Đang tải...' })).toBeDisabled()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).not.toHaveBeenCalled()
  })
})

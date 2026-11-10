import React from 'react'
import { renderWithProviders, screen, userEvent, waitFor, mockLocalStorage } from './test-utils'
import CopyIconButton from '@/components/wallet/CopyIconButton'

const writeText = jest.fn()

function installClipboard() {
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText },
  })
}

beforeEach(() => {
  mockLocalStorage()
  writeText.mockReset().mockResolvedValue(undefined)
  installClipboard()
})

describe('CopyIconButton', () => {
  it('chỉ hiện icon, tooltip mặc định là Sao chép', () => {
    renderWithProviders(
      <CopyIconButton value="0123456789" fieldLabel="Số tài khoản" onError={jest.fn()} />,
    )

    const button = screen.getByRole('button', { name: 'Sao chép Số tài khoản' })
    expect(button).toHaveAttribute('data-tooltip', 'Sao chép')
    expect(button.querySelector('i')).toHaveClass('bx-copy')
    expect(button).not.toHaveTextContent('Sao chép')
  })

  it('bấm thành công đổi tooltip sang Sao chép thành công', async () => {
    const user = userEvent.setup()
    installClipboard()
    renderWithProviders(
      <CopyIconButton value="0123456789" fieldLabel="Số tài khoản" onError={jest.fn()} />,
    )

    const button = screen.getByRole('button', { name: 'Sao chép Số tài khoản' })
    await user.click(button)

    await waitFor(() =>
      expect(button).toHaveAttribute('data-tooltip', 'Sao chép thành công'),
    )
    expect(writeText).toHaveBeenCalledWith('0123456789')
    expect(button.querySelector('i')).toHaveClass('bx-check')
    expect(screen.getByRole('status')).toHaveTextContent('Sao chép thành công')
  })

  it('clipboard lỗi thì gọi onError và không báo thành công', async () => {
    const user = userEvent.setup()
    const onError = jest.fn()
    writeText.mockRejectedValueOnce(new Error('blocked'))
    installClipboard()

    renderWithProviders(
      <CopyIconButton value="0123456789" fieldLabel="Số tài khoản" onError={onError} />,
    )

    const button = screen.getByRole('button', { name: 'Sao chép Số tài khoản' })
    await user.click(button)

    expect(onError).toHaveBeenCalledWith('0123456789')
    expect(button).toHaveAttribute('data-tooltip', 'Sao chép')
    expect(button.querySelector('i')).toHaveClass('bx-copy')
  })
})

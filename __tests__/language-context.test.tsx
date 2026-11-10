import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { LanguageProvider, useTranslation } from '@/contexts/LanguageContext'
import { mockLocalStorage, userEvent } from './test-utils'

function Probe({ keys }: { keys: string[] }) {
  const { t, setLanguage } = useTranslation()
  return (
    <div>
      {keys.map((key) => (
        <span key={key} data-testid={key}>
          {t(key)}
        </span>
      ))}
      <button type="button" onClick={() => setLanguage('en')}>
        en
      </button>
    </div>
  )
}

function renderProbe(keys: string[]) {
  return render(
    <LanguageProvider>
      <Probe keys={keys} />
    </LanguageProvider>,
  )
}

beforeEach(() => {
  mockLocalStorage()
})

describe('LanguageProvider', () => {
  it('trả bản dịch ngay lần render đầu, không trả key thô khi locale chưa load xong', () => {
    // Đây là regression: toast thanh toán tạo ngay khi mount từng hiện
    // "packages.paymentFailed" vì translations còn rỗng.
    renderProbe(['packages.paymentFailed', 'packages.paymentInvalid'])

    expect(screen.getByTestId('packages.paymentFailed')).toHaveTextContent(
      'Thanh toán không thành công hoặc đã bị huỷ.',
    )
    expect(screen.getByTestId('packages.paymentInvalid')).toHaveTextContent(
      'Không xác thực được kết quả thanh toán.',
    )
  })

  it('dùng bản EN ngay khi người dùng đã chọn en trước đó', () => {
    localStorage.setItem('language', 'en')
    renderProbe(['packages.paymentFailed'])

    expect(screen.getByTestId('packages.paymentFailed')).toHaveTextContent(
      'Payment failed or was cancelled.',
    )
  })

  it('vẫn trả key khi key không tồn tại (giữ hành vi cũ)', () => {
    renderProbe(['does.not.exist'])

    expect(screen.getByTestId('does.not.exist')).toHaveTextContent('does.not.exist')
  })

  it('đổi ngôn ngữ runtime hiển thị đúng bản mới', async () => {
    const user = userEvent.setup()
    renderProbe(['packages.paymentFailed'])

    expect(screen.getByTestId('packages.paymentFailed')).toHaveTextContent(
      'Thanh toán không thành công hoặc đã bị huỷ.',
    )

    await user.click(screen.getByRole('button', { name: 'en' }))

    await waitFor(() =>
      expect(screen.getByTestId('packages.paymentFailed')).toHaveTextContent(
        'Payment failed or was cancelled.',
      ),
    )
  })
})

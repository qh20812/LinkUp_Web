import React from 'react'
import { renderWithProviders, screen } from './test-utils'
import AdsHelpPage from '@/app/partner/help/ads/page'

describe('AdsHelpPage', () => {
  it('render đủ 7 mục hướng dẫn và nội dung khớp hành vi thật', async () => {
    renderWithProviders(<AdsHelpPage />)

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Hướng dẫn tạo quảng cáo' }),
    ).toBeInTheDocument()

    const sections = [
      'Chuẩn bị gì',
      'Ngân sách, CPM và CPC',
      'Thời gian chạy',
      'Duyệt mất bao lâu',
      'Các trạng thái của quảng cáo',
      'Sửa, tạm dừng, xoá',
      'Nhắm mục tiêu',
    ]
    for (const name of sections) {
      expect(screen.getByRole('heading', { name })).toBeInTheDocument()
    }

    // Nội dung phải khớp state machine: duyệt thủ công, chưa trừ tiền trước khi duyệt.
    expect(screen.getByText(/Admin duyệt thủ công/)).toBeInTheDocument()
    expect(screen.getByText(/chưa trừ tiền cho tới khi được duyệt/i)).toBeInTheDocument()
    expect(screen.getByText(/không tự bật lại được/)).toBeInTheDocument()
  })
})

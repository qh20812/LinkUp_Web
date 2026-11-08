import React from 'react'
import { renderWithProviders, screen, userEvent, waitFor, mockLocalStorage } from './test-utils'

jest.mock('@/api/partner', () => ({
  getMyAds: jest.fn(),
  updateAd: jest.fn(),
  replaceAdMedia: jest.fn(),
  submitAdForReview: jest.fn(),
}))

jest.mock('@/api/locations', () => ({
  getProvinces: jest.fn().mockResolvedValue({
    data: [{ id: '01', name: { vi: 'Hà Nội', en: 'Hanoi' } }],
  }),
}))

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn() }),
  useParams: () => ({ id: 'ad-1' }),
}))

import { getMyAds, replaceAdMedia, updateAd } from '@/api/partner'
import EditAdPage from '@/app/partner/ads/[id]/edit/page'
import type { PartnerAdListItem } from '@/types'

const adsMock = getMyAds as jest.Mock
const updateMock = updateAd as jest.Mock
const replaceMock = replaceAdMedia as jest.Mock

const ad: PartnerAdListItem = {
  id: 'ad-1',
  title: 'Khuyến mãi',
  content: 'Nội dung',
  format: 'image',
  target_url: 'https://linkup.vn/sale',
  status: 'pending',
  budget: 100000,
  daily_budget: 0,
  cpm_price: 25000,
  cpc_price: 1000,
  max_impressions: 0,
  total_spent: 0,
  impressions: 0,
  clicks: 0,
  ctr: 0,
  media_uri: 'https://cdn/old.jpg',
  media_list: [{ url: 'https://cdn/old.jpg', media_type: 'image' }],
  target_gender: 'all',
  target_age_min: 0,
  target_age_max: 100,
  target_locations: [],
  created_at: '2026-11-01T00:00:00Z',
}

beforeEach(() => {
  mockLocalStorage()
  adsMock.mockReset()
  updateMock.mockReset()
  replaceMock.mockReset()
  adsMock.mockResolvedValue({ data: [ad], total: 1, page: 1, page_size: 100 })
  updateMock.mockResolvedValue({ message: 'ok', data: ad })
  replaceMock.mockResolvedValue({ message: 'ok', data: ad })
  Object.defineProperty(URL, 'createObjectURL', { value: jest.fn(() => 'blob:preview'), configurable: true })
  Object.defineProperty(URL, 'revokeObjectURL', { value: jest.fn(), configurable: true })
})

describe('EditAdPage media replace', () => {
  it('hiển thị media hiện tại và gửi media mới khi lưu', async () => {
    const user = userEvent.setup()
    renderWithProviders(<EditAdPage />)

    expect(await screen.findByDisplayValue('Khuyến mãi')).toBeInTheDocument()
    expect(screen.getByText(/Media hiện tại/)).toBeInTheDocument()

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(input, new File(['x'], 'new.jpg', { type: 'image/jpeg' }))

    await user.click(screen.getByRole('button', { name: 'Lưu' }))

    await waitFor(() => expect(updateMock).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(replaceMock).toHaveBeenCalledTimes(1))
    const [id, files] = replaceMock.mock.calls[0]
    expect(id).toBe('ad-1')
    expect((files as File[]).map((file) => file.name)).toEqual(['new.jpg'])
  })

  it('không gọi replaceAdMedia khi không chọn media mới', async () => {
    const user = userEvent.setup()
    renderWithProviders(<EditAdPage />)

    await screen.findByDisplayValue('Khuyến mãi')
    await user.click(screen.getByRole('button', { name: 'Lưu' }))

    await waitFor(() => expect(updateMock).toHaveBeenCalledTimes(1))
    expect(replaceMock).not.toHaveBeenCalled()
  })
})

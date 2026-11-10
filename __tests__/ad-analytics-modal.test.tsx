import React from 'react'
import { renderWithProviders, screen } from './test-utils'

jest.mock('recharts', () => {
  const ReactLib = jest.requireActual<typeof import('react')>('react')
  const Stub = ({ children }: { children?: React.ReactNode }) => ReactLib.createElement('div', null, children)
  return {
    ResponsiveContainer: Stub,
    LineChart: Stub,
    Line: () => null,
    XAxis: () => null,
    YAxis: () => null,
    CartesianGrid: () => null,
    Tooltip: () => null,
  }
})

jest.mock('@/api/partner', () => ({
  getAdAnalytics: jest.fn(),
}))

import { getAdAnalytics } from '@/api/partner'
import AdAnalyticsModal from '@/components/AdAnalyticsModal'
import type { AdPerformance } from '@/types'

const analyticsMock = getAdAnalytics as jest.Mock

const fullPerformance: AdPerformance = {
  ad_id: 'ad-1',
  title: 'Khuyến mãi tháng 11',
  status: 'active',
  format: 'image',
  budget: 1000000,
  daily_budget: 0,
  total_spent: 250000,
  remaining_budget: 750000,
  impressions: 4000,
  unique_reach: 1800,
  clicks: 120,
  interactions: 20,
  ctr: 2.5,
  cost_per_click: 1200,
  cost_per_thousand_impressions: 25000,
  cost: 100000,
  series: [
    {
      date: '2026-11-01',
      impressions: 1000,
      clicks: 30,
      views: 10,
      swipes: 0,
      video_starts: 0,
      video_completions: 0,
      cost: 25000,
    },
  ],
}

beforeEach(() => {
  analyticsMock.mockReset()
})

describe('AdAnalyticsModal', () => {
  it('render số liệu thật từ API (đã bóc wrapper + map ctr)', async () => {
    analyticsMock.mockResolvedValue(fullPerformance)

    renderWithProviders(<AdAnalyticsModal open adId="ad-1" onClose={jest.fn()} />)

    expect(await screen.findByText('Khuyến mãi tháng 11')).toBeInTheDocument()
    expect(screen.getByText('4.0K')).toBeInTheDocument()
    expect(screen.getByText('120')).toBeInTheDocument()
    expect(screen.getByText('2.5%')).toBeInTheDocument()
    expect(analyticsMock).toHaveBeenCalledWith(
      'ad-1',
      expect.objectContaining({ from: expect.any(String), to: expect.any(String) }),
    )
  })

  it('không crash khi response thiếu field, hiện "—" thay vì undefined', async () => {
    analyticsMock.mockResolvedValue({
      ad_id: 'ad-2',
      title: 'Ad cũ',
      status: 'pending',
      format: 'image',
    } as unknown as AdPerformance)

    renderWithProviders(<AdAnalyticsModal open adId="ad-2" onClose={jest.fn()} />)

    expect(await screen.findByText('Ad cũ')).toBeInTheDocument()
    expect(screen.getAllByText('—').length).toBeGreaterThan(0)
  })

  it('hiện gợi ý tối ưu khi CTR thấp', async () => {
    analyticsMock.mockResolvedValue({ ...fullPerformance, ctr: 0.2 })

    renderWithProviders(<AdAnalyticsModal open adId="ad-1" onClose={jest.fn()} />)

    expect(await screen.findByText('Gợi ý tối ưu')).toBeInTheDocument()
    expect(screen.getByText(/CTR đang ở 0\.20%/)).toBeInTheDocument()
    expect(screen.getByText(/không phải cam kết/)).toBeInTheDocument()
  })

  it('im lặng khi chưa đủ 100 impression', async () => {
    analyticsMock.mockResolvedValue({ ...fullPerformance, impressions: 40, ctr: 0.1 })

    renderWithProviders(<AdAnalyticsModal open adId="ad-1" onClose={jest.fn()} />)

    expect(await screen.findByText('Khuyến mãi tháng 11')).toBeInTheDocument()
    expect(screen.queryByText('Gợi ý tối ưu')).not.toBeInTheDocument()
  })
})

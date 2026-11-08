import { AD_INSIGHT_MIN_IMPRESSIONS, buildAdInsights } from '@/lib/ad-insights'
import type { AdPerformance } from '@/types'

function performance(overrides: Partial<AdPerformance> = {}): AdPerformance {
  return {
    ad_id: 'ad-1',
    title: 'Ad',
    status: 'active',
    format: 'image',
    budget: 1000000,
    daily_budget: 0,
    total_spent: 100000,
    remaining_budget: 900000,
    impressions: 4000,
    unique_reach: 2000,
    clicks: 80,
    interactions: 10,
    ctr: 2,
    cost_per_click: 1000,
    cost_per_thousand_impressions: 25000,
    ...overrides,
  }
}

function codes(perf: AdPerformance) {
  return buildAdInsights(perf).map((insight) => insight.code)
}

describe('buildAdInsights', () => {
  it('im lặng khi chưa đủ ngưỡng impression', () => {
    expect(buildAdInsights(performance({ impressions: AD_INSIGHT_MIN_IMPRESSIONS - 1 }))).toEqual([])
    expect(
      codes(performance({ impressions: AD_INSIGHT_MIN_IMPRESSIONS, ctr: 2, clicks: 5, remaining_budget: 0 })),
    ).toEqual([])
  })

  it('gợi ý đổi tiêu đề/ảnh khi CTR dưới 0.5%', () => {
    const insights = buildAdInsights(performance({ impressions: 1000, ctr: 0.3 }))
    expect(insights[0]).toMatchObject({ code: 'lowCtr', params: { ctr: '0.30' } })
  })

  it('gợi ý tăng CPM/ngân sách khi ít lượt hiển thị mà còn tiền', () => {
    const insights = buildAdInsights(performance({ impressions: 300, ctr: 2, remaining_budget: 500000 }))
    expect(insights.map((i) => i.code)).toContain('lowReach')
  })

  it('không gợi ý tăng ngân sách khi đã hết tiền', () => {
    expect(codes(performance({ impressions: 300, ctr: 2, remaining_budget: 0 }))).not.toContain('lowReach')
  })

  it('gợi ý xem lại CTA khi CPC cao so với CPM', () => {
    const insights = buildAdInsights(
      performance({ impressions: 1000, ctr: 2, clicks: 20, cost_per_click: 3000, cost_per_thousand_impressions: 25000 }),
    )
    expect(insights.map((i) => i.code)).toContain('highCpc')
  })

  it('gợi ý rút ngắn video khi tỷ lệ xem hết thấp', () => {
    const insights = buildAdInsights(
      performance({ format: 'video', impressions: 1000, ctr: 2, video_starts: 100, video_completions: 20 }),
    )
    expect(insights.map((i) => i.code)).toContain('shortVideo')
  })

  it('không gợi ý video cho ad không phải video', () => {
    expect(
      codes(performance({ format: 'image', impressions: 1000, ctr: 2, video_starts: 100, video_completions: 0 })),
    ).not.toContain('shortVideo')
  })

  it('tối đa 2 gợi ý', () => {
    const insights = buildAdInsights(
      performance({
        impressions: 300,
        ctr: 0.1,
        clicks: 20,
        cost_per_click: 3000,
        cost_per_thousand_impressions: 25000,
        format: 'video',
        video_starts: 100,
        video_completions: 0,
      }),
    )
    expect(insights).toHaveLength(2)
    expect(insights.map((i) => i.code)).toEqual(['lowCtr', 'lowReach'])
  })
})

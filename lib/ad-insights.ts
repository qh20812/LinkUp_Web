import type { AdPerformance } from '../types'

export type AdInsightCode = 'lowCtr' | 'lowReach' | 'highCpc' | 'shortVideo'

export interface AdInsight {
  code: AdInsightCode
  params?: Record<string, string | number>
}

/** Dưới ngưỡng này số liệu quá ít để gợi ý có ý nghĩa. */
export const AD_INSIGHT_MIN_IMPRESSIONS = 100

/**
 * Sinh tối đa 2 gợi ý tối ưu từ số liệu hiện tại. Đây chỉ là gợi ý tham khảo,
 * không dùng để tính tiền hay cam kết kết quả.
 */
export function buildAdInsights(perf: AdPerformance): AdInsight[] {
  if (!perf || !Number.isFinite(perf.impressions)) return []
  if (perf.impressions < AD_INSIGHT_MIN_IMPRESSIONS) return []

  const insights: AdInsight[] = []
  const ctr = Number(perf.ctr ?? 0)

  if (ctr < 0.5) {
    insights.push({ code: 'lowCtr', params: { ctr: ctr.toFixed(2) } })
  }

  const remainingBudget = Number(
    perf.remaining_budget ?? Number(perf.budget ?? 0) - Number(perf.total_spent ?? 0),
  )
  if (perf.impressions < 500 && remainingBudget > 0) {
    insights.push({ code: 'lowReach', params: { impressions: perf.impressions } })
  }

  const costPerImpression = Number(perf.cost_per_thousand_impressions ?? 0) / 1000
  const cpc = Number(perf.cost_per_click ?? 0)
  if (Number(perf.clicks ?? 0) >= 10 && costPerImpression > 0 && cpc > costPerImpression * 100) {
    insights.push({ code: 'highCpc', params: { cpc: Math.round(cpc) } })
  }

  const videoStarts = Number(perf.video_starts ?? 0)
  const videoCompletions = Number(perf.video_completions ?? 0)
  if (perf.format === 'video' && videoStarts >= 20 && videoCompletions / videoStarts < 0.3) {
    insights.push({ code: 'shortVideo' })
  }

  return insights.slice(0, 2)
}

import type { PartnerAdListItem } from '../types'

export type AdTipKind = 'pending' | 'rejected' | 'paused' | 'budgetLow' | 'completed'

/** Tip ngữ cảnh cho từng ad trong danh sách partner. */
export function getAdTip(
  ad: Pick<PartnerAdListItem, 'status' | 'budget' | 'total_spent'>,
): AdTipKind | null {
  switch (ad.status) {
    case 'pending':
      return 'pending'
    case 'rejected':
      return 'rejected'
    case 'paused':
      return 'paused'
    case 'completed':
      return 'completed'
    case 'active':
      if (ad.budget > 0 && ad.total_spent / ad.budget >= 0.8) return 'budgetLow'
      return null
    default:
      return null
  }
}

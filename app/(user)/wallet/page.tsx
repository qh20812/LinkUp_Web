'use client'

import React from 'react'
import WalletView from '../../../components/wallet/WalletView'

/**
 * Trang ví trong khu người dùng. Toàn bộ UI/logic nằm ở `WalletView` để dùng
 * chung với `/partner/wallet` (partner giữ nguyên PartnerTabs).
 */
export default function WalletPage() {
  return <WalletView />
}

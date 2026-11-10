'use client'

import React from 'react'
import WalletView from '../../../components/wallet/WalletView'

/**
 * Ví trong khu partner — cùng component với `/wallet`, nhưng nằm dưới
 * PartnerLayout + PartnerTabs để partner chuyển tab qua lại thuận tiện.
 */
export default function PartnerWalletPage() {
  return <WalletView embedded />
}

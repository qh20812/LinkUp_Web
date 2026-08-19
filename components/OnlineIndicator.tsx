'use client'

interface OnlineIndicatorProps {
  isOnline: boolean
}

export default function OnlineIndicator({ isOnline }: OnlineIndicatorProps) {
  if (!isOnline) return null

  return (
    <span
      style={{
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 10,
        height: 10,
        borderRadius: '50%',
        background: '#22c55e',
        border: '2px solid var(--color-card)',
        zIndex: 1,
      }}
    />
  )
}

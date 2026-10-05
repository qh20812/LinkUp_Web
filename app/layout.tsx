import React from 'react'
import type { Metadata, Viewport } from 'next'
import { Outfit, DM_Sans } from 'next/font/google'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { LanguageProvider } from '../contexts/LanguageContext'
import { ThemeProvider } from '../contexts/ThemeContext'
import { ToastProvider } from '../contexts/ToastContext'
import { CallProvider } from '../contexts/CallContext'
import { GroupCallProvider } from '../contexts/GroupCallContext'
import CallOverlay from '../components/calls/CallOverlay'
import GroupCallOverlay from '../components/calls/GroupCallOverlay'
import GroupCallBubble from '../components/calls/GroupCallBubble'
import GroupCallIncomingModal from '../components/calls/GroupCallIncomingModal'
import ServiceWorkerRegister from '../components/ServiceWorkerRegister'
import './globals.css'

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-family-heading',
  weight: ['500', '600', '700'],
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-family-body',
  weight: ['400', '500', '600'],
})

export const metadata: Metadata = {
  title: process.env.APP_NAME || 'LinkUp',
  description: 'Ứng dụng kết nối và trò chuyện trực tuyến',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  appleWebApp: {
    capable: true,
    title: 'LinkUp',
    statusBarStyle: 'default',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#12A5A1',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="vi" className={`${outfit.variable} ${dmSans.variable}`}>
      <head>
        <link
          rel="stylesheet"
          href="https://unpkg.com/boxicons@2.1.4/css/boxicons.min.css"
        />
      </head>
      <body>
        <ServiceWorkerRegister />
        <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!}>
          <LanguageProvider>
            <ThemeProvider>
              <ToastProvider>
                <CallProvider>
                  <GroupCallProvider>
                    {children}
                    <CallOverlay />
                    <GroupCallOverlay />
                    <GroupCallBubble />
                    <GroupCallIncomingModal />
                  </GroupCallProvider>
                </CallProvider>
              </ToastProvider>
            </ThemeProvider>
          </LanguageProvider>
        </GoogleOAuthProvider>
      </body>
    </html>
  )
}

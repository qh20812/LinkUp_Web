import React from 'react'
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

export const metadata = {
  title: 'Trang chủ - LinkUp',
  description: 'Admin dashboard for LinkUp social network',
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
        <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? ''}>
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

'use client'

import React, { useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useAuth } from '../hooks/useAuth'
import { useTranslation } from '../hooks/useTranslation'
import { getPostAuthPath } from '../utils/auth'
import UserLayout from '../components/UserLayout'
import Feed from '../components/Feed'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import styles from './Landing.module.css'

function LandingPage() {
  const { t } = useTranslation()

  return (
    <div className={styles.wrap}>
      <Navbar />
      <main className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.logo}>
            <Image src="/S-Logo-Rmbg.png" alt="LinkUp" width={500} height={500} className={styles.logoImg} priority />
            <span className={styles.brand}>LinkUp</span>
          </div>
          <h1 className={styles.tagline}>{t('landing.tagline')}</h1>
          <div className={styles.actions}>
            <Link href="/register" className={styles.btnPrimary}>
              {t('landing.ctaStart')}
            </Link>
            <Link href="/login" className={styles.btnSecondary}>
              {t('landing.ctaLogin')}
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default function HomePage() {
  const { isAuthenticated, isUser, isAdmin, isSuperAdmin, isPartner, initializing } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (initializing) return
    const role = isSuperAdmin || isAdmin ? 'ADMIN' : isPartner ? 'PARTNER' : null
    if (role) router.push(getPostAuthPath(role))
  }, [isAdmin, isSuperAdmin, isPartner, router, initializing])

  if (initializing) {
    return <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }} />
  }

  if (!isAuthenticated) {
    return <LandingPage />
  }

  if (isAdmin || isSuperAdmin || isPartner) {
    return null
  }

  if (isUser) {
    return (
      <UserLayout>
        <Feed />
      </UserLayout>
    )
  }

  return <LandingPage />
}

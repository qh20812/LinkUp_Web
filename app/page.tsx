'use client'

import React, { useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useAuth } from '../hooks/useAuth'
import { useTranslation } from '../hooks/useTranslation'
import UserLayout from '../components/UserLayout'
import Feed from '../components/Feed'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import styles from './Landing.module.css'

function LandingPage() {
  const { t } = useTranslation()
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const nodes = Array.from(root.querySelectorAll<HTMLElement>('[data-reveal]'))
    const reduced =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced || typeof IntersectionObserver === 'undefined') {
      nodes.forEach((n) => n.classList.add(styles.revealed))
      return
    }
    root.setAttribute('data-reveal-active', '')
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add(styles.revealed)
            io.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    )
    nodes.forEach((n) => io.observe(n))
    return () => io.disconnect()
  }, [])

  return (
    <div className={styles.wrap} ref={rootRef}>
      <Navbar />
      <main className={styles.main}>
        <section className={styles.hero}>
          <span className={styles.heroOrb} aria-hidden="true" />
          <span className={`${styles.heroOrb} ${styles.heroOrbAlt}`} aria-hidden="true" />

          <div className={styles.heroCopy}>
            <div className={styles.heroLogo}>
              <Image
                src="/S-Logo-Rmbg.png"
                alt="LinkUp"
                width={500}
                height={500}
                className={styles.logoImg}
                priority
              />
              <span className={styles.heroBrand}>LinkUp</span>
            </div>
            <h1 className={styles.tagline}>{t('landing.tagline')}</h1>
            <p className={styles.sub}>{t('landing.sub')}</p>
            <div className={styles.actions}>
              <Link href="/register" className={styles.btnPrimary}>
                {t('landing.ctaStart')}
              </Link>
              <Link href="/login" className={styles.btnSecondary}>
                {t('landing.ctaLogin')}
              </Link>
            </div>
            <ul className={styles.points}>
              <li>
                <i className="bx bx-check" aria-hidden="true" />
                {t('brand.point1')}
              </li>
              <li>
                <i className="bx bx-check" aria-hidden="true" />
                {t('brand.point2')}
              </li>
              <li>
                <i className="bx bx-check" aria-hidden="true" />
                {t('brand.point3')}
              </li>
            </ul>
          </div>

          <div className={styles.preview} aria-hidden="true">
            <div className={`${styles.previewCard} ${styles.previewPost}`}>
              <div className={styles.previewPostInner}>
                <div className={styles.postHead}>
                  <span className={styles.postAvatar} />
                  <span className={styles.postMeta}>
                    <span className={`${styles.line} ${styles.lineW50}`} />
                    <span className={`${styles.line} ${styles.lineW35}`} />
                  </span>
                </div>
                <span className={`${styles.line} ${styles.lineW85}`} />
                <span className={`${styles.line} ${styles.lineW65}`} />
                <span className={styles.postMedia} />
                <div className={styles.postActions}>
                  <span className={styles.actionChip}>
                    <i className="bx bx-heart" />
                  </span>
                  <span className={styles.actionChip}>
                    <i className="bx bx-comment" />
                  </span>
                  <span className={styles.actionChip}>
                    <i className="bx bx-share" />
                  </span>
                </div>
              </div>
            </div>

            <div className={`${styles.previewCard} ${styles.previewChat}`}>
              <div className={styles.previewChatInner}>
                <div className={styles.chatHead}>
                  <span className={styles.chatAvatar} />
                  <span className={`${styles.line} ${styles.lineW50}`} />
                </div>
                <span className={`${styles.bubble} ${styles.bubbleIn}`}>
                  {t('landing.mock.bubble1')}
                </span>
                <span className={`${styles.bubble} ${styles.bubbleOut}`}>
                  {t('landing.mock.bubble2')}
                </span>
              </div>
            </div>

            <div className={`${styles.previewCard} ${styles.previewNotif}`}>
              <span className={styles.previewNotifInner}>
                <span className={styles.notifDot} />
                <span className={styles.notifText}>{t('landing.mock.notif')}</span>
              </span>
            </div>
          </div>
        </section>

        <section className={styles.features}>
          <div className={`${styles.featureRow} ${styles.reveal}`} data-reveal>
            <div className={styles.featureText}>
              <h2>{t('landing.feature1Title')}</h2>
              <p>{t('landing.feature1Body')}</p>
            </div>
            <div className={styles.featureVisual}>
              <div className={styles.mockList}>
                <div className={styles.mockRow}>
                  <span className={styles.mockAvatar} />
                  <span className={styles.mockMeta}>
                    <span className={styles.mockName}>{t('landing.mock.friend1')}</span>
                    <span className={styles.mockSub}>{t('landing.mock.mutual')}</span>
                  </span>
                  <span className={styles.mockPill}>{t('landing.mock.connect')}</span>
                </div>
                <div className={styles.mockRow}>
                  <span className={`${styles.mockAvatar} ${styles.mockAvatarAlt}`} />
                  <span className={styles.mockMeta}>
                    <span className={styles.mockName}>{t('landing.mock.friend2')}</span>
                    <span className={styles.mockSub}>{t('landing.mock.mutual')}</span>
                  </span>
                  <span className={`${styles.mockPill} ${styles.mockPillDone}`}>
                    {t('landing.mock.connected')}
                  </span>
                </div>
                <div className={styles.mockRow}>
                  <span className={`${styles.mockAvatar} ${styles.mockAvatarAlt2}`} />
                  <span className={styles.mockMeta}>
                    <span className={styles.mockName}>{t('landing.mock.friend3')}</span>
                    <span className={styles.mockSub}>{t('landing.mock.mutual')}</span>
                  </span>
                  <span className={styles.mockPill}>{t('landing.mock.connect')}</span>
                </div>
              </div>
            </div>
          </div>

          <div className={`${styles.featureRow} ${styles.reveal}`} data-reveal>
            <div className={styles.featureText}>
              <h2>{t('landing.feature2Title')}</h2>
              <p>{t('landing.feature2Body')}</p>
            </div>
            <div className={styles.featureVisual}>
              <div className={styles.mockChat}>
                <span className={styles.bubble}>{t('landing.mock.bubble1')}</span>
                <span className={`${styles.bubble} ${styles.bubbleOut}`}>
                  {t('landing.mock.bubble2')}
                </span>
                <span className={styles.mockEnc}>
                  <i className="bx bx-lock-alt" aria-hidden="true" />
                  {t('landing.mock.enc')}
                </span>
              </div>
            </div>
          </div>

          <div className={`${styles.featureRow} ${styles.reveal}`} data-reveal>
            <div className={styles.featureText}>
              <h2>{t('landing.feature3Title')}</h2>
              <p>{t('landing.feature3Body')}</p>
            </div>
            <div className={styles.featureVisual}>
              <div className={styles.mockCall}>
                <span className={styles.mockTile} />
                <span className={styles.mockTile} />
                <span className={styles.mockTile} />
                <span className={styles.mockTile} />
              </div>
              <div className={styles.mockControls}>
                <span className={styles.mockControl}>
                  <i className="bx bx-microphone" aria-hidden="true" />
                </span>
                <span className={styles.mockControl}>
                  <i className="bx bx-video" aria-hidden="true" />
                </span>
                <span className={`${styles.mockControl} ${styles.mockControlEnd}`}>
                  <i className="bx bx-phone-off" aria-hidden="true" />
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className={`${styles.closing} ${styles.reveal}`} data-reveal>
          <div className={styles.closingCopy}>
            <h2>{t('landing.trustTitle')}</h2>
            <p>{t('landing.trustBody')}</p>
            <ul className={styles.badges}>
              <li>
                <i className="bx bx-check-circle" aria-hidden="true" />
                {t('landing.badge1')}
              </li>
              <li>
                <i className="bx bx-check-circle" aria-hidden="true" />
                {t('landing.badge2')}
              </li>
              <li>
                <i className="bx bx-check-circle" aria-hidden="true" />
                {t('landing.badge3')}
              </li>
            </ul>
          </div>
          <div className={styles.closingPanel}>
            <h3>{t('landing.ctaTitle')}</h3>
            <p>{t('landing.ctaBody')}</p>
            <div className={styles.actions}>
              <Link href="/register" className={styles.btnPrimary}>
                {t('landing.ctaStart')}
              </Link>
              <Link href="/login" className={styles.btnSecondary}>
                {t('landing.ctaLogin')}
              </Link>
            </div>
          </div>
        </section>
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
    if (isSuperAdmin || isAdmin) router.push('/admin/dashboard')
  }, [isAdmin, isSuperAdmin, router, initializing])

  if (initializing) {
    return <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }} />
  }

  if (!isAuthenticated) {
    return <LandingPage />
  }

  if (isAdmin || isSuperAdmin) {
    return null
  }

  if (isUser || isPartner) {
    return (
      <UserLayout>
        <Feed />
      </UserLayout>
    )
  }

  return <LandingPage />
}

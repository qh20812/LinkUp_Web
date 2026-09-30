'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import NavControls from '../NavControls'
import styles from './AuthLayout.module.css'

export default function AuthLayout({
  children,
  showFooter = true,
}: {
  children: React.ReactNode
  showFooter?: boolean
}) {
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <Link href="/" className={styles.brand}>
          <Image
            src="/S-Logo-Rmbg.png"
            alt="LinkUp"
            width={32}
            height={32}
            className={styles.brandImg}
          />
          <span className={styles.brandText}>LinkUp</span>
        </Link>

        <div className={styles.controls}>
          <NavControls />
        </div>
      </header>

      <main className={styles.main}>{children}</main>

      {showFooter && <footer className={styles.footer}>© 2026 LinkUp</footer>}
    </div>
  )
}

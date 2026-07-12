'use client'

import React from 'react'
import styles from './Footer.module.css'

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <span className={styles.left}>
          &copy; 2026 LinkUp &middot; Bảng quản trị
        </span>
        <span className={styles.right}>v0.1.0</span>
      </div>
    </footer>
  )
}

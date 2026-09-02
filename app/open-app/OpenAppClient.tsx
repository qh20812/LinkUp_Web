'use client'

import React, { useEffect, useState, useRef } from 'react'
import Image from 'next/image'
import styles from './OpenApp.module.css'

const APP_STORE_URL = 'https://apps.apple.com/app/linkup/id000000000'
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.linkup.mobile'

export default function OpenAppClient({ redirect }: { redirect: string | null }) {
  const [status, setStatus] = useState<'trying' | 'fallback'>('trying')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!redirect) {
      setStatus('fallback')
      return
    }

    window.location.href = redirect

    timerRef.current = setTimeout(() => {
      setStatus('fallback')
    }, 2500)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [redirect])

  if (!redirect) {
    return (
      <div className={styles.centered}>
        <div className={styles.logo}>
          <Image src="/S-Logo-Rmbg.png" alt="LinkUp" width={48} height={48} className={styles.logoImg} />
          <span className={styles.logoText}>LinkUp</span>
        </div>
        <div className={styles.iconWrap}>
          <i className={`bx bx-error-circle ${styles.icon}`} />
        </div>
        <h1 className={styles.title}>Liên kết không hợp lệ</h1>
        <p className={styles.message}>Không tìm thấy tham số redirect.</p>
      </div>
    )
  }

  return (
    <div className={styles.centered}>
      <div className={styles.logo}>
        <Image src="/S-Logo-Rmbg.png" alt="LinkUp" width={48} height={48} className={styles.logoImg} />
        <span className={styles.logoText}>LinkUp</span>
      </div>

      {status === 'trying' && (
        <>
          <div className={styles.iconWrap}>
            <i className={`bx bx-loader-circle ${styles.icon}`} />
          </div>
          <h1 className={styles.title}>Đang mở ứng dụng...</h1>
          <p className={styles.message}>
            Nếu ứng dụng không mở tự động, vui lòng bấm nút bên dưới.
          </p>
        </>
      )}

      {status === 'fallback' && (
        <>
          <div className={styles.iconWrap}>
            <i className={`bx bx-mobile ${styles.icon}`} />
          </div>
          <h1 className={styles.title}>Mở LinkUp trên điện thoại</h1>
          <p className={styles.message}>
            Bấm nút bên dưới để mở ứng dụng LinkUp trên điện thoại của bạn.
          </p>

          <a href={redirect} className={styles.button}>
            Mở trong ứng dụng
          </a>

          <a href={APP_STORE_URL} className={styles.appStoreBtn} target="_blank" rel="noopener noreferrer">
            Tải trên App Store
          </a>

          <a href={PLAY_STORE_URL} className={styles.playStoreBtn} target="_blank" rel="noopener noreferrer">
            Tải trên Google Play
          </a>
        </>
      )}

      <div className={styles.footer}>
        Hoặc <a href="/verify-email">tiếp tục trên trình duyệt</a>
      </div>
    </div>
  )
}

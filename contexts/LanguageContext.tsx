'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

type Language = 'vi' | 'en'

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string) => string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('language') as Language
      if (saved === 'vi' || saved === 'en') return saved
    }
    return 'vi'
  })
  const [translations, setTranslations] = useState<Record<string, unknown>>({})

  useEffect(() => {
    import(`../locales/${language}.json`).then((mod) => setTranslations(mod.default))
    localStorage.setItem('language', language)
  }, [language])

  const t = (key: string): string => {
    const keys = key.split('.')
    let value: unknown = translations
    for (const k of keys) {
      if (value && typeof value === 'object') {
        value = (value as Record<string, unknown>)[k]
      } else {
        return key
      }
    }
    return typeof value === 'string' ? value : key
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export const useTranslation = () => {
  const context = useContext(LanguageContext)
  if (!context) throw new Error('useTranslation must be used within LanguageProvider')
  return context
}

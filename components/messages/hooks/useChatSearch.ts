'use client'

import { useEffect, useRef, useState } from 'react'

export interface UseChatSearchOptions {
  searchMessages: (keyword: string) => void
  clearSearch: () => void
}

export interface UseChatSearchReturn {
  searchActive: boolean
  searchInput: string
  setSearchActive: (value: boolean) => void
  setSearchInput: (value: string) => void
  toggleSearch: () => void
}

export function useChatSearch({
  searchMessages,
  clearSearch,
}: UseChatSearchOptions): UseChatSearchReturn {
  const [searchActive, setSearchActive] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const toggleSearch = () => {
    if (searchActive) {
      setSearchInput('')
      clearSearch()
    }
    setSearchActive((prev) => !prev)
  }

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    const keyword = searchInput
    if (!keyword.trim()) {
      clearSearch()
      return
    }
    searchTimerRef.current = setTimeout(() => searchMessages(keyword), 350)
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    }
  }, [searchInput, clearSearch, searchMessages])

  return {
    searchActive,
    searchInput,
    setSearchActive,
    setSearchInput,
    toggleSearch,
  }
}

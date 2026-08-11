'use client'

import { useState, useEffect, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import ExternalImage from './ExternalImage'
import styles from './RightSidebar.module.css'
import { useTranslation } from '../hooks/useTranslation'
import { useToast } from '../contexts/ToastContext'
import { getTrendingHashtags } from '../api/posts'
import { getFollowSuggestions } from '../api/follow'
import { useFollowContext } from '../contexts/FollowContext'
import type { TrendingHashtag, FollowSuggestionUser } from '../types'

function formatCount(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K'
  return String(n)
}

export default function RightSidebar() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [trending, setTrending] = useState<TrendingHashtag[]>([])
  const [trendingReady, setTrendingReady] = useState(false)
  const [trendingError, setTrendingError] = useState(false)

  const [suggestions, setSuggestions] = useState<FollowSuggestionUser[]>([])
  const [suggestionsLoading, setSuggestionsLoading] = useState(true)
  const [suggestionsError, setSuggestionsError] = useState(false)
  const [suggestionsPage, setSuggestionsPage] = useState(1)
  const [suggestionsHasMore, setSuggestionsHasMore] = useState(false)
  const { followUser, unfollowUser, isFollowed } = useFollowContext()

  useEffect(() => {
    getTrendingHashtags()
      .then((res) => setTrending(res.data))
      .catch(() => setTrendingError(true))
      .finally(() => setTrendingReady(true))
  }, [])

  useEffect(() => {
    getFollowSuggestions(1)
      .then((res) => {
        setSuggestions(res.data ?? [])
        setSuggestionsPage(res.page)
        setSuggestionsHasMore(res.has_more)
      })
      .catch(() => setSuggestionsError(true))
      .finally(() => setSuggestionsLoading(false))
  }, [])

  const handleFollow = async (userId: string) => {
    try {
      await followUser(userId)
      toast({ title: t('rightSidebar.followSuccess'), type: 'success' })
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : t('rightSidebar.followError'), type: 'error' })
    }
  }

  const handleUnfollow = async (userId: string) => {
    try {
      await unfollowUser(userId)
      toast({ title: t('rightSidebar.unfollowSuccess'), type: 'success' })
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : t('rightSidebar.unfollowError'), type: 'error' })
    }
  }

  const handleViewMore = async () => {
    const nextPage = suggestionsPage + 1
    try {
      const res = await getFollowSuggestions(nextPage)
      setSuggestions((prev) => {
        const existing = new Set(prev.map(u => u.id))
        const newItems = (res.data ?? []).filter(u => !existing.has(u.id))
        return [...prev, ...newItems]
      })
      setSuggestionsPage(res.page)
      setSuggestionsHasMore(res.has_more)
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : t('rightSidebar.loadError'), type: 'error' })
    }
  }

  const handleSearch = (e: FormEvent) => {
    e.preventDefault()
    const q = query.trim()
    if (q) router.push(`/search?q=${encodeURIComponent(q)}`)
  }

  return (
    <aside className={styles.sidebar}>
      <div className={styles.searchWrapper}>
        <form className={styles.searchBox} onSubmit={handleSearch}>
          <i className="bx bx-search" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('rightSidebar.searchPlaceholder')}
            className={styles.searchInput}
          />
        </form>
      </div>

      {trendingReady && (
        <section className={styles.card}>
          <h3 className={styles.cardTitle}>{t('rightSidebar.trending')}</h3>
          {trendingError ? (
            <p className={styles.statusText}>{t('common.error')}</p>
          ) : trending.length === 0 ? (
            <p className={styles.statusText}>{t('rightSidebar.noTrending')}</p>
          ) : (
            <>
              <ul className={styles.list}>
                {trending.map((item) => (
                  <li key={item.name}>
                    <button
                      className={styles.listItem}
                      onClick={() => router.push(`/search?q=${item.name}`)}
                    >
                      <span className={styles.hashTag}>#{item.name}</span>
                      <span className={styles.meta}>{formatCount(item.post_count)} {t('rightSidebar.posts')}</span>
                    </button>
                  </li>
                ))}
              </ul>
              <button className={styles.viewMore}>{t('rightSidebar.viewMore')}</button>
            </>
          )}
        </section>
      )}

      {!suggestionsLoading && (
        <section className={styles.card}>
          <h3 className={styles.cardTitle}>{t('rightSidebar.suggestions')}</h3>
          {suggestionsError ? (
            <p className={styles.statusText}>{t('common.error')}</p>
          ) : suggestions.length === 0 ? (
            <p className={styles.statusText}>{t('rightSidebar.noSuggestions')}</p>
          ) : (
            <>
              <ul className={styles.list}>
                {suggestions.map((user) => {
                  const followed = isFollowed(user.id)
                  return (
                    <li key={user.id}>
                      <div className={styles.suggestionItem}>
                        <div className={styles.suggestionAvatar}>
                          {user.avatar_uri ? (
                            <ExternalImage src={user.avatar_uri} alt="" className={styles.avatarImg} />
                          ) : (
                            <i className="bx bxs-user" />
                          )}
                        </div>
                        <div className={styles.suggestionMeta}>
                          <span className={styles.suggestionName}>
                            {user.display_name || user.username}
                          </span>
                          {user.mutual_count > 0 && (
                            <span className={styles.meta}>
                              {user.mutual_count} {t('rightSidebar.mutual')}
                            </span>
                          )}
                        </div>
                        {followed ? (
                          <button
                            className={styles.followingBtn}
                            onClick={() => handleUnfollow(user.id)}
                          >
                            {t('rightSidebar.following')}
                          </button>
                        ) : (
                          <button
                            className={styles.followBtn}
                            onClick={() => handleFollow(user.id)}
                          >
                            {t('rightSidebar.follow')}
                          </button>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
              {suggestionsHasMore && (
                <button className={styles.viewMore} onClick={handleViewMore}>
                  {t('rightSidebar.viewMore')}
                </button>
              )}
            </>
          )}
        </section>
      )}
    </aside>
  )
}

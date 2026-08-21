'use client'

import { useState, useEffect, useRef, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import ExternalImage from './ExternalImage'
import styles from './RightSidebar.module.css'
import { useTranslation } from '../hooks/useTranslation'
import { useToast } from '../contexts/ToastContext'
import { getTrendingHashtags } from '../api/posts'
import { getFollowSuggestions } from '../api/follow'
import { search } from '../api/search'
import { useFollowContext } from '../contexts/FollowContext'
import type { TrendingHashtag, FollowSuggestionUser, SearchResponse } from '../types'

function formatCount(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K'
  return String(n)
}

const MIN_CHARS = 2
const DEBOUNCE_MS = 300

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

  const [searchResults, setSearchResults] = useState<SearchResponse | null>(null)
  const [searching, setSearching] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const seqRef = useRef(0)
  const wrapperRef = useRef<HTMLDivElement>(null)

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

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDropdownOpen(false)
    }
    document.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    const trimmed = query.trim()
    if (trimmed.length < MIN_CHARS) return
    timerRef.current = setTimeout(async () => {
      setSearching(true)
      setDropdownOpen(true)
      const seq = ++seqRef.current
      try {
        const res = await search(trimmed, 'all')
        if (seq !== seqRef.current) return
        setSearchResults(res)
        setDropdownOpen(true)
      } catch {
        if (seq !== seqRef.current) return
        setSearchResults(null)
      } finally {
        if (seq === seqRef.current) setSearching(false)
      }
    }, DEBOUNCE_MS)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [query])

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

  const handleQueryChange = (value: string) => {
    setQuery(value)
    if (value.trim().length < MIN_CHARS) {
      setSearching(false)
      setSearchResults(null)
      setDropdownOpen(false)
    }
  }

  const handleSearch = (e: FormEvent) => {
    e.preventDefault()
    const q = query.trim()
    if (q) {
      setDropdownOpen(false)
      router.push(`/search?q=${encodeURIComponent(q)}`)
    }
  }

  const handleSearchFocus = () => {
    const trimmed = query.trim()
    if (trimmed.length >= MIN_CHARS && searchResults) {
      setDropdownOpen(true)
    }
  }

  const hasResults =
    searchResults &&
    ((searchResults.users && searchResults.users.length > 0) ||
      (searchResults.posts && searchResults.posts.length > 0) ||
      (searchResults.hashtags && searchResults.hashtags.length > 0) ||
      (searchResults.communities && searchResults.communities.length > 0))

  const showDropdown = dropdownOpen && (searching || hasResults || (searchResults && !hasResults))

  return (
    <aside className={styles.sidebar}>
      <div className={styles.searchWrapper} ref={wrapperRef}>
        <form className={styles.searchBox} onSubmit={handleSearch}>
          <i className="bx bx-search" />
          <input
            type="text"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            onFocus={handleSearchFocus}
            placeholder={t('rightSidebar.searchPlaceholder')}
            className={styles.searchInput}
          />
          {searching && <i className={`bx bx-loader-alt ${styles.spinner}`} />}
        </form>

        {showDropdown && (
          <div className={styles.dropdown}>
            {searching && !searchResults && (
              <div className={styles.dropdownEmpty}>{t('common.loading')}</div>
            )}

            {!searching && searchResults && !hasResults && (
              <div className={styles.dropdownEmpty}>{t('rightSidebar.searchNoResults')}</div>
            )}

            {searchResults?.users && searchResults.users.length > 0 && (
              <div className={styles.dropdownSection}>
                <div className={styles.dropdownLabel}>{t('rightSidebar.searchPeople')}</div>
                {searchResults.users.map((user) => (
                  <button
                    key={user.id}
                    className={styles.dropdownItem}
                    onClick={() => {
                      setDropdownOpen(false)
                      router.push(`/profile/${user.id}`)
                    }}
                  >
                    <div className={styles.dropdownAvatar}>
                      {user.avatar_uri ? (
                        <ExternalImage src={user.avatar_uri} alt="" className={styles.dropdownAvatarImg} />
                      ) : (
                        <i className="bx bxs-user" />
                      )}
                    </div>
                    <div className={styles.dropdownItemMeta}>
                      <span className={styles.dropdownItemName}>{user.display_name || user.username}</span>
                      {user.display_name && user.username && (
                        <span className={styles.dropdownItemSub}>@{user.username}</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {searchResults?.posts && searchResults.posts.length > 0 && (
              <div className={styles.dropdownSection}>
                <div className={styles.dropdownLabel}>{t('rightSidebar.searchPosts')}</div>
                {searchResults.posts.map((post) => (
                  <button
                    key={post.id}
                    className={styles.dropdownItem}
                    onClick={() => {
                      setDropdownOpen(false)
                      router.push(`/posts/${post.id}`)
                    }}
                  >
                    <div className={styles.dropdownPostIcon}>
                      <i className="bx bx-file" />
                    </div>
                    <div className={styles.dropdownItemMeta}>
                      <span className={styles.dropdownItemName}>{post.title}</span>
                      <span className={styles.dropdownItemSub}>@{post.username}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {searchResults?.hashtags && searchResults.hashtags.length > 0 && (
              <div className={styles.dropdownSection}>
                <div className={styles.dropdownLabel}>{t('rightSidebar.searchHashtags')}</div>
                {searchResults.hashtags.map((tag) => (
                  <button
                    key={tag.name}
                    className={styles.dropdownItem}
                    onClick={() => {
                      setDropdownOpen(false)
                      router.push(`/search?q=%23${encodeURIComponent(tag.name)}`)
                    }}
                  >
                    <div className={styles.dropdownHashtagIcon}>
                      <i className="bx bx-hash" />
                    </div>
                    <div className={styles.dropdownItemMeta}>
                      <span className={styles.dropdownItemName}>#{tag.name}</span>
                      <span className={styles.dropdownItemSub}>{formatCount(tag.post_count)} {t('rightSidebar.posts')}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {searchResults?.communities && searchResults.communities.length > 0 && (
              <div className={styles.dropdownSection}>
                <div className={styles.dropdownLabel}>{t('search.tabCommunities')}</div>
                {searchResults.communities.map((community) => (
                  <button
                    key={community.id}
                    className={styles.dropdownItem}
                    onClick={() => {
                      setDropdownOpen(false)
                      router.push(`/communities/${community.id}`)
                    }}
                  >
                    <div className={styles.dropdownCommunityIcon}>
                      <i className="bx bxs-chat" />
                    </div>
                    <div className={styles.dropdownItemMeta}>
                      <span className={styles.dropdownItemName}>{community.name}</span>
                      <span className={styles.dropdownItemSub}>{formatCount(community.member_count)} {t('communities.members')}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {searchResults && (searchResults.users || searchResults.posts || searchResults.hashtags || searchResults.communities) && (
              <button
                className={styles.dropdownViewAll}
                onClick={() => {
                  setDropdownOpen(false)
                  router.push(`/search?q=${encodeURIComponent(query.trim())}`)
                }}
              >
                {t('rightSidebar.searchViewAll')}
              </button>
            )}
          </div>
        )}
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

'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import styles from './Profile.module.css'
import { getMyProfile, updateProfile, uploadAvatar } from '../../../api/profile'
import { getFollowStats, getFollowers, getFollowing } from '../../../api/follow'
import { getUserPosts, reactPost, savePost, getEmojis } from '../../../api/posts'
import { getTokenPayload } from '../../../api/auth'
import { useAuth } from '../../../hooks/useAuth'
import { useTranslation } from '../../../hooks/useTranslation'
import { useToast } from '../../../contexts/ToastContext'
import { useFollowContext } from '../../../contexts/FollowContext'
import PostCard from '../../../components/PostCard'
import PostDetailModal from '../../../components/PostDetailModal'
import type { ViewProfileResponse, FeedPost, EmojiItem, FollowListItem } from '../../../types'

const PAGE_SIZE = 10

async function ensureLikeEmojiId(): Promise<string | undefined> {
  try {
    const res = await getEmojis()
    const emoji = res.data.find((e: EmojiItem) => e.code === ':like:')
    if (emoji) return emoji.id
  } catch { /* ignore */ }
  return undefined
}

export default function MyProfilePage() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const router = useRouter()
  const { isAuthenticated, initializing } = useAuth()
  const { followUser: ctxFollowUser } = useFollowContext()

  const [userID, setUserID] = useState<string | null>(null)
  const [profile, setProfile] = useState<ViewProfileResponse | null>(null)
  const [stats, setStats] = useState<{ follower_count: number; following_count: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editBio, setEditBio] = useState('')
  const [editPrivateProfile, setEditPrivateProfile] = useState(false)
  const [editPrivatePosts, setEditPrivatePosts] = useState(false)
  const [editAllowStrangerFriend, setEditAllowStrangerFriend] = useState(true)
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [posts, setPosts] = useState<FeedPost[]>([])
  const [postsLoading, setPostsLoading] = useState(false)
  const [postsError, setPostsError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const loadingRef = useRef(false)
  const cursorRef = useRef<string | null>(null)

  const [modalType, setModalType] = useState<'followers' | 'following' | null>(null)
  const [modalList, setModalList] = useState<FollowListItem[]>([])
  const [modalLoading, setModalLoading] = useState(false)
  const [modalPage, setModalPage] = useState(1)
  const [modalHasMore, setModalHasMore] = useState(true)
  const [modalSearch, setModalSearch] = useState('')

  useEffect(() => {
    const payload = getTokenPayload()
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (payload?.user_id) setUserID(payload.user_id)
  }, [])

  useEffect(() => {
    if (!userID) return
    let cancelled = false
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    Promise.all([
      getMyProfile().then((res) => {
        if (!cancelled) setProfile(res)
      }),
      getFollowStats(userID).then((s) => {
        if (!cancelled) setStats({ follower_count: s.follower_count, following_count: s.following_count })
      }),
    ])
      .catch(() => {
        if (!cancelled) setError(t('common.error'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [userID, t])

  const fetchNextPosts = useCallback(async () => {
    if (!userID || loadingRef.current) return
    loadingRef.current = true
    setPostsLoading(true)
    setPostsError(null)
    const isFirst = cursorRef.current === null
    try {
      const res = await getUserPosts(userID, cursorRef.current, PAGE_SIZE)
      setPosts((prev) => {
        const list = isFirst ? res.data : [...prev, ...res.data]
        const seen = new Set<string>()
        return list.filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)))
      })
      cursorRef.current = res.next_cursor
      setHasMore(res.next_cursor !== null)
    } catch (err) {
      setPostsError(err instanceof Error ? err.message : t('common.error'))
    } finally {
      setPostsLoading(false)
      loadingRef.current = false
    }
  }, [userID, t])

  useEffect(() => {
    fetchNextPosts()
  }, [fetchNextPosts])

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && cursorRef.current !== null && !loadingRef.current) {
          fetchNextPosts()
        }
      },
      { rootMargin: '200px' },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [fetchNextPosts, posts.length])

  const handleEdit = () => {
    setEditName(profile?.display_name ?? '')
    setEditBio(profile?.bio ?? '')
    setEditPrivateProfile(profile?.is_private_profile ?? false)
    setEditPrivatePosts(profile?.is_private_posts ?? false)
    setEditAllowStrangerFriend(profile?.allow_stranger_friend_request ?? true)
    setEditing(true)
  }

  const handleCancel = () => {
    setEditing(false)
  }

  const handleSave = async () => {
    if (saving) return
    setSaving(true)
    try {
      const res = await updateProfile({
        display_name: editName,
        bio: editBio,
        is_private_profile: editPrivateProfile,
        is_private_posts: editPrivatePosts,
        allow_stranger_friend_request: editAllowStrangerFriend,
      })
      setProfile(res.data)
      setEditing(false)
      toast({ type: 'success', title: t('common.save') })
    } catch (e) {
      toast({ type: 'error', title: e instanceof Error ? e.message : t('common.error') })
    } finally {
      setSaving(false)
    }
  }

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const uploadRes = await uploadAvatar(file)
      const avatarUri = uploadRes.data?.url ?? uploadRes.url
      if (!avatarUri) throw new Error('Upload failed')
      const res = await updateProfile({ avatar_uri: avatarUri })
      setProfile(res.data)
      toast({ type: 'success', title: t('profile.changeAvatar') })
    } catch (err) {
      toast({ type: 'error', title: err instanceof Error ? err.message : t('common.error') })
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleLike = async (postId: string) => {
    const emojiId = await ensureLikeEmojiId()
    if (!emojiId) return
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, is_liked: !p.is_liked, likes_count: p.is_liked ? p.likes_count - 1 : p.likes_count + 1 }
          : p,
      ),
    )
    try {
      await reactPost(postId, emojiId)
    } catch {
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, is_liked: !p.is_liked, likes_count: p.is_liked ? p.likes_count - 1 : p.likes_count + 1 }
            : p,
        ),
      )
    }
  }

  const handleSavePost = async (postId: string) => {
    setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, is_saved: false } : p)))
    try {
      const res = await savePost(postId)
      if (res.action === 'removed') {
        setPosts((prev) => prev.filter((p) => p.id !== postId))
      }
    } catch (e) {
      setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, is_saved: true } : p)))
      toast({ type: 'error', title: e instanceof Error ? e.message : t('common.error') })
    }
  }

  const handleFollow = async (userId: string) => {
    setPosts((prev) =>
      prev.map((p) => (p.user_id === userId ? { ...p, is_following: true } : p)),
    )
    try {
      await ctxFollowUser(userId)
    } catch {
      setPosts((prev) =>
        prev.map((p) => (p.user_id === userId ? { ...p, is_following: false } : p)),
      )
    }
  }

  const openModal = async (type: 'followers' | 'following') => {
    if (!userID) return
    setModalType(type)
    setModalList([])
    setModalPage(1)
    setModalHasMore(true)
    setModalSearch('')
    setModalLoading(true)
    try {
      const fn = type === 'followers' ? getFollowers : getFollowing
      const res = await fn(userID, 1, 20)
      setModalList(res.data)
      setModalHasMore(res.has_more)
    } catch {
      toast({ type: 'error', title: t('common.error') })
    } finally {
      setModalLoading(false)
    }
  }

  const loadMoreModal = async () => {
    if (!userID || modalLoading || !modalHasMore) return
    setModalLoading(true)
    try {
      const fn = modalType === 'followers' ? getFollowers : getFollowing
      const res = await fn(userID, modalPage + 1, 20)
      setModalList((prev) => [...prev, ...res.data])
      setModalPage((prev) => prev + 1)
      setModalHasMore(res.has_more)
    } catch {
      toast({ type: 'error', title: t('common.error') })
    } finally {
      setModalLoading(false)
    }
  }

  if (initializing) return <div className={styles.page} />
  if (!isAuthenticated) {
    router.push('/login')
    return <div className={styles.page} />
  }

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.headerCard}>
          <div className={styles.headerTop}>
            <div className={`${styles.avatarWrap} ${styles.skeletonAvatar}`} />
            <div className={styles.userInfo}>
              <div className={`${styles.skeletonLine} ${styles.skeletonLineWide}`} />
              <div className={`${styles.skeletonLine} ${styles.skeletonLineMedium}`} />
            </div>
          </div>
          <div className={styles.skeletonActions}>
            <div className={`${styles.skeletonLine} ${styles.skeletonLineShort}`} />
            <div className={`${styles.skeletonLine} ${styles.skeletonLineShort}`} />
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingWrap}>
          <p>{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.headerCard}>
        <div className={styles.headerTop}>
          <div className={styles.avatarWrap} onClick={handleAvatarClick}>
            <Image
              className={styles.avatar}
              src={profile?.avatar_uri || '/default-avatar.svg'}
              alt={profile?.display_name || ''}
              width={96}
              height={96}
              unoptimized
            />
            <div className={styles.avatarOverlay}>
              <span className={styles.avatarOverlayIcon}><i className="bx bx-camera" /></span>
              <span className={styles.avatarOverlayText}>{t('profile.changeAvatar')}</span>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleAvatarChange}
            />
          </div>
          <div className={styles.userInfo}>
            <p className={styles.displayName}>{profile?.display_name}</p>
            {profile?.bio && <p className={styles.bio}>{profile.bio}</p>}
          </div>
        </div>

        <div className={styles.stats}>
          <div className={styles.statItem} onClick={() => openModal('followers')}>
            <span className={styles.statValue}>{stats?.follower_count ?? 0}</span>
            <span className={styles.statLabel}>{t('profile.followers')}</span>
          </div>
          <div className={styles.statItem} onClick={() => openModal('following')}>
            <span className={styles.statValue}>{stats?.following_count ?? 0}</span>
            <span className={styles.statLabel}>{t('profile.following')}</span>
          </div>
        </div>

        {!editing && (
          <div className={styles.actionRow}>
            <button className={styles.editBtn} onClick={handleEdit}>
              <i className="bx bx-edit" /> {t('profile.editProfile')}
            </button>
            <Link href="/settings" className={styles.settingsBtn}>
              <i className="bx bx-cog" /> {t('nav.settings')}
            </Link>
          </div>
        )}

        {editing && (
          <div className={styles.editForm}>
            <label className={styles.fieldLabel}>{t('profile.editDisplayName')}</label>
            <input
              className={styles.input}
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              maxLength={50}
            />
            <label className={styles.fieldLabel}>{t('profile.editBio')}</label>
            <textarea
              className={`${styles.input} ${styles.textarea}`}
              value={editBio}
              onChange={(e) => setEditBio(e.target.value)}
              maxLength={200}
            />

            <div className={styles.privacySection}>
              <span className={styles.privacyTitle}>{t('profile.privacySection')}</span>

              <div className={styles.settingRow}>
                <div className={styles.settingInfo}>
                  <span className={styles.settingLabel}>{t('profile.privateProfile')}</span>
                  <span className={styles.settingHint}>{t('profile.privateProfileHint')}</span>
                </div>
                <label className={styles.toggle}>
                  <input
                    type="checkbox"
                    checked={editPrivateProfile}
                    onChange={(e) => setEditPrivateProfile(e.target.checked)}
                  />
                  <span className={styles.toggleTrack}>
                    <span className={styles.toggleThumb} />
                  </span>
                </label>
              </div>

              <div className={styles.settingRow}>
                <div className={styles.settingInfo}>
                  <span className={styles.settingLabel}>{t('profile.privatePosts')}</span>
                  <span className={styles.settingHint}>{t('profile.privatePostsHint')}</span>
                </div>
                <label className={styles.toggle}>
                  <input
                    type="checkbox"
                    checked={editPrivatePosts}
                    onChange={(e) => setEditPrivatePosts(e.target.checked)}
                  />
                  <span className={styles.toggleTrack}>
                    <span className={styles.toggleThumb} />
                  </span>
                </label>
              </div>

              <div className={styles.settingRow}>
                <div className={styles.settingInfo}>
                  <span className={styles.settingLabel}>{t('profile.allowStrangerFriend')}</span>
                  <span className={styles.settingHint}>{t('profile.allowStrangerFriendHint')}</span>
                </div>
                <label className={styles.toggle}>
                  <input
                    type="checkbox"
                    checked={editAllowStrangerFriend}
                    onChange={(e) => setEditAllowStrangerFriend(e.target.checked)}
                  />
                  <span className={styles.toggleTrack}>
                    <span className={styles.toggleThumb} />
                  </span>
                </label>
              </div>
            </div>

            <div className={styles.editActions}>
              <button className={styles.cancelBtn} onClick={handleCancel}>{t('common.cancel')}</button>
              <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
                {saving ? t('common.loading') : t('profile.saveChanges')}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className={styles.postsSection}>
        <h2 className={styles.postsSectionTitle}>{t('profile.myPosts')}</h2>
        <div className={styles.postsList}>
          {!postsLoading && postsError && posts.length === 0 && (
            <div className={styles.loadingWrap}>
              <p>{postsError}</p>
            </div>
          )}

          {!postsLoading && !postsError && posts.length === 0 && (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}><i className="bx bx-file" /></span>
              <p className={styles.emptyText}>{t('profile.noPosts')}</p>
            </div>
          )}

          {posts.map((post) => (
            <div key={post.id} className={styles.postItem}>
              <PostCard
                post={post}
                onLike={handleLike}
                onSave={handleSavePost}
                onComment={(id) => setSelectedPostId(id)}
                onShare={(id) => setSelectedPostId(id)}
                onFollow={handleFollow}
                onOpenDetail={setSelectedPostId}
              />
            </div>
          ))}

          {postsLoading && (
            <div className={styles.loadingWrap}>
              <div className={styles.loadingSpinner} />
              <span>{t('profile.loadingPosts')}</span>
            </div>
          )}

          {!hasMore && posts.length > 0 && (
            <div className={styles.loadingWrap}>
              <span style={{ color: 'var(--color-text-secondary)' }}>—</span>
            </div>
          )}

          <div ref={sentinelRef} />
        </div>
      </div>

      {modalType && (() => {
        const q = modalSearch.toLowerCase()
        const filteredList = q
          ? modalList.filter((u) => u.display_name.toLowerCase().includes(q) || u.username.toLowerCase().includes(q))
          : modalList
        return (
          <div className={styles.overlay} onClick={() => setModalType(null)}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h3 className={styles.modalTitle}>
                  {modalType === 'followers' ? t('profile.followersList') : t('profile.followingList')}
                </h3>
                <button className={styles.modalClose} onClick={() => setModalType(null)}>
                  <i className="bx bx-x" />
                </button>
              </div>
              <div className={styles.modalSearchWrap}>
                <i className="bx bx-search" />
                <input
                  className={styles.modalSearch}
                  type="text"
                  placeholder={t('profile.searchPlaceholder')}
                  value={modalSearch}
                  onChange={(e) => setModalSearch(e.target.value)}
                />
              </div>
              <div className={styles.modalBody}>
                {filteredList.length === 0 && !modalLoading && (
                  <div className={styles.followEmpty}>
                    {modalSearch ? t('profile.noResults') : (modalType === 'followers' ? t('profile.followers') : t('profile.following'))}
                  </div>
                )}
                {filteredList.map((user) => (
                  <div
                    key={user.user_id}
                    className={styles.followItem}
                    onClick={() => {
                      setModalType(null)
                      router.push(`/profile/${user.user_id}`)
                    }}
                  >
                    <Image
                      className={styles.followAvatar}
                      src={user.avatar_uri || '/default-avatar.svg'}
                      alt={user.display_name}
                      width={40}
                      height={40}
                      unoptimized
                    />
                    <div className={styles.followInfo}>
                      <span className={styles.followName}>{user.display_name}</span>
                      <span className={styles.followUsername}>@{user.username}</span>
                    </div>
                  </div>
                ))}
                {modalHasMore && filteredList.length > 0 && (
                  <div className={styles.loadingWrap} onClick={loadMoreModal} style={{ cursor: 'pointer' }}>
                    {modalLoading ? <div className={styles.loadingSpinner} /> : <span>{t('common.nextPage')}</span>}
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })()}

      {selectedPostId && (() => {
        const detailPost = posts.find((p) => p.id === selectedPostId)
        return detailPost ? (
          <PostDetailModal
            key={detailPost.id}
            post={detailPost}
            open
            onClose={() => setSelectedPostId(null)}
            onUpdated={(updated) =>
              setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
            }
            onDeleted={(postId) => setPosts((prev) => prev.filter((p) => p.id !== postId))}
          />
        ) : null
      })()}
    </div>
  )
}

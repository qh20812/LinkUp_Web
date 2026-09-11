'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslation } from '../../hooks/useTranslation'
import { getSharedContent, getGroupSharedContent } from '../../api/chats'
import ExternalImage from '../ExternalImage'
import type {
  SharedContent,
  SharedMediaItem,
  SharedFileItem,
  SharedLinkItem,
  SharedPostItem,
  ChatPartner,
} from '../../types'
import styles from './ChatDetailSidebar.module.css'

interface ChatDetailSidebarProps {
  open: boolean
  onClose: () => void
  chatId: string
  mode: 'direct' | 'group'
  partner?: ChatPartner | null
  groupName?: string
  groupAvatarUri?: string
  memberCount?: number
  members?: Map<string, { display_name: string; avatar_uri: string }>
  onSearch?: () => void
  onBackground?: () => void
  onGroupSettings?: () => void
  onDeleteChat?: () => void
}

type TabKey = 'media' | 'files' | 'links' | 'posts' | 'members'

const PAGE_SIZE = 30

function getFileIcon(fileType: string): string {
  if (fileType.includes('pdf')) return 'bx-file-pdf'
  if (fileType.includes('word') || fileType.includes('document')) return 'bx-file-blank'
  if (fileType.includes('sheet') || fileType.includes('excel')) return 'bx-file'
  if (fileType.includes('presentation') || fileType.includes('powerpoint')) return 'bx-slider'
  if (fileType.includes('zip') || fileType.includes('rar') || fileType.includes('7z')) return 'bx-file-archive'
  if (fileType.includes('text')) return 'bx-message-square'
  return 'bx-file'
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

export default function ChatDetailSidebar({
  open,
  onClose,
  chatId,
  mode,
  partner,
  groupName,
  groupAvatarUri,
  memberCount,
  members,
  onSearch,
  onBackground,
  onGroupSettings,
  onDeleteChat,
}: ChatDetailSidebarProps) {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<TabKey>('media')
  const [sharedContent, setSharedContent] = useState<SharedContent | null>(null)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const bodyRef = useRef<HTMLDivElement>(null)
  const prevOpenRef = useRef(open)

  const tabs: { key: TabKey; icon: string; label: string }[] = [
    { key: 'media', icon: 'bx-image', label: t('chat.sharedMedia') },
    { key: 'files', icon: 'bx-file', label: t('chat.sharedFiles') },
    { key: 'links', icon: 'bx-link', label: t('chat.sharedLinks') },
    { key: 'posts', icon: 'bx-message-rounded', label: t('chat.sharedPosts') },
    ...(mode === 'group' ? [{ key: 'members' as TabKey, icon: 'bx-group', label: t('chat.members') }] : []),
  ]

  const fetchContent = useCallback(
    async (tab: TabKey, pageNum: number, append: boolean) => {
      if (tab === 'members') return
      setLoading(true)
      try {
        const fetcher = mode === 'group' ? getGroupSharedContent : getSharedContent
        const res = await fetcher(chatId, tab, pageNum * PAGE_SIZE, PAGE_SIZE)
        const data = res.data
        setSharedContent((prev) => {
          if (!append) return data
          return {
            media: [...(prev?.media ?? []), ...data.media],
            files: [...(prev?.files ?? []), ...data.files],
            links: [...(prev?.links ?? []), ...data.links],
            posts: [...(prev?.posts ?? []), ...data.posts],
          }
        })
        const tabData = data[tab as keyof SharedContent]
        if (Array.isArray(tabData)) {
          setHasMore(tabData.length >= PAGE_SIZE)
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false)
      }
    },
    [chatId, mode],
  )

  useEffect(() => {
    if (!open) {
      prevOpenRef.current = false
      return
    }
    if (!prevOpenRef.current) {
      setActiveTab('media')
      setPage(0)
      setHasMore(true)
      setSharedContent(null)
      fetchContent('media', 0, false)
    }
    prevOpenRef.current = true
  }, [open, chatId, fetchContent])

  const handleTabChange = useCallback(
    (tab: TabKey) => {
      setActiveTab(tab)
      setPage(0)
      setHasMore(true)
      if (tab !== 'members') {
        fetchContent(tab, 0, false)
      }
    },
    [fetchContent],
  )

  const handleScroll = useCallback(() => {
    const el = bodyRef.current
    if (!el || loading || !hasMore || activeTab === 'members') return
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 100) {
      const nextPage = page + 1
      setPage(nextPage)
      fetchContent(activeTab, nextPage, true)
    }
  }, [loading, hasMore, activeTab, page, fetchContent])

  const handleAction = useCallback(
    (action?: () => void) => {
      onClose()
      action?.()
    },
    [onClose],
  )

  const avatarSrc = mode === 'group' ? groupAvatarUri : partner?.avatar_uri
  const displayName = mode === 'group' ? (groupName || t('chat.groupChat')) : (partner?.display_name || t('chat.unknown'))
  const subtitle = mode === 'group'
    ? (memberCount != null ? `${memberCount} ${t('chat.members')}` : '')
    : (partner?.is_online ? t('chat.online') : t('chat.offline'))

  return (
    <div className={`${styles.overlay} ${open ? styles.overlayOpen : ''}`} onClick={onClose}>
      <div className={styles.sidebar} onClick={(e) => e.stopPropagation()}>
        <div className={styles.sidebarHeader}>
          <button className={styles.backBtn} onClick={onClose}>
            <i className="bx bx-x" />
          </button>
          <span className={styles.headerTitle}>{t('chat.chatDetail')}</span>
        </div>

        <div className={styles.profileSection}>
          <div className={styles.avatarWrap}>
            {avatarSrc ? (
              <ExternalImage src={avatarSrc} alt="" className={styles.avatar} />
            ) : (
              <div className={styles.avatarPlaceholder}>
                <i className="bx bxs-user" />
              </div>
            )}
          </div>
          <span className={styles.displayName}>{displayName}</span>
          <span className={styles.subtitle}>{subtitle}</span>
        </div>

        <div className={styles.quickActions}>
          {onSearch && (
            <button className={styles.quickActionBtn} onClick={() => handleAction(onSearch)}>
              <i className="bx bx-search" />
              <span>{t('chat.searchMessages')}</span>
            </button>
          )}
          {mode === 'direct' && onBackground && (
            <button className={styles.quickActionBtn} onClick={() => handleAction(onBackground)}>
              <i className="bx bx-palette" />
              <span>{t('chat.background')}</span>
            </button>
          )}
          {mode === 'group' && onGroupSettings && (
            <button className={styles.quickActionBtn} onClick={() => handleAction(onGroupSettings)}>
              <i className="bx bx-cog" />
              <span>{t('chat.groupSettings')}</span>
            </button>
          )}
          {onDeleteChat && (
            <button className={`${styles.quickActionBtn} ${styles.quickActionDanger}`} onClick={() => handleAction(onDeleteChat)}>
              <i className="bx bx-trash" />
              <span>{t('chat.deleteChat')}</span>
            </button>
          )}
        </div>

        <div className={styles.tabs}>
          {tabs.map((tab) => (
            <button
              key={tab.key}
              className={`${styles.tab} ${activeTab === tab.key ? styles.tabActive : ''}`}
              onClick={() => handleTabChange(tab.key)}
            >
              <i className={`bx ${tab.icon}`} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <div className={styles.sidebarBody} ref={bodyRef} onScroll={handleScroll}>
          {activeTab === 'members' ? (
            <MembersTab members={members} />
          ) : (
            <>
              {activeTab === 'media' && (
                <MediaTab media={sharedContent?.media ?? []} />
              )}
              {activeTab === 'files' && (
                <FilesTab files={sharedContent?.files ?? []} />
              )}
              {activeTab === 'links' && (
                <LinksTab links={sharedContent?.links ?? []} />
              )}
              {activeTab === 'posts' && (
                <PostsTab posts={sharedContent?.posts ?? []} />
              )}
              {loading && (
                <div className={styles.loadingWrap}>
                  <div className={styles.spinner} />
                </div>
              )}
              {!loading && sharedContent && !hasMore && (
                <div className={styles.emptyState}>
                  {t(`chat.no${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}`) || t('chat.noMedia')}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function MediaTab({ media }: { media: SharedMediaItem[] }) {
  if (media.length === 0) return <EmptyState type="media" />
  return (
    <div className={styles.mediaGrid}>
      {media.map((item) => (
        <div key={item.media_id} className={styles.mediaItem}>
          {item.file_type.startsWith('video/') ? (
            <div className={styles.videoThumb}>
              <video src={item.file_uri} muted preload="metadata" />
              <div className={styles.playIcon}>
                <i className="bx bx-play" />
              </div>
            </div>
          ) : (
            <img src={item.file_uri} alt="" loading="lazy" />
          )}
        </div>
      ))}
    </div>
  )
}

function FilesTab({ files }: { files: SharedFileItem[] }) {
  if (files.length === 0) return <EmptyState type="files" />
  return (
    <div className={styles.fileList}>
      {files.map((item) => (
        <a key={item.media_id} href={item.file_uri} download className={styles.fileItem}>
          <i className={`bx ${getFileIcon(item.file_type)} ${styles.fileIcon}`} />
          <div className={styles.fileInfo}>
            <span className={styles.fileName}>{item.file_name}</span>
            <span className={styles.fileSize}>{formatFileSize(item.file_size)}</span>
          </div>
        </a>
      ))}
    </div>
  )
}

function LinksTab({ links }: { links: SharedLinkItem[] }) {
  if (links.length === 0) return <EmptyState type="links" />
  return (
    <div className={styles.linkList}>
      {links.map((item) => {
        let domain = ''
        try {
          domain = new URL(item.url).hostname
        } catch {
          return null
        }
        return (
          <a key={item.message_id} href={item.url} target="_blank" rel="noopener noreferrer" className={styles.linkItem}>
            <img
              src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
              alt=""
              className={styles.favicon}
            />
            <div className={styles.linkInfo}>
              <span className={styles.linkDomain}>{domain}</span>
              <span className={styles.linkUrl}>{item.url}</span>
            </div>
          </a>
        )
      })}
    </div>
  )
}

function PostsTab({ posts }: { posts: SharedPostItem[] }) {
  const { t } = useTranslation()
  if (posts.length === 0) return <EmptyState type="posts" />
  return (
    <div className={styles.postList}>
      {posts.map((item) => (
        <div key={item.message_id} className={styles.postItem}>
          <div className={styles.postIcon}>
            <i className="bx bx-message-rounded" />
          </div>
          <div className={styles.postInfo}>
            <span className={styles.postContent}>
              {item.post_content.length > 80
                ? `${item.post_content.slice(0, 80)}...`
                : item.post_content}
            </span>
            <span className={styles.postMeta}>
              {item.post_author_id && `${t('chat.sharedPosts')} · `}
              {new Date(item.created_at).toLocaleDateString('vi-VN')}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

function MembersTab({ members }: { members?: Map<string, { display_name: string; avatar_uri: string }> }) {
  const { t } = useTranslation()
  if (!members || members.size === 0) {
    return (
      <div className={styles.emptyWrap}>
        <i className={`bx bx-group ${styles.emptyIcon}`} />
        <span>{t('chat.members')}</span>
      </div>
    )
  }
  return (
    <div className={styles.memberList}>
      {Array.from(members.entries()).map(([userId, member]) => (
        <div key={userId} className={styles.memberItem}>
          <ExternalImage src={member.avatar_uri} alt="" className={styles.memberAvatar} />
          <span className={styles.memberName}>{member.display_name}</span>
        </div>
      ))}
    </div>
  )
}

function EmptyState({ type }: { type: string }) {
  const { t } = useTranslation()
  const key = `chat.no${type.charAt(0).toUpperCase() + type.slice(1)}`
  return (
    <div className={styles.emptyWrap}>
      <i className={`bx ${type === 'media' ? 'bx-image' : type === 'files' ? 'bx-file' : type === 'links' ? 'bx-link' : 'bx-message-rounded'} ${styles.emptyIcon}`} />
      <span>{t(key) || t('chat.noMedia')}</span>
    </div>
  )
}

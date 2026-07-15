'use client'

import React, { useState, useEffect } from 'react'
import { useTranslation } from '../../../hooks/useTranslation'
import { useToast } from '../../../contexts/ToastContext'
import { getPosts, updatePostStatus, hidePost } from '../../../api/admin'
import type { AdminPostListItem } from '../../../types'
import styles from './Posts.module.css'

export default function PostsPage() {
  const { t } = useTranslation()
  const { toast } = useToast()

  // State Management
  const [posts, setPosts] = useState<any[]>([]) // Sử dụng cấu trúc Post đã đồng bộ từ API
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)

  // Detail Modal & Action States
  const [selectedPost, setSelectedPost] = useState<any | null>(null)
  const [reasonModalOpen, setReasonModalOpen] = useState(false)
  const [hideReason, setHideReason] = useState('')
  const [postToHide, setPostToHide] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 500)
    return () => clearTimeout(timer)
  }, [search])

  // Fetch Posts Data
  const fetchPosts = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await getPosts(page, pageSize, debouncedSearch)
      // Giả định API trả về đúng schema dạng { posts: [...], total: 100 }
      setPosts(response.posts || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPosts()
  }, [page, debouncedSearch])

  // Toggle Status (Public <-> Hidden)
  const handleToggleStatus = async (post: any) => {
    setActionLoading(true)
    try {
      const nextStatus = post.status === 'public' ? 'hidden' : 'public'
      await updatePostStatus(post.id, nextStatus)
      toast({ title: t('common.save'), type: 'success' })
      fetchPosts()
      if (selectedPost?.id === post.id) {
        setSelectedPost({ ...selectedPost, status: nextStatus })
      }
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : t('common.error'), type: 'error' })
    } finally {
      setActionLoading(false)
    }
  }

  // Handle Hide Post with Reason
  const openHideReasonModal = (id: string) => {
    setPostToHide(id)
    setHideReason('')
    setReasonModalOpen(true)
  }

  const handleConfirmHide = async () => {
    if (!postToHide || !hideReason.trim()) return
    setActionLoading(true)
    try {
      await hidePost(postToHide, hideReason)
      toast({ title: t('common.save'), type: 'success' })
      setReasonModalOpen(false)
      fetchPosts()
      if (selectedPost?.id === postToHide) {
        setSelectedPost({ ...selectedPost, status: 'hidden' })
      }
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : t('common.error'), type: 'error' })
    } finally {
      setActionLoading(false)
    }
  }

  // Format Helper
  const formatDateTime = (iso: string): string => {
    try {
      const d = new Date(iso)
      return `${d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })} ${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`
    } catch {
      return iso
    }
  }

  const getStatusClass = (status: string) => {
    const map: Record<string, string> = {
      public: styles.badgePublic,
      active: styles.badgePublic,
      private: styles.badgePrivate,
      hidden: styles.badgeHidden,
      friend: styles.badgeFriend,
    }
    return map[status] ?? ''
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>{t('posts.title')}</h1>
        <div className={styles.searchBar}>
          <i className="bx bx-search" />
          <input
            type="text"
            placeholder={t('common.search')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </header>

      {error && (
        <div className={styles.errorCard}>
          <i className="bx bx-error-circle" />
          <p>{error}</p>
        </div>
      )}

      {/* Main Table View */}
      <div className={styles.tableWrap}>
        <table className={styles.mainTable}>
          <thead>
            <tr>
              <th>Bài viết</th>
              <th>Tác giả</th>
              <th>Trạng thái</th>
              <th>Tương tác</th>
              <th>Ngày tạo</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, idx) => (
                <tr key={idx} className={styles.skeletonRow}>
                  <td colSpan={6}><div className={styles.skeletonBar} /></td>
                </tr>
              ))
            ) : posts.length > 0 ? (
              posts.map((post) => (
                <tr key={post.id}>
                  <td className={styles.postTitleCell}>
                    <span className={styles.postTitle}>{post.title || 'Không có tiêu đề'}</span>
                    <span className={styles.postSnippet}>{post.content?.substring(0, 60)}...</span>
                  </td>
                  <td className={styles.authorCell}>
                    <span className={styles.userId}>ID: {post.user_id?.substring(0, 8)}...</span>
                  </td>
                  <td>
                    <span className={`${styles.badge} ${getStatusClass(post.status)}`}>
                      {post.status}
                    </span>
                  </td>
                  <td>
                    <div className={styles.interactions}>
                      <span><i className="bx bx-heart" /> {post.likes_count ?? 0}</span>
                      <span><i className="bx bx-comment" /> {post.comments_count ?? 0}</span>
                      <span><i className="bx bx-share" /> {post.shares_count ?? 0}</span>
                    </div>
                  </td>
                  <td className={styles.dateCell}>{formatDateTime(post.created_at)}</td>
                  <td>
                    <div className={styles.actionButtons}>
                      <button className={styles.btnView} onClick={() => setSelectedPost(post)} title="Xem chi tiết">
                        <i className="bx bx-show" />
                      </button>
                      <button 
                        className={post.status === 'hidden' ? styles.btnUnhide : styles.btnHide} 
                        onClick={() => post.status === 'hidden' ? handleToggleStatus(post) : openHideReasonModal(post.id)}
                        disabled={actionLoading}
                        title={post.status === 'hidden' ? 'Hiện bài đăng' : 'Ẩn bài đăng'}
                      >
                        <i className={post.status === 'hidden' ? 'bx bx-lock-open-alt' : 'bx bx-lock-alt'} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className={styles.emptyCell}>Không tìm thấy bài viết nào.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div className={styles.pagination}>
        <button disabled={page === 1 || loading} onClick={() => setPage(p => Math.max(p - 1, 1))}>
          <i className="bx bx-chevron-left" /> Previous
        </button>
        <span className={styles.pageIndicator}>Trang {page}</span>
        <button disabled={posts.length < pageSize || loading} onClick={() => setPage(p => p + 1)}>
          Next <i className="bx bx-chevron-right" />
        </button>
      </div>

      {/* 2-Column Detail Modal */}
      {selectedPost && (
        <div className={styles.overlay} onClick={() => setSelectedPost(null)}>
          <div className={styles.modalDetail} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Chi tiết bài đăng</h3>
              <button className={styles.modalClose} onClick={() => setSelectedPost(null)}>
                <i className="bx bx-x" />
              </button>
            </div>
            
            <div className={styles.modalBodyGrid}>
              {/* Left Column: Content Details */}
              <div className={styles.modalColLeft}>
                <h2 className={styles.detailTitle}>{selectedPost.title || 'Không có tiêu đề'}</h2>
                <div className={styles.detailMetadataMobile}>
                  <span>ID: {selectedPost.id}</span>
                  <span>Tác giả: {selectedPost.user_id}</span>
                </div>
                <p className={styles.detailContent}>{selectedPost.content}</p>
                
                {selectedPost.community_id && (
                  <div className={styles.communityTag}>
                    <i className="bx bx-world" /> Cộng đồng: {selectedPost.community_id}
                  </div>
                )}
              </div>

              {/* Right Column: Analytics & Quick Actions */}
              <div className={styles.modalColRight}>
                <div className={styles.infoCard}>
                  <h4><i className="bx bx-info-circle" /> Thông tin hệ thống</h4>
                  <div className={styles.infoRow}>
                    <span>Bài đăng ID:</span>
                    <code>{selectedPost.id}</code>
                  </div>
                  <div className={styles.infoRow}>
                    <span>Tác giả ID:</span>
                    <code>{selectedPost.user_id}</code>
                  </div>
                  <div className={styles.infoRow}>
                    <span>Ngày tạo:</span>
                    <span>{formatDateTime(selectedPost.created_at)}</span>
                  </div>
                  <div className={styles.infoRow}>
                    <span>Trạng thái:</span>
                    <span className={`${styles.badge} ${getStatusClass(selectedPost.status)}`}>
                      {selectedPost.status}
                    </span>
                  </div>
                </div>

                <div className={styles.infoCard}>
                  <h4><i className="bx bx-bar-chart-alt-2" /> Thống kê tương tác</h4>
                  <div className={styles.statsMetricsGrid}>
                    <div className={styles.metricItem}>
                      <i className="bx bx-show-alt" style={{ color: 'var(--color-primary)' }} />
                      <div className={styles.metricVal}>{selectedPost.views_count ?? 0}</div>
                      <div className={styles.metricLabel}>Lượt xem</div>
                    </div>
                    <div className={styles.metricItem}>
                      <i className="bx bx-heart" style={{ color: '#ff4d4f' }} />
                      <div className={styles.metricVal}>{selectedPost.likes_count ?? 0}</div>
                      <div className={styles.metricLabel}>Yêu thích</div>
                    </div>
                    <div className={styles.metricItem}>
                      <i className="bx bx-comment" style={{ color: 'var(--color-accent)' }} />
                      <div className={styles.metricVal}>{selectedPost.comments_count ?? 0}</div>
                      <div className={styles.metricLabel}>Bình luận</div>
                    </div>
                    <div className={styles.metricItem}>
                      <i className="bx bx-share" style={{ color: '#722ed1' }} />
                      <div className={styles.metricVal}>{selectedPost.shares_count ?? 0}</div>
                      <div className={styles.metricLabel}>Chia sẻ</div>
                    </div>
                  </div>
                </div>

                <div className={styles.actionsPanel}>
                  <button 
                    className={selectedPost.status === 'hidden' ? styles.btnActionActive : styles.btnActionDanger}
                    onClick={() => selectedPost.status === 'hidden' ? handleToggleStatus(selectedPost) : openHideReasonModal(selectedPost.id)}
                    disabled={actionLoading}
                  >
                    <i className={selectedPost.status === 'hidden' ? 'bx bx-lock-open-alt' : 'bx bx-lock-alt'} />
                    {selectedPost.status === 'hidden' ? 'Công khai bài viết này' : 'Ẩn bài viết hệ thống'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hide Post Reason Modal */}
      {reasonModalOpen && (
        <div className={styles.overlay} onClick={() => setReasonModalOpen(false)}>
          <div className={styles.reasonModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Lý do ẩn bài đăng</h3>
              <button className={styles.modalClose} onClick={() => setReasonModalOpen(false)}>
                <i className="bx bx-x" />
              </button>
            </div>
            <div className={styles.modalBody}>
              <textarea
                placeholder="Nhập lý do ẩn bài viết này (Gửi thông báo tới người dùng)..."
                className={styles.reasonInput}
                value={hideReason}
                onChange={(e) => setHideReason(e.target.value)}
                rows={4}
              />
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.btnCancel} onClick={() => setReasonModalOpen(false)} disabled={actionLoading}>
                {t('common.cancel')}
              </button>
              <button 
                className={styles.btnSubmit} 
                onClick={handleConfirmHide}
                disabled={!hideReason.trim() || actionLoading}
              >
                {actionLoading ? t('common.loading') : t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
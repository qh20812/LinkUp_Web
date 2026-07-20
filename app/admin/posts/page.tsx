"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useTranslation } from "../../../hooks/useTranslation";
import { useToast } from "../../../contexts/ToastContext";
import { getPosts, updatePostStatus, hidePost } from "../../../api/admin";
import type {
  AdminPostListItem,
  AdminPostListResponse,
  AdminHidePostInput,
} from "../../../types";
import styles from "./Posts.module.css";

function getUserRoleFromToken(): string | null {
  try {
    const token = localStorage.getItem('token')
    if (!token) return null
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.role || null
  } catch {
    return null
  }
}

export default function PostsPage() {
  const { t, language } = useTranslation();
  const { toast } = useToast();

  const [posts, setPosts] = useState<AdminPostListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [userRole] = useState<string | null>(() => getUserRoleFromToken());
  const canMutate = userRole === null || userRole === 'SUPER_ADMIN';
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuStyle, setMenuStyle] = useState<{
    top: number;
    left: number;
  } | null>(null);

  const [detailTarget, setDetailTarget] = useState<AdminPostListItem | null>(
    null
  );
  const [hideTarget, setHideTarget] = useState<AdminPostListItem | null>(null);
  const [hideReason, setHideReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const res: AdminPostListResponse = await getPosts(
          page,
          pageSize,
          keyword || undefined,
          statusFilter || undefined
        );
        if (!cancelled) {
          setPosts(res.posts ?? []);
          setTotal(res.total);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : t("common.error"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchData();
    return () => {
      cancelled = true;
    };
  }, [page, keyword, statusFilter, pageSize, t, refreshKey]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(e.target.value);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setKeyword(e.target.value);
      setPage(1);
    }, 400);
  };

  const handleStatusFilterChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    setStatusFilter(e.target.value);
    setPage(1);
  };

  const closeMenu = () => {
    setOpenMenuId(null);
    setMenuStyle(null);
  };

  useEffect(() => {
    if (!openMenuId) return;
    const handleClick = () => closeMenu();
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [openMenuId]);

  const handleStatusChange = async (postId: string, newStatus: string) => {
    setActionLoading(true);
    try {
      await updatePostStatus(postId, newStatus);
      toast({ title: t("posts.statusUpdated"), type: "success" });
      setRefreshKey((k) => k + 1);
    } catch (err) {
      toast({
        title: err instanceof Error ? err.message : t("common.error"),
        type: "error",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmHide = async () => {
    if (!hideTarget) return;
    setActionLoading(true);
    try {
      const hideInput: AdminHidePostInput = { reason: hideReason };
      await hidePost(hideTarget.id, hideInput);
      toast({ title: t("posts.hideSuccess"), type: "success" });
      setHideTarget(null);
      setHideReason("");
      setRefreshKey((k) => k + 1);
    } catch (err) {
      toast({
        title: err instanceof Error ? err.message : t("common.error"),
        type: "error",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const getPageNumbers = (): (number | string)[] => {
    const pages: (number | string)[] = [];
    pages.push(1);
    const left = Math.max(2, page - 1);
    const right = Math.min(totalPages - 1, page + 1);
    if (left > 2) pages.push("...");
    for (let i = left; i <= right; i++) pages.push(i);
    if (right < totalPages - 1) pages.push("...");
    if (totalPages > 1) pages.push(totalPages);
    return pages;
  };

  const formatDate = (iso: string): string => {
    try {
      return new Date(iso).toLocaleDateString(
        language === "vi" ? "vi-VN" : "en-US",
        { day: "2-digit", month: "2-digit", year: "numeric" }
      );
    } catch {
      return iso;
    }
  };

  const statusBadgeClass = (status: string): string => {
    const map: Record<string, string> = {
      active: styles.badgeActive,
      public: styles.badgeActive,
      hidden: styles.badgeBanned,
      pending: styles.badgeSuspended,
    };
    return map[status] ?? "";
  };

  const statusLabel = (status: string): string => {
    const map: Record<string, string> = {
      active: t("posts.active"),
      public: t("posts.active"),
      hidden: t("posts.hidden"),
      pending: t("posts.pending"),
    };
    return map[status] ?? status;
  };

  const skeletonRows = () => (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className={styles.skeletonRow}>
          <div className={styles.skeletonAvatar} />
          <div className={styles.skeletonText} />
          <div className={styles.skeletonText} />
          <div className={styles.skeletonText} />
          <div className={styles.skeletonText} />
          <div className={styles.skeletonText} />
          <div className={styles.skeletonText} />
        </div>
      ))}
    </>
  );

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>{t("posts.title")}</h1>
        <div className={styles.toolbar}>
          <div className={styles.searchWrap}>
            <i className={`bx bx-search ${styles.searchIcon}`} />
            <input
              type="text"
              className={styles.searchInput}
              placeholder={t("posts.searchPlaceholder")}
              value={searchInput}
              onChange={handleSearchChange}
            />
          </div>
          <select
            className={styles.filterSelect}
            value={statusFilter}
            onChange={handleStatusFilterChange}>
            <option value="">{t("posts.allStatuses")}</option>
            <option value="active">{t("posts.active")}</option>
            <option value="hidden">{t("posts.hidden")}</option>
          </select>
        </div>
      </div>

      <div className={styles.card}>
        {loading ? (
          skeletonRows()
        ) : error ? (
          <div className={styles.empty}>
            <i className="bx bx-error-circle" />
            <p>{error}</p>
          </div>
        ) : posts.length === 0 ? (
          <div className={styles.empty}>
            <i className="bx bx-file-blank" />
            <p>{t("common.noData")}</p>
          </div>
        ) : (
          <>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>{t("posts.author")}</th>
                  <th>{t("posts.title")}</th>
                  <th>{t("posts.content")}</th>
                  <th>{t("common.status")}</th>
                  <th>{t("posts.interactions")}</th>
                  <th>{t("common.createdAt")}</th>
                  <th>{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {posts.map((post) => (
                  <tr key={post.id}>
                    <td>
                      <div className={styles.cellUser}>
                        <Image
                          src={post.avatar_uri || "/default-avatar.png"}
                          alt=""
                          width={36}
                          height={36}
                          className={styles.avatar}
                          unoptimized
                        />
                        <div className={styles.userName}>
                          {post.display_name || post.username}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className={styles.titleCell}>
                        {post.title || t("posts.noTitle")}
                      </div>
                    </td>
                    <td>
                      <div className={styles.contentCell}>
                        {post.content ? (
                          <>
                            {post.content}
                            {post.media_uris?.length > 0 && (
                              <span className={styles.mediaCount}>
                                {" "}<i className="bx bx-image" /> {post.media_uris.length}
                              </span>
                            )}
                          </>
                        ) : post.media_uris?.length > 0 ? (
                          <div className={styles.mediaPreviewWrap}>
                            <Image
                              src={post.media_uris[0]}
                              alt=""
                              width={120}
                              height={80}
                              className={styles.mediaPreview}
                              unoptimized
                            />
                            {post.media_uris.length > 1 && (
                              <span className={styles.mediaCount}>
                                +{post.media_uris.length - 1}
                              </span>
                            )}
                          </div>
                        ) : (
                          t("posts.noContent")
                        )}
                      </div>
                    </td>
                    <td>
                      <span
                        className={`${styles.badge} ${statusBadgeClass(
                          post.status
                        )}`}>
                        {statusLabel(post.status)}
                      </span>
                    </td>
                    <td className={styles.cellDate}>
                      <i className="bx bx-heart" /> {post.likes_count} &nbsp;
                      <i className="bx bx-comment" /> {post.comments_count}
                    </td>
                    <td className={styles.cellDate}>
                      {formatDate(post.created_at)}
                    </td>
                    <td className={styles.actionsCell}>
                      <div className={styles.actionMenuWrap}>
                        <button
                          className={styles.actionsBtn}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (openMenuId === post.id) {
                              closeMenu();
                            } else {
                              const btn = e.currentTarget as HTMLElement;
                              const rect = btn.getBoundingClientRect();
                              const menuH = 130;
                              let top = rect.bottom + 4;
                              if (top + menuH > window.innerHeight)
                                top = rect.top - 4 - menuH;
                              let left = rect.right - 180;
                              if (left < 8) left = 8;
                              setMenuStyle({ top, left });
                              setOpenMenuId(post.id);
                            }
                          }}>
                          <i className="bx bx-dots-vertical-rounded" />
                        </button>
                        {openMenuId === post.id && menuStyle && (
                          <div
                            className={styles.actionMenu}
                            style={{
                              position: "fixed",
                              top: menuStyle.top,
                              left: menuStyle.left,
                              zIndex: 1000,
                            }}
                            onClick={(e) => e.stopPropagation()}>
                            <button
                              className={styles.actionMenuItem}
                              onClick={() => {
                                setDetailTarget(post);
                                closeMenu();
                              }}>
                              <i className="bx bx-show" />{" "}
                              {t("posts.viewDetail")}
                            </button>
                            {canMutate && (post.status !== "hidden" ? (
                              <button
                                className={`${styles.actionMenuItem} ${styles.actionMenuItemDanger}`}
                                onClick={() => {
                                  setHideTarget(post);
                                  closeMenu();
                                }}>
                                <i className="bx bx-hide" />{" "}
                                {t("posts.hidePost")}
                              </button>
                            ) : (
                              <button
                                className={styles.actionMenuItem}
                                disabled={actionLoading}
                                onClick={() => {
                                  handleStatusChange(post.id, "active");
                                  closeMenu();
                                }}>
                                <i className="bx bx-show-alt" />{" "}
                                {t("posts.showPost")}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div className={styles.pagination}>
                <button
                  className={styles.pageBtn}
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}>
                  <i className="bx bx-chevron-left" /> {t("common.prevPage")}
                </button>
                {getPageNumbers().map((p, i) =>
                  typeof p === "string" ? (
                    <span key={`e${i}`} className={styles.pageInfo}>
                      {p}
                    </span>
                  ) : (
                    <button
                      key={p}
                      className={`${styles.pageBtn} ${
                        p === page ? styles.pageBtnActive : ""
                      }`}
                      onClick={() => setPage(p)}>
                      {p}
                    </button>
                  )
                )}
                <button
                  className={styles.pageBtn}
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}>
                  {t("common.nextPage")} <i className="bx bx-chevron-right" />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {detailTarget && (
        <div className={styles.overlay} onClick={() => setDetailTarget(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>{t("posts.detailTitle")}</h2>
              <button
                className={styles.modalClose}
                onClick={() => setDetailTarget(null)}>
                <i className="bx bx-x" />
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>ID</span>
                <span className={styles.detailValue}>{detailTarget.id}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>{t("posts.title")}</span>
                <span className={styles.detailValue}>
                  {detailTarget.title || t("posts.noTitle")}
                </span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>{t("posts.author")}</span>
                <span className={styles.detailValue}>
                  {detailTarget.display_name || detailTarget.username}
                </span>
              </div>
              {detailTarget.content && (
                <div
                  className={styles.detailRow}
                  style={{
                    flexDirection: "column",
                    alignItems: "flex-start",
                    gap: "4px",
                  }}>
                  <span className={styles.detailLabel}>{t("posts.content")}</span>
                  <span
                    className={styles.detailValue}
                    style={{
                      textAlign: "left",
                      marginTop: "4px",
                      width: "100%",
                    }}>
                    {detailTarget.content}
                  </span>
                </div>
              )}
              {detailTarget.media_uris?.length > 0 && (
                <div className={styles.mediaRow}>
                  <span className={styles.detailLabel}>{t("posts.media")}</span>
                  <div className={styles.mediaGrid}>
                    {detailTarget.media_uris.map((uri, i) => (
                      <Image
                        key={i}
                        src={uri}
                        alt=""
                        width={200}
                        height={150}
                        className={styles.mediaItem}
                        unoptimized
                      />
                    ))}
                  </div>
                </div>
              )}
              {!detailTarget.content && (!detailTarget.media_uris || detailTarget.media_uris.length === 0) && (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>{t("posts.content")}</span>
                  <span className={styles.detailValue}>{t("posts.noContent")}</span>
                </div>
              )}
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>{t("common.status")}</span>
                <span className={styles.detailValue}>
                  <span
                    className={`${styles.badge} ${statusBadgeClass(
                      detailTarget.status
                    )}`}>
                    {statusLabel(detailTarget.status)}
                  </span>
                </span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>{t("posts.views")}</span>
                <span className={styles.detailValue}>
                  {detailTarget.views_count}
                </span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>
                  {t("posts.interactions")}
                </span>
                <span className={styles.detailValue}>
                  <span style={{ marginRight: "12px" }}>
                    <i className="bx bx-heart" /> {detailTarget.likes_count}
                  </span>
                  <span style={{ marginRight: "12px" }}>
                    <i className="bx bx-comment" />{" "}
                    {detailTarget.comments_count}
                  </span>
                  <span>
                    <i className="bx bx-share" /> {detailTarget.shares_count}
                  </span>
                </span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>
                  {t("common.createdAt")}
                </span>
                <span className={styles.detailValue}>
                  {formatDate(detailTarget.created_at)}
                </span>
              </div>
              {detailTarget.updated_at && (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>
                    {t("common.updatedAt")}
                  </span>
                  <span className={styles.detailValue}>
                    {formatDate(detailTarget.updated_at)}
                  </span>
                </div>
              )}
            </div>
            <div className={styles.modalFooter}>
              <button
                className={styles.btnCancel}
                onClick={() => setDetailTarget(null)}>
                {t("common.close")}
              </button>
            </div>
          </div>
        </div>
      )}

      {hideTarget && (
        <div
          className={styles.overlay}
          onClick={() => {
            setHideTarget(null);
            setHideReason("");
          }}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>{t("posts.hidePost")}</h2>
              <button
                className={styles.modalClose}
                onClick={() => {
                  setHideTarget(null);
                  setHideReason("");
                }}>
                <i className="bx bx-x" />
              </button>
            </div>
            <div className={styles.modalBody}>
              <p
                style={{
                  marginBottom: "var(--space-lg)",
                  color: "var(--color-text-secondary)",
                  fontSize: 14,
                }}>
                {t("posts.confirmHideMessage")}{" "}
                <strong style={{ color: "var(--color-text)" }}>
                  {hideTarget.display_name || hideTarget.username}
                </strong>
              </p>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>
                  {t("posts.hideReason")}
                </label>
                <input
                  type="text"
                  className={styles.fieldInput}
                  value={hideReason}
                  onChange={(e) => setHideReason(e.target.value)}
                  placeholder={t("posts.hideReasonPlaceholder")}
                />
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button
                className={styles.btnCancel}
                onClick={() => {
                  setHideTarget(null);
                  setHideReason("");
                }}>
                {t("common.cancel")}
              </button>
              <button
                className={styles.btnDanger}
                disabled={actionLoading || !hideReason.trim()}
                onClick={handleConfirmHide}>
                {actionLoading ? t("common.loading") : t("common.confirm")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

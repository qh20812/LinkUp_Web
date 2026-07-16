"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useTranslation } from "../../../hooks/useTranslation";
import { useToast } from "../../../contexts/ToastContext";
import {
  getGroups,
  hideGroup,
  unhideGroup,
  archiveGroup,
  warnGroup,
  deleteGroup,
} from "../../../api/admin";
import type { AdminGroupListItem } from "../../../types";
import styles from "./Groups.module.css";

export default function GroupsPage() {
  const { t, language } = useTranslation();
  const { toast } = useToast();

  // Mở rộng Type inline để khớp dữ liệu thực tế
  const [groups, setGroups] = useState<
    (AdminGroupListItem & { avatar_uri?: string })[]
  >([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuStyle, setMenuStyle] = useState<{
    top: number;
    left: number;
  } | null>(null);

  // Modals state
  const [detailTarget, setDetailTarget] = useState<
    (AdminGroupListItem & { avatar_uri?: string }) | null
  >(null);
  const [actionTarget, setActionTarget] = useState<AdminGroupListItem | null>(
    null
  );
  const [actionType, setActionType] = useState<
    "warn" | "archive" | "delete" | ""
  >("");
  const [actionReason, setActionReason] = useState("");
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
        const res = await getGroups(
          page,
          pageSize,
          keyword || undefined,
          statusFilter || undefined
        );
        if (!cancelled) {
          setGroups(res.groups ?? []);
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

  const handleToggleHide = async (group: AdminGroupListItem) => {
    setActionLoading(true);
    try {
      const isHidden = group.status === "hidden";
      if (isHidden) {
        await unhideGroup(group.id, { reason: "Unhide" });
      } else {
        await hideGroup(group.id, { reason: "Hide" });
      }
      toast({ title: t("groups.statusUpdated"), type: "success" });
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

  const executeModalAction = async () => {
    if (!actionTarget) return;
    setActionLoading(true);
    try {
      if (actionType === "warn") {
        await warnGroup(actionTarget.id, { reason: actionReason } as any);
        toast({ title: t("groups.warnSuccess"), type: "success" });
      } else if (actionType === "archive") {
        await archiveGroup(actionTarget.id, { reason: "Archive" });
        toast({ title: t("groups.archiveSuccess"), type: "success" });
      } else if (actionType === "delete") {
        await deleteGroup(actionTarget.id, { reason: "Delete" });
        toast({ title: t("groups.deleteSuccess"), type: "success" });
      }
      setActionTarget(null);
      setActionType("");
      setActionReason("");
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
      archived: styles.badgeSuspended,
      hidden: styles.badgeBanned,
      warned: styles.badgeSuspended,
    };
    return map[status] ?? "";
  };

  const statusLabel = (status: string): string => {
    const map: Record<string, string> = {
      active: t("groups.active"),
      archived: t("groups.archived"),
      hidden: t("groups.hidden"),
      warned: t("groups.warned"),
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
        </div>
      ))}
    </>
  );

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>{t("groups.title")}</h1>
        <div className={styles.toolbar}>
          <div className={styles.searchWrap}>
            <i className={`bx bx-search ${styles.searchIcon}`} />
            <input
              type="text"
              className={styles.searchInput}
              placeholder={t("groups.searchPlaceholder")}
              value={searchInput}
              onChange={handleSearchChange}
            />
          </div>
          <select
            className={styles.filterSelect}
            value={statusFilter}
            onChange={handleStatusFilterChange}>
            <option value="">{t("groups.allStatuses")}</option>
            <option value="active">{t("groups.active")}</option>
            <option value="archived">{t("groups.archived")}</option>
            <option value="hidden">{t("groups.hidden")}</option>
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
        ) : groups.length === 0 ? (
          <div className={styles.empty}>
            <i className="bx bx-group" />
            <p>{t("common.noData")}</p>
          </div>
        ) : (
          <>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>{t("groups.name")}</th>
                  <th>{t("groups.creator")}</th>
                  <th>{t("groups.members")}</th>
                  <th>{t("common.status")}</th>
                  <th>{t("common.createdAt")}</th>
                  <th>{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((group) => (
                  <tr key={group.id}>
                    <td>
                      <div className={styles.cellUser}>
                        <Image
                          src={group.avatar_uri || "/default-avatar.png"}
                          alt=""
                          width={36}
                          height={36}
                          className={styles.avatar}
                          unoptimized
                        />
                        <div>
                          <div className={styles.userName}>
                            {group.name || t("groups.noName")}
                          </div>
                          <div className={styles.userEmail}>
                            ID: {group.id.substring(0, 8)}...
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div>
                        <div className={styles.userName}>
                          {group.creator_name || t("groups.system")}
                        </div>
                      </div>
                    </td>
                    <td className={styles.cellDate}>
                      <i className="bx bx-user" /> {group.member_count}
                    </td>
                    <td>
                      <span
                        className={`${styles.badge} ${statusBadgeClass(
                          group.status
                        )}`}>
                        {statusLabel(group.status)}
                      </span>
                    </td>
                    <td className={styles.cellDate}>
                      {formatDate(group.created_at)}
                    </td>
                    <td className={styles.actionsCell}>
                      <div className={styles.actionMenuWrap}>
                        <button
                          className={styles.actionsBtn}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (openMenuId === group.id) {
                              closeMenu();
                            } else {
                              const btn = e.currentTarget as HTMLElement;
                              const rect = btn.getBoundingClientRect();
                              const menuH = 190; // 5 item lớn
                              let top = rect.bottom + 4;
                              if (top + menuH > window.innerHeight)
                                top = rect.top - 4 - menuH;
                              let left = rect.right - 180;
                              if (left < 8) left = 8;
                              setMenuStyle({ top, left });
                              setOpenMenuId(group.id);
                            }
                          }}>
                          <i className="bx bx-dots-vertical-rounded" />
                        </button>
                        {openMenuId === group.id && menuStyle && (
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
                                setDetailTarget(group);
                                closeMenu();
                              }}>
                              <i className="bx bx-show" />{" "}
                              {t("groups.viewDetail")}
                            </button>

                            {group.status !== "hidden" ? (
                              <button
                                className={styles.actionMenuItem}
                                onClick={() => {
                                  handleToggleHide(group);
                                  closeMenu();
                                }}>
                                <i className="bx bx-hide" />{" "}
                                {t("groups.hideGroup")}
                              </button>
                            ) : (
                              <button
                                className={styles.actionMenuItem}
                                onClick={() => {
                                  handleToggleHide(group);
                                  closeMenu();
                                }}>
                                <i className="bx bx-show-alt" />{" "}
                                {t("groups.unhideGroup")}
                              </button>
                            )}

                            {group.status !== "archived" && (
                              <button
                                className={styles.actionMenuItem}
                                onClick={() => {
                                  setActionTarget(group);
                                  setActionType("archive");
                                  closeMenu();
                                }}>
                                <i className="bx bx-archive-in" />{" "}
                                {t("groups.archiveGroup")}
                              </button>
                            )}

                            <button
                              className={styles.actionMenuItem}
                              onClick={() => {
                                setActionTarget(group);
                                setActionType("warn");
                                closeMenu();
                              }}>
                              <i className="bx bx-error" />{" "}
                              {t("groups.warnGroup")}
                            </button>

                            <button
                              className={`${styles.actionMenuItem} ${styles.actionMenuItemDanger}`}
                              onClick={() => {
                                setActionTarget(group);
                                setActionType("delete");
                                closeMenu();
                              }}>
                              <i className="bx bx-trash" />{" "}
                              {t("groups.deleteGroup")}
                            </button>
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

      {/* Detail Modal */}
      {detailTarget && (
        <div className={styles.overlay} onClick={() => setDetailTarget(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>{t("groups.detailTitle")}</h2>
              <button
                className={styles.modalClose}
                onClick={() => setDetailTarget(null)}>
                <i className="bx bx-x" />
              </button>
            </div>
            <div className={styles.modalBody}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-lg)",
                  marginBottom: "var(--space-lg)",
                }}>
                <Image
                  src={detailTarget.avatar_uri || "/default-avatar.png"}
                  alt=""
                  width={64}
                  height={64}
                  className={styles.detailAvatar}
                  unoptimized
                />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 18 }}>
                    {detailTarget.name || t("groups.noName")}
                  </div>
                  <div
                    style={{
                      color: "var(--color-text-secondary)",
                      fontSize: 14,
                    }}>
                    ID: {detailTarget.id}
                  </div>
                </div>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>
                  {t("groups.creator")}
                </span>
                <span className={styles.detailValue}>
                  {detailTarget.creator_name || t("groups.system")}
                </span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>
                  {t("groups.members")}
                </span>
                <span className={styles.detailValue}>
                  {detailTarget.member_count}
                </span>
              </div>
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
                <span className={styles.detailLabel}>
                  {t("common.createdAt")}
                </span>
                <span className={styles.detailValue}>
                  {formatDate(detailTarget.created_at)}
                </span>
              </div>
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

      {/* Multi-Purpose Action Modal (Warn, Archive, Delete) */}
      {actionTarget && actionType && (
        <div
          className={styles.overlay}
          onClick={() => {
            setActionTarget(null);
            setActionType("");
            setActionReason("");
          }}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                {actionType === "warn"
                  ? t("groups.warnGroup")
                  : actionType === "delete"
                  ? t("groups.deleteGroup")
                  : t("groups.confirmTitle")}
              </h2>
              <button
                className={styles.modalClose}
                onClick={() => {
                  setActionTarget(null);
                  setActionType("");
                  setActionReason("");
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
                {actionType === "warn" && t("groups.confirmWarnMessage")}
                {actionType === "delete" && t("groups.confirmDeleteMessage")}
                {actionType === "archive" && t("groups.confirmArchiveMessage")}
                <br />
                <strong style={{ color: "var(--color-text)" }}>
                  {actionTarget.name || actionTarget.id}
                </strong>
              </p>

              {actionType === "warn" && (
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>
                    {t("groups.warnReason")}
                  </label>
                  <input
                    type="text"
                    className={styles.fieldInput}
                    value={actionReason}
                    onChange={(e) => setActionReason(e.target.value)}
                    placeholder={t("groups.warnReasonPlaceholder")}
                  />
                </div>
              )}
            </div>
            <div className={styles.modalFooter}>
              <button
                className={styles.btnCancel}
                onClick={() => {
                  setActionTarget(null);
                  setActionType("");
                  setActionReason("");
                }}>
                {t("common.cancel")}
              </button>
              <button
                className={styles.btnDanger}
                disabled={
                  actionLoading ||
                  (actionType === "warn" && !actionReason.trim())
                }
                onClick={executeModalAction}>
                {actionLoading ? t("common.loading") : t("common.confirm")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

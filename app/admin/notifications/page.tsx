"use client";

import React, { useState } from "react";
import useSWR from 'swr'
import { swrFetcher, invalidate } from '../../../api/swr'
import { useTranslation } from "../../../hooks/useTranslation";
import { useToast } from "../../../contexts/ToastContext";
import { useNotification } from "../../../contexts/NotificationContext";
import {
  markAsRead as apiMarkAsRead,
  markAllAsRead as apiMarkAllAsRead,
} from "../../../api/notifications";
import type { NotificationItem, NotificationListResponse, NotificationType } from "../../../types";
import styles from "./Notifications.module.css";

export default function NotificationsPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { refreshUnreadCount } = useNotification();

  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const notifParams = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
  if (filter === 'unread') notifParams.set('unreadOnly', 'true')
  const swrKey = `/notifications?${notifParams}`
  const { data: res, isLoading: loading } = useSWR(swrKey, (url: string) => swrFetcher<NotificationListResponse>(url))
  let items: NotificationItem[] = []
  if (res) {
    items = filter === 'read' ? res.data.filter(n => n.is_read) : res.data
  }
  const total = filter === 'read' ? items.length : (res?.total ?? 0)

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value as "all" | "unread" | "read";
    setFilter(next);
    setPage(1);
  };

  const handleMarkOne = async (id: string) => {
    try {
      await apiMarkAsRead(id);
      refreshUnreadCount();
      invalidate('/notifications');
      toast({ title: t("notifications.markRead"), type: "success" });
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : t("notifications.markReadError"), type: "error" });
    }
  };

  const handleMarkAll = async () => {
    try {
      await apiMarkAllAsRead();
      refreshUnreadCount();
      invalidate('/notifications');
      toast({ title: t("notifications.markAllRead"), type: "success" });
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : t("notifications.markAllReadError"), type: "error" });
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

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
      return new Date(iso).toLocaleString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  };

  const getIconClass = (type: NotificationType): string => {
    switch (type) {
      case "like":
        return "bx bx-heart " + styles.iconLike;
      case "comment":
        return "bx bx-message-dots " + styles.iconComment;
      case "share":
        return "bx bx-share-alt " + styles.iconLike;
      case "follow":
        return "bx bx-user-plus " + styles.iconFollow;
      case "message":
        return "bx bx-envelope " + styles.iconMessage;
      case "friend_request":
      case "friend_accepted":
        return "bx bx-group " + styles.iconFriend;
      case "voice_call":
        return "bx bx-phone " + styles.iconCall;
      case "community_join_request":
      case "community_join_approved":
      case "community_join_rejected":
      case "community_role_changed":
      case "community_member_left":
      case "community_member_kicked":
      case "community_group_chat_added":
      case "community_invite_code_used":
      case "community_invitation_received":
      case "community_invitation_accepted":
        return "bx bx-world " + styles.iconCommunity;
      default:
        return "bx bx-bell " + styles.iconCommunity;
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>{t("notifications.title")}</h1>
        <div className={styles.toolbar}>
          <select
            className={styles.filterSelect}
            value={filter}
            onChange={handleFilterChange}>
            <option value="all">{t("notifications.filterAll")}</option>
            <option value="unread">{t("notifications.filterUnread")}</option>
            <option value="read">{t("notifications.filterRead")}</option>
          </select>
          {filter !== "read" && items.some((n) => !n.is_read) && (
            <button className={styles.btnMarkAll} onClick={handleMarkAll}>
              <i className="bx bx-check-double" />{" "}
              {t("notifications.markAllRead")}
            </button>
          )}
        </div>
      </div>

      <div className={styles.card}>
        {loading ? (
          <div>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className={styles.skeletonRow}>
                <div className={styles.skeletonIcon} />
                <div className={styles.skeletonTextMain} />
                <div className={styles.skeletonTextTime} />
                <div className={styles.skeletonTextAction} />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className={styles.empty}>
            <i className="bx bx-bell-off" />
            <p>{t("notifications.noNotifications")}</p>
          </div>
        ) : (
          <>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ width: "50px" }}></th>
                  <th>{t("notifications.newNotification")}</th>
                  <th>{t("common.createdAt")}</th>
                  <th style={{ width: "120px", textAlign: "right" }}>
                    {t("common.actions")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr
                    key={item.id}
                    className={!item.is_read ? styles.rowUnread : ""}>
                    <td>
                      <div className={styles.iconWrapper}>
                        {item.sender_avatar ? (
                          <img
                            src={item.sender_avatar}
                            alt=""
                            className={styles.senderAvatar}
                          />
                        ) : (
                          <i className={getIconClass(item.type)} />
                        )}
                      </div>
                    </td>
                    <td>
                      <div className={styles.cellContent}>
                        <span className={styles.contentMsg}>
                          {item.sender_name && (
                            <strong className={styles.senderName}>
                              {item.sender_name}
                            </strong>
                          )}
                          {item.sender_name ? ' ' + item.content : item.content}
                        </span>
                        {!item.is_read && (
                          <span className={styles.unreadBadge} />
                        )}
                      </div>
                    </td>
                    <td className={styles.cellDate}>
                      {formatDate(item.created_at)}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      {!item.is_read && (
                        <button
                          className={styles.actionBtn}
                          title={t("notifications.markRead")}
                          onClick={() => handleMarkOne(item.id)}>
                          <i className="bx bx-check" />
                        </button>
                      )}
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
                  <i className="bx bx-chevron-left" />
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
                  <i className="bx bx-chevron-right" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

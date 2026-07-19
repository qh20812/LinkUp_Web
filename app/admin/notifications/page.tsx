"use client";

import React, { useState, useEffect } from "react";
import { useNotification } from "../../../contexts/NotificationContext";
import { useTranslation } from "../../../hooks/useTranslation";
import { useToast } from "../../../contexts/ToastContext";
import type { NotificationItem, NotificationType } from "../../../types";
import styles from "./Notifications.module.css";

export default function NotificationsPage() {
  const { t } = useTranslation();
  const { toast } = useToast();

  // Lấy dữ liệu và các hàm thao tác từ NotificationContext toàn cục
  const {
    notifications: allNotifications,
    markAsRead,
    markAllAsRead,
    loading: contextLoading,
  } = useNotification();

  // State cục bộ cho bộ lọc và phân trang
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [filteredList, setFilteredList] = useState<NotificationItem[]>([]);

  // Xử lý lọc dữ liệu khi danh sách tổng hoặc bộ lọc thay đổi
  useEffect(() => {
    let list = [...allNotifications];
    if (filter === "unread") {
      list = list.filter((n) => !n.is_read);
    } else if (filter === "read") {
      list = list.filter((n) => n.is_read);
    }
    setFilteredList(list);
    setPage(1); // Reset về trang 1 khi đổi bộ lọc
  }, [allNotifications, filter]);

  // Tính toán phân trang dựa trên danh sách đã lọc
  const total = filteredList.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const startIndex = (page - 1) * pageSize;
  const paginatedNotifications = filteredList.slice(
    startIndex,
    startIndex + pageSize
  );

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilter(e.target.value as "all" | "unread" | "read");
  };

  const handleMarkOne = async (id: string) => {
    try {
      await markAsRead(id);
      toast({
        title: t("notifications.markReadSuccess") || "Đã đánh dấu đọc",
        type: "success",
      });
    } catch (err) {
      toast({
        title: err instanceof Error ? err.message : t("common.error"),
        type: "error",
      });
    }
  };

  const handleMarkAll = async () => {
    try {
      await markAllAsRead();
      toast({ title: t("notifications.prefSaved"), type: "success" });
    } catch (err) {
      toast({
        title: err instanceof Error ? err.message : t("common.error"),
        type: "error",
      });
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
      case "follow":
        return "bx bx-user-plus " + styles.iconFollow;
      case "message":
        return "bx bx-envelope " + styles.iconMessage;
      case "friend_request":
      case "friend_accepted":
        return "bx bx-group " + styles.iconFriend;
      case "voice_call":
        return "bx bx-phone " + styles.iconCall;
      default:
        return "bx bx-world " + styles.iconCommunity;
    }
  };

  const skeletonRows = () => (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className={styles.skeletonRow}>
          <div className={styles.skeletonIcon} />
          <div className={styles.skeletonTextMain} />
          <div className={styles.skeletonTextTime} />
          <div className={styles.skeletonTextAction} />
        </div>
      ))}
    </>
  );

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
          {filter !== "read" && filteredList.some((n) => !n.is_read) && (
            <button className={styles.btnMarkAll} onClick={handleMarkAll}>
              <i className="bx bx-check-double" />{" "}
              {t("notifications.markAllRead")}
            </button>
          )}
        </div>
      </div>

      <div className={styles.card}>
        {contextLoading ? (
          skeletonRows()
        ) : paginatedNotifications.length === 0 ? (
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
                {paginatedNotifications.map((item) => (
                  <tr
                    key={item.id}
                    className={!item.is_read ? styles.rowUnread : ""}>
                    <td>
                      <div className={styles.iconWrapper}>
                        <i className={getIconClass(item.type)} />
                      </div>
                    </td>
                    <td>
                      <div className={styles.cellContent}>
                        <span className={styles.contentMsg}>
                          {item.content}
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

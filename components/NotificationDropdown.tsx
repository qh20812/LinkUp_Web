"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useNotification } from "../contexts/NotificationContext";
import { useTranslation } from "../hooks/useTranslation";
import type { NotificationItem, NotificationType } from "../types";
import ExternalImage from "./ExternalImage";
import styles from "./NotificationDropdown.module.css";

interface NotificationDropdownProps {
  onClose: () => void;
}

export default function NotificationDropdown({
  onClose,
}: NotificationDropdownProps) {
  const { notifications, markAsRead, markAllAsRead, unreadCount, loading } =
    useNotification();
  const { t } = useTranslation();
  const router = useRouter();

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

  const formatTime = (dateStr: string): string => {
    const now = new Date();
    const past = new Date(dateStr);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return t("notifications.justNow");
    if (diffMins < 60)
      return t("notifications.minutesAgo").replace(
        "{minutes}",
        String(diffMins)
      );
    if (diffHours < 24)
      return t("notifications.hoursAgo").replace("{hours}", String(diffHours));
    return t("notifications.daysAgo").replace("{days}", String(diffDays));
  };

  const handleItemClick = async (item: NotificationItem) => {
    if (!item.is_read) {
      await markAsRead(item.id);
    }
    onClose();

    if (item.redirect_post_id) {
      router.push("/admin/posts");
    } else if (item.redirect_user_id) {
      router.push("/admin/users");
    }
  };

  return (
    <div className={styles.dropdown} onClick={(e) => e.stopPropagation()}>
      <div className={styles.header}>
        <h3>{t("notifications.title")}</h3>
        {unreadCount > 0 && (
          <button className={styles.markAllBtn} onClick={markAllAsRead}>
            {t("notifications.markAllRead")}
          </button>
        )}
      </div>

      <div className={styles.list}>
        {loading && notifications.length === 0 ? (
          <>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className={styles.skeletonItem}>
                <div className={styles.skeletonAvatar} />
                <div className={styles.skeletonContent}>
                  <div className={styles.skeletonLine} />
                  <div className={styles.skeletonLineShort} />
                </div>
              </div>
            ))}
          </>
        ) : notifications.length === 0 ? (
          <div className={styles.emptyState}>
            {t("notifications.noNotifications")}
          </div>
        ) : (
          notifications.map((item) => (
            <div
              key={item.id}
              className={`${styles.item} ${
                !item.is_read ? styles.itemUnread : ""
              }`}
              onClick={() => handleItemClick(item)}>
              <div className={styles.iconWrapper}>
                {item.sender_avatar ? (
                  <ExternalImage
                    src={item.sender_avatar}
                    alt=""
                    className={styles.senderAvatar}
                  />
                ) : (
                  <i className={getIconClass(item.type)} />
                )}
              </div>
              <div className={styles.contentWrap}>
                <p className={styles.content}>
                  {item.sender_name && (
                    <strong className={styles.senderName}>{item.sender_name}</strong>
                  )}
                  {item.sender_name ? ' ' + item.content : item.content}
                </p>
                <span className={styles.time}>
                  {formatTime(item.created_at)}
                </span>
              </div>
              {!item.is_read && <span className={styles.unreadDot} />}
            </div>
          ))
        )}
      </div>

      <Link
        href="/admin/notifications"
        className={styles.footer}
        onClick={onClose}>
        {t("notifications.viewAll")}
      </Link>
    </div>
  );
}

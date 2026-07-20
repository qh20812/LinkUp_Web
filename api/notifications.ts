import { request } from "./api";
import type {
  NotificationItem,
  NotificationListResponse,
  NotificationPreferences,
} from "../types";

export const getNotifications = (
  page = 1,
  pageSize = 20,
  unreadOnly = false
) => {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });
  if (unreadOnly) params.set("unreadOnly", "true");
  return request<NotificationListResponse>(`/notifications?${params}`);
};

export const markAsRead = (id: string) =>
  request<{ message: string }>(`/notifications/${id}/read`, { method: "PUT" });

export const markAllAsRead = () =>
  request<{ message: string }>("/notifications/read-all", { method: "PUT" });

export const getUnreadCount = () =>
  request<{ count: number }>("/notifications/unread-count");

export const getPreferences = () =>
  request<{ data: NotificationPreferences }>("/notifications/preferences");

export const updatePreferences = (prefs: Partial<NotificationPreferences>) =>
  request<{ message: string }>("/notifications/preferences", {
    method: "PUT",
    body: JSON.stringify(prefs),
  });

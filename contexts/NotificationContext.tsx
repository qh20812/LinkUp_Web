"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import type {
  NotificationItem,
  NotificationGroup,
  NotificationPreferences,
} from "../types";
import {
  getUnreadCount,
  getNotifications,
  markAsRead as apiMarkAsRead,
  markAllAsRead as apiMarkAllAsRead,
  getPreferences,
  updatePreferences as apiUpdatePreferences,
} from "../api/notifications";
import { invalidate } from "../api/swr";
import { groupNotifications, mergeNotification } from "../utils/groupNotifications";

interface NotificationContextType {
  unreadCount: number;
  notifications: NotificationGroup[];
  loading: boolean;
  preferences: NotificationPreferences | null;
  refreshUnreadCount: () => Promise<void>;
  fetchDropdownNotifications: () => Promise<void>;
  markAsRead: (group: NotificationGroup) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  loadPreferences: () => Promise<void>;
  updatePreferences: (prefs: Partial<NotificationPreferences>) => Promise<void>;
  closeWs: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

export function NotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [preferences, setPreferences] =
    useState<NotificationPreferences | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectDelayRef = useRef(1000);
  const closedByUserRef = useRef(false);
  const maxReconnectDelay = 30000;

  const closeWs = useCallback(() => {
    closedByUserRef.current = true;
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const refreshUnreadCount = useCallback(async () => {
    try {
      const res = await getUnreadCount();
      setUnreadCount(res.count);
    } catch (err) {
      console.error("Failed to get unread count:", err);
    }
  }, []);

  const fetchDropdownNotifications = useCallback(async () => {
    try {
      const res = await getNotifications(1, 5, false);
      setNotifications(groupNotifications(res.data));
    } catch (err) {
      console.error("Failed to fetch notifications dropdown:", err);
    }
  }, []);

  const loadPreferences = useCallback(async () => {
    try {
      const res = await getPreferences();
      setPreferences(res.data);
    } catch (err) {
      console.error("Failed to load preferences:", err);
    }
  }, []);

  const markAsRead = async (group: NotificationGroup) => {
    // Cập nhật UI trước cho mượt (Optimistic Update)
    setNotifications((prev) =>
      prev.map((n) => (n.key === group.key ? { ...n, is_read: true } : n))
    );
    try {
      await Promise.all(group.ids.map((id) => apiMarkAsRead(id)));
      refreshUnreadCount();
    } catch (err) {
      console.error("Failed to mark as read:", err);
      refreshUnreadCount();
      fetchDropdownNotifications();
    }
  };

  const markAllAsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
    try {
      await apiMarkAllAsRead();
    } catch (err) {
      console.error("Failed to mark all as read:", err);
      refreshUnreadCount();
    }
  };

  const updatePreferences = async (prefs: Partial<NotificationPreferences>) => {
    setPreferences((prev) => ({
      ...(prev ?? {
        like_enabled: true,
        comment_enabled: true,
        follow_enabled: true,
        message_enabled: true,
        friend_request_enabled: true,
        community_enabled: true,
        voice_call_enabled: true,
      }),
      ...prefs,
    }));
    try {
      await apiUpdatePreferences(prefs);
      await loadPreferences();
    } catch (err) {
      console.error("Failed to update preferences:", err);
      loadPreferences();
    }
  };

  // Thiết lập kết nối WebSocket và tải dữ liệu ban đầu
  useEffect(() => {
    if (typeof window !== "undefined" && !localStorage.getItem("token")) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false);
      return;
    }

    let isComponentMounted = true;

    function connectWS() {
      const token =
        typeof window !== "undefined" ? localStorage.getItem("token") : null;

      if (!token) {
        wsRef.current = null;
        return;
      }

      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = window.location.host;

      const ws = new WebSocket(
        `${protocol}//${host}/api/ws?token=${encodeURIComponent(token)}`
      );
      wsRef.current = ws;
      
      if (process.env.NODE_ENV !== "production") {
        (window as unknown as Record<string, unknown>).testWS = ws;
      }

      ws.onopen = () => {
        if (!isComponentMounted) return;
        closedByUserRef.current = false;
        reconnectDelayRef.current = 1000;
      };

      ws.onmessage = (event) => {
        if (!isComponentMounted) return;
        // Server batches multiple queued messages into one frame
        // separated by '\n'. Parse each chunk independently.
        const parts = String(event.data).split("\n");
        for (const part of parts) {
          const data = part.trim();
          if (!data) continue;
          try {
            const message = JSON.parse(data);
            if (message.type === "notification") {
              const newNotif: NotificationItem = message.data;
              setNotifications((prev) => mergeNotification(newNotif, prev));
              setUnreadCount((prev) => prev + 1);
              invalidate("/notifications");
            } else if (message.type === "presence:update") {
              window.dispatchEvent(
                new CustomEvent("presence:update", { detail: message.data }),
              );
            }
          } catch (err) {
            console.error("Error parsing WS message:", err);
          }
        }
      };

      ws.onclose = () => {
        if (!isComponentMounted || closedByUserRef.current) return;
        setTimeout(() => {
          if (isComponentMounted && !closedByUserRef.current) {
            reconnectDelayRef.current = Math.min(
              reconnectDelayRef.current * 2,
              maxReconnectDelay
            );
            connectWS();
          }
        }, reconnectDelayRef.current);
      };

      ws.onerror = () => {
        ws.close();
      };
    }

    // Tải song song toàn bộ dữ liệu khởi tạo, sau đó tắt trạng thái loading và kết nối WS
    const initData = async () => {
      setLoading(true);
      await Promise.all([refreshUnreadCount(), fetchDropdownNotifications()]).catch(() => {});
      if (isComponentMounted) {
        setLoading(false);
      }
    };

    initData();
    connectWS();

    const pollInterval = setInterval(() => {
      if (isComponentMounted) {
        refreshUnreadCount().catch(() => {});
        fetchDropdownNotifications().catch(() => {});
      }
    }, 30000);

    return () => {
      isComponentMounted = false;
      clearInterval(pollInterval);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [refreshUnreadCount, fetchDropdownNotifications]);

  return (
    <NotificationContext.Provider
      value={{
        unreadCount,
        notifications,
        loading,
        preferences,
        refreshUnreadCount,
        fetchDropdownNotifications,
        markAsRead,
        markAllAsRead,
        loadPreferences,
        updatePreferences,
        closeWs,
      }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error(
      "useNotification must be used within a NotificationProvider"
    );
  }
  return context;
}

"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import type { NotificationItem, NotificationPreferences } from "../types";
import {
  getUnreadCount,
  getNotifications,
  markAsRead as apiMarkAsRead,
  markAllAsRead as apiMarkAllAsRead,
  getPreferences,
  updatePreferences as apiUpdatePreferences,
} from "../api/notifications";

interface NotificationContextType {
  unreadCount: number;
  notifications: NotificationItem[];
  loading: boolean;
  preferences: NotificationPreferences | null;
  refreshUnreadCount: () => Promise<void>;
  fetchDropdownNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  loadPreferences: () => Promise<void>;
  updatePreferences: (prefs: Partial<NotificationPreferences>) => Promise<void>;
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
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [preferences, setPreferences] =
    useState<NotificationPreferences | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectDelayRef = useRef(1000);
  const maxReconnectDelay = 30000;

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
      setNotifications(res.data);
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

  const markAsRead = async (id: string) => {
    // Cập nhật UI trước cho mượt (Optimistic Update)
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
    try {
      await apiMarkAsRead(id);
    } catch (err) {
      console.error("Failed to mark as read:", err);
      refreshUnreadCount();
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
    if (preferences) {
      setPreferences({ ...preferences, ...prefs });
    }
    try {
      await apiUpdatePreferences(prefs);
    } catch (err) {
      console.error("Failed to update preferences:", err);
      loadPreferences();
    }
  };

  // Thiết lập kết nối WebSocket và tải dữ liệu ban đầu
  useEffect(() => {
    let token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;

    if (!token) {
      setLoading(false);
      return;
    }

    let isComponentMounted = true;

    function connectWS() {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = window.location.host;

      const ws = new WebSocket(
        `${protocol}//${host}/api/ws?token=${encodeURIComponent(token!)}`
      );
      wsRef.current = ws;
      
      if (process.env.NODE_ENV !== "production") {
        (window as any).testWS = ws;
      }

      ws.onopen = () => {
        if (!isComponentMounted) return;
        reconnectDelayRef.current = 1000;
      };

      ws.onmessage = (event) => {
        if (!isComponentMounted) return;
        try {
          const message = JSON.parse(event.data);
          if (message.type === "notification") {
            const newNotif: NotificationItem = message.data;
            setNotifications((prev) => [newNotif, ...prev.slice(0, 4)]);
            setUnreadCount((prev) => prev + 1);
          }
        } catch (err) {
          console.error("Error parsing WS message:", err);
        }
      };

      ws.onclose = () => {
        if (!isComponentMounted) return;
        setTimeout(() => {
          if (isComponentMounted) {
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
      await Promise.all([refreshUnreadCount(), fetchDropdownNotifications()]);
      if (isComponentMounted) {
        setLoading(false);
      }
    };

    initData();
    connectWS();

    return () => {
      isComponentMounted = false;
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

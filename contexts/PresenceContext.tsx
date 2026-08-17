"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import type { PresenceData, PresenceStatus, WsPresenceUpdatePayload } from "../types";
import { batchGetPresence } from "../api/presence";

interface PresenceContextType {
  presenceMap: Map<string, PresenceData>;
  getPresence: (userId: string) => PresenceData | undefined;
  isOnline: (userId: string) => boolean;
  getLastSeen: (userId: string) => string | null | undefined;
  subscribeToPresence: (userIds: string[]) => void;
  unsubscribeFromPresence: (userIds: string[]) => void;
}

const PresenceContext = createContext<PresenceContextType | undefined>(
  undefined
);

export function PresenceProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [presenceMap, setPresenceMap] = useState<Map<string, PresenceData>>(
    new Map()
  );
  const subscribedIdsRef = useRef<Set<string>>(new Set());
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchPresence = useCallback(async (userIds: string[]) => {
    if (userIds.length === 0) return;
    try {
      const res = await batchGetPresence(userIds);
      setPresenceMap((prev) => {
        const next = new Map(prev);
        for (const [id, data] of Object.entries(res.data)) {
          next.set(id, data);
        }
        return next;
      });
    } catch (err) {
      console.error("Failed to fetch presence:", err);
    }
  }, []);

  const subscribeToPresence = useCallback(
    (userIds: string[]) => {
      const newIds = userIds.filter(
        (id) => !subscribedIdsRef.current.has(id)
      );
      if (newIds.length === 0) return;

      newIds.forEach((id) => subscribedIdsRef.current.add(id));
      fetchPresence(newIds);
    },
    [fetchPresence]
  );

  const unsubscribeFromPresence = useCallback((userIds: string[]) => {
    userIds.forEach((id) => subscribedIdsRef.current.delete(id));
  }, []);

  const getPresence = useCallback(
    (userId: string) => presenceMap.get(userId),
    [presenceMap]
  );

  const isOnline = useCallback(
    (userId: string) => {
      const data = presenceMap.get(userId);
      return data?.status === "online";
    },
    [presenceMap]
  );

  const getLastSeen = useCallback(
    (userId: string) => {
      const data = presenceMap.get(userId);
      return data?.last_seen ?? null;
    },
    [presenceMap]
  );

  // Listen for presence updates from WebSocket (dispatched by NotificationContext)
  useEffect(() => {
    const handlePresenceUpdate = (event: CustomEvent<WsPresenceUpdatePayload>) => {
      const { user_id, status, last_seen } = event.detail;
      setPresenceMap((prev) => {
        const next = new Map(prev);
        const existing = next.get(user_id);
        next.set(user_id, {
          user_id,
          status,
          last_seen: last_seen ?? existing?.last_seen ?? null,
        });
        return next;
      });
    };

    window.addEventListener("presence:update", handlePresenceUpdate as EventListener);
    return () => {
      window.removeEventListener("presence:update", handlePresenceUpdate as EventListener);
    };
  }, []);

  // Poll presence for subscribed users
  useEffect(() => {
    pollIntervalRef.current = setInterval(() => {
      const ids = Array.from(subscribedIdsRef.current);
      if (ids.length > 0) {
        fetchPresence(ids);
      }
    }, 30000);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [fetchPresence]);

  return (
    <PresenceContext.Provider
      value={{
        presenceMap,
        getPresence,
        isOnline,
        getLastSeen,
        subscribeToPresence,
        unsubscribeFromPresence,
      }}>
      {children}
    </PresenceContext.Provider>
  );
}

export function usePresenceContext() {
  const context = useContext(PresenceContext);
  if (context === undefined) {
    throw new Error(
      "usePresenceContext must be used within a PresenceProvider"
    );
  }
  return context;
}

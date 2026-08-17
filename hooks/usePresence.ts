"use client";

import { useEffect, useMemo } from "react";
import { usePresenceContext } from "../contexts/PresenceContext";
import { useTranslation } from "./useTranslation";

function formatLastSeen(
  lastSeen: string | null | undefined,
  t: (key: string, params?: Record<string, string | number>) => string
): string {
  if (!lastSeen) return "";

  const now = new Date();
  const date = new Date(lastSeen);
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) return t("presence.lastSeenJustNow");
  if (diffMinutes < 60)
    return t("presence.lastSeenMinutes", { minutes: diffMinutes });
  if (diffHours < 24) return t("presence.lastSeenHours", { hours: diffHours });
  if (diffDays < 7) return t("presence.lastSeenDays", { days: diffDays });

  return date.toLocaleDateString("vi-VN");
}

export function usePresence(userId: string) {
  const { getPresence, isOnline, getLastSeen, subscribeToPresence } =
    usePresenceContext();
  const { t } = useTranslation();

  useEffect(() => {
    if (userId) {
      subscribeToPresence([userId]);
    }
  }, [userId, subscribeToPresence]);

  const presenceData = getPresence(userId);
  const online = isOnline(userId);
  const lastSeen = getLastSeen(userId);

  const statusText = useMemo(() => {
    if (online) return t("presence.online");
    if (lastSeen) return formatLastSeen(lastSeen, t);
    return "";
  }, [online, lastSeen, t]);

  return {
    isOnline: online,
    lastSeen: lastSeen ? new Date(lastSeen) : null,
    statusText,
    presenceData,
  };
}

export function usePresenceBatch(userIds: string[]) {
  const { getPresence, isOnline, getLastSeen, subscribeToPresence } =
    usePresenceContext();
  const { t } = useTranslation();

  useEffect(() => {
    if (userIds.length > 0) {
      subscribeToPresence(userIds);
    }
  }, [userIds, subscribeToPresence]);

  const getPresenceForUser = (userId: string) => {
    const data = getPresence(userId);
    return {
      isOnline: isOnline(userId),
      lastSeen: getLastSeen(userId),
      statusText: (() => {
        if (isOnline(userId)) return t("presence.online");
        const ls = getLastSeen(userId);
        if (ls) return formatLastSeen(ls, t);
        return "";
      })(),
      presenceData: data,
    };
  };

  return { getPresenceForUser };
}

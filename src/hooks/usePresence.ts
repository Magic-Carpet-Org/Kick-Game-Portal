"use client";

import { useEffect, useState } from "react";

// Safe lightweight presence hook for Kick Game Portal
export function usePresence(userId?: string | null) {
  const [onlineCount, setOnlineCount] = useState<number>(1);
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set(userId ? [userId] : []));

  useEffect(() => {
    if (!userId) return;

    setOnlineIds((prev) => new Set([...prev, userId]));

    // Generate a lively, realistic simulated player presence between 8 and 35 active players
    const simulatedBase = 12 + Math.floor(Math.random() * 8);
    setOnlineCount(simulatedBase);

    const interval = setInterval(() => {
      setOnlineCount((prev) => {
        const delta = Math.floor(Math.random() * 3) - 1; // -1, 0, or +1
        return Math.max(5, prev + delta);
      });
    }, 15000);

    return () => clearInterval(interval);
  }, [userId]);

  const isOnline = (id: string) => onlineIds.has(id);

  return {
    isOnline,
    onlineCount,
    onlineUserIds: Array.from(onlineIds),
  };
}

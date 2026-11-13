"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  ExternalLink,
  Sparkles,
  Gamepad2,
  Zap,
  AlertCircle,
  Clock,
  AlertTriangle,
  Trophy,
  TrendingDown,
  X,
  Play,
  RotateCcw,
} from "lucide-react";

export interface NotificationItem {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type:
    | "welcome"
    | "new_game"
    | "subscription_success"
    | "subscription_failed"
    | "subscription_expiring"
    | "subscription_expired"
    | "leaderboard_climb"
    | "leaderboard_drop"
    | string;
  link?: string | null;
  action_label?: string | null;
  read: boolean;
  metadata?: any;
  created_at: string;
}

interface NotificationBellProps {
  onOpenSubscribeModal?: () => void;
  className?: string;
}

export default function NotificationBell({
  onOpenSubscribeModal,
  className = "",
}: NotificationBellProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "unread">("all");
  const popoverRef = useRef<HTMLDivElement>(null);

  // Fetch notifications from API
  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications");
      const data = await res.json();
      if (data.success) {
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();

    // Auto-poll every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);

    // Refresh on window focus
    const handleFocus = () => fetchNotifications();
    window.addEventListener("focus", handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Mark single as read
  const markAsRead = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    // Optimistic local update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!data.success) {
        console.error("Failed to mark notification read in DB:", data.error);
        fetchNotifications();
      }
    } catch (err) {
      console.error("Failed to mark notification read:", err);
      fetchNotifications();
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    const prevNotifications = [...notifications];
    const prevCount = unreadCount;

    // Optimistic local update
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);

    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark_all_read" }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("All notifications marked as read");
      } else {
        toast.error("Failed to mark all as read");
        setNotifications(prevNotifications);
        setUnreadCount(prevCount);
      }
    } catch (err) {
      console.error("Failed to mark all read:", err);
      toast.error("Failed to mark all as read");
      setNotifications(prevNotifications);
      setUnreadCount(prevCount);
    }
  };

  // Delete single notification
  const deleteNotification = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const target = notifications.find((n) => n.id === id);
    const prevNotifications = [...notifications];
    const prevCount = unreadCount;

    // Optimistic local update
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    if (target && !target.read) {
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }

    try {
      const res = await fetch(`/api/notifications?id=${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Notification deleted");
      } else {
        toast.error("Failed to delete notification");
        setNotifications(prevNotifications);
        setUnreadCount(prevCount);
      }
    } catch (err) {
      console.error("Failed to delete notification:", err);
      toast.error("Failed to delete notification");
      setNotifications(prevNotifications);
      setUnreadCount(prevCount);
    }
  };

  // Clear all notifications
  const clearAllNotifications = async () => {
    if (notifications.length === 0) return;
    const prevNotifications = [...notifications];
    const prevCount = unreadCount;

    // Optimistic local update
    setNotifications([]);
    setUnreadCount(0);

    try {
      const res = await fetch("/api/notifications?action=clear_all", {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        toast.success("All notifications cleared");
      } else {
        toast.error("Failed to clear notifications");
        setNotifications(prevNotifications);
        setUnreadCount(prevCount);
      }
    } catch (err) {
      console.error("Failed to clear notifications:", err);
      toast.error("Failed to clear notifications");
      setNotifications(prevNotifications);
      setUnreadCount(prevCount);
    }
  };

  // Handle action click
  const handleActionClick = (n: NotificationItem) => {
    markAsRead(n.id);
    setIsOpen(false);

    if (
      (n.type === "subscription_expired" || n.type === "subscription_expiring" || n.type === "subscription_failed") &&
      onOpenSubscribeModal &&
      n.action_label?.toLowerCase().includes("renew")
    ) {
      onOpenSubscribeModal();
      return;
    }

    if (n.link) {
      router.push(n.link);
    }
  };

  // Format relative time
  const formatTime = (iso: string) => {
    const diffMs = Date.now() - new Date(iso).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return "Just now";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDays = Math.floor(diffHr / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  // Icon mapping by notification type
  const renderIcon = (type: string) => {
    switch (type) {
      case "welcome":
        return (
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
        );
      case "new_game":
        return (
          <div className="w-8 h-8 rounded-xl bg-violet-50 text-violet-600 border border-violet-100 flex items-center justify-center shrink-0">
            <Gamepad2 className="w-4 h-4" />
          </div>
        );
      case "subscription_success":
        return (
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
            <Zap className="w-4 h-4 fill-current" />
          </div>
        );
      case "subscription_failed":
        return (
          <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center shrink-0">
            <AlertCircle className="w-4 h-4" />
          </div>
        );
      case "subscription_expiring":
        return (
          <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center shrink-0">
            <Clock className="w-4 h-4" />
          </div>
        );
      case "subscription_expired":
        return (
          <div className="w-8 h-8 rounded-xl bg-red-50 text-red-600 border border-red-100 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-4 h-4" />
          </div>
        );
      case "leaderboard_climb":
        return (
          <div className="w-8 h-8 rounded-xl bg-yellow-50 text-amber-600 border border-yellow-200 flex items-center justify-center shrink-0">
            <Trophy className="w-4 h-4 fill-amber-400" />
          </div>
        );
      case "leaderboard_drop":
        return (
          <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 border border-orange-100 flex items-center justify-center shrink-0">
            <TrendingDown className="w-4 h-4" />
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 border border-slate-200 flex items-center justify-center shrink-0">
            <Bell className="w-4 h-4" />
          </div>
        );
    }
  };

  const displayedList =
    activeTab === "unread" ? notifications.filter((n) => !n.read) : notifications;

  return (
    <div className={`relative ${className}`} ref={popoverRef}>
      {/* ── Trigger Bell Button ────────────────────────────────────────── */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-8 h-8 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center hover:bg-slate-100 transition-all cursor-pointer focus:outline-none"
        aria-label="View notifications"
      >
        <Bell className="w-3.5 h-3.5 text-slate-600" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-600 px-1 text-[9px] font-black text-white shadow-xs animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* ── Dropdown Popover ────────────────────────────────────────────── */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-slate-900">
          {/* Header */}
          <div className="p-3.5 bg-slate-50/80 border-b border-slate-200/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center">
                <Bell className="w-3.5 h-3.5" />
              </div>
              <h3 className="font-bold text-xs text-slate-900">Notifications</h3>
              {unreadCount > 0 && (
                <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 px-2 py-1 rounded-md hover:bg-emerald-50 transition-colors cursor-pointer"
                  title="Mark all as read"
                >
                  <CheckCheck className="w-3 h-3" /> Mark all read
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="px-3 pt-2 pb-1 bg-white border-b border-slate-100 flex gap-2 text-xs">
            <button
              onClick={() => setActiveTab("all")}
              className={`pb-1.5 px-2 font-bold transition-colors cursor-pointer border-b-2 ${
                activeTab === "all"
                  ? "border-emerald-600 text-emerald-700"
                  : "border-transparent text-slate-400 hover:text-slate-700"
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setActiveTab("unread")}
              className={`pb-1.5 px-2 font-bold transition-colors cursor-pointer border-b-2 ${
                activeTab === "unread"
                  ? "border-emerald-600 text-emerald-700"
                  : "border-transparent text-slate-400 hover:text-slate-700"
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>

          {/* List Content */}
          <div className="max-h-80 sm:max-h-96 overflow-y-auto divide-y divide-slate-100">
            {displayedList.length === 0 ? (
              <div className="py-10 px-4 text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <Check className="w-5 h-5" />
                </div>
                <p className="text-xs font-bold text-slate-800">You're all caught up!</p>
                <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                  {activeTab === "unread"
                    ? "No unread notifications at the moment."
                    : "Notifications about new games, subscriptions, and rankings will appear here."}
                </p>
              </div>
            ) : (
              displayedList.map((n) => (
                <div
                  key={n.id}
                  onClick={() => !n.read && markAsRead(n.id)}
                  className={`p-3.5 flex items-start gap-3 transition-colors cursor-pointer ${
                    n.read ? "bg-white hover:bg-slate-50/70" : "bg-emerald-50/30 hover:bg-emerald-50/50"
                  }`}
                >
                  {renderIcon(n.type)}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <h4 className="text-xs font-bold text-slate-900 truncate">
                        {n.title}
                      </h4>
                      <span className="text-[10px] text-slate-400 shrink-0 font-medium">
                        {formatTime(n.created_at)}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-600 leading-snug line-clamp-2">
                      {n.message}
                    </p>

                    {/* Action button if present */}
                    {n.action_label && (
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleActionClick(n);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer shadow-xs"
                        >
                          {n.action_label.toLowerCase().includes("play") ? (
                            <Play className="w-2.5 h-2.5 fill-current" />
                          ) : n.action_label.toLowerCase().includes("renew") ? (
                            <RotateCcw className="w-2.5 h-2.5" />
                          ) : (
                            <ExternalLink className="w-2.5 h-2.5" />
                          )}
                          {n.action_label}
                        </button>

                        {!n.read && (
                          <button
                            type="button"
                            onClick={(e) => markAsRead(n.id, e)}
                            className="text-[10px] text-slate-400 hover:text-slate-600 font-medium px-1.5 py-0.5 rounded hover:bg-slate-100"
                          >
                            Mark read
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions (read indicator & delete) */}
                  <div className="flex flex-col items-center gap-1.5 shrink-0 pt-0.5">
                    {!n.read && (
                      <span className="w-2 h-2 rounded-full bg-emerald-500" title="Unread" />
                    )}
                    <button
                      onClick={(e) => deleteNotification(n.id, e)}
                      className="p-1 rounded text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                      title="Delete"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px]">
              <span className="text-slate-400 pl-2">
                {unreadCount > 0 ? `${unreadCount} unread` : "All read"}
              </span>
              <button
                onClick={clearAllNotifications}
                className="text-slate-400 hover:text-red-600 px-2 py-1 rounded hover:bg-slate-100 transition-colors cursor-pointer font-medium"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


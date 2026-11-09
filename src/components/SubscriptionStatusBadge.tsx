"use client";

import React, { useState, useEffect, useRef } from "react";
import { Zap, Clock, ShieldCheck, ChevronDown, RotateCcw, AlertCircle, Phone, Calendar, CheckCircle2 } from "lucide-react";

interface SubscriptionInfo {
  subscription_id?: number | string;
  sub_status?: string;
  sub_active?: boolean;
  telco?: string | null;
  active_product_id?: string | number;
  auto_renewal?: boolean;
  starts_date?: string;
  ends_date?: string;
}

interface SubscriptionStatusBadgeProps {
  onOpenSubscribeModal?: () => void;
  className?: string;
}

export default function SubscriptionStatusBadge({
  onOpenSubscribeModal,
  className = "",
}: SubscriptionStatusBadgeProps) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasActiveSub, setHasActiveSub] = useState(false);
  const [subInfo, setSubInfo] = useState<SubscriptionInfo | null>(null);
  const [msisdn, setMsisdn] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [timeLeftStr, setTimeLeftStr] = useState<string>("");
  const [isEndingSoon, setIsEndingSoon] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchStatus = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await fetch("/api/subscription/status");
      const data = await res.json();
      if (data.success) {
        setHasActiveSub(Boolean(data.has_active_subscription));
        setSubInfo(data.subscription || null);
        setMsisdn(data.msisdn || null);
      }
    } catch (err) {
      console.error("Failed to fetch subscription status:", err);
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStatus();

    // Re-check when window regains focus (e.g. after subscribing in another tab)
    const handleFocus = () => {
      fetchStatus();
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Update countdown timer
  useEffect(() => {
    if (!subInfo?.ends_date || !hasActiveSub) {
      setTimeLeftStr("");
      setIsEndingSoon(false);
      return;
    }

    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const end = new Date(subInfo.ends_date!).getTime();
      const diff = end - now;

      if (diff <= 0) {
        setTimeLeftStr("Expired");
        setIsEndingSoon(true);
        setHasActiveSub(false);
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (hours < 1) {
        setIsEndingSoon(true);
        setTimeLeftStr(`${minutes}m left`);
      } else if (hours < 24) {
        setIsEndingSoon(hours < 3);
        setTimeLeftStr(`${hours}h ${minutes}m left`);
      } else {
        const days = Math.floor(hours / 24);
        const remHours = hours % 24;
        setIsEndingSoon(false);
        setTimeLeftStr(`${days}d ${remHours}h left`);
      }
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 30000); // update every 30s
    return () => clearInterval(interval);
  }, [subInfo?.ends_date, hasActiveSub]);

  // Format date readable
  const formatFriendlyDate = (dateStr?: string) => {
    if (!dateStr) return "N/A";
    const d = new Date(dateStr);
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  if (loading) {
    return (
      <div className={`h-8 w-28 bg-slate-100 animate-pulse rounded-full border border-slate-200 ${className}`} />
    );
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* ── Badge Pill Button ─────────────────────────────────────────── */}
      {hasActiveSub ? (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
            isEndingSoon
              ? "bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-800"
              : "bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-800"
          }`}
          title="Click to view subscription details"
        >
          {/* Pulsing indicator */}
          <span className="relative flex h-2 w-2">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                isEndingSoon ? "bg-amber-400" : "bg-emerald-400"
              }`}
            />
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                isEndingSoon ? "bg-amber-500" : "bg-emerald-500"
              }`}
            />
          </span>

          <span className="hidden sm:inline">Pass Active</span>
          {timeLeftStr && (
            <span
              className={`text-[11px] font-mono font-medium px-1.5 py-0.5 rounded ${
                isEndingSoon ? "bg-amber-100/90 text-amber-900" : "bg-emerald-100/90 text-emerald-900"
              }`}
            >
              {timeLeftStr}
            </span>
          )}
          <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </button>
      ) : (
        <button
          onClick={() => {
            if (onOpenSubscribeModal) {
              onOpenSubscribeModal();
            } else {
              setIsOpen(!isOpen);
            }
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-slate-100 hover:bg-slate-200/80 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
          title="Subscribe to unlock unlimited games"
        >
          <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
          <span className="hidden sm:inline">Get Pass</span>
          <span className="sm:hidden">Subscribe</span>
        </button>
      )}

      {/* ── Details Popover Dropdown ──────────────────────────────────── */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-white border border-slate-200 rounded-2xl p-4 text-slate-800 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-100">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                  hasActiveSub ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                }`}
              >
                {hasActiveSub ? (
                  <ShieldCheck className="w-4 h-4" />
                ) : (
                  <AlertCircle className="w-4 h-4" />
                )}
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Kick Gaming Pass</h4>
                <p className="text-[10px] text-slate-400">Direct Carrier Billing</p>
              </div>
            </div>

            <span
              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                hasActiveSub
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              {hasActiveSub ? (isEndingSoon ? "Ending Soon" : "Active") : "No Active Pass"}
            </span>
          </div>

          {/* Details Body */}
          <div className="py-3 space-y-2.5 text-xs">
            {hasActiveSub ? (
              <>
                {/* Time Remaining Box */}
                <div
                  className={`p-3 rounded-xl border flex items-center justify-between ${
                    isEndingSoon
                      ? "bg-amber-50/70 border-amber-200/80 text-amber-900"
                      : "bg-slate-50 border-slate-200/80 text-slate-800"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Clock
                      className={`w-4 h-4 ${
                        isEndingSoon ? "text-amber-600" : "text-emerald-600"
                      }`}
                    />
                    <div>
                      <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">
                        Time Remaining
                      </p>
                      <p className="font-bold text-xs">{timeLeftStr || "Calculating..."}</p>
                    </div>
                  </div>

                  {subInfo?.auto_renewal && (
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded-full">
                      Auto-renews
                    </span>
                  )}
                </div>

                {/* Expiry Timestamp */}
                <div className="flex items-center justify-between text-slate-600 px-1">
                  <span className="flex items-center gap-1.5 text-[11px] text-slate-400">
                    <Calendar className="w-3.5 h-3.5" />
                    Expires at
                  </span>
                  <span className="font-semibold text-slate-800 text-[11px]">
                    {formatFriendlyDate(subInfo?.ends_date)}
                  </span>
                </div>

                {/* Phone / MSISDN */}
                {msisdn && (
                  <div className="flex items-center justify-between text-slate-600 px-1">
                    <span className="flex items-center gap-1.5 text-[11px] text-slate-400">
                      <Phone className="w-3.5 h-3.5" />
                      Mobile Line
                    </span>
                    <span className="font-mono font-medium text-slate-700 text-[11px]">
                      +{msisdn}
                    </span>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-2 px-1">
                <p className="text-xs text-slate-600 leading-relaxed mb-3">
                  You do not have an active gaming subscription. Subscribe with airtime to unlock unlimited play across all games.
                </p>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
            {hasActiveSub ? (
              <button
                onClick={() => fetchStatus(true)}
                disabled={refreshing}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition-colors cursor-pointer"
              >
                <RotateCcw className={`w-3 h-3 ${refreshing ? "animate-spin text-slate-500" : ""}`} />
                {refreshing ? "Checking status..." : "Refresh Status"}
              </button>
            ) : (
              <button
                onClick={() => {
                  setIsOpen(false);
                  onOpenSubscribeModal?.();
                }}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                Subscribe with Airtime
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


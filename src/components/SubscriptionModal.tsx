"use client";

import React, { useState, useEffect, useRef } from "react";
import { authClient } from "@/lib/auth-client";
import {
  Zap,
  ExternalLink,
  RotateCcw,
  ShieldCheck,
  Phone,
  X,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Smartphone,
  ChevronLeft,
} from "lucide-react";
import toast from "react-hot-toast";

// Helper to format Nigerian phone numbers for display without international prefix or leading 0
const formatLocalNumber = (raw?: string | null): string => {
  if (!raw) return "";
  let digits = raw.replace(/[^0-9]/g, "");
  if (digits.startsWith("2340")) digits = digits.substring(4);
  else if (digits.startsWith("234")) digits = digits.substring(3);
  else if (digits.startsWith("0")) digits = digits.substring(1);
  return digits;
};

// Helper to convert to international MSISDN (234...) for carrier API queries
const formatFullMsisdn = (raw?: string | null): string => {
  if (!raw) return "";
  let digits = raw.replace(/[^0-9]/g, "");
  if (digits.startsWith("2340")) digits = "234" + digits.substring(4);
  else if (digits.startsWith("0")) digits = "234" + digits.substring(1);
  else if (!digits.startsWith("234") && digits.length >= 10) digits = "234" + digits;
  return digits;
};

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose?: () => void;
  msisdn?: string;
  clientActions?: Array<{
    action: string;
    instruction?: string;
    redirection_url?: string;
    campaign_urls?: Array<{
      telco?: string;
      url?: string;
    }>;
  }>;
  onSubscriptionVerified?: () => void;
}

export default function SubscriptionModal({
  isOpen,
  onClose,
  msisdn: initialMsisdn,
  clientActions = [],
  onSubscriptionVerified,
}: SubscriptionModalProps) {
  const [step, setStep] = useState<"select" | "waiting" | "success">("select");
  const [phone, setPhone] = useState(formatLocalNumber(initialMsisdn));
  const [loadingAction, setLoadingAction] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [redirectUrl, setRedirectUrl] = useState<string>("");
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  const redirectAction = clientActions.find((a) => a.action === "redirect" && a.redirection_url);
  const promptAction = clientActions.find((a) => a.action === "prompt" && a.instruction);

  // Auto-fill user's phone number when modal opens
  useEffect(() => {
    if (!isOpen) return;

    if (initialMsisdn) {
      setPhone(formatLocalNumber(initialMsisdn));
      return;
    }

    const autoFillPhone = async () => {
      try {
        // 1. Check Better Auth session
        const session = await authClient.getSession();
        const sessionPhone = (session?.data?.user as any)?.phone;
        if (sessionPhone) {
          setPhone(formatLocalNumber(sessionPhone));
          return;
        }

        // 2. Query subscription status API (checks database profile & past subscriptions)
        const res = await fetch("/api/subscription/status");
        const data = await res.json();
        if (data.success && data.msisdn) {
          setPhone(formatLocalNumber(data.msisdn));
        }
      } catch (err) {
        console.error("Auto-fill phone lookup failed:", err);
      }
    };

    autoFillPhone();
  }, [isOpen, initialMsisdn]);

  // Sync redirection URL from props if provided
  useEffect(() => {
    if (redirectAction?.redirection_url) {
      setRedirectUrl(redirectAction.redirection_url);
    }
  }, [redirectAction]);

  // Reset step when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep("select");
      setVerifying(false);
      setLoadingAction(false);
    } else {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    }
  }, [isOpen]);

  // Verify subscription status
  const checkStatus = async (isManual = false) => {
    if (isManual) setVerifying(true);
    try {
      const fullMsisdn = formatFullMsisdn(phone || initialMsisdn || "");
      const url = fullMsisdn
        ? `/api/subscription/status?msisdn=${encodeURIComponent(fullMsisdn)}`
        : `/api/subscription/status`;

      const res = await fetch(url);
      const data = await res.json();

      if (data.success && data.has_active_subscription) {
        setStep("success");
        if (pollTimerRef.current) clearInterval(pollTimerRef.current);
        toast.success("Subscription Active! Unlimited access unlocked.", {
          icon: "🎮",
          style: { background: "#059669", color: "#fff" },
        });
        return true;
      } else if (isManual) {
        toast.error("No active subscription detected yet. Please authorize the airtime deduction or try again.", {
          duration: 4000,
        });
      }
      return false;
    } catch (err) {
      if (isManual) toast.error("Failed to verify status. Please check your network.");
      return false;
    } finally {
      if (isManual) setVerifying(false);
    }
  };

  // Auto-poll when waiting
  useEffect(() => {
    if (isOpen && step === "waiting") {
      pollTimerRef.current = setInterval(async () => {
        const active = await checkStatus(false);
        if (active && pollTimerRef.current) {
          clearInterval(pollTimerRef.current);
        }
      }, 3000);

      return () => {
        if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      };
    }
  }, [isOpen, step, phone]);

  // Auto-verify on window focus
  useEffect(() => {
    if (!isOpen) return;

    const handleFocus = async () => {
      await checkStatus(false);
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [isOpen, phone]);

  // Initiate subscription
  const handleStartSubscription = async () => {
    const fullMsisdn = formatFullMsisdn(phone || initialMsisdn || "");
    if (!fullMsisdn || fullMsisdn.length < 10) {
      toast.error("Please enter a valid mobile phone number");
      return;
    }

    setLoadingAction(true);
    try {
      // Auto-save phone number to user profile in background
      fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: fullMsisdn }),
      }).catch((err) => console.warn("Failed to auto-save phone to profile:", err));

      let targetUrl = redirectUrl || redirectAction?.redirection_url;

      // If URL not yet known, query API to get carrier action
      if (!targetUrl) {
        const url = `/api/subscription/status?msisdn=${encodeURIComponent(fullMsisdn)}`;
        const res = await fetch(url);
        const data = await res.json();

        const action = data.client_action?.find(
          (a: any) => a.action === "redirect" && a.redirection_url
        );
        if (action?.redirection_url) {
          targetUrl = action.redirection_url;
        } else {
          // Default fallback to direct Intelli test/live portal for service 82
          targetUrl = `https://api.intellihq.net/api/v1/service/82/test-subscription/`;
        }
      }

      setRedirectUrl(targetUrl || "");
      if (targetUrl) {
        window.open(targetUrl, "_blank");
      }
      setStep("waiting");
    } catch (err) {
      console.error("Subscription flow error:", err);
      toast.error("Unable to start carrier checkout. Please try again.");
    } finally {
      setLoadingAction(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 text-slate-900 shadow-xl">
        {/* Top Close Button */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* ── STEP 1: SELECT PLAN & SUBSCRIBE ─────────────────────────── */}
        {step === "select" && (
          <>
            {/* Header */}
            <div className="flex items-center gap-3.5 mb-5">
              <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                <Zap className="w-5 h-5 fill-current" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-900 tracking-tight">
                  Kick Gaming Pass
                </h3>
                <p className="text-xs text-slate-500">Unlimited access to all games</p>
              </div>
            </div>

            {/* Mobile Number & Carrier Info */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 mb-5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-emerald-600" /> Mobile Line
                </span>
                <span className="text-[10px] text-slate-400 font-medium">Billed from Airtime</span>
              </div>

              <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 focus-within:border-emerald-500 transition-colors">
                <span className="text-xs font-bold text-slate-500 select-none">🇳🇬 +234</span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(formatLocalNumber(e.target.value))}
                  placeholder="8012345678"
                  className="w-full text-xs font-mono font-semibold text-slate-900 outline-none placeholder:text-slate-400"
                />
              </div>

              {/* Supported Telcos */}
              <div className="flex items-center justify-between pt-1 text-[10px] text-slate-500">
                <span>Supported Networks:</span>
                <span className="font-semibold text-slate-700">MTN · GLO · Airtel · 9mobile</span>
              </div>
            </div>

            {/* Primary Action Button (Solid flat Kick green, NO shadows) */}
            <button
              onClick={handleStartSubscription}
              disabled={loadingAction}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl transition-colors cursor-pointer disabled:opacity-60"
            >
              <Zap className="w-4 h-4 fill-current" />
              {loadingAction ? "Connecting to Carrier..." : "Subscribe Now"}
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>
          </>
        )}

        {/* ── STEP 2: WAITING FOR CARRIER PAYMENT CONFIRMATION ─────────── */}
        {step === "waiting" && (
          <div className="py-2 space-y-5 text-center">
            {/* Animated Status Indicator */}
            <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-30" />
              <div className="relative w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                <Smartphone className="w-7 h-7" />
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                Confirming Your Payment
              </h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1 leading-relaxed">
                We opened the subscription page in a new window. Please select your preferred plan and authorize the airtime deduction on your phone.
              </p>
            </div>

            {/* Details Box */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs space-y-2 text-left">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Mobile Line:</span>
                <span className="font-mono font-bold text-slate-800">
                  +{formatFullMsisdn(phone || initialMsisdn)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Access:</span>
                <span className="font-semibold text-emerald-700">
                  Unlimited Gaming Pass
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Status:</span>
                <span className="flex items-center gap-1.5 text-emerald-700 font-semibold text-[11px]">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Awaiting confirmation...
                </span>
              </div>
            </div>

            {/* Buttons */}
            <div className="space-y-2 pt-2">
              <button
                onClick={() => checkStatus(true)}
                disabled={verifying}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl transition-colors cursor-pointer disabled:opacity-60"
              >
                <RotateCcw className={`w-4 h-4 ${verifying ? "animate-spin" : ""}`} />
                {verifying ? "Checking Carrier Status..." : "I've Completed Payment, Check Now"}
              </button>

              {redirectUrl && (
                <button
                  type="button"
                  onClick={() => window.open(redirectUrl, "_blank")}
                  className="w-full flex items-center justify-center gap-1.5 py-2 px-3 text-xs text-slate-600 hover:text-slate-900 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Re-open carrier checkout page
                </button>
              )}

              <button
                type="button"
                onClick={() => setStep("select")}
                className="flex items-center justify-center gap-1 text-xs text-slate-400 hover:text-slate-600 mx-auto pt-1 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Change number
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: SUCCESS ─────────────────────────────────────────── */}
        {step === "success" && (
          <div className="py-4 space-y-4 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto border-2 border-emerald-200">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div>
              <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
                Subscription Activated! 🎮
              </h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1 leading-relaxed">
                Your Unlimited Gaming Pass is now active. Enjoy unlimited access to all games on Kick Game Portal!
              </p>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 text-xs font-semibold text-emerald-800">
              ✓ Subscription verified on +{formatFullMsisdn(phone || initialMsisdn)}
            </div>

            <button
              onClick={() => {
                onClose?.();
                onSubscriptionVerified?.();
              }}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl transition-colors cursor-pointer"
            >
              Start Playing Now
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

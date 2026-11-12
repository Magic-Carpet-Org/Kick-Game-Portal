"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Zap,
  ExternalLink,
  MessageSquare,
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
  const [phone, setPhone] = useState(initialMsisdn || "");
  const [selectedPlan, setSelectedPlan] = useState<"daily" | "weekly">("daily");
  const [loadingAction, setLoadingAction] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [redirectUrl, setRedirectUrl] = useState<string>("");
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  const redirectAction = clientActions.find((a) => a.action === "redirect" && a.redirection_url);
  const promptAction = clientActions.find((a) => a.action === "prompt" && a.instruction);

  // Sync phone if prop changes
  useEffect(() => {
    if (initialMsisdn) {
      setPhone(initialMsisdn);
    }
  }, [initialMsisdn]);

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
      const targetPhone = phone || initialMsisdn || "";
      const url = targetPhone
        ? `/api/subscription/status?msisdn=${encodeURIComponent(targetPhone)}`
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
    setLoadingAction(true);
    try {
      let targetUrl = redirectUrl || redirectAction?.redirection_url;

      // If URL not yet known, query API to get carrier action
      if (!targetUrl) {
        const targetPhone = phone || initialMsisdn || "";
        const url = targetPhone
          ? `/api/subscription/status?msisdn=${encodeURIComponent(targetPhone)}`
          : `/api/subscription/status`;
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

            {/* Plan Selector */}
            <div className="space-y-2.5 mb-4">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Choose Access Plan
              </label>

              <div className="grid grid-cols-2 gap-2.5">
                {/* Daily Pass */}
                <button
                  type="button"
                  onClick={() => setSelectedPlan("daily")}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    selectedPlan === "daily"
                      ? "bg-emerald-50/70 border-emerald-500 text-slate-900"
                      : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100/60"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold">Daily Pass</span>
                    <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                      Popular
                    </span>
                  </div>
                  <p className="text-base font-black text-emerald-700">₦100</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">24 hours unlimited play</p>
                </button>

                {/* Weekly Pass */}
                <button
                  type="button"
                  onClick={() => setSelectedPlan("weekly")}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    selectedPlan === "weekly"
                      ? "bg-emerald-50/70 border-emerald-500 text-slate-900"
                      : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100/60"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold">Weekly Pass</span>
                    <span className="text-[10px] font-semibold bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded">
                      7 Days
                    </span>
                  </div>
                  <p className="text-base font-black text-slate-900">₦500</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Full week unlimited play</p>
                </button>
              </div>
            </div>

            {/* Mobile Number & Carrier Info */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 mb-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-emerald-600" /> Mobile Line
                </span>
                <span className="text-[10px] text-slate-400 font-medium">Billed from Airtime</span>
              </div>

              <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2">
                <span className="text-xs font-bold text-slate-500">🇳🇬 +234</span>
                <input
                  type="tel"
                  value={phone.replace(/^\+?234/, "")}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="08012345678"
                  className="w-full text-xs font-mono font-semibold text-slate-900 outline-none placeholder:text-slate-400"
                />
              </div>

              {/* Supported Telcos */}
              <div className="flex items-center justify-between pt-1 text-[10px] text-slate-500">
                <span>Supported Networks:</span>
                <span className="font-semibold text-slate-700">MTN · GLO · Airtel · 9mobile</span>
              </div>
            </div>

            {/* SMS Instruction Alternative (Only when returned dynamically by carrier API) */}
            {promptAction?.instruction && (
              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-start gap-2.5 mb-5">
                <MessageSquare className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-xs text-slate-600">
                  <p className="font-semibold text-slate-800">
                    {promptAction.instruction}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Or click below to authorize instantly using your mobile airtime.
                  </p>
                </div>
              </div>
            )}

            {/* Primary Action Button (Solid flat Kick green, NO shadows) */}
            <button
              onClick={handleStartSubscription}
              disabled={loadingAction}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl transition-colors cursor-pointer disabled:opacity-60"
            >
              <Zap className="w-4 h-4 fill-current" />
              {loadingAction
                ? "Connecting to Carrier..."
                : `Subscribe with Mobile Airtime (${selectedPlan === "daily" ? "₦100" : "₦500"})`}
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
                We opened your carrier's checkout page in a new window. Please authorize the{" "}
                <span className="font-bold text-slate-700">
                  {selectedPlan === "daily" ? "₦100" : "₦500"}
                </span>{" "}
                airtime deduction on your phone.
              </p>
            </div>

            {/* Details Box */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs space-y-2 text-left">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Mobile Line:</span>
                <span className="font-mono font-bold text-slate-800">
                  +{phone.replace(/^\+/, "")}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Plan:</span>
                <span className="font-semibold text-emerald-700">
                  {selectedPlan === "daily" ? "Daily Pass (₦100)" : "Weekly Pass (₦500)"}
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
                <ChevronLeft className="w-3.5 h-3.5" /> Change number or plan
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
              ✓ Subscription verified on +{phone.replace(/^\+/, "")}
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

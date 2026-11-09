"use client";

import React, { useState } from "react";
import { Zap, ExternalLink, MessageSquare, RotateCcw, ShieldCheck, PhoneCall, X } from "lucide-react";
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
  msisdn,
  clientActions = [],
  onSubscriptionVerified,
}: SubscriptionModalProps) {
  const [verifying, setVerifying] = useState(false);

  const redirectAction = clientActions.find((a) => a.action === "redirect" && a.redirection_url);
  const promptAction = clientActions.find((a) => a.action === "prompt" && a.instruction);

  // Auto-verify when user returns to this tab after subscribing in the other window
  React.useEffect(() => {
    if (!isOpen) return;

    const checkOnFocus = async () => {
      try {
        const url = msisdn
          ? `/api/subscription/status?msisdn=${encodeURIComponent(msisdn)}`
          : `/api/subscription/status`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.success && data.has_active_subscription) {
          toast.success("Subscription Active! Enjoy unlimited gaming.", {
            icon: "🎮",
            style: { background: "#059669", color: "#fff" },
          });
          if (onSubscriptionVerified) {
            onSubscriptionVerified();
          }
        }
      } catch {
        // silent fail on passive check
      }
    };

    window.addEventListener("focus", checkOnFocus);
    return () => window.removeEventListener("focus", checkOnFocus);
  }, [isOpen, msisdn, onSubscriptionVerified]);

  if (!isOpen) return null;

  const handleVerify = async () => {
    setVerifying(true);
    try {
      const url = msisdn
        ? `/api/subscription/status?msisdn=${encodeURIComponent(msisdn)}`
        : `/api/subscription/status`;

      const res = await fetch(url);
      const data = await res.json();

      if (data.success && data.has_active_subscription) {
        toast.success("Subscription Active! Enjoy unlimited gaming.", {
          icon: "🎮",
          style: { background: "#059669", color: "#fff" },
        });
        if (onSubscriptionVerified) {
          onSubscriptionVerified();
        }
      } else {
        toast.error("No active subscription detected yet. Please complete carrier billing or try again.", {
          duration: 4000,
        });
      }
    } catch (err) {
      toast.error("Failed to verify status. Please check your network.");
    } finally {
      setVerifying(false);
    }
  };

  const handleSubscribeClick = () => {
    if (redirectAction?.redirection_url) {
      window.open(redirectAction.redirection_url, "_blank");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 text-slate-900">
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

        {/* Header */}
        <div className="flex items-center gap-3.5 mb-5">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
            <Zap className="w-5 h-5 fill-current" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-slate-900 tracking-tight">Kick Gaming Subscription</h3>
            <p className="text-xs text-slate-500">Direct Carrier Billing / Telco VAS</p>
          </div>
        </div>

        {/* Notice Body */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 mb-4 text-sm text-slate-700 space-y-1.5">
          <p className="font-semibold text-slate-900">
            Unlimited Pay-to-Play Access Required
          </p>
          <p className="text-xs text-slate-500 leading-relaxed">
            To play this game, an active daily or weekly mobile subscription is required on your mobile carrier (MTN, GLO, Airtel, 9mobile).
          </p>

          {msisdn && (
            <div className="flex items-center gap-2 pt-2 text-xs text-emerald-700 font-mono font-medium">
              <PhoneCall className="w-3.5 h-3.5" />
              <span>MSISDN: +{msisdn}</span>
            </div>
          )}
        </div>

        {/* Client Actions */}
        <div className="space-y-3 mb-5">
          {promptAction?.instruction && (
            <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl flex items-start gap-2.5">
              <MessageSquare className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">SMS Instruction</p>
                <p className="text-xs font-semibold text-slate-800 mt-0.5">{promptAction.instruction}</p>
              </div>
            </div>
          )}

          {redirectAction?.redirection_url && (
            <button
              onClick={handleSubscribeClick}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-xl transition-colors cursor-pointer"
            >
              <Zap className="w-4 h-4 fill-current" />
              Subscribe with Mobile Airtime
              <ExternalLink className="w-4 h-4 ml-1" />
            </button>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleVerify}
            disabled={verifying}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${verifying ? "animate-spin text-slate-500" : ""}`} />
            {verifying ? "Verifying..." : "I've Subscribed, Check Status"}
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="py-2.5 px-4 bg-transparent hover:bg-slate-100 text-slate-500 hover:text-slate-700 text-xs font-medium rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
          )}
        </div>

        <div className="flex items-center justify-center gap-1.5 mt-5 text-[11px] text-slate-400 font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Secured by IntelliHQ Direct Carrier Billing</span>
        </div>
      </div>
    </div>
  );
}


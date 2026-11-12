"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import Sidebar from "@/components/dashboard/Sidebar";
import SubscriptionStatusBadge from "@/components/SubscriptionStatusBadge";
import SubscriptionModal from "@/components/SubscriptionModal";
import NotificationBell from "@/components/NotificationBell";
import {
  Receipt,
  Calendar,
  Clock,
  Phone,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Zap,
  ArrowRight,
  RotateCcw,
  Menu,
} from "lucide-react";

interface SubscriptionRecord {
  id: string;
  msisdn: string;
  service_id: number;
  sub_status: string;
  telco?: string;
  starts_date?: string;
  ends_date?: string;
  created_at: string;
  billing_records?: any[];
}

interface BillingRecord {
  id: number | string;
  amount: number;
  created: string;
  billing_type: string;
  telco?: string | null;
  circle_start?: string;
  circle_end?: string;
  fulfilled?: boolean;
}

export default function SubscriptionHistoryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [history, setHistory] = useState<SubscriptionRecord[]>([]);
  const [liveBilling, setLiveBilling] = useState<BillingRecord[]>([]);
  const [activeSub, setActiveSub] = useState<any>(null);
  const [phone, setPhone] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showSubModal, setShowSubModal] = useState(false);

  const fetchHistory = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await fetch("/api/subscription/history");
      if (res.status === 401) {
        router.push("/");
        return;
      }
      const data = await res.json();
      if (data.success) {
        setLiveBilling(data.billing_records || []);
        setActiveSub(data.active_subscription || null);
        setPhone(data.phone || null);
      }
    } catch (err) {
      console.error("Error fetching subscription history:", err);
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      const { data } = await authClient.getSession();
      if (!data?.user) {
        router.push("/");
        return;
      }
      await fetchHistory();
    };
    init();
  }, [router]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "N/A";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const isSubActive = Boolean(activeSub?.sub_active || activeSub?.sub_status === "active");

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <Sidebar
        currentActiveId="subscriptions"
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* ── Main Content Area ────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-12 flex-shrink-0 bg-white border-b border-slate-200 flex items-center px-4 gap-3">
          {/* Mobile Toggle */}
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="md:hidden p-2 -ml-2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-emerald-600" />
            <h1 className="text-sm font-bold text-slate-900">Subscription History</h1>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <SubscriptionStatusBadge onOpenSubscribeModal={() => setShowSubModal(true)} />
            <NotificationBell onOpenSubscribeModal={() => setShowSubModal(true)} />
          </div>
        </header>

        {/* Scrollable Body */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Header Title & Refresh Button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                Billing & Subscription History
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                View your active plan, telco airtime transactions, and subscription validity.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchHistory(true)}
                disabled={refreshing}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
                {refreshing ? "Refreshing..." : "Refresh"}
              </button>

              <button
                onClick={() => setShowSubModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                Subscribe / Renew
              </button>
            </div>
          </div>

          {/* Current Plan Overview Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="flex items-start sm:items-center gap-3.5">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                    isSubActive
                      ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                      : "bg-slate-100 text-slate-400 border border-slate-200"
                  }`}
                >
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">
                      Unlimited Gaming Pass
                    </h3>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        isSubActive
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {isSubActive ? "Active" : "Inactive / Expired"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Mobile Airtime Billing (MTN, Airtel, Glo, 9mobile)
                  </p>
                </div>
              </div>

              {phone && (
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-700">
                  <Phone className="w-3.5 h-3.5 text-emerald-600" />
                  <span>+{phone}</span>
                </div>
              )}
            </div>

            {/* Quick Details */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 text-xs">
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80">
                <p className="text-slate-400 font-medium text-[11px]">Valid From</p>
                <p className="text-slate-800 font-semibold mt-1">
                  {formatDate(activeSub?.starts_date || history[0]?.starts_date)}
                </p>
              </div>

              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80">
                <p className="text-slate-400 font-medium text-[11px]">Valid Until</p>
                <p className="text-slate-800 font-semibold mt-1">
                  {formatDate(activeSub?.ends_date || history[0]?.ends_date)}
                </p>
              </div>

              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80">
                <p className="text-slate-400 font-medium text-[11px]">Service ID</p>
                <p className="text-slate-800 font-semibold mt-1">
                  Service 82 (Direct Telco)
                </p>
              </div>
            </div>
          </div>

          {/* History List / Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Transaction & Renewal Records</h3>
                <p className="text-xs text-slate-500">Every airtime deduction and subscription session recorded.</p>
              </div>
              <span className="text-xs font-semibold text-slate-500">
                {liveBilling.length} record{liveBilling.length !== 1 ? "s" : ""}
              </span>
            </div>

            {loading ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                <RotateCcw className="w-5 h-5 animate-spin mx-auto mb-2 text-slate-400" />
                Loading subscription history...
              </div>
            ) : liveBilling.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {liveBilling.map((bill, index) => (
                  <div
                    key={bill.id || index}
                    className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-slate-800">
                            Mobile Airtime Deduction (₦{bill.amount || 100})
                          </p>
                          <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200/60">
                            Fulfilled
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {bill.billing_type || "SUBSCRIPTION"} · Transaction #{bill.id}
                        </p>
                      </div>
                    </div>

                    <div className="sm:text-right text-xs space-y-0.5">
                      <p className="font-semibold text-slate-800">{formatDate(bill.created || bill.circle_start)}</p>
                      {bill.circle_end && (
                        <p className="text-[11px] text-slate-400">
                          Pass valid until {formatDate(bill.circle_end)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                  <Receipt className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800">No Subscription History Yet</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                    When you subscribe to Kick Gaming using your mobile airtime, your transactions and subscription periods will appear here.
                  </p>
                </div>
                <button
                  onClick={() => setShowSubModal(true)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Subscribe Now
                </button>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Subscription Modal */}
      <SubscriptionModal
        isOpen={showSubModal}
        onClose={() => setShowSubModal(false)}
        msisdn={phone || undefined}
        onSubscriptionVerified={() => {
          setShowSubModal(false);
          fetchHistory(true);
        }}
      />
    </div>
  );
}


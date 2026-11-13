"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { signOut, authClient } from "@/lib/auth-client";
import Sidebar from "@/components/dashboard/Sidebar";
import DashboardSkeleton from "@/components/dashboard/DashboardSkeleton";
import SubscriptionStatusBadge from "@/components/SubscriptionStatusBadge";
import NotificationBell from "@/components/NotificationBell";
import SubscriptionModal from "@/components/SubscriptionModal";
import toast from "react-hot-toast";
import {
  User,
  Mail,
  Smartphone,
  MapPin,
  AtSign,
  ShieldCheck,
  Trophy,
  Gamepad2,
  Zap,
  Calendar,
  CheckCircle2,
  Menu,
  LogOut,
  Save,
  ArrowRight,
  ExternalLink,
} from "lucide-react";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  username: string | null;
  phone: string | null;
  location: string | null;
  image: string | null;
  role: string;
  createdAt: string;
}

interface GamingStats {
  peak_score: number;
  total_matches: number;
  is_sub_active: boolean;
  latest_subscription: any;
}

// Helper to format Nigerian phone numbers for display without 234 / 0 prefix
const formatLocalNumber = (raw?: string | null): string => {
  if (!raw) return "";
  let digits = raw.replace(/[^0-9]/g, "");
  if (digits.startsWith("2340")) digits = digits.substring(4);
  else if (digits.startsWith("234")) digits = digits.substring(3);
  else if (digits.startsWith("0")) digits = digits.substring(1);
  return digits;
};

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showSubModal, setShowSubModal] = useState(false);

  // Profile Form States
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [createdAt, setCreatedAt] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [stats, setStats] = useState<GamingStats | null>(null);

  const phoneInputRef = useRef<HTMLInputElement>(null);
  const locationInputRef = useRef<HTMLInputElement>(null);

  // Loading State
  const [savingProfile, setSavingProfile] = useState(false);

  // Fetch Profile
  const fetchProfile = async () => {
    try {
      const res = await fetch("/api/user/profile");
      const data = await res.json();

      if (!data.success || !data.user) {
        router.push("/");
        return;
      }

      const u: UserProfile = data.user;
      setName(u.name || "");
      setUsername(u.username || "");
      setEmail(u.email || "");
      setPhone(formatLocalNumber(u.phone));
      setLocation(u.location || "");
      setCreatedAt(u.createdAt || "");
      setAvatarUrl(u.image || null);
      setStats(data.stats || null);

      // Auto-focus phone if ?focus=phone in query string
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        if (params.get("focus") === "phone") {
          setTimeout(() => {
            phoneInputRef.current?.focus();
            phoneInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
          }, 250);
        }
      }
    } catch (err) {
      console.error("Failed to load user profile:", err);
      toast.error("Failed to load profile details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  // Handle Save Profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Full name cannot be blank");
      return;
    }
    if (!email.trim()) {
      toast.error("Email address cannot be blank");
      return;
    }

    setSavingProfile(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          username: username.trim() || null,
          email: email.trim().toLowerCase(),
          phone: phone.trim() ? `234${phone.trim()}` : null,
          location: location.trim() || null,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success("Profile updated successfully! 🎉", {
          style: { background: "#059669", color: "#fff" },
        });
        if (data.user) {
          setName(data.user.name || "");
          setUsername(data.user.username || "");
          setEmail(data.user.email || "");
          setPhone(formatLocalNumber(data.user.phone));
          setLocation(data.user.location || "");
        }
      } else {
        toast.error(data.error || "Failed to update profile");
      }
    } catch (err: any) {
      console.error("Profile update error:", err);
      toast.error("Network error while updating profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleLogout = async () => {
    toast.loading("Logging out...", { duration: 2000 });
    try {
      await signOut();
    } catch {
      // ignore
    }
    setTimeout(() => {
      window.location.href = "/";
    }, 300);
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  const joinDate = createdAt
    ? new Date(createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })
    : "";

  const displayName = name || username || email.split("@")[0] || "Gamer";

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <Sidebar
        currentActiveId="profile"
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
            <User className="w-4 h-4 text-emerald-600" />
            <h1 className="text-sm font-bold text-slate-900">Player Profile</h1>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <SubscriptionStatusBadge onOpenSubscribeModal={() => setShowSubModal(true)} />
            <NotificationBell onOpenSubscribeModal={() => setShowSubModal(true)} />
            <button
              onClick={handleLogout}
              className="w-8 h-8 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center hover:bg-red-50 hover:border-red-200 transition-all group cursor-pointer"
              title="Log out"
            >
              <LogOut className="w-3.5 h-3.5 text-slate-500 group-hover:text-red-600" />
            </button>
          </div>
        </header>

        {/* Scrollable Body */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl mx-auto w-full">

          {/* ── 0. Profile Completion Prompt Banner (if phone or location missing) ── */}
          {(!phone || !location) && (
            <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-emerald-500/5 border border-emerald-500/30 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs animate-fadeIn">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200">
                  <Smartphone className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">
                      Finish Setting Up Your Gamer Profile
                    </h3>
                    <span className="text-[10px] font-black text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      {!phone && !location ? "50% Complete" : "75% Complete"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 max-w-xl leading-relaxed">
                    {!phone
                      ? "Add your mobile phone number for 1-click airtime game passes and state for regional leaderboard rankings."
                      : "Set your location to represent your state on regional tournament leaderboards."}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!phone) {
                    phoneInputRef.current?.focus();
                    phoneInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                  } else {
                    locationInputRef.current?.focus();
                    locationInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                  }
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer"
              >
                Complete Profile Below ↓
              </button>
            </div>
          )}

          {/* ── 1. Hero Profile Header Card ─────────────────────────────────── */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
              <div className="flex items-center gap-4">
                {/* Avatar with Status Ring */}
                <div className="relative">
                  {avatarUrl ? (
                    <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-emerald-500 shadow-xs relative">
                      <Image src={avatarUrl} alt="Avatar" fill className="object-cover" />
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-xl font-black text-white shadow-xs border-2 border-emerald-500/30">
                      {displayName[0]?.toUpperCase()}
                    </div>
                  )}
                  <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full" title="Online" />
                </div>

                {/* Name & Identity */}
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                      {displayName}
                    </h2>
                    {username && (
                      <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                        @{username}
                      </span>
                    )}
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/90 border border-emerald-200 px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Kick Gamer
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-3 flex-wrap">
                    <span>{email}</span>
                    {joinDate && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" /> Member since {joinDate}
                      </span>
                    )}
                    {location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" /> {location}
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Stats Chips */}
              <div className="flex items-center gap-3 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                <div className="px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-center min-w-24">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Peak Score</p>
                  <p className="text-base font-black text-emerald-600 flex items-center justify-center gap-1 mt-0.5">
                    <Trophy className="w-3.5 h-3.5 text-amber-500" />
                    {(stats?.peak_score || 0).toLocaleString()}
                  </p>
                </div>

                <div className="px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-center min-w-24">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Matches</p>
                  <p className="text-base font-black text-slate-800 flex items-center justify-center gap-1 mt-0.5">
                    <Gamepad2 className="w-3.5 h-3.5 text-emerald-600" />
                    {(stats?.total_matches || 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ── 2. Grid: Personal Details & Password Forms ──────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* ── LEFT: Edit Details Form ──────────────────────────────────── */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-xs">
              <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100 mb-5">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Personal Details</h3>
                  <p className="text-xs text-slate-500">Update your gamer identity and contact info</p>
                </div>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-4">
                {/* Full Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">Full Name</label>
                  <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus-within:border-emerald-500 focus-within:bg-white transition-all">
                    <User className="w-4 h-4 text-slate-400 shrink-0" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your full name"
                      className="w-full text-xs font-semibold text-slate-900 outline-none bg-transparent placeholder:text-slate-400"
                      required
                    />
                  </div>
                </div>

                {/* Username */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">Username</label>
                  <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus-within:border-emerald-500 focus-within:bg-white transition-all">
                    <AtSign className="w-4 h-4 text-slate-400 shrink-0" />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
                      placeholder="username"
                      className="w-full text-xs font-mono font-semibold text-slate-900 outline-none bg-transparent placeholder:text-slate-400"
                    />
                  </div>
                </div>

                {/* Email Address */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">Email Address</label>
                  <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus-within:border-emerald-500 focus-within:bg-white transition-all">
                    <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full text-xs font-semibold text-slate-900 outline-none bg-transparent placeholder:text-slate-400"
                      required
                    />
                  </div>
                </div>

                {/* Mobile Phone Number */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <span>Mobile Phone Number</span>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                        Required for Airtime Payments
                      </span>
                    </label>
                    <span className="text-[10px] font-normal text-slate-400 hidden sm:inline">Used for carrier pass</span>
                  </div>
                  <div className={`flex items-center gap-2 bg-slate-50 border rounded-xl px-3 py-2.5 transition-all focus-within:border-emerald-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-emerald-500/15 ${
                    !phone ? "border-emerald-300 bg-emerald-50/20" : "border-slate-200"
                  }`}>
                    <span className="text-xs font-bold text-slate-500 select-none">🇳🇬 +234</span>
                    <input
                      ref={phoneInputRef}
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(formatLocalNumber(e.target.value))}
                      placeholder="8012345678"
                      className="w-full text-xs font-mono font-semibold text-slate-900 outline-none bg-transparent placeholder:text-slate-400"
                    />
                  </div>
                </div>

                {/* Location */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <span>Location / State</span>
                      <span className="text-[10px] font-bold text-teal-700 bg-teal-100 px-2 py-0.5 rounded-full border border-teal-200">
                        For Regional Leaderboards
                      </span>
                    </label>
                  </div>
                  <div className={`flex items-center gap-2 bg-slate-50 border rounded-xl px-3 py-2.5 transition-all focus-within:border-emerald-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-emerald-500/15 ${
                    !location ? "border-teal-300 bg-teal-50/20" : "border-slate-200"
                  }`}>
                    <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                    <input
                      ref={locationInputRef}
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="e.g. Lagos, Nigeria"
                      className="w-full text-xs font-semibold text-slate-900 outline-none bg-transparent placeholder:text-slate-400"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer disabled:opacity-60 shadow-xs"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {savingProfile ? "Saving Changes..." : "Save Profile Details"}
                  </button>
                </div>
              </form>
            </div>

            {/* ── RIGHT: Security & Membership ─────────────────────────────── */}
            <div className="space-y-6">
              {/* ── Membership & Subscription Card ───────────────────────────── */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center">
                      <Zap className="w-4 h-4 fill-current" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-slate-900">Gaming Pass Status</h4>
                      <p className="text-[11px] text-slate-500">Carrier airtime membership</p>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      stats?.is_sub_active
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {stats?.is_sub_active ? "Active" : "Inactive"}
                  </span>
                </div>

                <div className="pt-1 flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={() => router.push("/dashboard/subscriptions")}
                    className="text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    View Billing History <ArrowRight className="w-3 h-3" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowSubModal(true)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-lg transition-colors cursor-pointer shadow-xs"
                  >
                    {stats?.is_sub_active ? "Renew Pass" : "Subscribe Now"}
                  </button>
                </div>
              </div>

              {/* ── Passwordless Account Protection Card ─────────────────────── */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-3">
                <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xs text-slate-900">Account Security</h3>
                    <p className="text-[11px] text-slate-500">Passwordless One-Time Code Login</p>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-600 space-y-2">
                  <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-xs">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                    <span>Password-Free Protected</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-slate-500">
                    Your account uses secure 6-digit one-time codes sent directly to <strong className="text-slate-700 font-medium">{email}</strong> whenever you sign in. You never have to worry about forgotten or stolen passwords.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Subscription Modal */}
      <SubscriptionModal
        isOpen={showSubModal}
        onClose={() => setShowSubModal(false)}
        msisdn={phone ? `234${phone}` : undefined}
        onSubscriptionVerified={() => {
          setShowSubModal(false);
          fetchProfile();
        }}
      />
    </div>
  );
}


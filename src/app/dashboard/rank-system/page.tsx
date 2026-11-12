"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Trophy,
  Gamepad2,
  Medal,
  Crown,
  Sparkles,
  Menu,
  TrendingUp,
  ShieldCheck,
  Zap,
  Target,
  Flame,
  Award,
  ArrowRight,
  HelpCircle,
  Clock,
  CheckCircle2,
} from "lucide-react";
import Sidebar from "@/components/dashboard/Sidebar";
import SubscriptionStatusBadge from "@/components/SubscriptionStatusBadge";
import SubscriptionModal from "@/components/SubscriptionModal";
import NotificationBell from "@/components/NotificationBell";

const RANK_TIERS = [
  {
    tier: "Grand Champion / Legend",
    icon: <Crown className="w-5 h-5 text-amber-500" />,
    badgeBg: "bg-amber-100 text-amber-900 border-amber-300",
    points: "10,000+ pts / Top 3",
    description: "Featured atop the #1, #2, and #3 podium pedestals on the Global Leaderboard with custom spotlight cards.",
    color: "from-amber-500/10 to-yellow-500/10 border-amber-200",
  },
  {
    tier: "Diamond Master",
    icon: <Sparkles className="w-5 h-5 text-cyan-600" />,
    badgeBg: "bg-cyan-100 text-cyan-900 border-cyan-300",
    points: "5,000 – 9,999 pts",
    description: "Elite tier gamers who consistently break high-score ceilings across multiple competitive titles.",
    color: "from-cyan-500/10 to-blue-500/10 border-cyan-200",
  },
  {
    tier: "Platinum Striker",
    icon: <Medal className="w-5 h-5 text-emerald-600" />,
    badgeBg: "bg-emerald-100 text-emerald-900 border-emerald-300",
    points: "2,500 – 4,999 pts",
    description: "Experienced players climbing into the top ranks with strong game consistency and high play counts.",
    color: "from-emerald-500/10 to-teal-500/10 border-emerald-200",
  },
  {
    tier: "Gold Challenger",
    icon: <Award className="w-5 h-5 text-indigo-600" />,
    badgeBg: "bg-indigo-100 text-indigo-900 border-indigo-300",
    points: "1,000 – 2,499 pts",
    description: "Solid competitors actively logging matches and securing leaderboard positions.",
    color: "from-indigo-500/10 to-violet-500/10 border-indigo-200",
  },
  {
    tier: "Rookie Contender",
    icon: <Target className="w-5 h-5 text-slate-600" />,
    badgeBg: "bg-slate-100 text-slate-800 border-slate-300",
    points: "0 – 999 pts",
    description: "Starting rank for every player. Finish matches to unlock your initial high score record.",
    color: "from-slate-100 to-slate-50 border-slate-200",
  },
];

const LEADERBOARD_RULES = [
  {
    icon: <Trophy className="w-5 h-5 text-emerald-600" />,
    title: "Peak High Score Ranking",
    description:
      "Your position is decided by your single highest score record. If you score 850 in one match and 1,200 in the next, your record immediately jumps to 1,200.",
  },
  {
    icon: <Gamepad2 className="w-5 h-5 text-emerald-600" />,
    title: "Global & Per-Game Boards",
    description:
      "Global rankings highlight your best score across all Kick games, proudly displaying which title you achieved it in. Per-game filters rank you against players of that exact game.",
  },
  {
    icon: <ShieldCheck className="w-5 h-5 text-emerald-600" />,
    title: "Verified Engine Completion",
    description:
      "Scores are only recorded from completed game sessions through Kick's verified postMessage game harness. Matches abandoned midway are excluded for fair play.",
  },
  {
    icon: <Clock className="w-5 h-5 text-emerald-600" />,
    title: "Real-Time Sync & Tie-Breakers",
    description:
      "Rankings refresh instantly as matches complete. If two players share the exact same high score, the player who set it first holds the higher spot.",
  },
];

const FAQS = [
  {
    q: "Does playing more games increase my high score?",
    a: "Your rank is based on your peak personal best score in a single match, rather than cumulative points. However, your total matches played is tracked and displayed right beside your score to show your dedication.",
  },
  {
    q: "How does the Global All Games leaderboard work?",
    a: "The Global Leaderboard identifies each player's highest scoring game on Kick and ranks players by that peak score, displaying a badge showing the game title (e.g. 🎮 Switchback).",
  },
  {
    q: "Do I need an active subscription to be on the leaderboard?",
    a: "Yes. Playing games and recording verified match high scores requires an active Kick Gaming Pass.",
  },
  {
    q: "Can I hold high ranks in more than one game?",
    a: "Absolutely! You can hold top spots across individual game leaderboards simultaneously.",
  },
];

export default function RankSystemPage() {
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showSubModal, setShowSubModal] = useState(false);

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <Sidebar
        currentActiveId="rank-system"
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
            <Trophy className="w-4 h-4 text-emerald-600" />
            <h1 className="text-sm font-bold text-slate-900">Rank System & Leaderboard Guide</h1>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <SubscriptionStatusBadge onOpenSubscribeModal={() => setShowSubModal(true)} />
            <NotificationBell onOpenSubscribeModal={() => setShowSubModal(true)} />
          </div>
        </header>

        {/* Scrollable Body */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Hero Banner */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-800 p-6 sm:p-8 text-white shadow-sm">
            <div className="relative z-10 max-w-2xl space-y-3">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-xs font-semibold text-emerald-100">
                <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
                <span>Kick Competitive Gaming</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                How the Kick Rank System Works
              </h2>
              <p className="text-sm text-emerald-100/90 leading-relaxed">
                Compete against gamers across Nigeria. Every match you finish logs your verified score, pushes you up the global tiers, and earns you a spot on the Champions Podium.
              </p>
              <div className="pt-2 flex flex-wrap items-center gap-3">
                <button
                  onClick={() => router.push("/dashboard/leaderboard")}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white text-emerald-800 hover:bg-emerald-50 text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer"
                >
                  <Trophy className="w-4 h-4 text-emerald-600" />
                  View Live Leaderboard
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => router.push("/dashboard/games")}
                  className="flex items-center gap-2 px-4 py-2.5 bg-emerald-800/60 hover:bg-emerald-800/90 text-white text-xs font-semibold rounded-xl border border-emerald-500/40 transition-all cursor-pointer"
                >
                  <Gamepad2 className="w-4 h-4" />
                  Play Games Now
                </button>
              </div>
            </div>
          </div>

          {/* Core Scoring Mechanics Cards */}
          <div>
            <div className="mb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Target className="w-4 h-4 text-emerald-600" /> Scoring Mechanics & Rules
              </h3>
              <p className="text-xs text-slate-500">
                Understand how scores are calculated, verified, and placed on the live leaderboard.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {LEADERBOARD_RULES.map((rule, idx) => (
                <div
                  key={idx}
                  className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-emerald-300 transition-all shadow-xs"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
                      {rule.icon}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 mb-1">{rule.title}</h4>
                      <p className="text-xs text-slate-600 leading-relaxed">{rule.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tier Progression Ladder */}
          <div>
            <div className="mb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Crown className="w-4 h-4 text-amber-500" /> Competitive Rank Tiers
              </h3>
              <p className="text-xs text-slate-500">
                Push your high score higher to advance through competitive tiers.
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100 shadow-xs">
              {RANK_TIERS.map((tier, idx) => (
                <div
                  key={idx}
                  className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r ${tier.color}`}
                >
                  <div className="flex items-start sm:items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-xs">
                      {tier.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-slate-900">{tier.tier}</h4>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${tier.badgeBg}`}
                        >
                          {tier.points}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1">{tier.description}</p>
                    </div>
                  </div>
                  <div className="text-right sm:shrink-0 pl-13 sm:pl-0">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Tier #{idx + 1}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Step by Step Guide: How to Climb */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-4">
              <Flame className="w-4 h-4 text-emerald-600" /> How to Climb the Ranks
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white font-black text-xs flex items-center justify-center">
                  1
                </div>
                <h4 className="text-xs font-bold text-slate-900">Subscribe & Unlock</h4>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Activate an access pass to play unlimited games and submit verified scores.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white font-black text-xs flex items-center justify-center">
                  2
                </div>
                <h4 className="text-xs font-bold text-slate-900">Choose Your Game</h4>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Select your strongest title from the Kick games library and master its gameplay.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white font-black text-xs flex items-center justify-center">
                  3
                </div>
                <h4 className="text-xs font-bold text-slate-900">Complete the Match</h4>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Play through to match completion so the game engine automatically saves your score.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white font-black text-xs flex items-center justify-center">
                  4
                </div>
                <h4 className="text-xs font-bold text-slate-900">Claim the Podium</h4>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Outscore the competition to claim the #1, #2, or #3 podium spots on the leaderboard!
                </p>
              </div>
            </div>
          </div>

          {/* Frequently Asked Questions */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-4">
              <HelpCircle className="w-4 h-4 text-emerald-600" /> Frequently Asked Questions
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {FAQS.map((faq, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1.5">
                  <h4 className="text-xs font-bold text-slate-900 flex items-start gap-1.5">
                    <span className="text-emerald-600 font-black">Q:</span> {faq.q}
                  </h4>
                  <p className="text-[11px] text-slate-600 leading-relaxed pl-4">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>

      {/* Subscription Modal */}
      <SubscriptionModal
        isOpen={showSubModal}
        onClose={() => setShowSubModal(false)}
      />
    </div>
  );
}


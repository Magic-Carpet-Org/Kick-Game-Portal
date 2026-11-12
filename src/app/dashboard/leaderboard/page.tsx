"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Trophy,
  Gamepad2,
  Medal,
  Crown,
  Search,
  Sparkles,
  Menu,
  TrendingUp,
  User,
  Zap,
} from "lucide-react";
import Sidebar from "@/components/dashboard/Sidebar";
import DashboardSkeleton from "@/components/dashboard/DashboardSkeleton";
import SubscriptionStatusBadge from "@/components/SubscriptionStatusBadge";
import NotificationBell from "@/components/NotificationBell";
import { authClient } from "@/lib/auth-client";

interface LeaderboardEntry {
  user_id: string;
  player_name: string;
  username: string;
  avatar_url: string | null;
  high_score: number;
  game_title?: string;
  game_id?: string;
  total_plays: number;
  last_played_at: string;
}

interface Game {
  id: string;
  title: string;
  thumbnail_url: string | null;
}

export default function LeaderboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [selectedGameId, setSelectedGameId] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const { data } = await authClient.getSession();
        if (!data?.user) {
          router.push("/");
          return;
        }

        // Fetch games list
        const gamesRes = await fetch("/api/games");
        const gamesJson = await gamesRes.json();
        if (gamesJson.success) {
          setGames(gamesJson.games || []);
        }

        // Fetch leaderboard
        await fetchLeaderboard("all");
      } catch (err) {
        console.error("Leaderboard init error:", err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [router]);

  const fetchLeaderboard = async (gameId: string) => {
    try {
      const url = gameId && gameId !== "all" ? `/api/leaderboard?gameId=${gameId}` : "/api/leaderboard";
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setLeaderboard(data.leaderboard || []);
      }
    } catch (err) {
      console.error("Fetch leaderboard error:", err);
    }
  };

  const handleGameSelect = async (gameId: string) => {
    setSelectedGameId(gameId);
    setLoading(true);
    await fetchLeaderboard(gameId);
    setLoading(false);
  };

  const filtered = leaderboard.filter(
    (e) =>
      !search ||
      e.player_name?.toLowerCase().includes(search.toLowerCase()) ||
      e.username?.toLowerCase().includes(search.toLowerCase())
  );

  const topThree = filtered.slice(0, 3);
  const restEntries = filtered.slice(3);

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        currentActiveId="leaderboard"
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-14 bg-white border-b border-slate-200/80 px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden p-2 -ml-2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              <span className="font-extrabold text-base text-slate-900 tracking-tight">Leaderboard</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <SubscriptionStatusBadge />
            <NotificationBell />
            <button
              onClick={() => router.push("/dashboard/profile")}
              className="w-8 h-8 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center hover:bg-slate-100 transition-all cursor-pointer"
              title="My Profile"
            >
              <User className="w-3.5 h-3.5 text-slate-600" />
            </button>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              <Zap className="w-3 h-3 fill-current" />
              <span>Live Scores</span>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-5xl mx-auto space-y-6">
            
            {/* Title & Filter Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">Champions & High Scores</h1>
                <p className="text-xs text-slate-500 mt-1">Real-time player rankings across Kick games</p>
              </div>

              {/* Game Selector */}
              <div className="flex items-center gap-2">
                <Gamepad2 className="w-4 h-4 text-slate-400 shrink-0" />
                <select
                  value={selectedGameId}
                  onChange={(e) => handleGameSelect(e.target.value)}
                  className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-xs cursor-pointer"
                >
                  <option value="all">All Games Combined</option>
                  {games.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Top 3 Podium (Gold, Silver, Bronze) */}
            {!loading && topThree.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
                {/* 2nd Place */}
                {topThree[1] && (
                  <div className="order-2 md:order-1 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col items-center text-center relative overflow-hidden">
                    <div className="absolute top-3 left-3 flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                      #2 Silver
                    </div>
                    <div className="w-16 h-16 rounded-full bg-slate-100 border-2 border-slate-300 flex items-center justify-center font-black text-lg text-slate-600 mb-3 shadow-inner">
                      {topThree[1].player_name[0]?.toUpperCase() || "2"}
                    </div>
                    <h3 className="font-bold text-sm text-slate-900 truncate max-w-[180px]">{topThree[1].player_name}</h3>
                    <p className="text-[11px] text-slate-400">@{topThree[1].username || "player"}</p>
                    <div className="mt-3 px-3 py-1 bg-slate-100 rounded-xl text-xs font-black text-slate-800">
                      {topThree[1].high_score.toLocaleString()} pts
                    </div>
                    {topThree[1].game_title && (
                      <span className="text-[10px] font-semibold text-slate-600 bg-slate-50 border border-slate-200/80 px-2 py-0.5 rounded-md mt-1.5 flex items-center gap-1">
                        <Gamepad2 className="w-2.5 h-2.5 text-emerald-600" /> {topThree[1].game_title}
                      </span>
                    )}
                  </div>
                )}

                {/* 1st Place (Champion) */}
                {topThree[0] && (
                  <div className="order-1 md:order-2 bg-gradient-to-b from-amber-500/10 to-transparent border border-amber-500/30 rounded-2xl p-6 shadow-md flex flex-col items-center text-center relative overflow-hidden transform md:-translate-y-2">
                    <div className="absolute top-3 left-3 flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full">
                      <Crown className="w-3 h-3 fill-current text-amber-500" />
                      Champion #1
                    </div>
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 border-4 border-amber-300 flex items-center justify-center font-black text-2xl text-white mb-3 shadow-lg shadow-amber-500/20">
                      {topThree[0].player_name[0]?.toUpperCase() || "1"}
                    </div>
                    <h3 className="font-extrabold text-base text-slate-900 truncate max-w-[200px]">{topThree[0].player_name}</h3>
                    <p className="text-xs text-amber-600 font-semibold">@{topThree[0].username || "player"}</p>
                    <div className="mt-3 px-4 py-1.5 bg-amber-500 text-white rounded-xl text-sm font-black shadow-sm">
                      {topThree[0].high_score.toLocaleString()} pts
                    </div>
                    {topThree[0].game_title && (
                      <span className="text-[10px] font-bold text-amber-900 bg-amber-100/90 border border-amber-200 px-2.5 py-0.5 rounded-md mt-1.5 flex items-center gap-1">
                        <Gamepad2 className="w-2.5 h-2.5 text-amber-700" /> {topThree[0].game_title}
                      </span>
                    )}
                  </div>
                )}

                {/* 3rd Place */}
                {topThree[2] && (
                  <div className="order-3 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col items-center text-center relative overflow-hidden">
                    <div className="absolute top-3 left-3 flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full">
                      #3 Bronze
                    </div>
                    <div className="w-16 h-16 rounded-full bg-orange-50 border-2 border-orange-200 flex items-center justify-center font-black text-lg text-amber-800 mb-3 shadow-inner">
                      {topThree[2].player_name[0]?.toUpperCase() || "3"}
                    </div>
                    <h3 className="font-bold text-sm text-slate-900 truncate max-w-[180px]">{topThree[2].player_name}</h3>
                    <p className="text-[11px] text-slate-400">@{topThree[2].username || "player"}</p>
                    <div className="mt-3 px-3 py-1 bg-slate-100 rounded-xl text-xs font-black text-slate-800">
                      {topThree[2].high_score.toLocaleString()} pts
                    </div>
                    {topThree[2].game_title && (
                      <span className="text-[10px] font-semibold text-slate-600 bg-slate-50 border border-slate-200/80 px-2 py-0.5 rounded-md mt-1.5 flex items-center gap-1">
                        <Gamepad2 className="w-2.5 h-2.5 text-emerald-600" /> {topThree[2].game_title}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Ranked Table */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <span className="font-bold text-xs uppercase tracking-wider text-slate-400">Rankings</span>
                <span className="text-xs text-slate-500 font-medium">{filtered.length} Competitors</span>
              </div>

              {loading ? (
                <div className="p-8 text-center text-slate-400 text-xs font-medium">Loading rankings...</div>
              ) : filtered.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-sm font-medium">
                  No match scores recorded yet. Be the first to play and set the record!
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filtered.map((entry, index) => {
                    const rank = index + 1;
                    return (
                      <div
                        key={entry.user_id + rank}
                        className="flex items-center justify-between p-4 hover:bg-slate-50/80 transition-colors"
                      >
                        <div className="flex items-center gap-3.5">
                          <span
                            className={`w-7 text-center font-black text-sm ${
                              rank === 1
                                ? "text-amber-500"
                                : rank === 2
                                ? "text-slate-400"
                                : rank === 3
                                ? "text-amber-700"
                                : "text-slate-400 font-medium"
                            }`}
                          >
                            #{rank}
                          </span>

                          <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-xs text-slate-700">
                            {entry.player_name[0]?.toUpperCase() || "P"}
                          </div>

                          <div>
                            <p className="font-bold text-xs text-slate-900">{entry.player_name}</p>
                            <p className="text-[10px] text-slate-400">@{entry.username || "gamer"}</p>
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="font-black text-xs text-slate-900">{entry.high_score.toLocaleString()} pts</p>
                          <div className="flex items-center justify-end gap-1.5 mt-0.5">
                            {entry.game_title && (
                              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 flex items-center gap-1">
                                <Gamepad2 className="w-2.5 h-2.5 text-emerald-600" />
                                {entry.game_title}
                              </span>
                            )}
                            <span className="text-[10px] text-slate-400">· {entry.total_plays} played</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}

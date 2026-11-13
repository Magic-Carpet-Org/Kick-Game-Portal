"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { signOut, authClient } from "@/lib/auth-client";
import SubscriptionModal from "@/components/SubscriptionModal";
import SubscriptionStatusBadge from "@/components/SubscriptionStatusBadge";
import NotificationBell from "@/components/NotificationBell";
import toast, { Toaster } from "react-hot-toast";
import {
    LogOut, Sparkles, Zap, Search, Bell, Home,
    Gamepad2, Users, HelpCircle, BarChart3, Globe,
    Trophy, Play, Folder, TrendingUp, UserCheck, UserMinus,
    MapPin, Calendar, Hash, ExternalLink, DoorOpen, Star, Menu,
    ChevronDown, ChevronUp, Loader2
} from "lucide-react";
import Sidebar from "@/components/dashboard/Sidebar";
import DashboardSkeleton from "@/components/dashboard/DashboardSkeleton";
import { usePresence } from "@/hooks/usePresence";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Game {
    id: string;
    title: string;
    description: string;
    thumbnail_url: string;
    game_url: string;
    status: string;
    plays: number;
    version: string;
    created_at: string;
    avg_rating?: number;
    total_ratings?: number;
}

interface Collection {
    id: string;
    name: string;
    description: string;
    image_url: string;
}

// ─── Static chat data ──────────────────────────────────────────────────────────

const CHAT_MESSAGES = [
    { user: "DragonSlayer", msg: "Just unlocked a new game! 🔥", time: "2m", color: "#f59e0b" },
    { user: "MoonWizard", msg: "Anyone tried the new collection?", time: "4m", color: "#8b5cf6" },
    { user: "StarLord", msg: "This platform is insane 🎮", time: "6m", color: "#10b981" },
    { user: "JacobClark", msg: "GG everyone, see you at the top!", time: "9m", color: "#3b82f6" },
    { user: "NightOwl", msg: "Just hit a new high score 🎉", time: "12m", color: "#ec4899" },
];

const NAV_ITEMS = [
    { icon: <Home className="w-4 h-4" />, label: "Home", id: "home", href: "/dashboard" },
    { icon: <Gamepad2 className="w-4 h-4" />, label: "Games", id: "games", href: "/dashboard/games" },
    { icon: <Folder className="w-4 h-4" />, label: "Collections", id: "collections", href: "/dashboard/collections" },
    { icon: <Trophy className="w-4 h-4" />, label: "Leaderboard", id: "leaderboard", href: "/dashboard/leaderboard" },
];

const GRADIENTS = [
    { from: "from-emerald-50 to-teal-100", accent: "#10b981", text: "text-emerald-700" },
    { from: "from-amber-50 to-orange-100", accent: "#f59e0b", text: "text-amber-700" },
    { from: "from-violet-50 to-indigo-100", accent: "#8b5cf6", text: "text-violet-700" },
    { from: "from-blue-50 to-sky-100", accent: "#3b82f6", text: "text-blue-700" },
    { from: "from-pink-50 to-rose-100", accent: "#ec4899", text: "text-pink-700" },
    { from: "from-lime-50 to-emerald-100", accent: "#84cc16", text: "text-lime-700" },
];

// ─── Component ─────────────────────────────────────────────────────────────────

export default function UserDashboard() {
    const [user, setUser] = useState<any>(null);
    const [profile, setProfile] = useState<any>(null);
    const [games, setGames] = useState<Game[]>([]);
    const [collections, setCollections] = useState<Collection[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeNav, setActiveNav] = useState("home");
    const [featuredGames, setFeaturedGames] = useState<Game[]>([]);
    const [activeTab, setActiveTab] = useState("ALL");
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
    const [favouriteIds, setFavouriteIds] = useState<string[]>([]);
    const [realFriends, setRealFriends] = useState<any[]>([]);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isFriendsCollapsed, setIsFriendsCollapsed] = useState(true);
    const router = useRouter();
    const [loadingGameId, setLoadingGameId] = useState<string | null>(null);

    // Subscription Modal State (Intelli VAS Pay-to-Play Gate)
    const [showSubModal, setShowSubModal] = useState(false);
    const [subClientActions, setSubClientActions] = useState<any[]>([]);
    const [subMsisdn, setSubMsisdn] = useState<string>("");

    // Real-time presence
    const { isOnline, onlineCount } = usePresence(user?.id);
    const onlineFriendsCount = realFriends.filter(f => isOnline(f.friend_id)).length;

    // ── Auth + data fetch ──────────────────────────────────────────────────────
    useEffect(() => {
        const init = async () => {
            try {
                const { data: sessionData } = await authClient.getSession();
                if (!sessionData?.user) {
                    router.push("/");
                    return;
                }
                setUser(sessionData.user);
                setProfile(sessionData.user);
                if ((sessionData.user as any).phone) {
                    setSubMsisdn((sessionData.user as any).phone);
                }

                // Fetch published games from Neon DB API
                const gamesRes = await fetch("/api/games");
                const gamesJson = await gamesRes.json();
                if (gamesJson.success) {
                    const fetchedGames = gamesJson.games || [];
                    setGames(fetchedGames);
                    setFeaturedGames(fetchedGames.slice(0, 5));
                }

                // Fetch collections from Neon DB API
                const colRes = await fetch("/api/collections");
                const colJson = await colRes.json();
                if (colJson.success) {
                    setCollections(colJson.collections || []);
                }
            } catch (err) {
                console.error("Dashboard init error:", err);
                router.push("/");
            } finally {
                setLoading(false);
            }
        };
        init();
    }, [router]);

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

    // Auto-rotate featured games carousel (full-width slideshow)
    const [activeSlide, setActiveSlide] = useState(0);

    useEffect(() => {
        if (featuredGames.length <= 1) return;

        const interval = setInterval(() => {
            setActiveSlide((prev) => (prev + 1) % featuredGames.length);
        }, 5000);

        return () => clearInterval(interval);
    }, [featuredGames]);

    const handlePlayGame = async (game: Game) => {
        if (!game.game_url || loadingGameId) return;
        setLoadingGameId(game.id);
        try {
            // Call session generation API (verifies telco subscription)
            const response = await fetch("/api/game/session", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    gameId: game.id,
                    mode: 'single_player'
                })
            });

            const resData = await response.json();

            // Pay-to-Play subscription gate: if user is not subscribed, prompt carrier subscription
            if (response.status === 402 || resData.subscription_required) {
                setSubClientActions(resData.client_action || []);
                setSubMsisdn(resData.msisdn || (user as any)?.phone || "");
                setShowSubModal(true);
                setLoadingGameId(null);
                return;
            }

            if (!response.ok || !resData.success) {
                throw new Error(resData.error || "Failed to start game session");
            }

            // Redirect to the unified play page
            router.push(`/dashboard/play/${resData.sessionId}`);
        } catch (err: any) {
            console.error("Error launching game session:", err);
            alert(err.message || "Failed to start game session");
            setLoadingGameId(null);
        }
    };

    // ── Derived data ───────────────────────────────────────────────────────────
    // Prefer profiles table data over auth metadata
    const displayName = profile?.username || profile?.full_name || user?.user_metadata?.first_name || user?.email?.split("@")[0] || "Adventurer";
    const fullName = profile?.full_name || user?.user_metadata?.full_name || displayName;
    const location = profile?.location || user?.user_metadata?.location;
    const joinDate = (profile?.created_at || user?.created_at)
        ? new Date(profile?.created_at || user?.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })
        : "";

    const filteredGames = games.filter(g => {
        const matchesSearch = g.title.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesSearch;
    });

    const topGames = [...games].sort((a, b) => (b.plays || 0) - (a.plays || 0)).slice(0, 4);
    const newGames = [...games].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 4);

    // Top Rated Logic: Rating >= 3, sorted by rating desc
    const topRatedGames = [...games]
        .filter(g => (g.avg_rating || 0) >= 3)
        .sort((a, b) => (b.avg_rating || 0) - (a.avg_rating || 0));

    const favouriteGames = games.filter(g => favouriteIds.includes(g.id));

    const displayedGames = activeTab === "TOP" ? topRatedGames : activeTab === "FAV" ? favouriteGames : filteredGames;

    if (loading) {
        return <DashboardSkeleton />;
    }

    return (
        <div className="flex h-screen w-full bg-slate-50 text-slate-900 font-sans overflow-hidden">

            {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
            <Sidebar 
                onNavItemClick={setActiveNav} 
                currentActiveId={activeNav} 
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
            />

            {/* ── Main ────────────────────────────────────────────────────────────── */}
            <div className="flex-1 flex flex-col overflow-hidden">

                {/* Top Bar */}
                <header className="h-12 flex-shrink-0 bg-white border-b border-slate-200 flex items-center px-4 gap-3">
                    {/* Mobile Toggle */}
                    <button 
                        onClick={() => setIsSidebarOpen(true)}
                        className="md:hidden p-2 -ml-2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        <Menu className="w-5 h-5" />
                    </button>

                    <div className="flex-1" />

                    {/* Search */}
                    <div className="relative hidden md:block">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                        <input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-slate-50 border border-slate-200 rounded-full pl-7 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500/50 w-40"
                            placeholder="Search games..."
                        />
                    </div>

                    {/* Subscription Status Badge & Expiry Flow */}
                    <SubscriptionStatusBadge onOpenSubscribeModal={() => setShowSubModal(true)} />

                    {/* Notification Bell with Dropdown */}
                    <NotificationBell onOpenSubscribeModal={() => setShowSubModal(true)} />

                    {/* User Profile Button */}
                    <button
                        onClick={() => router.push("/dashboard/profile")}
                        className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-full p-1 md:pl-1 md:pr-3 hover:bg-slate-100 hover:border-slate-300 transition-all cursor-pointer"
                        title="View & Edit Profile"
                    >
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                            {displayName[0]?.toUpperCase()}
                        </div>
                        <span className="text-xs font-semibold text-slate-700 hidden md:block">{displayName}</span>
                    </button>

                    {/* Logout */}
                    <button onClick={handleLogout} className="w-8 h-8 rounded-full bg-slate-50 border border-slate-200 hidden md:flex items-center justify-center hover:bg-red-50 hover:border-red-200 transition-all group">
                        <LogOut className="w-3.5 h-3.5 text-slate-500 group-hover:text-red-600" />
                    </button>
                </header>

                {/* Content + Chat */}
                <div className="flex-1 flex overflow-hidden">

                    {/* ── Scrollable center ─────────────────────────────────────────── */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-5">





                        {/* Welcome banner (Dark Green Gradient) */}
                        <div className="relative rounded-xl overflow-hidden bg-gradient-to-r from-[#0a3822] via-[#064e3b] to-[#043322] border border-emerald-600/30 p-5 shadow-md shadow-emerald-950/20 text-white">
                            <div className="absolute -top-10 -right-10 w-40 h-40 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
                            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div>
                                    <h1 className="text-xl font-black mb-0.5">Welcome back, {displayName}! 👋</h1>
                                    <p className="text-sm text-white/90">
                                        {games.length > 0
                                            ? `${games.length} game${games.length !== 1 ? "s" : ""} available to play right now`
                                            : "Your adventure awaits — games coming soon!"}
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="text-center bg-white/10 rounded-xl px-4 py-2 border border-white/15 backdrop-blur-sm">
                                        <p className="text-xl font-black text-white">{games.length}</p>
                                        <p className="text-[9px] text-emerald-200/90 uppercase tracking-wide font-semibold">Games</p>
                                    </div>
                                    <div className="text-center bg-white/10 rounded-xl px-4 py-2 border border-white/15 backdrop-blur-sm">
                                        <p className="text-xl font-black text-white">{collections.length}</p>
                                        <p className="text-[9px] text-emerald-200/90 uppercase tracking-wide font-semibold">Collections</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Mobile Search Bar */}
                        <div className="relative md:hidden">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500/50 shadow-sm"
                                placeholder="Search games..."
                            />
                        </div>

                        {/* ── Featured Games ─────────────────────────────────────────── */}
                        {featuredGames.length > 0 && (
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                                    <h2 className="font-bold text-sm uppercase tracking-wide text-slate-800">Featured Games</h2>
                                </div>

                                {/* Full-width slideshow carousel */}
                                <div className="relative h-52 sm:h-56 rounded-2xl overflow-hidden shadow-md group">
                                    {featuredGames.map((game, i) => (
                                        <div
                                            key={game.id}
                                            className={`absolute inset-0 transition-all duration-700 ease-in-out ${
                                                i === activeSlide
                                                    ? "opacity-100 scale-100 z-10"
                                                    : "opacity-0 scale-105 z-0"
                                            }`}
                                        >
                                            {game.thumbnail_url ? (
                                                <Image
                                                    src={game.thumbnail_url}
                                                    alt={game.title}
                                                    fill
                                                    className="object-cover"
                                                />
                                            ) : (
                                                <div className="absolute inset-0 bg-gradient-to-br from-emerald-800 via-teal-900 to-slate-900" />
                                            )}
                                            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

                                            <div className="absolute bottom-0 left-0 p-5 w-2/3 z-10">
                                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-yellow-500/20 border border-yellow-500/30 text-yellow-300 text-[9px] font-bold mb-2 backdrop-blur-md">
                                                    <Star className="w-2.5 h-2.5 fill-current" /> Featured
                                                </div>
                                                <h2 className="text-2xl font-black mb-1 leading-tight text-white">{game.title}</h2>
                                                <p className="text-white/90 text-xs mb-3 line-clamp-2">
                                                    {game.description || "No description provided."}
                                                </p>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handlePlayGame(game);
                                                    }}
                                                    disabled={!game.game_url || loadingGameId !== null}
                                                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer disabled:pointer-events-none"
                                                >
                                                    {loadingGameId === game.id ? (
                                                        <><Loader2 className="w-3 h-3 animate-spin" /> Starting...</>
                                                    ) : (
                                                        <>
                                                            <Play className="w-3 h-3 fill-current" />
                                                            {game.game_url ? 'Play Game' : 'Coming Soon'}
                                                        </>
                                                    )}
                                                </button>
                                            </div>

                                            {/* Plays badge */}
                                            <div className="absolute top-3 right-3 bg-black/40 backdrop-blur-md rounded-lg px-2 py-1 flex items-center gap-1 border border-white/10 z-10">
                                                <Zap className="w-2.5 h-2.5 text-yellow-400" />
                                                <span className="text-[9px] font-bold text-white">{(game.plays || 0).toLocaleString()} plays</span>
                                            </div>
                                        </div>
                                    ))}

                                    {/* Dot indicators */}
                                    {featuredGames.length > 1 && (
                                        <div className="absolute bottom-3 right-3 flex items-center gap-1.5 z-20">
                                            {featuredGames.map((_, i) => (
                                                <button
                                                    key={i}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setActiveSlide(i);
                                                    }}
                                                    className={`rounded-full transition-all duration-300 cursor-pointer ${
                                                        i === activeSlide
                                                            ? "w-5 h-2 bg-white"
                                                            : "w-2 h-2 bg-white/40 hover:bg-white/60"
                                                    }`}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}




                        {/* Tabs */}
                        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
                            {["ALL", "TOP", "FAV"].map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold tracking-wide transition-all cursor-pointer ${activeTab === tab
                                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60 shadow-xs"
                                        : "text-slate-500 hover:text-slate-800"
                                        }`}
                                >
                                    {tab === "ALL" ? "All Games" : tab === "TOP" ? "🔥 Top Rated" : "⭐ Favourites"}
                                </button>
                            ))}
                        </div>

                        {/* Games grid */}
                        {displayedGames.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-4 bg-white border border-slate-200 rounded-2xl shadow-sm">
                                <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100">
                                    <Gamepad2 className="w-8 h-8 opacity-40 text-slate-400" />
                                </div>
                                <p className="text-sm font-medium">
                                    {searchQuery ? `No games matching "${searchQuery}"` : "No games available yet"}
                                </p>
                                <p className="text-xs text-slate-400">
                                    Games added in the Admin Portal will automatically appear here!
                                </p>
                                {searchQuery && (
                                    <button onClick={() => setSearchQuery("")} className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold">
                                        Clear search
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <Sparkles className="w-4 h-4 text-emerald-500" />
                                        <h3 className="font-bold text-sm uppercase tracking-wide text-slate-800">
                                            {activeTab === "TOP" ? "Top Rated Games" : activeTab === "NEW" ? "Newest Games" : "All Games"}
                                        </h3>
                                        <span className="text-[10px] text-slate-500 bg-slate-100 border border-slate-200/60 px-2 py-0.5 rounded-full">
                                            {displayedGames.length}
                                        </span>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                                    {displayedGames.map((game, i) => {
                                        const grad = GRADIENTS[i % GRADIENTS.length];
                                        return (
                                            <div
                                                key={game.id}
                                                onClick={() => router.push(`/dashboard/games/${game.id}`)}
                                                className="relative rounded-xl overflow-hidden border border-slate-200 group cursor-pointer transition-all hover:scale-[1.03] hover:border-emerald-400 hover:shadow-md bg-white flex flex-col justify-between"
                                            >
                                                {/* Thumbnail or gradient placeholder */}
                                                <div className={`relative h-28 overflow-hidden bg-gradient-to-br ${grad.from}`}>
                                                    {game.thumbnail_url ? (
                                                        <Image
                                                            src={game.thumbnail_url}
                                                            alt={game.title}
                                                            fill
                                                            className="object-cover transition-transform duration-500 group-hover:scale-110"
                                                        />
                                                    ) : (
                                                        <div className="absolute inset-0 flex items-center justify-center">
                                                            <Gamepad2 className={`w-10 h-10 opacity-30 ${grad.text}`} />
                                                        </div>
                                                    )}
                                                    {/* Play overlay */}
                                                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                        <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
                                                            <Play className="w-4 h-4 fill-white text-white ml-0.5" />
                                                        </div>
                                                    </div>
                                                    {/* Rating badge if exists */}
                                                    {game.avg_rating && game.avg_rating > 0 && (
                                                        <div className="absolute top-2 left-2 bg-white/80 backdrop-blur-sm text-slate-800 text-[8px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1 z-10 border border-slate-200/50">
                                                            <Star className="w-2 h-2 text-yellow-500 fill-yellow-500" />
                                                            {game.avg_rating.toFixed(1)}
                                                        </div>
                                                    )}

                                                    {/* Plays badge */}
                                                    {(game.plays || 0) > 0 && (
                                                        <div className="absolute top-2 right-2 bg-white/80 backdrop-blur-sm text-slate-800 text-[8px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1 border border-slate-200/50">
                                                            <Zap className="w-2 h-2 text-emerald-500" />
                                                            {(game.plays || 0).toLocaleString()} plays
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="p-3 flex-1 flex flex-col justify-between">
                                                    <div>
                                                        <p className="text-xs font-bold text-slate-800 truncate mb-0.5 group-hover:text-emerald-600 transition-colors">{game.title}</p>
                                                        {game.description && (
                                                            <p className="text-[9px] text-slate-500 line-clamp-2 mb-2 leading-relaxed">{game.description}</p>
                                                        )}
                                                    </div>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handlePlayGame(game); }}
                                                        disabled={!game.game_url || loadingGameId !== null}
                                                        className="w-full py-1.5 rounded-lg text-[10px] font-bold text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1 cursor-pointer disabled:pointer-events-none bg-emerald-600 hover:bg-emerald-700"
                                                    >
                                                        {game.game_url ? (
                                                            loadingGameId === game.id ? (
                                                                <><Loader2 className="w-2.5 h-2.5 animate-spin" /> Starting...</>
                                                            ) : (
                                                                <><ExternalLink className="w-2.5 h-2.5" /> Play Now</>
                                                            )
                                                        ) : (
                                                            "Coming Soon"
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                    </div>

                </div>
            </div>

            {/* Telco VAS Subscription Modal */}
            <SubscriptionModal
                isOpen={showSubModal}
                onClose={() => setShowSubModal(false)}
                msisdn={subMsisdn}
                clientActions={subClientActions}
                onSubscriptionVerified={() => {
                    setShowSubModal(false);
                    // Re-trigger play once subscribed
                    if (loadingGameId) {
                        const targetGame = games.find(g => g.id === loadingGameId);
                        if (targetGame) handlePlayGame(targetGame);
                    }
                }}
            />
        </div>
    );
}

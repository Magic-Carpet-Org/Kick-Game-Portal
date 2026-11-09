"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { signOut, authClient } from "@/lib/auth-client";
import Image from "next/image";
import {
    Home, Gamepad2, Folder, DoorOpen, Users, Trophy,
    Receipt, BarChart3, MapPin, Calendar, LogOut, X, Menu
} from "lucide-react";
import { usePresence } from "@/hooks/usePresence";

const NAV_ITEMS = [
    { icon: <Home className="w-4 h-4" />, label: "Home", id: "home", href: "/dashboard" },
    { icon: <Gamepad2 className="w-4 h-4" />, label: "Games", id: "games", href: "/dashboard/games" },
    { icon: <Folder className="w-4 h-4" />, label: "Collections", id: "collections", href: "/dashboard/collections" },
    { icon: <Trophy className="w-4 h-4" />, label: "Leaderboard", id: "leaderboard", href: "/dashboard/leaderboard" },
];

interface SidebarProps {
    onNavItemClick?: (id: string) => void;
    currentActiveId?: string;
    isOpen?: boolean;
    onClose?: () => void;
}

export default function Sidebar({ onNavItemClick, currentActiveId, isOpen, onClose }: SidebarProps) {
    const router = useRouter();
    const pathname = usePathname();

    const [user, setUser] = useState<any>(null);
    const [profile, setProfile] = useState<any>(null);
    const [friends, setFriends] = useState<any[]>([]);

    useEffect(() => {
        const fetchProfile = async () => {
            const { data } = await authClient.getSession();
            if (data?.user) {
                setUser(data.user);
                setProfile(data.user);
            }
        };
        fetchProfile();
    }, []);

    const handleLogout = async () => {
        await signOut();
        router.push("/");
    };

    // Real-time presence
    const { isOnline } = usePresence(user?.id);
    const onlineFriendsCount = friends.filter(id => isOnline(id)).length;

    // Derived display data exactly matching the homepage
    const displayName = user?.user_metadata?.first_name || user?.email?.split("@")[0] || "Adventurer";
    const fullName = profile?.full_name || user?.user_metadata?.full_name || displayName;
    const location = profile?.location || user?.user_metadata?.location;
    const joinDateRaw = profile?.created_at || user?.created_at;
    const joinDate = joinDateRaw ? new Date(joinDateRaw).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "";
    const avatarUrl = profile?.avatar_url;

    // Determine active item if not explicitly passed
    let activePathId = currentActiveId;
    if (!activePathId) {
        if (pathname === "/dashboard") activePathId = "home";
        else if (pathname.startsWith("/dashboard/games")) activePathId = "games";
        else if (pathname.startsWith("/dashboard/collections")) activePathId = "collections";
        else if (pathname.startsWith("/dashboard/subscriptions")) activePathId = "subscriptions";
        else if (pathname.startsWith("/dashboard/gameroom")) activePathId = "gameroom";
        else if (pathname.startsWith("/dashboard/friends")) activePathId = "friends";
        else if (pathname.startsWith("/dashboard/gamers")) activePathId = "home"; // Fallback
    }

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div 
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden animate-in fade-in duration-300"
                    onClick={onClose}
                />
            )}

            <aside className={`
                fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col 
                transform transition-transform duration-300 ease-in-out
                ${isOpen ? "translate-x-0" : "-translate-x-full"}
                md:relative md:translate-x-0 md:w-52 md:flex-shrink-0
            `}>
                {/* Logo & Close Button */}
                <div className="relative py-6 px-4 border-b border-slate-200/80 flex flex-col items-center justify-center">
                    <div className="relative h-24 w-24 transition-transform duration-200 hover:scale-105 drop-shadow-md">
                        <Image
                            src="/3D_green_Kick_logo_4f62e053-removebg-preview.png"
                            alt="Kick Logo"
                            fill
                            className="object-contain object-center"
                            priority
                        />
                    </div>
                    {onClose && (
                        <button onClick={onClose} className="absolute right-3 top-3 md:hidden p-2 text-slate-400 hover:text-slate-700 transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    )}
                </div>

            {/* Player profile mini-card */}
            <div className="p-3 border-b border-slate-200/80">
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 shadow-sm">
                    <div className="flex items-center gap-2.5 mb-2">
                        {avatarUrl ? (
                            <div className="w-9 h-9 relative rounded-full overflow-hidden flex-shrink-0 border border-slate-200">
                                <Image src={avatarUrl} alt="Avatar" fill className="object-cover" />
                            </div>
                        ) : (
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-sm font-black text-white flex-shrink-0 shadow-sm">
                                {displayName[0]?.toUpperCase() || "K"}
                            </div>
                        )}
                        <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-800 truncate">{fullName}</p>
                            <p className="text-[9px] text-emerald-600 font-semibold">Kick Subscriber</p>
                        </div>
                    </div>
                    <div className="space-y-1">
                        {location && (
                            <div className="flex items-center gap-1.5 text-[9px] text-slate-500">
                                <MapPin className="w-2.5 h-2.5 flex-shrink-0 text-slate-400" />
                                <span className="truncate">{location}</span>
                            </div>
                        )}
                        {joinDate && (
                            <div className="flex items-center gap-1.5 text-[9px] text-slate-500">
                                <Calendar className="w-2.5 h-2.5 flex-shrink-0 text-slate-400" />
                                <span>Joined {joinDate}</span>
                            </div>
                        )}
                    </div>
                </div>

            </div>

            {/* Nav */}
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                {NAV_ITEMS.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => {
                            if (item.href) {
                                router.push(item.href);
                            } else if (onNavItemClick) {
                                onNavItemClick(item.id);
                            }
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${activePathId === item.id
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60 shadow-xs font-bold"
                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                            }`}
                    >
                        {item.icon}
                        {item.label}
                        {/* Live online badge on Friends nav item */}
                        {item.id === "friends" && onlineFriendsCount > 0 && (
                            <span className="ml-auto flex items-center gap-1 bg-emerald-50 text-emerald-700 text-[8px] font-bold px-1.5 py-0.5 rounded-full border border-emerald-200/50">
                                <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                                {onlineFriendsCount}
                            </span>
                        )}
                    </button>
                ))}
            </nav>

            {/* Bottom */}
            <div className="p-3 border-t border-slate-200/80 space-y-0.5">
                <button
                    onClick={() => router.push("/dashboard/subscriptions")}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-all cursor-pointer ${
                        pathname === "/dashboard/subscriptions"
                            ? "bg-emerald-50 text-emerald-700 font-bold border border-emerald-200/60"
                            : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium"
                    }`}
                >
                    <Receipt className={`w-3.5 h-3.5 ${pathname === "/dashboard/subscriptions" ? "text-emerald-600" : "text-slate-400"}`} /> Subscription History
                </button>
                <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-all cursor-pointer">
                    <BarChart3 className="w-3.5 h-3.5 text-slate-400" /> Rank System
                </button>
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-red-600 hover:bg-red-50 hover:text-red-700 border border-transparent hover:border-red-100 transition-all mt-2 cursor-pointer"
                >
                    <LogOut className="w-3.5 h-3.5" /> Disconnect
                </button>
            </div>
        </aside>
    </>
    );
}

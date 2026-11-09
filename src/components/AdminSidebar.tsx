"use client";

import React, { useEffect } from "react";
import Image from "next/image";
import {
  LayoutGrid,
  Gamepad2,
  Users,
  Shield,
  LogOut,
  Folder,
} from "lucide-react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { signOut, useSession } from "@/lib/auth-client";

interface AdminSidebarProps {
  activeItem?: string;
}

export default function AdminSidebar({ activeItem = "dashboard" }: AdminSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, isPending } = useSession();

  useEffect(() => {
    if (!isPending) {
      if (!session?.user) {
        if (pathname !== "/admin") {
          router.replace("/admin");
        }
      } else if ((session.user as any).role !== "admin") {
        router.replace("/dashboard");
      }
    }
  }, [session, isPending, pathname, router]);

  const handleLogout = async () => {
    await signOut();
    router.push("/admin");
  };

  return (
    <aside className="w-64 flex flex-col p-6 gap-8 border-r border-neutral-800 bg-neutral-950/80 backdrop-blur-xl shrink-0 h-screen">
      <div className="flex items-center gap-3 px-2">
        <div className="relative w-10 h-10 shrink-0">
          <Image
            src="/3D_green_Kick_logo_4f62e053-removebg-preview.png"
            alt="Kick Logo"
            fill
            className="object-contain drop-shadow"
          />
        </div>
        <div>
          <span className="font-extrabold text-base text-white tracking-tight block">Kick Admin</span>
          <span className="text-[10px] text-emerald-400 font-semibold tracking-wider uppercase block">Operations Hub</span>
        </div>
      </div>

      <nav className="flex-1 space-y-1.5">
        <NavItem
          icon={LayoutGrid}
          label="Dashboard"
          href="/admin/dashboard"
          active={activeItem === "dashboard"}
        />
        <NavItem
          icon={Gamepad2}
          label="Games"
          href="/admin/games"
          active={activeItem === "games"}
        />
        <NavItem
          icon={Folder}
          label="Collections"
          href="/admin/collections"
          active={activeItem === "collections"}
        />
        <NavItem
          icon={Users}
          label="Users & Gamers"
          href="/admin/users"
          active={activeItem === "users"}
        />
        <NavItem
          icon={Shield}
          label="Subadmins"
          href="/admin/subadmins"
          active={activeItem === "subadmins"}
        />
      </nav>

      <button
        onClick={handleLogout}
        className="flex items-center gap-3 px-4 py-3 rounded-xl border border-neutral-800 hover:bg-neutral-900 transition-colors text-sm font-semibold text-neutral-400 hover:text-white mt-auto"
      >
        <LogOut className="w-4 h-4 text-neutral-500" />
        Log Out
      </button>
    </aside>
  );
}

function NavItem({
  icon: Icon,
  label,
  href,
  active,
}: {
  icon: any;
  label: string;
  href: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
        active
          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
          : "text-neutral-400 hover:text-white hover:bg-neutral-900"
      }`}
    >
      <Icon className={`w-4 h-4 ${active ? "text-emerald-400" : "text-neutral-500"}`} />
      {label}
    </Link>
  );
}

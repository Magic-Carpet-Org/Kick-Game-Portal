"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Lock, Mail, ArrowRight, Loader2, KeyRound, AlertTriangle, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { signIn } from "@/lib/auth-client";
import toast, { Toaster } from "react-hot-toast";

export default function AdminLogin() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const res = await signIn.email({
                email: email.trim(),
                password,
            });

            if (res.error) {
                throw new Error(res.error.message || "Invalid admin credentials");
            }

            // Check if user has admin role
            const userRole = (res.data?.user as any)?.role;
            if (userRole !== 'admin') {
                throw new Error("Access Denied: Administrator role required");
            }

            // Show success toast
            toast.success("Identity verified. Accessing operations hub...", {
                duration: 2000,
                position: "top-center",
                style: {
                    background: "#059669",
                    color: "#fff",
                    fontWeight: "bold",
                },
            });

            setTimeout(() => {
                window.location.href = "/admin/dashboard";
            }, 700);
        } catch (err: any) {
            setError(err.message || "Login failed. Please check your credentials.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-[#070b09] font-sans selection:bg-emerald-500/30 px-4 py-8">
            {/* Toast Notifications */}
            <Toaster />

            {/* Ambient Lighting & Grid Pattern */}
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[450px] bg-emerald-600/15 rounded-full blur-[140px]" />
                <div className="absolute -bottom-40 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-green-500/10 rounded-full blur-[140px]" />
                
                {/* Subtle Grid overlay */}
                <div 
                    className="absolute inset-0 opacity-15"
                    style={{
                        backgroundImage: `radial-gradient(rgba(16, 185, 129, 0.25) 1px, transparent 1px)`,
                        backgroundSize: '32px 32px'
                    }}
                />
            </div>

            {/* Main Container */}
            <div className="relative z-10 w-full max-w-[440px] mx-auto">
                
                {/* Admin Card */}
                <div className="relative backdrop-blur-2xl bg-neutral-900/70 border border-neutral-800/80 rounded-3xl p-7 sm:p-9 shadow-2xl shadow-emerald-950/40">
                    
                    {/* Header */}
                    <div className="flex flex-col items-center text-center mb-7">
                        
                        {/* 3D Green Kick Logo */}
                        <div className="relative h-20 w-48 mb-3 transition-transform duration-300 hover:scale-105">
                            <Image
                                src="/3D_green_Kick_logo_4f62e053-removebg-preview.png"
                                alt="Kick Logo"
                                fill
                                className="object-contain drop-shadow-lg"
                                priority
                            />
                        </div>

                        {/* Title & Badge */}
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-[11px] font-semibold text-emerald-400 mb-2.5">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Operations & VAS Control Hub</span>
                        </div>

                        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                            Admin Access
                        </h1>
                        <p className="text-xs text-neutral-400 mt-1 font-medium">
                            Authorized personnel and platform administrators only.
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleLogin} className="space-y-4">
                        {error && (
                            <div className="p-3 bg-red-500/10 border border-red-500/25 rounded-2xl flex items-center gap-2.5 text-xs text-red-300 animate-fadeIn">
                                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        {/* Email */}
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-neutral-300 uppercase tracking-wider ml-1">
                                Administrator Email
                            </label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                    <Mail className="h-4 w-4 text-neutral-400 group-focus-within:text-emerald-400 transition-colors" />
                                </div>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-neutral-950/60 border border-neutral-800 text-white rounded-2xl py-3 pl-10 pr-4 text-xs sm:text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 placeholder-neutral-500 transition-all"
                                    placeholder="admin@kick.com"
                                    required
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-neutral-300 uppercase tracking-wider ml-1">
                                Password
                            </label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                    <Lock className="h-4 w-4 text-neutral-400 group-focus-within:text-emerald-400 transition-colors" />
                                </div>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-neutral-950/60 border border-neutral-800 text-white rounded-2xl py-3 pl-10 pr-10 text-xs sm:text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 placeholder-neutral-500 transition-all font-mono"
                                    placeholder="••••••••••••"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-neutral-400 hover:text-neutral-200 focus:outline-none cursor-pointer"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            style={{ backgroundColor: '#00c853', color: '#ffffff' }}
                            className="w-full py-3 sm:py-3.5 px-4 rounded-full bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-lg shadow-emerald-500/25 transition-all active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer mt-4"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Verifying Credentials...</span>
                                </>
                            ) : (
                                <>
                                    <span>Sign In to Admin Hub</span>
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Footer Links */}
                    <div className="mt-6 pt-5 border-t border-neutral-800/80 flex items-center justify-between text-[11px] text-neutral-400">
                        <a
                            href="/"
                            className="hover:text-emerald-400 transition-colors flex items-center gap-1"
                        >
                            ← Back to Player Portal
                        </a>
                        <a 
                            href="/admin/seed" 
                            className="text-emerald-400 hover:text-emerald-300 font-semibold hover:underline flex items-center gap-1"
                        >
                            <KeyRound className="w-3 h-3" />
                            <span>Setup Seed</span>
                        </a>
                    </div>
                </div>

                {/* Bottom Security Notice */}
                <p className="text-center text-[11px] text-neutral-500 mt-4 font-mono">
                    Kick Gaming Network • End-to-End Encrypted Session
                </p>
            </div>
        </div>
    );
}

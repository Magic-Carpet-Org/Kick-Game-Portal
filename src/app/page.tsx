"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Mail, ArrowRight, ArrowLeft, Loader2, Sparkles, CheckCircle2, AlertCircle, RefreshCw, UserCheck } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import toast, { Toaster } from "react-hot-toast";

type AuthMode = "sign-in" | "sign-up";
type AuthStep = "EMAIL" | "OTP" | "NICKNAME";

export default function UserAuth() {
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [step, setStep] = useState<AuthStep>("EMAIL");

  // Form State
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [username, setUsername] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  
  // Validation & UI State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken" | "invalid">("idle");
  const [accountExistsNotice, setAccountExistsNotice] = useState<"not_found" | "already_exists" | null>(null);

  const otpInputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // Timer countdown for OTP resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Debounced username availability checker
  useEffect(() => {
    if (step !== "NICKNAME") return;

    const trimmed = username.trim();
    if (!trimmed) {
      setUsernameStatus("idle");
      return;
    }

    if (!/^[a-zA-Z0-9_]{3,20}$/.test(trimmed)) {
      setUsernameStatus("invalid");
      return;
    }

    setUsernameStatus("checking");
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/auth/check-username?username=${encodeURIComponent(trimmed)}`);
        const data = await res.json();
        if (data.success) {
          setUsernameStatus(data.available ? "available" : "taken");
        } else {
          setUsernameStatus("invalid");
        }
      } catch {
        setUsernameStatus("idle");
      }
    }, 350);

    return () => clearTimeout(timeout);
  }, [username, step]);

  // Handle Mode Toggle
  const toggleMode = (newMode: AuthMode) => {
    setMode(newMode);
    setStep("EMAIL");
    setError(null);
    setAccountExistsNotice(null);
    setOtp(["", "", "", "", "", ""]);
    setUsername("");
    setSuggestions([]);
  };

  // STEP 1: Send 6-Digit OTP
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !cleanEmail.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    setError(null);
    setAccountExistsNotice(null);

    try {
      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail, mode }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        if (data.code === "USER_NOT_FOUND") {
          setAccountExistsNotice("not_found");
          setLoading(false);
          return;
        }
        if (data.code === "USER_EXISTS") {
          setAccountExistsNotice("already_exists");
          setLoading(false);
          return;
        }
        throw new Error(data.error || "Failed to send verification code.");
      }

      toast.success(`6-digit code sent to ${cleanEmail}`, {
        icon: "✉️",
        style: { background: "#059669", color: "#fff", fontWeight: 600 },
      });

      setCountdown(45);
      setStep("OTP");
      setTimeout(() => otpInputsRef.current[0]?.focus(), 150);
    } catch (err: any) {
      setError(err.message || "Failed to send code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // OTP Input Handlers
  const handleOtpChange = (index: number, value: string) => {
    const digit = value.replace(/[^0-9]/g, "").slice(-1);
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);

    // Auto-advance
    if (digit && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits entered
    if (digit && index === 5 && newOtp.every((d) => d !== "")) {
      handleVerifyOtp(newOtp.join(""));
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/[^0-9]/g, "").slice(0, 6);
    if (!pastedData) return;

    const newOtp = [...otp];
    for (let i = 0; i < pastedData.length; i++) {
      newOtp[i] = pastedData[i];
    }
    setOtp(newOtp);

    const nextIndex = Math.min(pastedData.length, 5);
    otpInputsRef.current[nextIndex]?.focus();

    if (pastedData.length === 6) {
      handleVerifyOtp(pastedData);
    }
  };

  // STEP 2: Verify 6-Digit OTP
  const handleVerifyOtp = async (codeToVerify?: string) => {
    const finalCode = codeToVerify || otp.join("");
    if (finalCode.length !== 6) {
      setError("Please enter the full 6-digit code.");
      return;
    }

    setLoading(true);
    setError(null);
    const cleanEmail = email.trim().toLowerCase();

    try {
      if (mode === "sign-in") {
        // Sign-in with Email OTP via Better Auth
        const res = await (authClient as any).signIn.emailOtp({
          email: cleanEmail,
          otp: finalCode,
        });

        if (res?.error) {
          throw new Error(res.error.message || "Invalid or expired verification code.");
        }

        toast.success("Welcome back! Entering arena...", {
          icon: "🎮",
          style: { background: "#059669", color: "#fff", fontWeight: 700 },
        });

        setTimeout(() => {
          window.location.href = "/dashboard";
        }, 500);
      } else {
        // Sign-up: Verify OTP via dedicated endpoint
        const verifyRes = await fetch("/api/auth/otp/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: cleanEmail, code: finalCode, mode: "sign-up" }),
        });

        const verifyData = await verifyRes.json();

        if (!verifyRes.ok || !verifyData.success) {
          throw new Error(verifyData.error || "Invalid or expired verification code.");
        }

        // Fetch gamer tag suggestions based on email
        try {
          const suggRes = await fetch(`/api/auth/check-username?email=${encodeURIComponent(cleanEmail)}`);
          const suggData = await suggRes.json();
          if (suggData.suggestions && suggData.suggestions.length > 0) {
            setSuggestions(suggData.suggestions);
          }
        } catch {
          // Suggestions fallback
        }

        toast.success("Email verified! Choose your gamer tag.", {
          icon: "✅",
          style: { background: "#059669", color: "#fff", fontWeight: 600 },
        });

        setStep("NICKNAME");
      }
    } catch (err: any) {
      setError(err.message || "Verification failed. Please check the code and try again.");
    } finally {
      setLoading(false);
    }
  };

  // STEP 3: Complete Sign-Up with Gamer Tag
  const handleCompleteSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUsername = username.trim();

    if (!cleanUsername || usernameStatus !== "available") {
      setError("Please choose an available gamer tag.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/complete-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          otp: otp.join(""),
          username: cleanUsername,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to create account.");
      }

      toast.success(`Welcome to Kick Gaming, ${cleanUsername}!`, {
        icon: "🏆",
        duration: 2500,
        style: { background: "#059669", color: "#fff", fontWeight: 700 },
      });

      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 700);
    } catch (err: any) {
      setError(err.message || "Could not complete registration.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 h-[100dvh] w-full overflow-hidden flex flex-col lg:flex-row bg-white font-sans selection:bg-emerald-500/20 overscroll-none">
      <Toaster position="top-center" />

      {/* Left Column: Interactive Auth Form */}
      <div className="relative w-full lg:w-1/2 h-full flex flex-col justify-center items-center px-6 sm:px-10 lg:px-12 xl:px-16 overflow-hidden overscroll-none">
        
        {/* Soft Ambient Gaming Aura (enhances mobile atmosphere so it doesn't look like empty white space) */}
        <div className="lg:hidden absolute -top-28 left-1/2 -translate-x-1/2 w-[380px] h-[280px] bg-gradient-to-b from-emerald-400/20 via-emerald-300/10 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="lg:hidden absolute top-1/2 -right-24 w-56 h-56 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative w-full max-w-[420px] mx-auto flex flex-col justify-center py-3 sm:py-6">
          
          {/* 1. Kick 3D Logo */}
          <div className="flex justify-center mb-4 sm:mb-6">
            <div className="relative h-20 w-60 sm:h-24 sm:w-72 lg:h-28 lg:w-80 transition-transform duration-300 hover:scale-105">
              <Image
                src="/3D_green_Kick_logo_4f62e053-removebg-preview.png"
                alt="Kick Logo"
                fill
                className="object-contain drop-shadow-md"
                priority
              />
            </div>
          </div>

          {/* 2. Step Header */}
          <div className="mb-5 sm:mb-6 text-center">
            {step === "EMAIL" && (
              <>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-neutral-900 tracking-tight">
                  {mode === "sign-up" ? "Create Account" : "Welcome Back"}
                </h1>
                <p className="text-sm sm:text-base text-neutral-500 font-medium mt-1.5 max-w-sm mx-auto">
                  {mode === "sign-up"
                    ? "Enter your email to get your 6-digit access code."
                    : "Enter your email to sign in password-free."}
                </p>
              </>
            )}

            {step === "OTP" && (
              <>
                <div className="flex items-center gap-2 mb-2 justify-center">
                  <button
                    onClick={() => {
                      setStep("EMAIL");
                      setError(null);
                    }}
                    className="p-1.5 -ml-1 text-neutral-400 hover:text-neutral-700 transition-colors cursor-pointer rounded-lg hover:bg-neutral-100"
                    title="Change email"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">
                    Verification Code
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight">
                  Check your inbox
                </h1>
                <p className="text-sm text-neutral-500 mt-1.5">
                  We sent a 6-digit code to <strong className="text-neutral-900 font-semibold">{email}</strong>
                </p>
              </>
            )}

            {step === "NICKNAME" && (
              <>
                <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold mb-2.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Email Verified</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight">
                  Choose your Gamer Tag
                </h1>
                <p className="text-sm text-neutral-500 mt-1.5">
                  Your nickname on leaderboards and in-game matches.
                </p>
              </>
            )}
          </div>

          {/* Global Error Banner */}
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-2.5 rounded-2xl text-xs sm:text-sm flex items-center gap-2 animate-fadeIn">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Account Exists / Not Found Switcher Notice */}
          {accountExistsNotice === "not_found" && (
            <div className="mb-4 bg-amber-50 border border-amber-200 p-3.5 rounded-2xl text-xs sm:text-sm text-amber-900">
              <p className="font-semibold mb-1">No account found with this email.</p>
              <button
                type="button"
                onClick={() => {
                  setMode("sign-up");
                  setAccountExistsNotice(null);
                  handleSendOtp();
                }}
                className="text-xs sm:text-sm font-bold text-emerald-700 hover:text-emerald-800 underline flex items-center gap-1 cursor-pointer"
              >
                Create a new account now <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {accountExistsNotice === "already_exists" && (
            <div className="mb-4 bg-emerald-50 border border-emerald-200 p-3.5 rounded-2xl text-xs sm:text-sm text-emerald-900">
              <p className="font-semibold mb-1">You already have a Kick account!</p>
              <button
                type="button"
                onClick={() => {
                  setMode("sign-in");
                  setAccountExistsNotice(null);
                  handleSendOtp();
                }}
                className="text-xs sm:text-sm font-bold text-emerald-700 hover:text-emerald-800 underline flex items-center gap-1 cursor-pointer"
              >
                Sign in with your code <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════ */}
          {/* STEP 1: Email Form */}
          {/* ═══════════════════════════════════════════════════════ */}
          {step === "EMAIL" && (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-neutral-600 uppercase tracking-wider ml-1 mb-2 block">
                  Email Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError(null);
                      setAccountExistsNotice(null);
                    }}
                    placeholder="gamer@example.com"
                    required
                    autoFocus
                    className="w-full rounded-2xl border border-neutral-200/90 px-4 py-3.5 sm:py-4 pl-11 text-sm sm:text-base text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15 transition-all bg-neutral-50/70 hover:bg-white focus:bg-white shadow-xs"
                  />
                  <Mail className="w-5 h-5 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !email.trim()}
                style={{ backgroundColor: "#00c853", color: "#ffffff" }}
                className="w-full py-3.5 sm:py-4 px-6 rounded-full font-bold text-sm sm:text-base transition-all hover:brightness-105 active:scale-[0.99] flex items-center justify-center gap-2.5 disabled:opacity-50 cursor-pointer shadow-lg shadow-emerald-500/25 mt-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Sending Code...</span>
                  </>
                ) : (
                  <>
                    <span>Send 6-Digit Code</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* ═══════════════════════════════════════════════════════ */}
          {/* STEP 2: 6-Digit OTP Form */}
          {/* ═══════════════════════════════════════════════════════ */}
          {step === "OTP" && (
            <div className="space-y-4">
              <div className="flex justify-between gap-2 my-2" onPaste={handleOtpPaste}>
                {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => {
                      otpInputsRef.current[idx] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    className="w-12 h-14 sm:w-14 sm:h-16 text-center font-mono text-2xl font-black rounded-2xl border-2 border-neutral-300 bg-neutral-50/80 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15 outline-none transition-all text-neutral-900 shadow-xs"
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={() => handleVerifyOtp()}
                disabled={loading || otp.some((d) => d === "")}
                style={{ backgroundColor: "#00c853", color: "#ffffff" }}
                className="w-full py-3.5 sm:py-4 px-6 rounded-full font-bold text-sm sm:text-base transition-all hover:brightness-105 active:scale-[0.99] flex items-center justify-center gap-2.5 disabled:opacity-50 cursor-pointer shadow-lg shadow-emerald-500/25"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Verifying Code...</span>
                  </>
                ) : (
                  <>
                    <span>{mode === "sign-in" ? "Verify & Sign In" : "Verify & Continue"}</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>

              {/* Resend Timer / Button */}
              <div className="text-center pt-2">
                {countdown > 0 ? (
                  <p className="text-xs sm:text-sm text-neutral-400">
                    Resend code in <strong className="text-neutral-700 font-mono">0:{countdown < 10 ? `0${countdown}` : countdown}</strong>
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSendOtp()}
                    disabled={loading}
                    className="text-xs sm:text-sm font-semibold text-emerald-600 hover:text-emerald-700 hover:underline flex items-center gap-1.5 mx-auto cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Didn't receive code? Resend</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════ */}
          {/* STEP 3: Choose Gamer Tag (Sign-Up Only) */}
          {/* ═══════════════════════════════════════════════════════ */}
          {step === "NICKNAME" && (
            <form onSubmit={handleCompleteSignUp} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-neutral-600 uppercase tracking-wider ml-1 mb-2 block">
                  Nickname / Gamer Tag
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""));
                      setError(null);
                    }}
                    placeholder="e.g. shadow_ninja"
                    required
                    maxLength={20}
                    autoFocus
                    className="w-full rounded-2xl border border-neutral-200/90 px-4 py-3.5 sm:py-4 pl-11 pr-11 text-sm sm:text-base text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15 transition-all font-mono font-bold bg-neutral-50/70 hover:bg-white focus:bg-white shadow-xs"
                  />
                  <span className="text-neutral-400 font-bold absolute left-4 top-1/2 -translate-y-1/2 text-base">@</span>
                  
                  {/* Status Indicator Icon */}
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                    {usernameStatus === "checking" && <Loader2 className="w-5 h-5 animate-spin text-neutral-400" />}
                    {usernameStatus === "available" && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                    {usernameStatus === "taken" && <AlertCircle className="w-5 h-5 text-red-500" />}
                  </div>
                </div>

                {/* Status Message */}
                <div className="mt-1.5 ml-1 text-xs">
                  {usernameStatus === "available" && (
                    <span className="text-emerald-600 font-semibold flex items-center gap-1">
                      ✓ @{username} is available!
                    </span>
                  )}
                  {usernameStatus === "taken" && (
                    <span className="text-red-500 font-semibold">
                      ✕ @{username} is already taken. Pick another or choose a suggestion below.
                    </span>
                  )}
                  {usernameStatus === "invalid" && (
                    <span className="text-neutral-400">
                      3-20 characters (letters, numbers, underscores only).
                    </span>
                  )}
                </div>
              </div>

              {/* Suggestions Pills */}
              {suggestions.length > 0 && (
                <div className="pt-1">
                  <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">
                    Suggested Gamer Tags
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {suggestions.map((sugg, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          setUsername(sugg);
                          setError(null);
                        }}
                        className={`text-xs font-semibold px-3.5 py-2 rounded-xl border transition-all cursor-pointer ${
                          username === sugg
                            ? "bg-emerald-500 text-white border-emerald-600 shadow-sm"
                            : "bg-neutral-50 hover:bg-neutral-100 text-neutral-700 border-neutral-200"
                        }`}
                      >
                        ⚡ {sugg}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || usernameStatus !== "available"}
                style={{ backgroundColor: "#00c853", color: "#ffffff" }}
                className="w-full py-3.5 sm:py-4 px-6 rounded-full font-bold text-sm sm:text-base transition-all hover:brightness-105 active:scale-[0.99] flex items-center justify-center gap-2.5 disabled:opacity-50 cursor-pointer shadow-lg shadow-emerald-500/25 mt-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Finalizing Account...</span>
                  </>
                ) : (
                  <>
                    <UserCheck className="w-5 h-5" />
                    <span>Enter the Arena</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* ═══════════════════════════════════════════════════════ */}
          {/* 3. Footer Mode Toggle */}
          {/* ═══════════════════════════════════════════════════════ */}
          {step === "EMAIL" && (
            <p className="text-center text-sm text-neutral-500 mt-6 font-medium">
              {mode === "sign-up" ? "Already a gamer? " : "New to Kick? "}
              <button
                type="button"
                onClick={() => toggleMode(mode === "sign-up" ? "sign-in" : "sign-up")}
                className="font-bold text-[#00c853] hover:text-[#009b3e] hover:underline cursor-pointer focus:outline-none ml-1 text-sm"
              >
                {mode === "sign-up" ? "Sign In" : "Create Account"}
              </button>
            </p>
          )}

        </div>
      </div>

      {/* Right Column: Full-Height Kick 3D Art Panel */}
      <div className="hidden lg:block lg:w-1/2 h-full p-3 lg:p-4 xl:p-5">
        <div className="relative w-full h-full rounded-[24px] xl:rounded-[32px] overflow-hidden shadow-2xl bg-neutral-950">
          <Image
            src="/Kick_3D_logo_text_6a1140dc.jpg"
            alt="Kick 3D Gaming"
            fill
            className="object-cover object-center"
            priority
          />
        </div>
      </div>

    </div>
  );
}

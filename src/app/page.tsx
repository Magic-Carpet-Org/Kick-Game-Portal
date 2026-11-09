"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Mail, Eye, EyeOff, User, Phone, AtSign, Loader2 } from "lucide-react";
import { signIn, signUp } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

export default function UserAuth() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Form State
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        if (!email || !password || !fullName || !phone) {
          throw new Error("Please complete all required fields.");
        }

        const res = await (signUp.email as any)({
          email,
          password,
          name: fullName,
          username: username || fullName,
          phone: phone,
        });

        if (res.error) {
          throw new Error(res.error.message || "Failed to create account");
        }

        window.location.href = "/dashboard";
      } else {
        if (!email || !password) {
          throw new Error("Please enter your email or phone number, and password.");
        }

        let loginEmail = email.trim();
        // If user typed their phone number or username instead of email, resolve it
        if (!loginEmail.includes('@')) {
          try {
            const resolveRes = await fetch('/api/auth/resolve-identifier', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ identifier: loginEmail }),
            });
            const resolveData = await resolveRes.json();
            if (resolveData.email) {
              loginEmail = resolveData.email;
            }
          } catch {
            // fallback
          }
        }

        const res = await signIn.email({
          email: loginEmail,
          password,
        });

        if (res.error) {
          throw new Error(res.error.message || "Invalid credentials. Please check your login details.");
        }

        window.location.href = "/dashboard";
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setError(null);
  };

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col lg:flex-row bg-white font-sans">
      
      {/* Left Column: Vertically Centered Form, No Scroll */}
      <div className="w-full lg:w-1/2 h-full flex flex-col justify-center items-center px-6 sm:px-10 lg:px-12 xl:px-16 overflow-y-auto scrollbar-hide">
        <div className="w-full max-w-[390px] mx-auto flex flex-col justify-center my-auto py-3">
          
          {/* 1. Centralized 3D Green Kick Logo */}
          <div className="flex justify-center mb-2 sm:mb-3">
            <div className="relative h-24 w-64 sm:h-28 sm:w-80 transition-transform duration-300 hover:scale-105">
              <Image
                src="/3D_green_Kick_logo_4f62e053-removebg-preview.png"
                alt="Kick Logo"
                fill
                className="object-contain drop-shadow-lg"
                priority
              />
            </div>
          </div>

          {/* 2. Header (without hand icon) */}
          <div className="mb-3.5 sm:mb-4 text-center sm:text-left">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight">
              {isSignUp ? "Create account" : "Welcome back"}
            </h1>
            <p className="text-xs sm:text-sm text-neutral-400 font-medium mt-1">
              {isSignUp ? "Join Kick Gaming to play premium games." : "Please enter your details."}
            </p>
          </div>

          {/* 3. Main Form */}
          <form onSubmit={handleAuth} className="space-y-2.5 sm:space-y-3">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-3.5 py-2 rounded-xl text-xs">
                {error}
              </div>
            )}

            {/* Sign Up extra fields */}
            {isSignUp && (
              <>
                <div>
                  <div className="relative">
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Full Name"
                      required
                      className="w-full rounded-full border border-neutral-200 px-4 py-2.5 pr-10 text-xs text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all bg-white"
                    />
                    <User className="w-4 h-4 text-neutral-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <div className="relative">
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Username"
                      required
                      className="w-full rounded-full border border-neutral-200 px-4 py-2.5 pr-10 text-xs text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all bg-white"
                    />
                    <AtSign className="w-4 h-4 text-neutral-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <div className="relative">
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Phone Number (e.g. 08012345678)"
                      required
                      className="w-full rounded-full border border-neutral-200 px-4 py-2.5 pr-10 text-xs text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all bg-white"
                    />
                    <Phone className="w-4 h-4 text-neutral-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </>
            )}

            {/* Email / Identifier */}
            <div>
              <div className="relative">
                <input
                  type={isSignUp ? "email" : "text"}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={isSignUp ? "Email" : "Email or Phone Number"}
                  required
                  className="w-full rounded-full border border-neutral-200 px-4 py-2.5 pr-10 text-xs text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all bg-white"
                />
                <Mail className="w-4 h-4 text-neutral-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  required
                  minLength={6}
                  className="w-full rounded-full border border-neutral-200 px-4 py-2.5 pr-10 text-xs text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 focus:outline-none cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember for 30 days & Forgot Password (Only on Log In) */}
            {!isSignUp && (
              <div className="flex items-center justify-between pt-0.5 pb-0.5">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-neutral-300 text-emerald-500 focus:ring-emerald-500 accent-[#00c853]"
                  />
                  <span className="text-[11px] text-neutral-500">Remember for 30 days</span>
                </label>
                <a
                  href="#forgot"
                  onClick={(e) => {
                    e.preventDefault();
                    alert("Please contact Kick support or reset through your mobile carrier.");
                  }}
                  className="text-[11px] text-neutral-400 hover:text-neutral-600 transition-colors"
                >
                  Forgot password?
                </a>
              </div>
            )}

            {/* Submit Button (Vibrant Kick Green) */}
            <button
              type="submit"
              disabled={loading}
              style={{ backgroundColor: '#00c853', color: '#ffffff' }}
              className="w-full py-2.5 sm:py-3 px-4 rounded-full bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white font-bold text-xs sm:text-sm transition-colors active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer mt-1"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <span>{isSignUp ? "Sign Up" : "Log In"}</span>
              )}
            </button>
          </form>

          {/* 4. Footer Toggle */}
          <p className="text-center text-xs text-neutral-500 mt-4 sm:mt-5">
            {isSignUp ? "Already have an account? " : "Don't have an account? "}
            <button
              type="button"
              onClick={toggleMode}
              className="font-bold text-[#00c853] hover:text-[#009b3e] hover:underline cursor-pointer focus:outline-none ml-1"
            >
              {isSignUp ? "Log In" : "Sign Up"}
            </button>
          </p>

        </div>
      </div>

      {/* Right Column: Full-Height Kick 3D Art Panel */}
      <div className="hidden lg:block lg:w-1/2 h-screen p-3 lg:p-4 xl:p-5">
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

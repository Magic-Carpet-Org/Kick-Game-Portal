"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import {
    ArrowLeft,
    Trophy,
    RotateCcw,
    Loader2,
    Sparkles,
    Smile,
    Gamepad2
} from "lucide-react";
import Link from "next/link";
import toast, { Toaster } from "react-hot-toast";

interface Game {
    id: string;
    title: string;
    game_url: string;
}

interface GameSession {
    id: string;
    game_id: string;
    user_id: string;
    mode: string;
    tournament_id: string | null;
    session_token: string;
    status: string;
    score: number | null;
    game?: Game;
}

export default function GamePlayPage() {
    const params = useParams();
    const router = useRouter();
    const sessionId = params.sessionId as string;
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const isGameOverRef = useRef(false);
    const restartAckReceivedRef = useRef(false);
    const hasTriggeredHighScoreAlertRef = useRef(false);

    const [userId, setUserId] = useState<string | null>(null);
    const [session, setSession] = useState<GameSession | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Results state
    const [isGameOver, setIsGameOver] = useState(false);
    const [finalScore, setFinalScore] = useState<number | null>(null);
    const [isHighScore, setIsHighScore] = useState(false);
    const [bestScore, setBestScore] = useState<number | null>(null);
    const [leaderboardRank, setLeaderboardRank] = useState<number | null>(null);
    const [fetchingResults, setFetchingResults] = useState(false);
    const [showMidGameAlert, setShowMidGameAlert] = useState(false);
    const [restarting, setRestarting] = useState(false);

    // Reset all gameplay tracking states and refs when sessionId changes to support component reuse
    useEffect(() => {
        isGameOverRef.current = false;
        restartAckReceivedRef.current = false;
        hasTriggeredHighScoreAlertRef.current = false;
        
        setIsGameOver(false);
        setFinalScore(null);
        setIsHighScore(false);
        setBestScore(null);
        setLeaderboardRank(null);
        setFetchingResults(false);
        setShowMidGameAlert(false);
        setRestarting(false);
    }, [sessionId]);

    // Listen for direct HTML5 window postMessage notifications from the game iframe
    useEffect(() => {
        if (!userId) return;

        const handleMessage = async (event: MessageEvent) => {
            let data = event.data;
            if (typeof data === "string") {
                try {
                    data = JSON.parse(data);
                } catch {
                    // Ignore non-JSON strings
                }
            }

            if (data) {
                if (data.type) {
                    console.log("Portal message received from iframe. Event type:", data.type, "payload:", data);
                }
                if (data.type === "MATCH_COMPLETE") {
                    const score = Number(data.score);
                    if (!isGameOverRef.current) {
                        await handleMatchFinished(score, userId);
                    }
                } else if (data.type === "REQUEST_RESTART") {
                    console.log("Portal received REQUEST_RESTART message from game iframe.");
                    await handlePlayAgain();
                } else if (data.type === "SESSION_UPDATED") {
                    const newSessionId = data.sessionId;
                    if (newSessionId) {
                        console.log("Portal received SESSION_UPDATED message from game iframe. New sessionId:", newSessionId);
                        const newPath = `/dashboard/play/${newSessionId}`;
                        setSession(prev => prev ? { ...prev, id: newSessionId, status: 'in_progress', score: null } : null);
                        window.history.replaceState(null, '', newPath);
                        isGameOverRef.current = false;
                        setIsGameOver(false);
                        setFinalScore(null);
                        setIsHighScore(false);
                        setBestScore(null);
                        setLeaderboardRank(null);
                        hasTriggeredHighScoreAlertRef.current = false;
                    }
                } else if (data.type === "RESTART_ACK") {
                    restartAckReceivedRef.current = true;
                } else if (data.type === "SCORE_UPDATE") {
                    const currentScore = Number(data.score);
                    if (!isNaN(currentScore) && bestScore !== null && bestScore > 0 && currentScore > bestScore) {
                        if (!hasTriggeredHighScoreAlertRef.current) {
                            hasTriggeredHighScoreAlertRef.current = true;
                            setShowMidGameAlert(true);
                            setTimeout(() => {
                                setShowMidGameAlert(false);
                            }, 3000);
                        }
                        setBestScore(currentScore);
                    }
                }
            }
        };

        window.addEventListener("message", handleMessage);
        return () => window.removeEventListener("message", handleMessage);
    }, [userId, session, bestScore]);

    useEffect(() => {
        let pollInterval: NodeJS.Timeout | null = null;

        const init = async () => {
            try {
                hasTriggeredHighScoreAlertRef.current = false;
                // Get auth user via Better Auth
                const { data } = await authClient.getSession();
                if (!data?.user) {
                    router.push("/");
                    return;
                }
                const currentUserId = data.user.id;
                setUserId(currentUserId);

                // Fetch session details via Neon-backed Game Session API
                const res = await fetch(`/api/game/session?sessionId=${sessionId}`);
                const json = await res.json();

                if (!res.ok || !json.session) {
                    setError("Session not found or has expired.");
                    setLoading(false);
                    return;
                }

                const sessionData = json.session;
                setSession(sessionData);

                // If already completed, show results directly
                if (sessionData.status === 'completed' && sessionData.score !== null) {
                    setLoading(false);
                    await handleMatchFinished(Number(sessionData.score), currentUserId);
                    return;
                }

                setLoading(false);

                // Setup polling fallback (runs every 2.5s) to guarantee updates
                pollInterval = setInterval(async () => {
                    if (isGameOverRef.current) {
                        if (pollInterval) clearInterval(pollInterval);
                        return;
                    }

                    try {
                        const pollRes = await fetch(`/api/game/session?sessionId=${sessionId}`);
                        const pollJson = await pollRes.json();
                        const currentSession = pollJson.session;

                        if (currentSession && currentSession.status === 'completed' && currentSession.score !== null) {
                            if (pollInterval) clearInterval(pollInterval);
                            await handleMatchFinished(Number(currentSession.score), currentUserId);
                        }
                    } catch (e) {
                        // ignore transient polling errors
                    }
                }, 2500);

            } catch (err: any) {
                console.error("Error loading play session:", err);
                setError(err.message || "Failed to load play session.");
                setLoading(false);
            }
        };

        init();

        return () => {
            if (pollInterval) clearInterval(pollInterval);
        };
    }, [sessionId, router]);

    const handleMatchFinished = async (score: number, currentUserId: string) => {
        if (isGameOverRef.current) return;
        isGameOverRef.current = true;

        setFinalScore(score);
        setIsGameOver(true);
        setFetchingResults(true);

        try {
            // Persist the match completion and score to Neon DB
            const patchRes = await fetch("/api/game/session", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sessionId, score }),
            });
            const patchData = await patchRes.json();

            if (patchData.success) {
                if (patchData.best_score !== undefined) {
                    setBestScore(Number(patchData.best_score));
                }
                if (patchData.is_personal_best !== undefined) {
                    setIsHighScore(Boolean(patchData.is_personal_best));
                }
            }

            // Fetch high scores from Neon DB via leaderboard API
            if (session?.game?.id) {
                const res = await fetch(`/api/leaderboard?gameId=${session.game.id}`);
                const data = await res.json();
                if (data.success && data.leaderboard) {
                    const entries = data.leaderboard;
                    const userEntry = entries.find((e: any) => e.user_id === currentUserId);
                    const best = userEntry ? Number(userEntry.high_score) : score;
                    if (!patchData.success) {
                        setBestScore(Math.max(best, score));
                        if (score >= best) {
                            setIsHighScore(true);
                        }
                    }
                    const rank = entries.findIndex((e: any) => e.user_id === currentUserId) + 1;
                    setLeaderboardRank(rank > 0 ? rank : null);
                }
            }
        } catch (err) {
            console.error("Error persisting match stats:", err);
        }
        setFetchingResults(false);
    };

    const handlePlayAgain = async () => {
        if (!session || !session.game || !userId) return;
        
        try {
            setRestarting(true);
            isGameOverRef.current = false;
            setFinalScore(null);
            setIsHighScore(false);
            setBestScore(null);
            setLeaderboardRank(null);

            // 1. Fetch new session from backend
            const response = await fetch("/api/game/session", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    gameId: session.game.id,
                    mode: session.mode
                })
            });

            const resData = await response.json();
            if (!response.ok || !resData.success) {
                throw new Error(resData.error || "Failed to start new session");
            }

            const newSessionId = resData.sessionId;
            const newPath = `/dashboard/play/${newSessionId}`;

            // Reset ACK ref before sending message
            restartAckReceivedRef.current = false;
            hasTriggeredHighScoreAlertRef.current = false;

            // Hide overlay and allow iframe interaction
            setIsGameOver(false);
            setRestarting(false);

            // 2. Try the fast restart path: send postMessage to iframe
            const iframeEl = document.getElementById("game-iframe") as HTMLIFrameElement;
            const targetWindow = iframeEl?.contentWindow || iframeRef.current?.contentWindow;

            if (targetWindow) {
                console.log("Portal posting RESTART_GAME signal to game iframe. sessionId:", newSessionId);
                targetWindow.postMessage({
                    type: "RESTART_GAME",
                    sessionId: newSessionId
                }, "*");
            } else {
                console.error("Portal Error: Game iframe window not found via ref or document ID!");
            }

            // 3. Start a 500ms fallback timeout
            setTimeout(async () => {
                console.log("Portal 500ms timeout check. restartAckReceived =", restartAckReceivedRef.current);
                if (restartAckReceivedRef.current) {
                    console.log("Portal fast restart flow successful! Replacing URL bar silently.");
                    // Success! Game supports fast restart.
                    // Update React state and silently replace URL in address bar without reloading iframe
                    setSession(prev => prev ? { ...prev, id: newSessionId, status: 'in_progress', score: null } : null);
                    window.history.replaceState(null, '', newPath);
                } else {
                    console.warn("Portal fast restart timed out. Doing fallback full reload of the game iframe... (TEMPORARILY DISABLED FOR TESTING)");
                    // Fallback: Game does not support fast restart. Reload iframe.
                    // router.replace(newPath);
                }
            }, 500);

        } catch (err: any) {
            console.error("Error restarting match:", err);
            toast.error(err.message || "Failed to start new match");
            setRestarting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-screen flex-col bg-slate-50 text-slate-900 font-sans overflow-hidden">
                {/* Top header skeleton */}
                <div className="h-14 bg-white border-b border-slate-200 flex items-center px-6 justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-200 animate-pulse" />
                        <div className="w-32 h-5 bg-slate-200 rounded animate-pulse" />
                    </div>
                    <div className="w-20 h-4 bg-slate-200 rounded animate-pulse" />
                </div>
                {/* Immersive Game canvas skeleton placeholder */}
                <div className="flex-grow p-4 md:p-8 flex items-center justify-center">
                    <div className="w-full max-w-4xl aspect-[4/3] max-h-[80vh] bg-slate-200/80 rounded-3xl animate-pulse shadow-md flex flex-col items-center justify-center gap-3">
                        <Gamepad2 className="w-12 h-12 text-slate-300 animate-bounce" />
                        <p className="text-sm font-semibold text-slate-400">Preparing game session...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex h-screen bg-slate-50 flex-col items-center justify-center p-8 text-center text-slate-900">
                <p className="text-red-500 font-bold mb-4">{error}</p>
                <Link href="/dashboard" className="text-purple-600 hover:underline text-sm flex items-center gap-1.5">
                    <ArrowLeft className="w-4 h-4" /> Back to Dashboard
                </Link>
            </div>
        );
    }

    if (!session || !session.game) return null;

    const gameUrl = (session.game.game_url || "").trim();
    const separator = gameUrl.includes("?") ? "&" : "?";
    // We send sessionId=sessionId and sessionToken=JWT to ensure compliance
    const finalUrl = `${gameUrl}${separator}sessionId=${sessionId}&sessionToken=${session.session_token}`;

    return (
        <div className="relative h-screen w-screen overflow-hidden bg-black text-white font-sans">
            <Toaster />

            {/* Subtle top back-bar */}
            {!isGameOver && (
                <div className="absolute top-4 left-4 z-50 group flex items-center gap-3">
                    <button
                        onClick={() => router.back()}
                        className="p-3 bg-black/50 hover:bg-black/80 backdrop-blur-md border border-white/10 rounded-2xl text-gray-400 hover:text-white transition-all shadow-lg active:scale-95"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <span className="text-xs font-bold uppercase tracking-wider bg-black/60 backdrop-blur-md px-4 py-2 rounded-xl border border-white/5 shadow-lg select-none text-emerald-400">
                        Playing {session.game.title} • Kick Games
                    </span>
                </div>
            )}

            {/* Game Iframe */}
            <iframe
                ref={iframeRef}
                id="game-iframe"
                src={finalUrl}
                className="w-full h-full border-none"
                allow="autoplay; fullscreen"
            />

            {/* Mid-Game High Score Alert Pop-Up */}
            {showMidGameAlert && (
                <div className="absolute inset-0 pointer-events-none z-[999] flex items-center justify-center animate-in zoom-in-75 fade-in duration-500">
                    <div className="flex flex-col items-center animate-bounce">
                        <img
                            src="/ChatGPT Image Jul 8, 2026, 11_57_12 AM.png"
                            alt="NEW RECORD!"
                            className="w-44 sm:w-52 object-contain drop-shadow-[0_10px_25px_rgba(168,85,247,0.6)]"
                        />
                        <div className="bg-purple-600/90 backdrop-blur-md px-4 py-1.5 rounded-full border border-purple-400 text-white text-[10px] font-black uppercase tracking-widest shadow-lg -mt-3 shadow-purple-500/20">
                            New High Score!
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

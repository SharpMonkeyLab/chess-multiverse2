"use client";

import { useEffect, useState } from "react";

import { hasSupabaseConfig, supabase } from "@/lib/supabaseClient";

import {
    MATCHMAKING_EVENT_NAME,
    cancelReadyForMatch,
    clearStoredWaitingMatch,
    formatQueueTime,
    readStoredWaitingMatch
} from "@/lib/matchmakingClient";

const PRESENCE_REFRESH_MS = 30000;
const QUEUE_FALLBACK_REFRESH_MS = 2500;

export default function GlobalMatchmakingBar() {
    const [waitingMatch, setWaitingMatch] = useState(null);
    const [waitingSeconds, setWaitingSeconds] = useState(0);
    const [onlinePlayerCount, setOnlinePlayerCount] = useState(0);
    const [isCancelling, setIsCancelling] = useState(false);

    useEffect(() => {
        function syncWaitingMatchFromStorage() {
            setWaitingMatch(readStoredWaitingMatch());
        }

        syncWaitingMatchFromStorage();

        window.addEventListener(MATCHMAKING_EVENT_NAME, syncWaitingMatchFromStorage);
        window.addEventListener("storage", syncWaitingMatchFromStorage);

        return () => {
            window.removeEventListener(
                MATCHMAKING_EVENT_NAME,
                syncWaitingMatchFromStorage
            );
            window.removeEventListener("storage", syncWaitingMatchFromStorage);
        };
    }, []);

    useEffect(() => {
        if (!hasSupabaseConfig() || !supabase) return;

        let isStillMounted = true;

        async function markOnlineAndLoadCount() {
            try {
                await supabase.rpc("mark_user_online");

                const { data, error } = await supabase.rpc("get_online_player_count");

                if (!isStillMounted || error) return;

                setOnlinePlayerCount(Number(data) || 0);
            } catch {
                // Quiet fail. Presence is useful, not sacred scripture.
            }
        }

        markOnlineAndLoadCount();

        const intervalId = window.setInterval(
            markOnlineAndLoadCount,
            PRESENCE_REFRESH_MS
        );

        return () => {
            isStillMounted = false;
            window.clearInterval(intervalId);
        };
    }, []);

    useEffect(() => {
        if (!waitingMatch?.queueId || !hasSupabaseConfig() || !supabase) {
            return;
        }

        let isStillMounted = true;

        async function checkQueueRow() {
            const { data: queueRow, error } = await supabase
                .from("matchmaking_queue")
                .select("id, status, matched_session_id")
                .eq("id", waitingMatch.queueId)
                .single();

            if (!isStillMounted || error || !queueRow) return;

            if (queueRow.status === "matched" && queueRow.matched_session_id) {
                clearStoredWaitingMatch();
                window.location.replace(`/play?session=${queueRow.matched_session_id}`);
            }
        }

        checkQueueRow();

        const channel = supabase
            .channel(`global-matchmaking-${waitingMatch.queueId}`)
            .on(
                "postgres_changes",
                {
                    event: "UPDATE",
                    schema: "public",
                    table: "matchmaking_queue",
                    filter: `id=eq.${waitingMatch.queueId}`
                },
                (payload) => {
                    const queueRow = payload.new;

                    if (queueRow?.status === "matched" && queueRow?.matched_session_id) {
                        clearStoredWaitingMatch();
                        window.location.replace(`/play?session=${queueRow.matched_session_id}`);
                    }
                }
            )
            .subscribe();

        const fallbackIntervalId = window.setInterval(
            checkQueueRow,
            QUEUE_FALLBACK_REFRESH_MS
        );

        return () => {
            isStillMounted = false;
            window.clearInterval(fallbackIntervalId);
            supabase.removeChannel(channel);
        };
    }, [waitingMatch?.queueId]);

    useEffect(() => {
        if (!waitingMatch?.startedAt) {
            setWaitingSeconds(0);
            return;
        }

        function updateWaitingSeconds() {
            const startedAtTime = new Date(waitingMatch.startedAt).getTime();
            const nextSeconds = Math.floor((Date.now() - startedAtTime) / 1000);

            setWaitingSeconds(nextSeconds);
        }

        updateWaitingSeconds();

        const intervalId = window.setInterval(updateWaitingSeconds, 1000);

        return () => {
            window.clearInterval(intervalId);
        };
    }, [waitingMatch?.startedAt]);

    async function handleCancelReady() {
        if (!waitingMatch?.worldId) {
            clearStoredWaitingMatch();
            return;
        }

        setIsCancelling(true);

        try {
            await cancelReadyForMatch(waitingMatch.worldId);
        } catch (error) {
            console.warn("Cancel matchmaking failed:", error);
            clearStoredWaitingMatch();
        } finally {
            setIsCancelling(false);
        }
    }

    if (!waitingMatch) {
        return null;
    }

    const queueTime = formatQueueTime(waitingSeconds);
    const isWorldScoped =
        waitingMatch.scope === "world" ||
        Boolean(waitingMatch.worldId && waitingMatch.worldName);

    return (
        <div
            className="global-matchmaking-bar"
            role="status"
            aria-live="polite"
            aria-label={`Seeking opponent in the Multiverse. Waiting ${queueTime}.`}
        >
            <div className="mm-bar-atmosphere" aria-hidden="true">
                <span className="mm-bar-scan" />
                <span className="mm-bar-board-fade" />
            </div>

            <div className="mm-bar-status">
                <span className="mm-bar-piece" aria-hidden="true">
                    ♞
                </span>

                <div className="mm-bar-status-copy">
                    <strong>Seeking opponent in the Multiverse</strong>
                    <span className="mm-bar-pulse-label">
                        <span className="mm-bar-pulse-dot" aria-hidden="true" />
                        {isWorldScoped ? "In this universe" : "Across every universe"}
                    </span>
                </div>
            </div>

            <div className="mm-bar-timer" aria-hidden="true">
                <span className="mm-bar-timer-digits">{queueTime}</span>
                <span className="mm-bar-timer-caption">elapsed</span>
            </div>

            <div className="mm-bar-meta">
                {waitingMatch.worldName && (
                    <span className="mm-bar-world" title={waitingMatch.worldName}>
                        {waitingMatch.worldName}
                    </span>
                )}

                <span className="mm-bar-online">
                    {onlinePlayerCount || "—"} online
                </span>
            </div>

            <button
                type="button"
                className="mm-bar-cancel"
                onClick={handleCancelReady}
                disabled={isCancelling}
            >
                {isCancelling ? "Leaving..." : "Cancel"}
            </button>
        </div>
    );
}

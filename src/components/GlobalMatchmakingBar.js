"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { hasSupabaseConfig, supabase } from "@/lib/supabaseClient";

import {
    MATCHMAKING_EVENT_NAME,
    cancelReadyForMatch,
    clearStoredWaitingMatch,
    formatQueueTime,
    readStoredWaitingMatch
} from "@/lib/matchmakingClient";

const PRESENCE_REFRESH_MS = 30000;
const QUEUE_FALLBACK_REFRESH_MS = 10000;

export default function GlobalMatchmakingBar() {
    const router = useRouter();

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
                router.push(`/play?session=${queueRow.matched_session_id}`);
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
                        router.push(`/play?session=${queueRow.matched_session_id}`);
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
    }, [waitingMatch?.queueId, router]);

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

    return (
        <div className="global-matchmaking-bar">
            <strong>Finding match</strong>

            <span>{formatQueueTime(waitingSeconds)}</span>

            <span>
                {onlinePlayerCount || "—"} player
                {onlinePlayerCount === 1 ? "" : "s"} online
            </span>

            {waitingMatch.worldName && (
                <span className="global-matchmaking-world">
                    {waitingMatch.worldName}
                </span>
            )}

            <button type="button" onClick={handleCancelReady} disabled={isCancelling}>
                {isCancelling ? "Cancelling..." : "Cancel"}
            </button>
        </div>
    );
}
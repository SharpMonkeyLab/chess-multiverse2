import { hasSupabaseConfig, supabase } from "@/lib/supabaseClient";

export const MATCHMAKING_STORAGE_KEY =
    "chess-multiverse:matchmaking-waiting";

export const MATCHMAKING_EVENT_NAME =
    "chess-multiverse:matchmaking-updated";

export function storeWaitingMatch({ queueId, worldId, worldName }) {
    if (typeof window === "undefined") return;

    window.localStorage.setItem(
        MATCHMAKING_STORAGE_KEY,
        JSON.stringify({
            queueId,
            worldId,
            worldName,
            startedAt: new Date().toISOString()
        })
    );

    window.dispatchEvent(new Event(MATCHMAKING_EVENT_NAME));
}

export function clearStoredWaitingMatch() {
    if (typeof window === "undefined") return;

    window.localStorage.removeItem(MATCHMAKING_STORAGE_KEY);
    window.dispatchEvent(new Event(MATCHMAKING_EVENT_NAME));
}

export function readStoredWaitingMatch() {
    if (typeof window === "undefined") return null;

    try {
        const rawValue = window.localStorage.getItem(MATCHMAKING_STORAGE_KEY);

        if (!rawValue) return null;

        const parsedValue = JSON.parse(rawValue);

        if (!parsedValue?.queueId || !parsedValue?.worldId) {
            return null;
        }

        return parsedValue;
    } catch {
        return null;
    }
}

export function formatQueueTime(totalSeconds) {
    const safeSeconds = Math.max(0, Number(totalSeconds) || 0);
    const minutes = Math.floor(safeSeconds / 60);
    const seconds = safeSeconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export async function runMatchmakingMaintenance() {
    if (!hasSupabaseConfig() || !supabase) return;

    try {
        // Cancel abandoned queue rows.
        // Example: someone clicked Ready, then closed the browser.
        await supabase.rpc("cleanup_stale_matchmaking_queue", {
            stale_minutes: 30
        });

        // Mark very old open sessions as abandoned.
        // This does not delete match records.
        await supabase.rpc("cleanup_stale_play_sessions", {
            stale_hours: 24
        });
    } catch (error) {
        // Maintenance should never block matchmaking.
        // If it fails, matchmaking can still continue.
        console.warn("Matchmaking maintenance failed:", error);
    }
}

export async function readyForMatch({ worldId, worldName }) {
    if (!worldId) {
        return {
            status: "error",
            message: "No world selected for matchmaking."
        };
    }

    if (!hasSupabaseConfig() || !supabase) {
        return {
            status: "error",
            message: "Online matchmaking is not available."
        };
    }

    const {
        data: { user },
        error: userError
    } = await supabase.auth.getUser();

    if (userError || !user) {
        return {
            status: "error",
            message: "Sign in to join matchmaking."
        };
    }

    await runMatchmakingMaintenance();

    const { data: matchResult, error: matchError } = await supabase.rpc(
        "ready_for_match",
        {
            target_world_id: worldId
        }
    );

    if (matchError) {
        return {
            status: "error",
            message: matchError.message || "Could not join matchmaking."
        };
    }

    if (matchResult?.status === "matched" && matchResult?.session_id) {
        clearStoredWaitingMatch();

        return {
            status: "matched",
            sessionId: matchResult.session_id,
            message: "Match found. Opening board..."
        };
    }

    if (matchResult?.status === "waiting" && matchResult?.queue_id) {
        storeWaitingMatch({
            queueId: matchResult.queue_id,
            worldId,
            worldName
        });

        return {
            status: "waiting",
            queueId: matchResult.queue_id,
            message: "Waiting for opponent..."
        };
    }

    return {
        status: "error",
        message: "Matchmaking returned an unexpected result."
    };
}

export async function cancelReadyForMatch(worldId) {
    if (!worldId || !hasSupabaseConfig() || !supabase) {
        clearStoredWaitingMatch();
        return;
    }

    try {
        await supabase.rpc("cancel_ready_for_match", {
            target_world_id: worldId
        });
    } finally {
        clearStoredWaitingMatch();
    }
}
import { hasSupabaseConfig, supabase } from "@/lib/supabaseClient";

export function getLiveUndoReasonMessage(reason) {
    if (reason === "latest_action_belongs_to_other_player") {
        return "Only the player who acted last can undo.";
    }

    if (reason === "no_actions") {
        return "Nothing to undo yet.";
    }

    if (reason === "session_ended") {
        return "Session ended.";
    }

    if (reason === "not_active_player") {
        return "Only active players can undo.";
    }

    return "Undo isn’t available.";
}

export async function getLiveUndoStatus(sessionId) {
    if (!sessionId || !hasSupabaseConfig() || !supabase) {
        return null;
    }

    const { data, error } = await supabase.rpc("get_live_undo_status", {
        target_session_id: sessionId
    });

    if (error) {
        throw error;
    }

    return data || null;
}

export async function undoLatestLiveAction(sessionId) {
    if (!sessionId || !hasSupabaseConfig() || !supabase) {
        return {
            status: "not_allowed",
            reason: "missing_session"
        };
    }

    const { data, error } = await supabase.rpc(
        "undo_latest_live_session_action",
        {
            target_session_id: sessionId
        }
    );

    if (error) {
        throw error;
    }

    return data || {
        status: "not_allowed",
        reason: "unknown"
    };
}

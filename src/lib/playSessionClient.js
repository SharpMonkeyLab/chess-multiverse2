import { hasSupabaseConfig, supabase } from "@/lib/supabaseClient";
import {
    createSessionGameState,
    getActionSummaryFromGameStates,
    getGameStateJson
} from "@/lib/sessionGameState";

export const PLAY_SESSION_SELECT =
    "id, world_id, host_id, status, visibility, game_state, lifecycle_status, ended_at, end_reason, match_phase, result_status, proposed_result, confirmed_result, result_note, result_proposed_by, result_proposed_at, result_response, result_response_by, result_response_at, result_resolved_by, result_resolved_at, winner_team, loser_team";

export function getSessionLifecycleStatus(session) {
    if (!session) return "unknown";

    return session.lifecycle_status || (session.ended_at ? "ended" : "open");
}

export async function fetchPlaySession(sessionId) {
    if (!sessionId || !hasSupabaseConfig() || !supabase) {
        return { session: null, error: new Error("Online sessions unavailable.") };
    }

    const { data: session, error } = await supabase
        .from("play_sessions")
        .select(PLAY_SESSION_SELECT)
        .eq("id", sessionId)
        .single();

    return { session: session || null, error };
}

export async function fetchSessionParticipants(sessionId) {
    if (!sessionId || !hasSupabaseConfig() || !supabase) {
        return { participants: [], error: null };
    }

    const { data: participantRows, error: participantError } = await supabase
        .from("play_session_participants")
        .select(
            "id, session_id, user_id, role, team, conduct_score, joined_at, participant_status, left_at"
        )
        .eq("session_id", sessionId)
        .order("joined_at", { ascending: true });

    if (participantError) {
        return { participants: [], error: participantError };
    }

    const safeParticipantRows = Array.isArray(participantRows)
        ? participantRows
        : [];

    const userIds = [
        ...new Set(
            safeParticipantRows.map((participant) => participant.user_id).filter(Boolean)
        )
    ];

    let profilesByUserId = {};

    if (userIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
            .from("profiles")
            .select("id, display_name")
            .in("id", userIds);

        if (!profilesError && Array.isArray(profiles)) {
            profilesByUserId = Object.fromEntries(
                profiles.map((profile) => [profile.id, profile])
            );
        }
    }

    const participants = safeParticipantRows.map((participant) => {
        const profile = profilesByUserId[participant.user_id];
        const displayName = profile?.display_name?.trim();

        const fallbackName =
            participant.role === "host"
                ? "Host"
                : `Player ${participant.user_id?.slice(0, 4) || ""}`;

        return {
            ...participant,
            displayName: displayName || fallbackName
        };
    });

    return { participants, error: null };
}

export async function recordPlaySessionAction({
    sessionId,
    previousGameState,
    nextGameState,
    moveNumber,
    turnTeam
}) {
    if (!sessionId || !hasSupabaseConfig() || !supabase) {
        return { error: new Error("Online sessions unavailable.") };
    }

    const actionSummary = getActionSummaryFromGameStates(
        previousGameState,
        nextGameState
    );

    const { error } = await supabase.rpc("record_play_session_action", {
        target_session_id: sessionId,
        action_type: actionSummary.actionType,
        before_game_state: previousGameState,
        after_game_state: nextGameState,
        description: actionSummary.description,
        action_move_number: moveNumber,
        action_turn_team: turnTeam
    });

    return { error, actionSummary };
}

export function buildSessionGameState({
    cells,
    pieceNames,
    pieceNameLocked,
    turnTeam,
    moveNumber,
    actionLog,
    systemsRuntime = null,
    enPassantTargetIndex = null
}) {
    return createSessionGameState({
        cells,
        pieceNames,
        pieceNameLocked,
        turnTeam,
        moveNumber,
        actionLog,
        systemsRuntime,
        enPassantTargetIndex
    });
}

export { getGameStateJson };

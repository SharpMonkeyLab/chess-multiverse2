import { hasSupabaseConfig, supabase } from "@/lib/supabaseClient";

export const MATCH_RESULT_OPTIONS = [
    {
        key: "white_win",
        label: "White won"
    },
    {
        key: "black_win",
        label: "Black won"
    },
    {
        key: "draw",
        label: "Draw"
    },
    {
        key: "no_contest",
        label: "No contest"
    }
];

export function getMatchResultLabel(resultKey) {
    const resultOption = MATCH_RESULT_OPTIONS.find(
        (option) => option.key === resultKey
    );

    return resultOption?.label || "Unknown result";
}

export function getMatchPhaseLabel(matchPhase) {
    if (matchPhase === "active") return "Active match";
    if (matchPhase === "result_pending") return "Result pending";
    if (matchPhase === "continue_requested") return "Continue requested";
    if (matchPhase === "completed") return "Completed";
    if (matchPhase === "disputed") return "Disputed";
    if (matchPhase === "cancelled") return "Cancelled";
    if (matchPhase === "abandoned") return "Abandoned";

    return "Match";
}

export function getMatchResultResponseMessage(reason) {
    if (reason === "not_active_player") {
        return "Only active players can do this.";
    }

    if (reason === "invalid_result") {
        return "That result is not valid.";
    }

    if (reason === "invalid_response") {
        return "That response is not valid.";
    }

    if (reason === "invalid_decision") {
        return "That decision is not valid.";
    }

    if (reason === "session_ended") {
        return "This session has already ended.";
    }

    if (reason === "result_flow_already_active") {
        return "A result process is already active.";
    }

    if (reason === "no_pending_result") {
        return "There is no pending result proposal.";
    }

    if (reason === "only_proposer_can_cancel") {
        return "Only the player who proposed the result can cancel it.";
    }

    if (reason === "opponent_already_responded") {
        return "The opponent has already responded.";
    }

    if (reason === "proposer_cannot_respond_to_own_proposal") {
        return "You cannot respond to your own result proposal.";
    }

    if (reason === "no_continue_request") {
        return "There is no continue request to resolve.";
    }

    if (reason === "only_proposer_can_resolve_continue_request") {
        return "Only the player who proposed the result can answer this continue request.";
    }

    return "Match result action was not available.";
}

function getUnavailableResult() {
    return {
        status: "error",
        message: "Online match result tools are not available."
    };
}

export async function proposeMatchResult({
    sessionId,
    result,
    note = ""
}) {
    if (!sessionId || !hasSupabaseConfig() || !supabase) {
        return getUnavailableResult();
    }

    const { data, error } = await supabase.rpc("propose_match_result", {
        target_session_id: sessionId,
        target_result: result,
        note
    });

    if (error) {
        return {
            status: "error",
            message: error.message || "Could not propose match result."
        };
    }

    return data || {
        status: "proposed",
        session_id: sessionId,
        proposed_result: result
    };
}

export async function cancelMatchResultProposal(sessionId) {
    if (!sessionId || !hasSupabaseConfig() || !supabase) {
        return getUnavailableResult();
    }

    const { data, error } = await supabase.rpc(
        "cancel_match_result_proposal",
        {
            target_session_id: sessionId
        }
    );

    if (error) {
        return {
            status: "error",
            message: error.message || "Could not cancel result proposal."
        };
    }

    return data || {
        status: "cancelled",
        session_id: sessionId
    };
}

export async function respondToMatchResult({
    sessionId,
    response
}) {
    if (!sessionId || !hasSupabaseConfig() || !supabase) {
        return getUnavailableResult();
    }

    const { data, error } = await supabase.rpc("respond_to_match_result", {
        target_session_id: sessionId,
        response
    });

    if (error) {
        return {
            status: "error",
            message: error.message || "Could not respond to match result."
        };
    }

    return data || {
        status: response,
        session_id: sessionId
    };
}

export async function resolveContinueRequest({
    sessionId,
    decision
}) {
    if (!sessionId || !hasSupabaseConfig() || !supabase) {
        return getUnavailableResult();
    }

    const { data, error } = await supabase.rpc("resolve_continue_request", {
        target_session_id: sessionId,
        decision
    });

    if (error) {
        return {
            status: "error",
            message: error.message || "Could not resolve continue request."
        };
    }

    return data || {
        status: decision === "continue" ? "continued" : "disputed",
        session_id: sessionId
    };
}

export async function resignMatch(sessionId) {
    if (!sessionId || !hasSupabaseConfig() || !supabase) {
        return getUnavailableResult();
    }

    const { data, error } = await supabase.rpc("resign_match", {
        target_session_id: sessionId
    });

    if (error) {
        return {
            status: "error",
            message: error.message || "Could not resign match."
        };
    }

    return data || {
        status: "completed",
        session_id: sessionId,
        reason: "resignation"
    };
}
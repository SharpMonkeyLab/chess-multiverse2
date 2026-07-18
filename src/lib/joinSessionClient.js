import { hasSupabaseConfig, supabase } from "@/lib/supabaseClient";

function getSessionLifecycleStatus(session) {
    if (!session) return "unknown";

    return session.lifecycle_status || (session.ended_at ? "ended" : "open");
}

function pickJoinTeam(participants, userId) {
    const activeParticipants = (participants || []).filter(
        (participant) =>
            participant.participant_status !== "left" &&
            !participant.left_at
    );

    const existing = activeParticipants.find(
        (participant) => participant.user_id === userId
    );

    if (existing) {
        return {
            alreadyJoined: true,
            team: existing.team || "black",
            role: existing.role || "player"
        };
    }

    const takenTeams = new Set(
        activeParticipants
            .map((participant) => participant.team)
            .filter(Boolean)
    );

    if (!takenTeams.has("black")) {
        return { alreadyJoined: false, team: "black", role: "player" };
    }

    if (!takenTeams.has("white")) {
        return { alreadyJoined: false, team: "white", role: "player" };
    }

    return {
        alreadyJoined: false,
        team: null,
        role: "player",
        error: "This session already has two players."
    };
}

export async function joinPlaySessionByInvite(sessionId) {
    if (!sessionId) {
        return {
            status: "error",
            message: "This invite link is missing a session."
        };
    }

    if (!hasSupabaseConfig() || !supabase) {
        return {
            status: "error",
            message: "Online sessions are unavailable right now."
        };
    }

    const {
        data: { user },
        error: userError
    } = await supabase.auth.getUser();

    if (userError || !user) {
        return {
            status: "auth_required",
            message: "Sign in, then open this invite link again."
        };
    }

    const { data: session, error: sessionError } = await supabase
        .from("play_sessions")
        .select("id, lifecycle_status, ended_at, match_phase")
        .eq("id", sessionId)
        .single();

    if (sessionError || !session) {
        return {
            status: "error",
            message: "Session not found."
        };
    }

    const lifecycleStatus = getSessionLifecycleStatus(session);

    if (lifecycleStatus !== "open") {
        return {
            status: "error",
            message: "This session has ended and can no longer be joined."
        };
    }

    if (
        session.match_phase &&
        ["completed", "cancelled", "abandoned", "disputed"].includes(
            session.match_phase
        )
    ) {
        return {
            status: "error",
            message: "This match is finished and can no longer be joined."
        };
    }

    const { data: participants, error: participantsError } = await supabase
        .from("play_session_participants")
        .select(
            "id, session_id, user_id, role, team, participant_status, left_at"
        )
        .eq("session_id", sessionId);

    if (participantsError) {
        return {
            status: "error",
            message:
                participantsError.message || "Could not load session players."
        };
    }

    const teamChoice = pickJoinTeam(participants, user.id);

    if (teamChoice.error) {
        return {
            status: "error",
            message: teamChoice.error
        };
    }

    if (teamChoice.alreadyJoined) {
        return {
            status: "joined",
            sessionId,
            message: "Already in this session. Opening board…"
        };
    }

    const { error: participantError } = await supabase
        .from("play_session_participants")
        .insert({
            session_id: sessionId,
            user_id: user.id,
            role: teamChoice.role,
            team: teamChoice.team,
            conduct_score: 0
        });

    // Unique violation: already a participant.
    if (participantError && participantError.code !== "23505") {
        return {
            status: "error",
            message: participantError.message || "Could not join this session."
        };
    }

    return {
        status: "joined",
        sessionId,
        team: teamChoice.team,
        message: "Joined. Opening board…"
    };
}

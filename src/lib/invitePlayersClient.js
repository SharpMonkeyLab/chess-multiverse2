import { hasSupabaseConfig, supabase } from "@/lib/supabaseClient";
import { buildSessionGameState } from "@/lib/playSessionClient";
import {
    createPieceRecord,
    createStandardSetupCells
} from "@/lib/defaultWorld";
import { fetchOnlinePlayers } from "@/lib/presenceClient";

export const FRIENDS_STORAGE_KEY = "chess-multiverse:friends";

function readFriendIds() {
    if (typeof window === "undefined") return [];

    try {
        const rawValue = window.localStorage.getItem(FRIENDS_STORAGE_KEY);
        const parsedValue = rawValue ? JSON.parse(rawValue) : [];

        return Array.isArray(parsedValue)
            ? parsedValue.filter((id) => typeof id === "string" && id)
            : [];
    } catch {
        return [];
    }
}

export function writeFriendIds(friendIds) {
    if (typeof window === "undefined") return;

    window.localStorage.setItem(
        FRIENDS_STORAGE_KEY,
        JSON.stringify(Array.from(new Set(friendIds)))
    );
}

export function addFriendId(friendId) {
    if (!friendId) return readFriendIds();

    const nextFriendIds = [...readFriendIds(), friendId];
    writeFriendIds(nextFriendIds);
    return nextFriendIds;
}

function shuffleList(items) {
    const nextItems = [...items];

    for (let index = nextItems.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(Math.random() * (index + 1));
        const temp = nextItems[index];
        nextItems[index] = nextItems[swapIndex];
        nextItems[swapIndex] = temp;
    }

    return nextItems;
}

async function loadProfilesByIds(userIds) {
    if (!userIds.length || !hasSupabaseConfig() || !supabase) {
        return [];
    }

    const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", userIds);

    if (error) {
        console.warn("Could not load invite profiles:", error.message);
        return [];
    }

    return data || [];
}

export async function loadInvitePlayerLists(currentUserId) {
    const friendIds = readFriendIds().filter((id) => id !== currentUserId);
    const friendProfiles = await loadProfilesByIds(friendIds);

    const friends = friendIds.map((friendId) => {
        const profile = friendProfiles.find((item) => item.id === friendId);

        return {
            id: friendId,
            displayName: profile?.display_name || "Friend",
            isFriend: true
        };
    });

    const onlineRows = await fetchOnlinePlayers(currentUserId, 8);
    const friendIdSet = new Set(friendIds);

    const onlinePlayers = shuffleList(
        onlineRows.filter((row) => !friendIdSet.has(row.id))
    )
        .slice(0, 6)
        .map((row) => ({
            id: row.id,
            displayName: row.display_name || "Player",
            isFriend: false
        }));

    return {
        friends,
        onlinePlayers
    };
}

export async function ensurePrivatePlaySession({
    worldId,
    currentUserId,
    cells,
    pieceNames,
    pieceNameLocked,
    turnTeam = "white",
    moveNumber = 1,
    actionLog = []
}) {
    if (!worldId) {
        return {
            status: "error",
            message: "No universe selected for invite."
        };
    }

    if (!hasSupabaseConfig() || !supabase) {
        return {
            status: "error",
            message: "Online invites are not available."
        };
    }

    if (!currentUserId) {
        return {
            status: "auth_required",
            message: "Sign in to invite players."
        };
    }

    const gameState = buildSessionGameState({
        cells: Array.isArray(cells) ? cells : createStandardSetupCells(),
        pieceNames: pieceNames || createPieceRecord(""),
        pieceNameLocked: pieceNameLocked || createPieceRecord(false),
        turnTeam,
        moveNumber,
        actionLog
    });

    const { data: session, error: sessionError } = await supabase
        .from("play_sessions")
        .insert({
            world_id: worldId,
            host_id: currentUserId,
            status: "active",
            visibility: "private",
            lifecycle_status: "open",
            match_phase: "active",
            game_state: gameState
        })
        .select("id")
        .single();

    if (sessionError || !session?.id) {
        return {
            status: "error",
            message:
                sessionError?.message ||
                "Could not open a private table for invites."
        };
    }

    const { error: participantError } = await supabase
        .from("play_session_participants")
        .insert({
            session_id: session.id,
            user_id: currentUserId,
            role: "host",
            team: "white",
            conduct_score: 0
        });

    if (participantError && participantError.code !== "23505") {
        return {
            status: "error",
            message:
                participantError.message ||
                "Could not join your private invite table."
        };
    }

    return {
        status: "ready",
        sessionId: session.id
    };
}

export function buildInviteLink(sessionId) {
    if (typeof window === "undefined" || !sessionId) return "";

    return `${window.location.origin}/join?session=${sessionId}`;
}

export async function copyTextToClipboard(text) {
    if (!text) {
        throw new Error("Nothing to copy.");
    }

    await navigator.clipboard.writeText(text);
}

import { hasSupabaseConfig, supabase } from "@/lib/supabaseClient";

const ONLINE_WINDOW_MS = 5 * 60 * 1000;

export async function markUserOnline() {
    if (!hasSupabaseConfig() || !supabase) {
        return { ok: false };
    }

    try {
        const { error } = await supabase.rpc("mark_user_online");

        if (error) {
            console.warn("mark_user_online failed:", error.message);
            return { ok: false, error };
        }

        return { ok: true };
    } catch (error) {
        console.warn("mark_user_online failed:", error);
        return { ok: false, error };
    }
}

function isRecentPresence(row, nowMs = Date.now()) {
    const stamp =
        row?.last_seen_at ||
        row?.last_seen ||
        row?.updated_at ||
        row?.seen_at ||
        row?.online_at ||
        null;

    if (!stamp) {
        // If presence row exists without a timestamp, treat it as online.
        return true;
    }

    const timeMs = new Date(stamp).getTime();

    if (!Number.isFinite(timeMs)) {
        return true;
    }

    return nowMs - timeMs <= ONLINE_WINDOW_MS;
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
        console.warn("Could not load online profiles:", error.message);
        return [];
    }

    return data || [];
}

/**
 * Best-effort online player list for Invite.
 * Prefers presence RPCs / tables, then recent profiles as a soft fallback.
 */
export async function fetchOnlinePlayers(currentUserId, limit = 8) {
    if (!hasSupabaseConfig() || !supabase) {
        return [];
    }

    await markUserOnline();

    try {
        const { data, error } = await supabase.rpc("get_online_players");

        if (!error && Array.isArray(data) && data.length > 0) {
            return data
                .map((row) => ({
                    id: row.user_id || row.id,
                    display_name: row.display_name || row.name || "Player"
                }))
                .filter((row) => row.id && row.id !== currentUserId)
                .slice(0, limit);
        }
    } catch {
        // Fall through.
    }

    try {
        const { data, error } = await supabase
            .from("user_presence")
            .select("*")
            .limit(48);

        if (!error && Array.isArray(data) && data.length > 0) {
            const nowMs = Date.now();
            const onlineUserIds = data
                .filter((row) => isRecentPresence(row, nowMs))
                .map((row) => row.user_id || row.id)
                .filter((id) => id && id !== currentUserId);

            if (onlineUserIds.length > 0) {
                const profiles = await loadProfilesByIds(onlineUserIds);

                const profilesById = Object.fromEntries(
                    profiles.map((profile) => [profile.id, profile])
                );

                return onlineUserIds.slice(0, limit).map((userId) => ({
                    id: userId,
                    display_name: profilesById[userId]?.display_name || "Player"
                }));
            }
        }
    } catch {
        // Fall through.
    }

    // Soft fallback so Invite is never empty when accounts exist.
    const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, display_name, updated_at")
        .neq("id", currentUserId || "00000000-0000-0000-0000-000000000000")
        .order("updated_at", { ascending: false })
        .limit(limit);

    if (profilesError) {
        console.warn("Could not load invite candidates:", profilesError.message);
        return [];
    }

    return (profiles || []).map((profile) => ({
        id: profile.id,
        display_name: profile.display_name || "Player"
    }));
}

export async function fetchOnlinePlayerCount() {
    if (!hasSupabaseConfig() || !supabase) {
        return 0;
    }

    try {
        await markUserOnline();

        const { data, error } = await supabase.rpc("get_online_player_count");

        if (error) {
            console.warn("get_online_player_count failed:", error.message);
            return 0;
        }

        return Number(data) || 0;
    } catch (error) {
        console.warn("get_online_player_count failed:", error);
        return 0;
    }
}

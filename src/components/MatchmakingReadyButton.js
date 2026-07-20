"use client";

import { useEffect, useState } from "react";

import {
    MATCHMAKING_EVENT_NAME,
    clearStoredWaitingMatch,
    readStoredWaitingMatch,
    readyForMatch
} from "@/lib/matchmakingClient";
import { getUserPreferences } from "@/lib/userPreferences";
import { hasSupabaseConfig, supabase } from "@/lib/supabaseClient";

export default function MatchmakingReadyButton({
    worldId,
    worldName,
    className = "",
    disabled = false,
    readyLabel = "Ready",
    loadingLabel = "Finding Match...",
    disabledLabel = "Unavailable",
    description = "",
    onStatusChange = () => { }
}) {
    const [isJoiningMatchmaking, setIsJoiningMatchmaking] = useState(false);
    const [storedWaitingMatch, setStoredWaitingMatch] = useState(null);

    useEffect(() => {
        function syncStoredWaitingMatch() {
            setStoredWaitingMatch(readStoredWaitingMatch());
        }

        syncStoredWaitingMatch();

        window.addEventListener(MATCHMAKING_EVENT_NAME, syncStoredWaitingMatch);
        window.addEventListener("storage", syncStoredWaitingMatch);

        return () => {
            window.removeEventListener(MATCHMAKING_EVENT_NAME, syncStoredWaitingMatch);
            window.removeEventListener("storage", syncStoredWaitingMatch);
        };
    }, []);

    async function handleReadyClick() {
        if (storedWaitingMatch?.queueId) {
            if (storedWaitingMatch.worldId === worldId) {
                onStatusChange("Already waiting for an opponent…");
                return;
            }

            onStatusChange("You’re already queued in another universe.");
            return;
        }

        if (!worldId) {
            onStatusChange("No universe selected.");
            return;
        }

        setIsJoiningMatchmaking(true);
        onStatusChange("Looking for an opponent…");

        try {
            const matchResult = await readyForMatch({
                worldId,
                worldName
            });

            if (matchResult.status === "matched" && matchResult.sessionId) {
                clearStoredWaitingMatch();
                onStatusChange("Match found. Opening board…");

                // Last player to Ready gets an immediate hard navigation.
                // location.replace avoids a stuck loading button on back-nav.
                window.location.replace(`/play?session=${matchResult.sessionId}`);
                return;
            }

            if (matchResult.status === "waiting") {
                onStatusChange("Waiting for an opponent…");
                setIsJoiningMatchmaking(false);

                try {
                    let userId = "guest";
                    if (hasSupabaseConfig() && supabase) {
                        const {
                            data: { user }
                        } = await supabase.auth.getUser();
                        if (user?.id) userId = user.id;
                    }

                    if (getUserPreferences(userId).preferCommunityAfterReady) {
                        window.location.assign("/lobby");
                        return;
                    }
                } catch {
                    // Stay on the current page if preference lookup fails.
                }

                return;
            }

            onStatusChange(matchResult.message || "Could not join matchmaking.");
            setIsJoiningMatchmaking(false);
        } catch (error) {
            console.warn("Matchmaking ready button failed:", error);
            onStatusChange("Could not join matchmaking.");
            setIsJoiningMatchmaking(false);
        }
    }

    const isQueuedForThisWorld =
        storedWaitingMatch?.queueId && storedWaitingMatch.worldId === worldId;

    const isQueuedForAnotherWorld =
        storedWaitingMatch?.queueId && storedWaitingMatch.worldId !== worldId;

    const buttonLabel = disabled
        ? disabledLabel
        : isQueuedForThisWorld
            ? "Queued"
            : isQueuedForAnotherWorld
                ? "Queued Elsewhere"
                : isJoiningMatchmaking
                    ? loadingLabel
                    : readyLabel;

    return (
        <button
            type="button"
            className={className}
            onClick={handleReadyClick}
            disabled={
                disabled ||
                isJoiningMatchmaking ||
                Boolean(storedWaitingMatch?.queueId)
            }
        >
            {description ? (
                <span className="world-details-choice-copy">
                    <strong>{buttonLabel}</strong>
                    <small>{description}</small>
                </span>
            ) : (
                buttonLabel
            )}
        </button>
    );
}
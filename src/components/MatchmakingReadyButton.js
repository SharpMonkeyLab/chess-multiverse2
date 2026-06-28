"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
    MATCHMAKING_EVENT_NAME,
    clearStoredWaitingMatch,
    readStoredWaitingMatch,
    readyForMatch
} from "@/lib/matchmakingClient";

export default function MatchmakingReadyButton({
    worldId,
    worldName,
    className = "",
    disabled = false,
    readyLabel = "Ready",
    loadingLabel = "Finding Match...",
    disabledLabel = "Unavailable",
    onStatusChange = () => { }
}) {
    const router = useRouter();
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
                onStatusChange("Already waiting for opponent...");
                return;
            }

            onStatusChange("You are already queued for another world.");
            return;
        }

        if (!worldId) {
            onStatusChange("No world selected for matchmaking.");
            return;
        }

        setIsJoiningMatchmaking(true);
        onStatusChange("Looking for opponent...");

        try {
            const matchResult = await readyForMatch({
                worldId,
                worldName
            });

            if (matchResult.status === "matched" && matchResult.sessionId) {
                clearStoredWaitingMatch();
                onStatusChange("Match found. Opening board...");
                router.push(`/play?session=${matchResult.sessionId}`);
                return;
            }

            if (matchResult.status === "waiting") {
                onStatusChange("Waiting for opponent...");
                setIsJoiningMatchmaking(false);
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
            {buttonLabel}
        </button>
    );
}
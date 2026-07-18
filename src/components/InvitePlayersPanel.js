"use client";

import { useEffect, useRef, useState } from "react";

import {
    addFriendId,
    buildInviteLink,
    copyTextToClipboard,
    ensurePrivatePlaySession,
    loadInvitePlayerLists
} from "@/lib/invitePlayersClient";

export default function InvitePlayersPanel({
    isOpen,
    onClose,
    currentUserId,
    playSessionId,
    onSessionReady,
    worldId,
    cells,
    pieceNames,
    pieceNameLocked,
    turnTeam,
    moveNumber,
    actionLog,
    onStatusChange = () => {}
}) {
    const panelRef = useRef(null);
    const [friends, setFriends] = useState([]);
    const [onlinePlayers, setOnlinePlayers] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isInvitingId, setIsInvitingId] = useState("");
    const [panelStatus, setPanelStatus] = useState("");

    useEffect(() => {
        if (!isOpen) return undefined;

        let cancelled = false;

        async function loadLists() {
            setIsLoading(true);
            setPanelStatus("");

            try {
                const lists = await loadInvitePlayerLists(currentUserId);

                if (cancelled) return;

                setFriends(lists.friends);
                setOnlinePlayers(lists.onlinePlayers);
            } catch (error) {
                console.warn("Could not load invite players:", error);

                if (!cancelled) {
                    setPanelStatus("Could not load players.");
                }
            } finally {
                if (!cancelled) {
                    setIsLoading(false);
                }
            }
        }

        loadLists();

        return () => {
            cancelled = true;
        };
    }, [isOpen, currentUserId]);

    useEffect(() => {
        if (!isOpen) return undefined;

        function handlePointerDown(event) {
            if (!panelRef.current) return;
            if (panelRef.current.contains(event.target)) return;

            onClose();
        }

        function handleKeyDown(event) {
            if (event.key === "Escape") {
                onClose();
            }
        }

        document.addEventListener("mousedown", handlePointerDown);
        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("mousedown", handlePointerDown);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [isOpen, onClose]);

    async function resolveInviteSessionId() {
        if (playSessionId) {
            return { status: "ready", sessionId: playSessionId };
        }

        return ensurePrivatePlaySession({
            worldId,
            currentUserId,
            cells,
            pieceNames,
            pieceNameLocked,
            turnTeam,
            moveNumber,
            actionLog
        });
    }

    async function handleInvitePlayer(player) {
        if (!player?.id || isInvitingId) return;

        setIsInvitingId(player.id);
        setPanelStatus(`Preparing invite for ${player.displayName}...`);

        try {
            const sessionResult = await resolveInviteSessionId();

            if (sessionResult.status === "auth_required") {
                setPanelStatus(sessionResult.message);
                onStatusChange(sessionResult.message);
                return;
            }

            if (sessionResult.status !== "ready" || !sessionResult.sessionId) {
                const message =
                    sessionResult.message || "Could not open invite table.";
                setPanelStatus(message);
                onStatusChange(message);
                return;
            }

            if (!playSessionId && sessionResult.sessionId) {
                onSessionReady(sessionResult.sessionId);
            }

            const inviteUrl = buildInviteLink(sessionResult.sessionId);
            const inviteText = `Join me in Chess Multiverse — ${inviteUrl}`;

            await copyTextToClipboard(inviteText);

            const message = `Invite link copied for ${player.displayName}.`;
            setPanelStatus(message);
            onStatusChange(message);
        } catch (error) {
            console.warn("Invite failed:", error);
            const message = "Could not copy invite link.";
            setPanelStatus(message);
            onStatusChange(message);
        } finally {
            setIsInvitingId("");
        }
    }

    async function handleCopyLink() {
        setIsInvitingId("link");
        setPanelStatus("Preparing invite link...");

        try {
            const sessionResult = await resolveInviteSessionId();

            if (sessionResult.status !== "ready" || !sessionResult.sessionId) {
                const message =
                    sessionResult.message || "Could not open invite table.";
                setPanelStatus(message);
                onStatusChange(message);
                return;
            }

            if (!playSessionId && sessionResult.sessionId) {
                onSessionReady(sessionResult.sessionId);
            }

            await copyTextToClipboard(buildInviteLink(sessionResult.sessionId));

            const message = "Invite link copied.";
            setPanelStatus(message);
            onStatusChange(message);
        } catch (error) {
            console.warn("Copy invite failed:", error);
            const message = "Copy failed.";
            setPanelStatus(message);
            onStatusChange(message);
        } finally {
            setIsInvitingId("");
        }
    }

    function handleAddFriend(player) {
        if (!player?.id) return;

        addFriendId(player.id);
        setFriends((current) => {
            if (current.some((friend) => friend.id === player.id)) {
                return current;
            }

            return [
                ...current,
                {
                    id: player.id,
                    displayName: player.displayName,
                    isFriend: true
                }
            ];
        });
        setOnlinePlayers((current) =>
            current.filter((item) => item.id !== player.id)
        );
        setPanelStatus(`${player.displayName} added to friends.`);
    }

    if (!isOpen) return null;

    return (
        <div className="invite-players-panel" ref={panelRef} role="dialog" aria-label="Invite players">
            <div className="invite-players-panel-header">
                <h2>Invite</h2>
                <button type="button" className="invite-players-close" onClick={onClose}>
                    Close
                </button>
            </div>

            {isLoading ? (
                <p className="invite-players-status">Loading players…</p>
            ) : (
                <>
                    <section className="invite-players-section">
                        <h3>Friends</h3>
                        {friends.length === 0 ? (
                            <p className="invite-players-empty">
                                No friends yet. Add players from Online below.
                            </p>
                        ) : (
                            <ul className="invite-players-list">
                                {friends.map((player) => (
                                    <li key={player.id}>
                                        <span>{player.displayName}</span>
                                        <button
                                            type="button"
                                            disabled={Boolean(isInvitingId)}
                                            onClick={() => handleInvitePlayer(player)}
                                        >
                                            {isInvitingId === player.id ? "..." : "Invite"}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>

                    <section className="invite-players-section">
                        <h3>Online</h3>
                        {onlinePlayers.length === 0 ? (
                            <p className="invite-players-empty">
                                No other online players right now.
                            </p>
                        ) : (
                            <ul className="invite-players-list">
                                {onlinePlayers.map((player) => (
                                    <li key={player.id}>
                                        <span>{player.displayName}</span>
                                        <div className="invite-players-row-actions">
                                            <button
                                                type="button"
                                                className="invite-players-add"
                                                onClick={() => handleAddFriend(player)}
                                            >
                                                Add
                                            </button>
                                            <button
                                                type="button"
                                                disabled={Boolean(isInvitingId)}
                                                onClick={() => handleInvitePlayer(player)}
                                            >
                                                {isInvitingId === player.id ? "..." : "Invite"}
                                            </button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>
                </>
            )}

            <div className="invite-players-footer">
                <button
                    type="button"
                    className="invite-players-copy-link"
                    disabled={Boolean(isInvitingId)}
                    onClick={handleCopyLink}
                >
                    {isInvitingId === "link" ? "Copying..." : "Copy invite link"}
                </button>

                {panelStatus ? (
                    <p className="invite-players-status">{panelStatus}</p>
                ) : null}
            </div>
        </div>
    );
}

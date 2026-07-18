"use client";

import { useEffect, useRef } from "react";

import { hasSupabaseConfig, supabase } from "@/lib/supabaseClient";
import {
    createPieceRecord,
    createStandardSetupCells
} from "@/lib/defaultWorld";
import {
    buildSessionGameState,
    fetchPlaySession,
    getGameStateJson,
    getSessionLifecycleStatus,
    recordPlaySessionAction
} from "@/lib/playSessionClient";

/**
 * Autosave + realtime sync for an open play session.
 * Match-result response handling stays in useMatchResultFlow.
 */
export function usePlaySessionSync({
    playSessionId,
    isWorldLoaded,
    sessionLifecycleStatus,
    matchPhase,
    cells,
    pieceNames,
    pieceNameLocked,
    turnTeam,
    moveNumber,
    actionLog,
    systemsRuntime,
    setCells,
    setPieceNames,
    setPieceNameLocked,
    setTurnTeam,
    setMoveNumber,
    setActionLog,
    setSystemsRuntime,
    setMovingPiece,
    setActivePiece,
    setSessionLifecycleStatus,
    setSessionEndReason,
    setLiveUndoStatus,
    syncMatchResultStateFromSession,
    showSessionSyncStatus,
    loadLiveUndoStatus,
    loadSessionParticipants,
    clearLocalCellHistory
}) {
    const lastSavedGameStateJsonRef = useRef("");
    const lastSavedGameStateRef = useRef(null);
    const saveSessionTimeoutRef = useRef(null);
    const suppressAutosaveForGameStateJsonRef = useRef("");

    const callbacksRef = useRef({});
    callbacksRef.current = {
        setCells,
        setPieceNames,
        setPieceNameLocked,
        setTurnTeam,
        setMoveNumber,
        setActionLog,
        setSystemsRuntime,
        setMovingPiece,
        setActivePiece,
        setSessionLifecycleStatus,
        setSessionEndReason,
        setLiveUndoStatus,
        syncMatchResultStateFromSession,
        showSessionSyncStatus,
        loadLiveUndoStatus,
        loadSessionParticipants,
        clearLocalCellHistory
    };

    function seedSavedGameState(gameState) {
        const json = getGameStateJson(gameState || {});
        lastSavedGameStateRef.current = gameState || null;
        lastSavedGameStateJsonRef.current = json;
        suppressAutosaveForGameStateJsonRef.current = "";
    }

    function applyRemoteSession(session) {
        const remoteGameState = session?.game_state;
        const nextLifecycleStatus = getSessionLifecycleStatus(session);

        callbacksRef.current.setSessionLifecycleStatus?.(nextLifecycleStatus);
        callbacksRef.current.setSessionEndReason?.(session?.end_reason || "");
        callbacksRef.current.syncMatchResultStateFromSession?.(session || {});

        if (nextLifecycleStatus !== "open") {
            callbacksRef.current.setLiveUndoStatus?.(null);
            callbacksRef.current.showSessionSyncStatus?.("Session ended.");
            return;
        }

        if (!remoteGameState) return;

        const remoteGameStateJson = getGameStateJson(remoteGameState);

        if (remoteGameStateJson === lastSavedGameStateJsonRef.current) {
            return;
        }

        lastSavedGameStateRef.current = remoteGameState;
        lastSavedGameStateJsonRef.current = remoteGameStateJson;
        suppressAutosaveForGameStateJsonRef.current = remoteGameStateJson;

        callbacksRef.current.setCells?.(
            Array.isArray(remoteGameState.cells)
                ? remoteGameState.cells
                : createStandardSetupCells()
        );

        callbacksRef.current.setPieceNames?.(
            remoteGameState.pieceNames || createPieceRecord("")
        );
        callbacksRef.current.setPieceNameLocked?.(
            remoteGameState.pieceNameLocked || createPieceRecord(false)
        );

        callbacksRef.current.setTurnTeam?.(remoteGameState.turnTeam || "white");
        callbacksRef.current.setMoveNumber?.(
            Number.isFinite(Number(remoteGameState.moveNumber))
                ? Number(remoteGameState.moveNumber)
                : 1
        );

        callbacksRef.current.setActionLog?.(
            Array.isArray(remoteGameState.actionLog)
                ? remoteGameState.actionLog
                : []
        );

        callbacksRef.current.setSystemsRuntime?.(
            remoteGameState.systemsRuntime || null
        );

        callbacksRef.current.setMovingPiece?.(null);
        callbacksRef.current.setActivePiece?.(null);
        callbacksRef.current.clearLocalCellHistory?.();
        callbacksRef.current.showSessionSyncStatus?.("Synced.");
        callbacksRef.current.loadLiveUndoStatus?.(playSessionId);
    }

    useEffect(() => {
        if (
            !playSessionId ||
            !isWorldLoaded ||
            sessionLifecycleStatus !== "open" ||
            matchPhase !== "active" ||
            !hasSupabaseConfig() ||
            !supabase
        ) {
            return;
        }

        const nextGameState = buildSessionGameState({
            cells,
            pieceNames,
            pieceNameLocked,
            turnTeam,
            moveNumber,
            actionLog,
            systemsRuntime
        });

        const nextGameStateJson = getGameStateJson(nextGameState);

        if (nextGameStateJson === lastSavedGameStateJsonRef.current) {
            return;
        }

        if (nextGameStateJson === suppressAutosaveForGameStateJsonRef.current) {
            suppressAutosaveForGameStateJsonRef.current = "";
            return;
        }

        if (saveSessionTimeoutRef.current) {
            clearTimeout(saveSessionTimeoutRef.current);
        }

        callbacksRef.current.showSessionSyncStatus?.("Saving…");

        saveSessionTimeoutRef.current = setTimeout(async () => {
            try {
                const previousGameState =
                    lastSavedGameStateRef.current || nextGameState;

                const { error } = await recordPlaySessionAction({
                    sessionId: playSessionId,
                    previousGameState,
                    nextGameState,
                    moveNumber,
                    turnTeam
                });

                if (error) {
                    console.warn(
                        "Could not record play session action:",
                        error.message
                    );
                    callbacksRef.current.showSessionSyncStatus?.("Couldn’t save.");
                    return;
                }

                lastSavedGameStateRef.current = nextGameState;
                lastSavedGameStateJsonRef.current = nextGameStateJson;
                callbacksRef.current.showSessionSyncStatus?.("Saved.");
                callbacksRef.current.loadLiveUndoStatus?.(playSessionId);
            } catch (error) {
                console.warn(
                    "Could not reach Supabase to record play session action:",
                    error
                );
                callbacksRef.current.showSessionSyncStatus?.("Couldn’t save.");
            }
        }, 450);

        return () => {
            if (saveSessionTimeoutRef.current) {
                clearTimeout(saveSessionTimeoutRef.current);
            }
        };
    }, [
        cells,
        pieceNames,
        pieceNameLocked,
        turnTeam,
        moveNumber,
        actionLog,
        systemsRuntime,
        playSessionId,
        isWorldLoaded,
        sessionLifecycleStatus,
        matchPhase
    ]);

    useEffect(() => {
        if (!playSessionId || !hasSupabaseConfig() || !supabase) {
            return;
        }

        const channel = supabase
            .channel(`play-session-${playSessionId}`)
            .on(
                "postgres_changes",
                {
                    event: "UPDATE",
                    schema: "public",
                    table: "play_sessions",
                    filter: `id=eq.${playSessionId}`
                },
                (payload) => {
                    applyRemoteSession(payload.new || {});
                }
            )
            .subscribe();

        const pollId = window.setInterval(async () => {
            const { session, error } = await fetchPlaySession(playSessionId);
            if (error || !session) return;
            applyRemoteSession(session);
        }, 2500);

        return () => {
            window.clearInterval(pollId);
            supabase.removeChannel(channel);
        };
    }, [playSessionId]);

    useEffect(() => {
        if (!playSessionId || !hasSupabaseConfig() || !supabase) {
            return;
        }

        callbacksRef.current.loadSessionParticipants?.(playSessionId);

        const channel = supabase
            .channel(`play-session-participants-${playSessionId}`)
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "play_session_participants",
                    filter: `session_id=eq.${playSessionId}`
                },
                () => {
                    callbacksRef.current.loadSessionParticipants?.(playSessionId);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [playSessionId]);

    return {
        seedSavedGameState,
        lastSavedGameStateJsonRef,
        lastSavedGameStateRef,
        suppressAutosaveForGameStateJsonRef
    };
}

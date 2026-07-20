"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import SiteHeader from "./SiteHeader";
import LeftSidebar from "./LeftSidebar";
import Workspace from "./Workspace";
import RightPanel from "./RightPanel";

import {
    createBoardCells,
    createDefaultWorldTheme,
    createPieceRecord,
    createStandardSetupCells,
    DEFAULT_WORLD_FEATURES,
    DEFAULT_WORLD_MECHANICS,
    getCounterListFromMechanics
} from "@/lib/defaultWorld";

import { loadLocalItem } from "@/lib/saveLoad";
import { hasSupabaseConfig, supabase } from "@/lib/supabaseClient";
import { normalizeWorldTheme } from "@/lib/worldData";
import {
    DISPLAY_MODE_PIECE,
    getWorldDisplayMode,
    saveWorldDisplayMode
} from "@/lib/userPreferences";

import InvitePlayersPanel from "./InvitePlayersPanel";
import MatchmakingReadyButton from "./MatchmakingReadyButton";
import PlaySessionResultPanel from "./PlaySessionResultPanel";

import {
    MATCHMAKING_EVENT_NAME,
    readStoredWaitingMatch
} from "@/lib/matchmakingClient";

import {
    GENERIC_PIECE_KEY,
    registerGenericPieceInstance,
    resolvePlacementPieceKey
} from "@/lib/genericPiece";

import {
    adjustCounterOnCell,
    applyTerrainToCells,
    cellHasOccupant,
    clearCounterOnCell,
    clearConditionsOnCell,
    clearPieceFromCell,
    clearTerrainOnCell,
    cloneCell,
    createMovingPiece,
    createMovingToken,
    getPrimaryToken,
    moveOccupantForPlay,
    paintTerrainOnCell,
    placePieceOnCellForPlay,
    placeTokenOnCellForPlay,
    setCounterOnCell,
    toggleConditionOnCell,
    updateCellAtIndex
} from "@/lib/boardCellActions";

import { useResponsiveStageLayout } from "@/lib/useResponsiveStageLayout";
import {
    STAGE_DESIGN_HEIGHT,
    STAGE_DESIGN_WIDTH,
    getDisplayWorldName
} from "@/lib/stageLayoutConfig";

import { useLocalCellHistory } from "@/lib/useLocalCellHistory";
import { useMatchResultFlow } from "@/lib/useMatchResultFlow";
import { usePlaySessionSync } from "@/lib/usePlaySessionSync";

import {
    addActionLogEntryToLog,
    getPieceLabel,
    getTeamLabel
} from "@/lib/sessionActionLog";

import {
    createAdvancedSystemsRuntime,
    normalizeWorldFeatures,
    normalizeWorldMechanics,
    getViewerTeam,
    paintFogCell,
    clearFogCell,
    applyFogToWholeBoard,
    resetTurnTimer
} from "@/lib/worldSystems";
import { markUserOnline } from "@/lib/presenceClient";

import {
    buildSessionGameState,
    fetchPlaySession,
    fetchSessionParticipants,
    getSessionLifecycleStatus
} from "@/lib/playSessionClient";

import {
    getLiveUndoReasonMessage,
    getLiveUndoStatus,
    undoLatestLiveAction
} from "@/lib/liveMatchUndoClient";

import { getMatchPhaseLabel } from "@/lib/matchResultClient";

const MAX_CELL_HISTORY = 30;
const MAX_ACTION_LOG = 40;

export default function PlayMode() {
    const router = useRouter();

    const [worldFeatures, setWorldFeatures] = useState(DEFAULT_WORLD_FEATURES);

    const [worldDetails, setWorldDetails] = useState({
        name: "Loading Universe…",
        description: "",
        rulesNotes: ""
    });

    const [worldTheme, setWorldTheme] = useState(createDefaultWorldTheme());
    const [worldMechanics, setWorldMechanics] = useState(DEFAULT_WORLD_MECHANICS);

    const [characterLibrary, setCharacterLibrary] = useState({});
    const [portraitAssets, setPortraitAssets] = useState({});
    const [worldTokens, setWorldTokens] = useState({});

    const [pieceNames, setPieceNames] = useState(() => createPieceRecord(""));
    const [pieceNameLocked, setPieceNameLocked] = useState(() =>
        createPieceRecord(false)
    );

    const [cells, setCells] = useState(createStandardSetupCells);

    const [movingPiece, setMovingPiece] = useState(null);
    const [selectedBoardAction, setSelectedBoardAction] = useState(null);

    const {
        cellHistory,
        cellFuture,
        clearLocalCellHistory,
        updateCellsWithHistory,
        handleUndo,
        handleRedo
    } = useLocalCellHistory({
        cells,
        setCells,
        maxHistory: MAX_CELL_HISTORY,
        onAfterHistoryRestore: () => {
            setMovingPiece(null);
        }
    });

    const [selectedTeam, setSelectedTeam] = useState(null);
    const [selectedPiece, setSelectedPiece] = useState(null);
    const [selectedToken, setSelectedToken] = useState(null);

    const [selectedCounterKey, setSelectedCounterKey] = useState("main-counter");
    const [selectedCounterDelta, setSelectedCounterDelta] = useState(null);
    const [selectedCounterAction, setSelectedCounterAction] = useState(null);
    const [counterSetValue, setCounterSetValue] = useState("1");

    const [selectedCondition, setSelectedCondition] = useState(null);
    const [selectedConditionAction, setSelectedConditionAction] = useState(null);

    const [selectedTerrain, setSelectedTerrain] = useState(null);
    const [selectedTerrainAction, setSelectedTerrainAction] = useState(null);
    const [selectedFogAction, setSelectedFogAction] = useState(null);

    const [activePiece, setActivePiece] = useState(null);

    const [playWorldId, setPlayWorldId] = useState("");
    const [playWorldSource, setPlayWorldSource] = useState("");
    const [playSessionId, setPlaySessionId] = useState("");
    const [sessionLifecycleStatus, setSessionLifecycleStatus] = useState("open");
    const [sessionEndReason, setSessionEndReason] = useState("");

    const [liveUndoStatus, setLiveUndoStatus] = useState(null);
    const [isUndoingLiveAction, setIsUndoingLiveAction] = useState(false);
    const [currentUserId, setCurrentUserId] = useState("");
    const [sessionParticipants, setSessionParticipants] = useState([]);

    const [loadStatus, setLoadStatus] = useState("Loading board…");
    const [isWorldLoaded, setIsWorldLoaded] = useState(false);

    const [sessionSyncStatus, setSessionSyncStatus] = useState("");
    const [matchmakingStatus, setMatchmakingStatus] = useState("");
    const [isInvitePanelOpen, setIsInvitePanelOpen] = useState(false);
    const [turnTeam, setTurnTeam] = useState("white");
    const [moveNumber, setMoveNumber] = useState(1);
    const [actionLog, setActionLog] = useState([]);
    const [systemsRuntime, setSystemsRuntime] = useState(null);

    // Keeps status messages temporary instead of permanently screaming.
    const sessionSyncStatusTimeoutRef = useRef(null);

    const stageLayout = useResponsiveStageLayout({
        fallbackWidth: STAGE_DESIGN_WIDTH,
        fallbackHeight: STAGE_DESIGN_HEIGHT
    });

    function showSessionSyncStatus(message) {
        setSessionSyncStatus(message);

        if (sessionSyncStatusTimeoutRef.current) {
            clearTimeout(sessionSyncStatusTimeoutRef.current);
        }

        if (message === "Saved." || message === "Synced." || message === "Undone.") {
            sessionSyncStatusTimeoutRef.current = setTimeout(() => {
                setSessionSyncStatus("");
            }, 1200);
        }
    }

    const {
        matchResultState,
        setMatchResultState,
        isResultChooserOpen,
        setIsResultChooserOpen,
        resultNote,
        setResultNote,
        isHandlingResultAction,
        isCurrentUserResultProposer,
        isResultFlowBlockingBoard,
        syncMatchResultStateFromSession,
        resetMatchResultFlow,
        handleProposeResult,
        handleCancelResultProposal,
        handleRespondToResult,
        handleResolveContinueRequest,
        handleResignMatch
    } = useMatchResultFlow({
        playSessionId,
        currentUserId,
        setSessionLifecycleStatus,
        showSessionSyncStatus
    });

    async function loadSessionParticipants(sessionId) {
        if (!sessionId) {
            setSessionParticipants([]);
            return;
        }

        try {
            const { participants, error } = await fetchSessionParticipants(sessionId);

            if (error) {
                console.warn("Could not load session participants:", error.message);
                setSessionParticipants([]);
                return;
            }

            setSessionParticipants(participants);
        } catch (error) {
            console.warn("Could not load session participants:", error);
            setSessionParticipants([]);
        }
    }

    async function loadLiveUndoStatus(targetSessionId = playSessionId) {
        if (!targetSessionId || !hasSupabaseConfig() || !supabase) {
            setLiveUndoStatus(null);
            return;
        }

        try {
            const status = await getLiveUndoStatus(targetSessionId);
            setLiveUndoStatus(status);
        } catch (error) {
            console.warn("Could not load live undo status:", error);
            setLiveUndoStatus(null);
        }
    }

    const { seedSavedGameState } = usePlaySessionSync({
        playSessionId,
        isWorldLoaded,
        sessionLifecycleStatus,
        matchPhase: matchResultState.matchPhase,
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
    });

    useEffect(() => {
        async function loadPlaySession(sessionId) {
            if (!hasSupabaseConfig() || !supabase) {
                setLoadStatus("Online play is unavailable right now.");
                setIsWorldLoaded(false);
                return;
            }

            setPlaySessionId(sessionId);
            setPlayWorldSource("online");
            setLoadStatus("Loading session…");

            try {
                const {
                    data: { user },
                    error: userError
                } = await supabase.auth.getUser();

                if (!userError && user) {
                    setCurrentUserId(user.id);
                    markUserOnline();
                }

                const { session, error: sessionError } = await fetchPlaySession(sessionId);

                if (sessionError || !session) {
                    setLoadStatus("Session not found.");
                    setIsWorldLoaded(false);
                    return;
                }

                const { data: onlineWorld, error: worldError } = await supabase
                    .from("worlds")
                    .select("id, name, is_public, world_data")
                    .eq("id", session.world_id)
                    .single();

                if (worldError || !onlineWorld?.world_data) {
                    setLoadStatus("Universe not found.");
                    setIsWorldLoaded(false);
                    return;
                }

                const nextLifecycleStatus = getSessionLifecycleStatus(session);

                setPlayWorldId(onlineWorld.id);
                setSessionLifecycleStatus(nextLifecycleStatus);
                setSessionEndReason(session.end_reason || "");
                syncMatchResultStateFromSession(session);

                applyWorldData(
                    onlineWorld.world_data,
                    session.game_state,
                    user?.id || "",
                    onlineWorld.id
                );
                await loadSessionParticipants(sessionId);
                await loadLiveUndoStatus(sessionId);

                setLoadStatus(
                    nextLifecycleStatus === "open"
                        ? "Ready."
                        : "Session ended."
                );

                setIsWorldLoaded(true);
            } catch (error) {
                console.warn("Could not load play session:", error);
                setLoadStatus("Could not load this session.");
                setIsWorldLoaded(false);
            }
        }

        async function loadWorldForPlay(worldId) {
            setPlayWorldId(worldId);
            setPlayWorldSource("");
            setPlaySessionId("");
            setSessionLifecycleStatus("open");
            setSessionEndReason("");
            resetMatchResultFlow();
            setLiveUndoStatus(null);
            setLoadStatus("Loading board…");

            let prefsUserId = "";

            if (hasSupabaseConfig() && supabase) {
                try {
                    const {
                        data: { user }
                    } = await supabase.auth.getUser();

                    if (user) {
                        prefsUserId = user.id;
                        setCurrentUserId(user.id);
                        markUserOnline();
                    }
                } catch {
                    // Presence is optional.
                }

                try {
                    const { data: onlineWorld, error } = await supabase
                        .from("worlds")
                        .select("id, name, is_public, world_data")
                        .eq("id", worldId)
                        .eq("is_public", true)
                        .single();

                    if (!error && onlineWorld?.world_data) {
                        setPlayWorldSource("online");
                        applyWorldData(
                            onlineWorld.world_data,
                            null,
                            prefsUserId,
                            onlineWorld.id
                        );
                        setLoadStatus("Ready.");
                        setIsWorldLoaded(true);
                        return;
                    }
                } catch (error) {
                    console.warn("Could not load published universe for play:", error);
                }
            }

            const localWorld = loadLocalItem("worlds", worldId);

            if (localWorld?.data) {
                setPlayWorldSource("local");
                applyWorldData(localWorld.data, null, prefsUserId, worldId);
                setLoadStatus("Ready (local).");
                setIsWorldLoaded(true);
                return;
            }

            setLoadStatus("Universe not found.");
            setIsWorldLoaded(false);
        }

        async function loadPlayTarget() {
            const searchParams = new URLSearchParams(window.location.search);
            const sessionId = searchParams.get("session");
            const worldId = searchParams.get("world");

            if (sessionId) {
                await loadPlaySession(sessionId);
                return;
            }

            if (worldId) {
                await loadWorldForPlay(worldId);
                return;
            }

            setLoadStatus("No universe selected. Open a universe first.");
            setIsWorldLoaded(false);
        }

        loadPlayTarget();
    }, []);

    function applyWorldData(
        worldData,
        sessionGameState = null,
        prefsUserId = "",
        worldIdForPrefs = ""
    ) {
        if (!worldData) return;

        setWorldDetails(
            worldData.worldDetails || {
                name: "Untitled Universe",
                description: "",
                rulesNotes: ""
            }
        );

        const defaultTheme = createDefaultWorldTheme();
        const savedTheme = worldData.worldTheme || {};
        const normalizedTheme = normalizeWorldTheme(savedTheme, defaultTheme);

        const savedMode = getWorldDisplayMode(
            prefsUserId || currentUserId || "guest",
            worldIdForPrefs
        );

        const nextTheme = savedMode
            ? {
                  ...normalizedTheme,
                  characterDisplayMode: savedMode
              }
            : normalizedTheme;

        setWorldTheme(nextTheme);

        const nextFeatures = normalizeWorldFeatures(worldData.worldFeatures);
        const nextMechanics = normalizeWorldMechanics(worldData.worldMechanics);

        setWorldMechanics(nextMechanics);
        setWorldFeatures(nextFeatures);
        setCharacterLibrary(worldData.characterLibrary || {});
        setPortraitAssets(
            worldData.portraitAssets && typeof worldData.portraitAssets === "object"
                ? { ...worldData.portraitAssets }
                : {}
        );
        setWorldTokens(worldData.worldTokens || {});

        // Character assignments belong to this play session.
        // If this is just /play?world=..., start fresh.
        setPieceNames(sessionGameState?.pieceNames || createPieceRecord(""));
        setPieceNameLocked(
            sessionGameState?.pieceNameLocked || createPieceRecord(false)
        );

        setTurnTeam(sessionGameState?.turnTeam || "white");
        setMoveNumber(
            Number.isFinite(Number(sessionGameState?.moveNumber))
                ? Number(sessionGameState.moveNumber)
                : 1
        );

        setActionLog(
            Array.isArray(sessionGameState?.actionLog)
                ? sessionGameState.actionLog
                : []
        );

        // Board state belongs to this play session.
        // New sessions start with standard setup.
        setCells(
            Array.isArray(sessionGameState?.cells)
                ? sessionGameState.cells
                : createStandardSetupCells()
        );

        clearLocalCellHistory();

        const startingTurnTeam = sessionGameState?.turnTeam || "white";

        const startingMoveNumber = Number.isFinite(Number(sessionGameState?.moveNumber))
            ? Number(sessionGameState.moveNumber)
            : 1;

        const startingActionLog = Array.isArray(sessionGameState?.actionLog)
            ? sessionGameState.actionLog
            : [];

        const startingSystemsRuntime =
            sessionGameState?.systemsRuntime ||
            createAdvancedSystemsRuntime({
                worldFeatures: nextFeatures,
                worldMechanics: nextMechanics,
                turnTeam: startingTurnTeam
            });

        setSystemsRuntime(startingSystemsRuntime);

        const startingGameState = buildSessionGameState({
            cells: Array.isArray(sessionGameState?.cells)
                ? sessionGameState.cells
                : createStandardSetupCells(),
            pieceNames: sessionGameState?.pieceNames || createPieceRecord(""),
            pieceNameLocked: sessionGameState?.pieceNameLocked || createPieceRecord(false),
            turnTeam: startingTurnTeam,
            moveNumber: startingMoveNumber,
            actionLog: startingActionLog,
            systemsRuntime: startingSystemsRuntime
        });

        seedSavedGameState(startingGameState);
        setSessionSyncStatus("");

        clearAllSelections();
        setActivePiece(null);
    }

    function clearAllSelections() {
        setSelectedTeam(null);
        setSelectedPiece(null);
        setSelectedToken(null);

        setSelectedCounterDelta(null);
        setSelectedCounterAction(null);

        setSelectedCondition(null);
        setSelectedConditionAction(null);

        setSelectedTerrain(null);
        setSelectedTerrainAction(null);
        setSelectedFogAction(null);

        setMovingPiece(null);
        setSelectedBoardAction(null);
    }

    function clearPlacementSelections() {
        setSelectedTeam(null);
        setSelectedPiece(null);
        setSelectedToken(null);
        setMovingPiece(null);
    }

    function clearCounterSelections() {
        setSelectedCounterDelta(null);
        setSelectedCounterAction(null);
    }

    function clearConditionSelections() {
        setSelectedCondition(null);
        setSelectedConditionAction(null);
    }

    function clearTerrainSelections() {
        setSelectedTerrain(null);
        setSelectedTerrainAction(null);
    }

    function clearFogSelections() {
        setSelectedFogAction(null);
    }

    function canUseMatchLoadoutKey(kind, key) {
        if (systemsRuntime?.setup && !systemsRuntime.setup.isComplete) {
            return false;
        }

        const loadout = systemsRuntime?.matchLoadout;
        if (!loadout) return true;

        const allowedKeys = loadout[`${kind}Keys`];
        if (!Array.isArray(allowedKeys)) return true;

        return allowedKeys.includes(key);
    }

    useEffect(() => {
        function handleKeyboardShortcut(event) {
            const tagName = event.target.tagName;

            const isTyping =
                tagName === "INPUT" ||
                tagName === "TEXTAREA" ||
                tagName === "SELECT";

            if (isTyping) return;

            const key = event.key.toLowerCase();

            const terrainShortcutKeys = ["q", "w", "e", "r", "t", "y"];
            const counterShortcutKeys = ["a", "s", "d", "f", "g", "h"];
            const conditionShortcutKeys = ["z", "x", "c", "v", "b", "n"];

            const isUndo = event.ctrlKey && key === "z";
            const isRedo = event.ctrlKey && key === "y";
            const isDeleteKey = key === "delete" || key === "backspace";
            const isEscape = key === "escape";

            if (terrainShortcutKeys.includes(key)) {
                const terrainList = (worldMechanics.terrains || []).filter(
                    (terrain) => canUseMatchLoadoutKey("terrain", terrain.key)
                );
                const terrainIndex = terrainShortcutKeys.indexOf(key);
                const terrain = terrainList[terrainIndex];

                if (terrain) {
                    event.preventDefault();
                    handleSelectTerrain(terrain.key);
                }

                return;
            }

            if (conditionShortcutKeys.includes(key)) {
                const conditionList = (worldMechanics.conditions || []).filter(
                    (condition) =>
                        canUseMatchLoadoutKey("condition", condition.key)
                );
                const conditionIndex = conditionShortcutKeys.indexOf(key);
                const condition = conditionList[conditionIndex];

                if (condition) {
                    event.preventDefault();
                    handleSelectCondition(condition.key);
                }

                return;
            }

            if (counterShortcutKeys.includes(key)) {
                const counterList = getCounterListFromMechanics(
                    worldMechanics
                ).filter((counter) =>
                    canUseMatchLoadoutKey("counter", counter.key)
                );
                const activeCounter =
                    counterList.find((counter) => counter.key === selectedCounterKey) ||
                    counterList[0];

                if (!activeCounter) return;

                event.preventDefault();

                if (key === "a") {
                    handleSelectCounterDelta(activeCounter.key, -1);
                    return;
                }

                if (key === "s") {
                    handleSelectCounterDelta(activeCounter.key, 1);
                    return;
                }

                if (key === "d") {
                    handleSelectClearCounter(activeCounter.key);
                    return;
                }
            }

            if (isUndo) {
                event.preventDefault();
                handleLocalUndo();
                return;
            }

            if (isRedo) {
                event.preventDefault();
                handleLocalRedo();
                return;
            }

            if (isEscape) {
                event.preventDefault();
                clearAllSelections();
                return;
            }

            if (isDeleteKey) {
                event.preventDefault();
                handleDeleteSelectedPiece();
            }
        }

        window.addEventListener("keydown", handleKeyboardShortcut);

        return () => {
            window.removeEventListener("keydown", handleKeyboardShortcut);
        };
    }, [
        cellHistory,
        cellFuture,
        cells,
        worldMechanics,
        selectedCounterKey,
        movingPiece,
        playSessionId
    ]);

    function addActionLogEntry(message, category = "action") {
        setActionLog((currentLog) =>
            addActionLogEntryToLog(currentLog, {
                message,
                category,
                turnTeam,
                moveNumber,
                maxActionLog: MAX_ACTION_LOG
            })
        );
    }

    async function handleLiveUndo() {
        if (!playSessionId || !hasSupabaseConfig() || !supabase) {
            return;
        }

        if (sessionLifecycleStatus !== "open") {
            showSessionSyncStatus("Session ended.");
            return;
        }

        if (isUndoingLiveAction) {
            return;
        }

        setIsUndoingLiveAction(true);
        showSessionSyncStatus("Undoing…");

        try {
            const undoResult = await undoLatestLiveAction(playSessionId);

            if (undoResult?.status === "undone") {
                showSessionSyncStatus("Undone.");
                await loadLiveUndoStatus(playSessionId);
                return;
            }

            showSessionSyncStatus(
                getLiveUndoReasonMessage(undoResult?.reason)
            );

            await loadLiveUndoStatus(playSessionId);
        } catch (error) {
            console.warn("Could not reach Supabase to undo live action:", error);
            showSessionSyncStatus("Undo failed.");
        } finally {
            setIsUndoingLiveAction(false);
        }
    }

    function handleLocalUndo() {
        if (playSessionId) {
            handleLiveUndo();
            return;
        }

        handleUndo();
    }

    function handleLocalRedo() {
        if (playSessionId) {
            showSessionSyncStatus("Redo isn’t available in live matches yet.");
            return;
        }

        handleRedo();
    }

    useEffect(() => {
        return () => {
            if (sessionSyncStatusTimeoutRef.current) {
                clearTimeout(sessionSyncStatusTimeoutRef.current);
            }
        };
    }, []);


    useEffect(() => {
        function syncPlayModeStatusWithGlobalMatchmaking() {
            const waitingMatch = readStoredWaitingMatch();

            if (!waitingMatch) {
                setMatchmakingStatus((currentStatus) =>
                    currentStatus === "Waiting for an opponent…" ||
                        currentStatus === "Looking for an opponent…" ||
                        currentStatus === "Waiting for opponent..." ||
                        currentStatus === "Looking for opponent..."
                        ? ""
                        : currentStatus
                );
            }
        }

        window.addEventListener(
            MATCHMAKING_EVENT_NAME,
            syncPlayModeStatusWithGlobalMatchmaking
        );

        window.addEventListener(
            "storage",
            syncPlayModeStatusWithGlobalMatchmaking
        );

        return () => {
            window.removeEventListener(
                MATCHMAKING_EVENT_NAME,
                syncPlayModeStatusWithGlobalMatchmaking
            );

            window.removeEventListener(
                "storage",
                syncPlayModeStatusWithGlobalMatchmaking
            );
        };
    }, []);

    function handleSelectCounterDelta(counterKey, delta) {
        if (!canUseMatchLoadoutKey("counter", counterKey)) return;

        setSelectedCounterKey(counterKey);
        setSelectedCounterDelta(delta);
        setSelectedCounterAction("adjust");

        setSelectedTeam(null);
        setSelectedPiece(null);
        setSelectedToken(null);

        setSelectedCondition(null);
        setSelectedConditionAction(null);

        setSelectedTerrain(null);
        setSelectedTerrainAction(null);

        setMovingPiece(null);
        setSelectedBoardAction(null);
    }

    function handleSelectSetCounter(counterKey, nextSetValue = 0) {
        if (!canUseMatchLoadoutKey("counter", counterKey)) return;

        setSelectedCounterKey(counterKey);
        setCounterSetValue(String(nextSetValue));
        setSelectedCounterAction("set");
        setSelectedCounterDelta(null);

        setSelectedTeam(null);
        setSelectedPiece(null);
        setSelectedToken(null);

        setSelectedCondition(null);
        setSelectedConditionAction(null);

        setSelectedTerrain(null);
        setSelectedTerrainAction(null);

        setMovingPiece(null);
        setSelectedBoardAction(null);
    }

    function handleSelectClearCounter(counterKey) {
        if (!canUseMatchLoadoutKey("counter", counterKey)) return;

        setSelectedCounterKey(counterKey);
        setSelectedCounterAction("clear");
        setSelectedCounterDelta(null);

        setSelectedTeam(null);
        setSelectedPiece(null);
        setSelectedToken(null);

        setSelectedCondition(null);
        setSelectedConditionAction(null);

        setSelectedTerrain(null);
        setSelectedTerrainAction(null);

        setMovingPiece(null);
        setSelectedBoardAction(null);
    }

    function handleSelectCondition(conditionKey) {
        if (!worldFeatures.conditions) return;
        if (!canUseMatchLoadoutKey("condition", conditionKey)) return;

        setSelectedCondition(conditionKey);
        setSelectedConditionAction("toggle");

        clearCounterSelections();
        clearTerrainSelections();
        clearPlacementSelections();

        setSelectedBoardAction(null);
    }

    function handleSelectClearConditions() {
        if (!worldFeatures.conditions) return;
        if (systemsRuntime?.setup && !systemsRuntime.setup.isComplete) return;

        setSelectedCondition(null);
        setSelectedConditionAction("clear");

        clearCounterSelections();
        clearTerrainSelections();
        clearPlacementSelections();

        setSelectedBoardAction(null);
    }

    function handleSelectTerrain(terrainKey) {
        if (!worldFeatures.terrains) return;
        if (!canUseMatchLoadoutKey("terrain", terrainKey)) return;

        setSelectedTerrain(terrainKey);
        setSelectedTerrainAction("paint");

        clearCounterSelections();
        clearConditionSelections();
        clearPlacementSelections();

        setSelectedBoardAction(null);
    }

    function handleSelectClearTerrain() {
        if (!worldFeatures.terrains) return;
        if (systemsRuntime?.setup && !systemsRuntime.setup.isComplete) return;

        setSelectedTerrain(null);
        setSelectedTerrainAction("clear");

        clearCounterSelections();
        clearConditionSelections();
        clearPlacementSelections();

        setSelectedBoardAction(null);
    }

    function handleApplyTerrainToWholeBoard() {
        if (!worldFeatures.terrains) return;

        if (selectedTerrainAction === "clear") {
            updateCellsWithHistory((currentCells) =>
                applyTerrainToCells(currentCells, "neutral")
            );

            clearTerrainSelections();
            return;
        }

        if (!selectedTerrain) return;

        updateCellsWithHistory((currentCells) =>
            applyTerrainToCells(currentCells, selectedTerrain)
        );

        clearTerrainSelections();
    }

    function handleSelectPaintFog() {
        if (!worldFeatures.fogOfWar) return;

        setSelectedFogAction("paint");
        clearCounterSelections();
        clearConditionSelections();
        clearTerrainSelections();
        clearPlacementSelections();
        setSelectedBoardAction(null);
    }

    function handleSelectClearFog() {
        if (!worldFeatures.fogOfWar) return;

        setSelectedFogAction("clear");
        clearCounterSelections();
        clearConditionSelections();
        clearTerrainSelections();
        clearPlacementSelections();
        setSelectedBoardAction(null);
    }

    function handleApplyFogToWholeBoard() {
        if (!worldFeatures.fogOfWar) return;

        setSystemsRuntime((current) => {
            if (!current?.fogOfWar) return current;

            return {
                ...current,
                fogOfWar: {
                    ...current.fogOfWar,
                    fogCells: applyFogToWholeBoard(8)
                }
            };
        });

        clearFogSelections();
        addActionLogEntry("Fog applied to the whole board.", "fog");
    }

    function handleClearAllFog() {
        if (!worldFeatures.fogOfWar) return;

        setSystemsRuntime((current) => {
            if (!current?.fogOfWar) return current;

            return {
                ...current,
                fogOfWar: {
                    ...current.fogOfWar,
                    fogCells: []
                }
            };
        });

        clearFogSelections();
        addActionLogEntry("All fog cleared.", "fog");
    }

    function handleSelectPiece(team, pieceKey) {
        if (!team || !pieceKey) return;

        setSelectedTeam(team);
        setSelectedPiece(pieceKey);
        setSelectedToken(null);

        clearCounterSelections();
        clearConditionSelections();
        clearTerrainSelections();

        setMovingPiece(null);
        setSelectedBoardAction(null);

        // Generic pieces are templates. Their character card opens
        // after the actual generic piece is placed on the board.
        if (pieceKey === GENERIC_PIECE_KEY) {
            setActivePiece(null);
            return;
        }

        // Normal tray pieces can be assigned a character before placement.
        setActivePiece({ team, pieceKey });
    }

    function handleSelectToken(tokenName) {
        setSelectedToken(tokenName);
        setSelectedTeam(null);
        setSelectedPiece(null);

        clearCounterSelections();
        clearConditionSelections();
        clearTerrainSelections();

        setMovingPiece(null);
        setSelectedBoardAction(null);
    }

    function handleSelectDeletePiece() {
        setSelectedBoardAction("delete-piece");

        setSelectedTeam(null);
        setSelectedPiece(null);
        setSelectedToken(null);

        clearCounterSelections();
        clearConditionSelections();
        clearTerrainSelections();

        setMovingPiece(null);
    }

    function handleDeleteSelectedPiece() {
        if (!movingPiece) {
            handleSelectDeletePiece();
            return;
        }

        updateCellsWithHistory((currentCells) => {
            const nextCells = currentCells.map(cloneCell);
            const targetCell = nextCells[movingPiece.fromIndex];

            clearPieceFromCell(targetCell);

            return nextCells;
        });

        setMovingPiece(null);
        setActivePiece(null);
        setSelectedBoardAction(null);
    }

    function handleStandardSetup() {
        if (isResultFlowBlockingBoard) {
            showSessionSyncStatus("Resolve the match result first.");
            return;
        }
        updateCellsWithHistory(() => createStandardSetupCells());
        addActionLogEntry("Board reset to standard setup.", "board");
        clearAllSelections();
        setActivePiece(null);
    }

    function handleClearBoard() {
        if (isResultFlowBlockingBoard) {
            showSessionSyncStatus("Resolve the match result first.");
            return;
        }
        updateCellsWithHistory(() => createBoardCells());
        addActionLogEntry("Board cleared.", "board");
        clearAllSelections();
        setActivePiece(null);
    }

    function handleNameChange(team, pieceKey, value) {
        setPieceNames((currentNames) => ({
            ...currentNames,
            [team]: {
                ...(currentNames[team] || {}),
                [pieceKey]: value
            }
        }));
    }

    function handleLockName(team, pieceKey) {
        setPieceNameLocked((currentLocked) => ({
            ...currentLocked,
            [team]: {
                ...(currentLocked[team] || {}),
                [pieceKey]: true
            }
        }));
    }

    function handleUnlockName(team, pieceKey) {
        setPieceNameLocked((currentLocked) => ({
            ...currentLocked,
            [team]: {
                ...(currentLocked[team] || {}),
                [pieceKey]: false
            }
        }));
    }

    function handleAssignCharacter(team, pieceKey, characterName) {
        setPieceNames((currentNames) => ({
            ...currentNames,
            [team]: {
                ...(currentNames[team] || {}),
                [pieceKey]: characterName
            }
        }));

        setPieceNameLocked((currentLocked) => ({
            ...currentLocked,
            [team]: {
                ...(currentLocked[team] || {}),
                [pieceKey]: true
            }
        }));

        setActivePiece({ team, pieceKey });
    }

    function handleCellClick(index, event) {
        if (isResultFlowBlockingBoard) {
            showSessionSyncStatus("Resolve the match result first.");
            return;
        }
        const clickedCell = cells[index];
        const clickedToken = getPrimaryToken(clickedCell);

        if (selectedBoardAction === "delete-piece") {
            updateCellsWithHistory((currentCells) =>
                updateCellAtIndex(currentCells, index, (targetCell) => {
                    if (!cellHasOccupant(targetCell)) return;

                    clearPieceFromCell(targetCell);
                })
            );

            if (!event?.shiftKey) {
                setSelectedBoardAction(null);
            }

            setActivePiece(null);
            setMovingPiece(null);

            return;
        }

        if (selectedCounterAction === "adjust" && selectedCounterDelta !== null) {
            updateCellsWithHistory((currentCells) =>
                updateCellAtIndex(currentCells, index, (targetCell) => {
                    if (!cellHasOccupant(targetCell)) return;

                    adjustCounterOnCell(
                        targetCell,
                        selectedCounterKey,
                        selectedCounterDelta
                    );
                })
            );

            if (!event?.shiftKey) {
                setSelectedCounterDelta(null);
                setSelectedCounterAction(null);
            }

            return;
        }

        if (selectedCounterAction === "set") {
            updateCellsWithHistory((currentCells) =>
                updateCellAtIndex(currentCells, index, (targetCell) => {
                    if (!cellHasOccupant(targetCell)) return;

                    setCounterOnCell(targetCell, selectedCounterKey, counterSetValue);
                })
            );

            if (!event?.shiftKey) {
                setSelectedCounterAction(null);
            }

            return;
        }

        if (selectedCounterAction === "clear") {
            updateCellsWithHistory((currentCells) =>
                updateCellAtIndex(currentCells, index, (targetCell) => {
                    if (!cellHasOccupant(targetCell)) return;

                    clearCounterOnCell(targetCell, selectedCounterKey);
                })
            );

            if (!event?.shiftKey) {
                setSelectedCounterAction(null);
            }

            return;
        }

        if (selectedConditionAction === "toggle" && selectedCondition) {
            updateCellsWithHistory((currentCells) =>
                updateCellAtIndex(currentCells, index, (targetCell) => {
                    if (!cellHasOccupant(targetCell)) return;

                    toggleConditionOnCell(targetCell, selectedCondition, event?.shiftKey);
                })
            );

            if (!event?.shiftKey) {
                setSelectedCondition(null);
                setSelectedConditionAction(null);
            }

            return;
        }

        if (selectedConditionAction === "clear") {
            updateCellsWithHistory((currentCells) =>
                updateCellAtIndex(currentCells, index, (targetCell) => {
                    if (!cellHasOccupant(targetCell)) return;

                    clearConditionsOnCell(targetCell);
                })
            );

            if (!event?.shiftKey) {
                setSelectedConditionAction(null);
            }

            return;
        }

        if (selectedTerrainAction === "paint" && selectedTerrain) {
            updateCellsWithHistory((currentCells) =>
                updateCellAtIndex(currentCells, index, (targetCell) => {
                    paintTerrainOnCell(targetCell, selectedTerrain);
                })
            );

            if (!event?.shiftKey) {
                setSelectedTerrain(null);
                setSelectedTerrainAction(null);
            }

            return;
        }

        if (selectedTerrainAction === "clear") {
            updateCellsWithHistory((currentCells) =>
                updateCellAtIndex(currentCells, index, (targetCell) => {
                    clearTerrainOnCell(targetCell);
                })
            );

            if (!event?.shiftKey) {
                setSelectedTerrainAction(null);
            }

            return;
        }

        if (selectedFogAction === "paint") {
            setSystemsRuntime((current) => {
                if (!current?.fogOfWar) return current;

                return {
                    ...current,
                    fogOfWar: {
                        ...current.fogOfWar,
                        fogCells: paintFogCell(current.fogOfWar.fogCells, index)
                    }
                };
            });

            if (!event?.shiftKey) {
                setSelectedFogAction(null);
            }

            return;
        }

        if (selectedFogAction === "clear") {
            setSystemsRuntime((current) => {
                if (!current?.fogOfWar) return current;

                return {
                    ...current,
                    fogOfWar: {
                        ...current.fogOfWar,
                        fogCells: clearFogCell(current.fogOfWar.fogCells, index)
                    }
                };
            });

            if (!event?.shiftKey) {
                setSelectedFogAction(null);
            }

            return;
        }

        if (!movingPiece) {
            if (selectedToken) {
                updateCellsWithHistory((currentCells) => {
                    const nextCells = currentCells.map(cloneCell);
                    const targetCell = nextCells[index];

                    placeTokenOnCellForPlay(targetCell, selectedToken);

                    return nextCells;
                });

                if (!event?.shiftKey) {
                    setSelectedToken(null);
                }

                return;
            }

            if (selectedTeam && selectedPiece) {
                const placedPieceKey = resolvePlacementPieceKey(selectedPiece);

                updateCellsWithHistory((currentCells) => {
                    const nextCells = currentCells.map(cloneCell);
                    const targetCell = nextCells[index];

                    placePieceOnCellForPlay(targetCell, placedPieceKey, selectedTeam);

                    return nextCells;
                });

                if (selectedPiece === GENERIC_PIECE_KEY) {
                    registerGenericPieceInstance(
                        selectedTeam,
                        placedPieceKey,
                        setPieceNames,
                        setPieceNameLocked
                    );
                }

                setActivePiece({
                    team: selectedTeam,
                    pieceKey: placedPieceKey
                });

                addActionLogEntry(
                    `${getTeamLabel(selectedTeam)} placed ${getPieceLabel(pieceNames, selectedTeam, placedPieceKey)}.`,
                    "piece"
                );

                if (!event?.shiftKey) {
                    setSelectedTeam(null);
                    setSelectedPiece(null);
                }

                return;
            }

            if (clickedCell.pieceType) {
                setMovingPiece(createMovingPiece(clickedCell, index));
                setActivePiece({
                    team: clickedCell.team,
                    pieceKey: clickedCell.pieceType
                });
                return;
            }

            if (clickedToken) {
                setMovingPiece(createMovingToken(clickedCell, index));
                setActivePiece(null);
                return;
            }

            return;
        }

        if (movingPiece.fromIndex === index) {
            setMovingPiece(null);
            return;
        }

        if (
            movingPiece.kind !== "token" &&
            clickedCell.pieceType &&
            clickedCell.team === movingPiece.team
        ) {
            setMovingPiece(createMovingPiece(clickedCell, index));
            setActivePiece({
                team: clickedCell.team,
                pieceKey: clickedCell.pieceType
            });
            return;
        }

        updateCellsWithHistory((currentCells) =>
            moveOccupantForPlay(currentCells, movingPiece, index)
        );

        if (movingPiece.kind === "token") {
            addActionLogEntry(
                `Token moved.`,
                "token"
            );

            setActivePiece(null);
        } else {
            addActionLogEntry(
                `${getTeamLabel(movingPiece.team)} moved ${getPieceLabel(
                    pieceNames,
                    movingPiece.team,
                    movingPiece.pieceType
                )}.`,
                "piece"
            );

            setActivePiece({
                team: movingPiece.team,
                pieceKey: movingPiece.pieceType
            });
        }

        setMovingPiece(null);
    }

    function handlePassTurn() {
        if (isResultFlowBlockingBoard) {
            showSessionSyncStatus("Resolve the match result first.");
            return;
        }
        const currentTeamLabel = getTeamLabel(turnTeam);
        const nextTurnTeam = turnTeam === "white" ? "black" : "white";
        const nextMoveNumber =
            turnTeam === "black" ? moveNumber + 1 : moveNumber;

        addActionLogEntry(
            `${currentTeamLabel} passed turn.`,
            "turn"
        );

        setTurnTeam(nextTurnTeam);
        setMoveNumber(nextMoveNumber);

        setSystemsRuntime((current) => {
            if (!current?.timers) return current;

            return {
                ...current,
                timers: resetTurnTimer(current.timers, nextTurnTeam)
            };
        });

        setMovingPiece(null);
        setSelectedBoardAction(null);
        clearAllSelections();
    }

    function handleToggleCharacterDisplayMode() {
        setWorldTheme((currentTheme) => {
            const currentMode =
                currentTheme.characterDisplayMode || DISPLAY_MODE_PIECE;

            const nextMode =
                currentMode === DISPLAY_MODE_PIECE
                    ? "portrait-with-piece"
                    : DISPLAY_MODE_PIECE;

            if (playWorldId) {
                saveWorldDisplayMode(
                    currentUserId || "guest",
                    playWorldId,
                    nextMode
                );
            }

            return {
                ...currentTheme,
                characterDisplayMode: nextMode
            };
        });
    }

    function handleBackToWorld() {
        if (playWorldId) {
            router.push(`/worlds/${playWorldId}`);
            return;
        }

        router.push("/worlds");
    }

    function handleInviteSessionReady(sessionId) {
        if (!sessionId) return;

        setPlaySessionId(sessionId);
        showSessionSyncStatus("Private table ready.");

        if (typeof window !== "undefined") {
            const nextUrl = new URL(window.location.href);
            nextUrl.searchParams.set("session", sessionId);
            nextUrl.searchParams.delete("world");
            window.history.replaceState({}, "", nextUrl.toString());
        }
    }

    if (!isWorldLoaded) {
        return (
            <main className="simple-page">
                <SiteHeader />

                <section className="simple-page-card">
                    <p className="home-kicker">Play Board</p>

                    <h1>{loadStatus}</h1>

                    <p>
                        Choose a published universe first, then open its board from the universe page.
                    </p>

                    <div className="home-action-row">
                        <Link className="home-primary-link" href="/worlds">
                            Browse Universes
                        </Link>

                        <Link className="home-secondary-link" href="/lobby">
                            Multiverse Community
                        </Link>
                    </div>
                </section>
            </main>
        );
    }

    return (
        <main
            className="viewport-frame play-mode-frame"
            style={
                worldTheme.backgroundImage
                    ? {
                        backgroundImage: `linear-gradient(rgba(5, 6, 10, 0.72), rgba(5, 6, 10, 0.72)), url("${worldTheme.backgroundImage}")`
                    }
                    : {}
            }
        >
            <div className="game-stage">
                <div
                    className="stage-scale-frame"
                    style={{
                        width: `${stageLayout.width}px`,
                        height: `${stageLayout.height}px`
                    }}
                >
                    <div
                        className="stage-content"
                        style={{ "--stage-scale": stageLayout.scale }}
                        onClick={(event) => {
                            if (event.target === event.currentTarget) {
                                clearAllSelections();
                            }
                        }}
                    >
                        <header className="top-command-bar play-command-bar">
                            <div className="world-title-block">
                                <h1>Play Mode</h1>
                                <p className="world-name-display play-world-name-readonly">
                                    {getDisplayWorldName(worldDetails.name)}
                                </p>
                            </div>

                            <div className="top-command-actions play-command-actions">
                                <div className="play-command-nav-row">
                                    <div className="play-command-nav-group">
                                        <button type="button" onClick={handleBackToWorld}>
                                            Back
                                        </button>
                                    </div>

                                    <div className="play-command-session-group">
                                        {!playSessionId && (
                                            <MatchmakingReadyButton
                                                className="play-ready-button"
                                                worldId={playWorldId}
                                                worldName={worldDetails.name}
                                                disabled={playWorldSource !== "online"}
                                                disabledLabel="Online Only"
                                                readyLabel="Ready"
                                                loadingLabel="Ready..."
                                                onStatusChange={setMatchmakingStatus}
                                            />
                                        )}

                                        <div className="play-invite-wrap">
                                            <button
                                                type="button"
                                                className="play-invite-button"
                                                onClick={() =>
                                                    setIsInvitePanelOpen((current) => !current)
                                                }
                                            >
                                                Invite
                                            </button>

                                            <InvitePlayersPanel
                                                isOpen={isInvitePanelOpen}
                                                onClose={() => setIsInvitePanelOpen(false)}
                                                currentUserId={currentUserId}
                                                playSessionId={playSessionId}
                                                onSessionReady={handleInviteSessionReady}
                                                worldId={playWorldId}
                                                cells={cells}
                                                pieceNames={pieceNames}
                                                pieceNameLocked={pieceNameLocked}
                                                turnTeam={turnTeam}
                                                moveNumber={moveNumber}
                                                actionLog={actionLog}
                                                onStatusChange={showSessionSyncStatus}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <PlaySessionResultPanel
                                    playSessionId={playSessionId}
                                    matchResultState={matchResultState}
                                    isResultChooserOpen={isResultChooserOpen}
                                    setIsResultChooserOpen={setIsResultChooserOpen}
                                    resultNote={resultNote}
                                    setResultNote={setResultNote}
                                    isHandlingResultAction={isHandlingResultAction}
                                    isCurrentUserResultProposer={isCurrentUserResultProposer}
                                    sessionLifecycleStatus={sessionLifecycleStatus}
                                    sessionEndReason={sessionEndReason}
                                    onProposeResult={handleProposeResult}
                                    onCancelResultProposal={handleCancelResultProposal}
                                    onRespondToResult={handleRespondToResult}
                                    onResolveContinueRequest={handleResolveContinueRequest}
                                    onResignMatch={handleResignMatch}
                                />
                            </div>
                        </header>

                        <LeftSidebar
                            isPlayMode={true}
                            worldDetails={worldDetails}
                            worldTheme={worldTheme}
                            worldFeatures={worldFeatures}
                            worldMechanics={worldMechanics}
                            matchLoadout={
                                systemsRuntime?.setup &&
                                !systemsRuntime.setup.isComplete
                                    ? {
                                          terrainKeys: [],
                                          counterKeys: [],
                                          conditionKeys: []
                                      }
                                    : systemsRuntime?.matchLoadout || null
                            }
                            onClearSelections={clearAllSelections}
                            onWorldDetailsChange={() => { }}
                            onThemeChange={() => { }}
                            onPieceSkinChange={() => { }}
                            onCharacterDisplayModeChange={() => { }}
                            onToggleWorldFeature={() => { }}
                            onTerrainListChange={() => { }}
                            onCounterSettingsChange={() => { }}
                            onConditionListChange={() => { }}
                            characterLibrary={characterLibrary}
                            portraitAssets={portraitAssets}
                            onCharacterLibraryChange={() => { }}
                            characterUploadStatus="Character editing is off in Play."
                            selectedCounterKey={selectedCounterKey}
                            selectedCounterDelta={selectedCounterDelta}
                            selectedCounterAction={selectedCounterAction}
                            counterSetValue={counterSetValue}
                            selectedCondition={selectedCondition}
                            selectedConditionAction={selectedConditionAction}
                            selectedTerrain={selectedTerrain}
                            selectedTerrainAction={selectedTerrainAction}
                            selectedFogAction={selectedFogAction}
                            onSelectPaintFog={handleSelectPaintFog}
                            onSelectClearFog={handleSelectClearFog}
                            onApplyFogToWholeBoard={handleApplyFogToWholeBoard}
                            onClearAllFog={handleClearAllFog}
                            onCounterSetValueChange={setCounterSetValue}
                            onCharacterCsvUpload={() => { }}
                            onSaveCharacter={() => { }}
                            onSelectCounterDelta={handleSelectCounterDelta}
                            onSelectSetCounter={handleSelectSetCounter}
                            onSelectClearCounter={handleSelectClearCounter}
                            onSelectCondition={handleSelectCondition}
                            onSelectClearConditions={handleSelectClearConditions}
                            onSelectTerrain={handleSelectTerrain}
                            onSelectClearTerrain={handleSelectClearTerrain}
                            onApplyTerrainToWholeBoard={handleApplyTerrainToWholeBoard}
                        />

                        <Workspace
                            cells={cells}
                            movingPiece={movingPiece}
                            pieceNames={pieceNames}
                            characterLibrary={characterLibrary}
                            portraitAssets={portraitAssets}
                            worldTheme={worldTheme}
                            worldMechanics={worldMechanics}
                            worldFeatures={worldFeatures}
                            systemsRuntime={systemsRuntime}
                            onSystemsRuntimeChange={setSystemsRuntime}
                            turnTeam={turnTeam}
                            isPlayMode={true}
                            fogCells={systemsRuntime?.fogOfWar?.fogCells || []}
                            viewerTeam={
                                getViewerTeam(sessionParticipants, currentUserId) ||
                                (!playSessionId ? turnTeam : "")
                            }
                            revealOwnPiecesInFog={
                                systemsRuntime?.fogOfWar?.revealOwnPieces !== false
                            }
                            onLogAction={addActionLogEntry}
                            selectedBoardAction={selectedBoardAction}
                            actionLog={actionLog}
                            boardStatus={[
                                loadStatus,
                                sessionSyncStatus,
                                matchmakingStatus,
                                playSessionId
                                    ? getMatchPhaseLabel(matchResultState.matchPhase)
                                    : "",
                                playSessionId &&
                                sessionLifecycleStatus === "open" &&
                                matchResultState.matchPhase === "active" &&
                                liveUndoStatus
                                    ? liveUndoStatus.can_undo
                                        ? "Can undo"
                                        : "Undo locked"
                                    : ""
                            ]
                                .filter(Boolean)
                                .join(" · ")}
                            onToggleCharacterDisplayMode={handleToggleCharacterDisplayMode}
                            onStandardSetup={handleStandardSetup}
                            onUndo={handleLocalUndo}
                            onRedo={handleLocalRedo}
                            onDeletePiece={handleDeleteSelectedPiece}
                            onClearBoard={handleClearBoard}
                            onCellClick={handleCellClick}
                            onClearSelections={clearAllSelections}
                        />

                        <RightPanel
                            isPlayMode={true}
                            worldFeatures={worldFeatures}
                            worldTheme={worldTheme}
                            characterLibrary={characterLibrary}
                            portraitAssets={portraitAssets}
                            selectedTeam={selectedTeam}
                            selectedPiece={selectedPiece}
                            selectedToken={selectedToken}
                            activePiece={activePiece}
                            pieceNames={pieceNames}
                            pieceNameLocked={pieceNameLocked}
                            turnTeam={turnTeam}
                            moveNumber={moveNumber}
                            onPassTurn={handlePassTurn}
                            playSessionId={playSessionId}
                            sessionLifecycleStatus={sessionLifecycleStatus}
                            sessionParticipants={sessionParticipants}
                            currentUserId={currentUserId}
                            onClearSelections={clearAllSelections}
                            onSelectPiece={handleSelectPiece}
                            onSelectToken={handleSelectToken}
                            onNameChange={handleNameChange}
                            onLockName={handleLockName}
                            onUnlockName={handleUnlockName}
                            onAssignCharacter={handleAssignCharacter}
                        />
                    </div>
                </div>
            </div>
        </main>
    );
}

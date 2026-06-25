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

import {
    createGenericPieceInstanceKey,
    GENERIC_PIECE_KEY
} from "@/lib/genericPiece";

const FALLBACK_STAGE_WIDTH = 1460;
const FALLBACK_STAGE_HEIGHT = 840;
const MAX_CELL_HISTORY = 30;
const MAX_ACTION_LOG = 40;

function getCellCounters(cell) {
    return {
        ...(cell.counters || {})
    };
}

function cleanCounterValue(value) {
    const numberValue = Number(value);

    if (!Number.isFinite(numberValue) || numberValue === 0) {
        return null;
    }

    return numberValue;
}

function adjustCounterOnCell(cell, counterKey, delta) {
    if (!counterKey) return;

    const counters = getCellCounters(cell);
    const currentValue = Number(counters[counterKey] || 0);
    const nextValue = cleanCounterValue(currentValue + delta);

    if (nextValue === null) {
        delete counters[counterKey];
    } else {
        counters[counterKey] = nextValue;
    }

    cell.counters = counters;
}

function setCounterOnCell(cell, counterKey, value) {
    if (!counterKey) return;

    const counters = getCellCounters(cell);
    const nextValue = cleanCounterValue(value);

    if (nextValue === null) {
        delete counters[counterKey];
    } else {
        counters[counterKey] = nextValue;
    }

    cell.counters = counters;
}

function clearCounterOnCell(cell, counterKey) {
    if (!counterKey) return;

    const counters = getCellCounters(cell);
    delete counters[counterKey];

    cell.counters = counters;
}

function toggleConditionOnCell(cell, conditionKey, shouldStack = false) {
    if (!conditionKey) return;

    const currentConditions = cell.conditions || [];

    if (shouldStack) {
        cell.conditions = [...currentConditions, conditionKey];
        return;
    }

    const alreadyHasCondition = currentConditions.includes(conditionKey);

    if (alreadyHasCondition) {
        cell.conditions = currentConditions.filter(
            (condition) => condition !== conditionKey
        );
        return;
    }

    cell.conditions = [...currentConditions, conditionKey];
}

function clearConditionsOnCell(cell) {
    cell.conditions = [];
}

function cloneCell(cell) {
    return {
        ...cell,
        conditions: [...(cell.conditions || [])],
        tokens: [...(cell.tokens || [])],
        counters: {
            ...(cell.counters || {})
        }
    };
}

function clearPieceFromCell(cell) {
    cell.pieceType = null;
    cell.team = null;
    cell.counter = "";
    cell.counterColor = "neutral";
    cell.counters = {};
    cell.conditions = [];
    cell.tokens = [];
}

function getPrimaryToken(cell) {
    if (!cell.tokens || cell.tokens.length === 0) return null;

    return cell.tokens[0];
}

function cellHasOccupant(cell) {
    return Boolean(cell.pieceType || getPrimaryToken(cell));
}

function createMovingPiece(cell, index) {
    return {
        kind: "piece",
        fromIndex: index,
        pieceType: cell.pieceType,
        team: cell.team,
        counters: {
            ...(cell.counters || {})
        },
        conditions: [...(cell.conditions || [])],
        tokens: [...(cell.tokens || [])]
    };
}

function createMovingToken(cell, index) {
    return {
        kind: "token",
        fromIndex: index,
        tokenName: getPrimaryToken(cell),
        counters: {
            ...(cell.counters || {})
        },
        conditions: [...(cell.conditions || [])]
    };
}

function createSessionGameState({
    cells,
    pieceNames,
    pieceNameLocked,
    turnTeam = "white",
    moveNumber = 1,
    actionLog = []
}) {
    return {
        version: 2,

        // Current match board.
        cells,

        // Current match character assignments.
        pieceNames,
        pieceNameLocked,

        // Current turn state.
        turnTeam,
        moveNumber,

        // Shared action history for this session.
        actionLog: Array.isArray(actionLog) ? actionLog : []
    };
}

function stableStringify(value) {
    if (value === undefined) {
        return "null";
    }

    if (value === null || typeof value !== "object") {
        return JSON.stringify(value) ?? "null";
    }

    if (Array.isArray(value)) {
        return `[${value.map((item) => stableStringify(item)).join(",")}]`;
    }

    const sortedKeys = Object.keys(value).sort();

    return `{${sortedKeys
        .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
        .join(",")}}`;
}

function getGameStateJson(gameState) {
    // Supabase stores game_state as jsonb. jsonb can return object keys in a
    // different order from the original JavaScript object. A normal
    // JSON.stringify comparison can therefore think the state changed when the
    // board is actually identical, causing a save/sync echo loop.
    return stableStringify(gameState || {});
}

export default function PlayMode() {
    const router = useRouter();

    const [worldFeatures, setWorldFeatures] = useState(DEFAULT_WORLD_FEATURES);

    const [worldDetails, setWorldDetails] = useState({
        name: "Loading World...",
        description: "",
        rulesNotes: ""
    });

    const [worldTheme, setWorldTheme] = useState(createDefaultWorldTheme());
    const [worldMechanics, setWorldMechanics] = useState(DEFAULT_WORLD_MECHANICS);

    const [characterLibrary, setCharacterLibrary] = useState({});
    const [worldTokens, setWorldTokens] = useState({});

    const [pieceNames, setPieceNames] = useState(() => createPieceRecord(""));
    const [pieceNameLocked, setPieceNameLocked] = useState(() =>
        createPieceRecord(false)
    );

    const [cells, setCells] = useState(createStandardSetupCells);
    const [cellHistory, setCellHistory] = useState([]);
    const [cellFuture, setCellFuture] = useState([]);

    const [movingPiece, setMovingPiece] = useState(null);
    const [selectedBoardAction, setSelectedBoardAction] = useState(null);

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

    const [activePiece, setActivePiece] = useState(null);

    const [playWorldId, setPlayWorldId] = useState("");
    const [playSessionId, setPlaySessionId] = useState("");
    const [loadStatus, setLoadStatus] = useState("Opening board...");
    const [isWorldLoaded, setIsWorldLoaded] = useState(false);

    const [sessionSyncStatus, setSessionSyncStatus] = useState("");
    const [turnTeam, setTurnTeam] = useState("white");
    const [moveNumber, setMoveNumber] = useState(1);
    const [actionLog, setActionLog] = useState([]);

    const lastSavedGameStateJsonRef = useRef("");
    const saveSessionTimeoutRef = useRef(null);

    // When a realtime update changes local state,
    // this prevents the autosave effect from saving that same remote state back.
    const suppressAutosaveForGameStateJsonRef = useRef("");

    // Keeps status messages temporary instead of permanently screaming.
    const sessionSyncStatusTimeoutRef = useRef(null);

    const [stageLayout, setStageLayout] = useState({
        scale: 1,
        width: FALLBACK_STAGE_WIDTH,
        height: FALLBACK_STAGE_HEIGHT
    });

    const baseDevicePixelRatioRef = useRef(null);

    useEffect(() => {
        function readCssPixelValue(variableName, fallbackValue) {
            const rootStyles = getComputedStyle(document.documentElement);
            const rawValue = rootStyles.getPropertyValue(variableName).trim();
            const parsedValue = Number.parseFloat(rawValue);

            return Number.isFinite(parsedValue) ? parsedValue : fallbackValue;
        }

        function getZoomCompensatedViewportSize() {
            if (baseDevicePixelRatioRef.current === null) {
                baseDevicePixelRatioRef.current = window.devicePixelRatio || 1;
            }

            const baseDevicePixelRatio = baseDevicePixelRatioRef.current || 1;
            const currentDevicePixelRatio =
                window.devicePixelRatio || baseDevicePixelRatio;

            const browserZoomRatio = currentDevicePixelRatio / baseDevicePixelRatio;

            return {
                width: window.innerWidth * browserZoomRatio,
                height: window.innerHeight * browserZoomRatio
            };
        }

        function updateStageScale() {
            const designWidth = readCssPixelValue(
                "--stage-design-width",
                FALLBACK_STAGE_WIDTH
            );

            const designHeight = readCssPixelValue(
                "--stage-design-height",
                FALLBACK_STAGE_HEIGHT
            );

            const viewportPadding = readCssPixelValue("--viewport-padding", 0);
            const viewportSize = getZoomCompensatedViewportSize();

            const availableWidth = Math.max(
                viewportSize.width - viewportPadding * 2,
                1
            );

            const availableHeight = Math.max(
                viewportSize.height - viewportPadding * 2,
                1
            );

            const nextScale = Math.min(
                availableWidth / designWidth,
                availableHeight / designHeight
            );

            setStageLayout({
                scale: nextScale,
                width: designWidth * nextScale,
                height: designHeight * nextScale
            });
        }

        updateStageScale();

        window.addEventListener("resize", updateStageScale);

        return () => {
            window.removeEventListener("resize", updateStageScale);
        };
    }, []);

    useEffect(() => {
        async function loadPlaySession(sessionId) {
            if (!hasSupabaseConfig() || !supabase) {
                setLoadStatus("Online play sessions are not available.");
                setIsWorldLoaded(false);
                return;
            }

            setPlaySessionId(sessionId);
            setLoadStatus("Opening session...");

            try {
                const { data: session, error: sessionError } = await supabase
                    .from("play_sessions")
                    .select("id, world_id, host_id, status, visibility, game_state")
                    .eq("id", sessionId)
                    .single();

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
                    setLoadStatus("World not found.");
                    setIsWorldLoaded(false);
                    return;
                }

                setPlayWorldId(onlineWorld.id);
                applyWorldData(onlineWorld.world_data, session.game_state);
                setLoadStatus("Board ready.");
                setIsWorldLoaded(true);
            } catch (error) {
                console.warn("Could not load play session:", error);
                setLoadStatus("Could not open this session.");
                setIsWorldLoaded(false);
            }
        }

        async function loadWorldForPlay(worldId) {
            setPlayWorldId(worldId);
            setLoadStatus("Opening board...");

            if (hasSupabaseConfig() && supabase) {
                try {
                    const { data: onlineWorld, error } = await supabase
                        .from("worlds")
                        .select("id, name, is_public, world_data")
                        .eq("id", worldId)
                        .eq("is_public", true)
                        .single();

                    if (!error && onlineWorld?.world_data) {
                        applyWorldData(onlineWorld.world_data);
                        setLoadStatus("Board ready.");
                        setIsWorldLoaded(true);
                        return;
                    }
                } catch (error) {
                    console.warn("Could not load published world for play:", error);
                }
            }

            const localWorld = loadLocalItem("worlds", worldId);

            if (localWorld?.data) {
                applyWorldData(localWorld.data);
                setLoadStatus("Local board ready.");
                setIsWorldLoaded(true);
                return;
            }

            setLoadStatus("World not found.");
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

            setLoadStatus("No world selected. Choose a world first.");
            setIsWorldLoaded(false);
        }

        loadPlayTarget();
    }, []);

    function applyWorldData(worldData, sessionGameState = null) {
        if (!worldData) return;

        setWorldDetails(
            worldData.worldDetails || {
                name: "Untitled World",
                description: "",
                rulesNotes: ""
            }
        );

        const defaultTheme = createDefaultWorldTheme();
        const savedTheme = worldData.worldTheme || {};

        setWorldTheme({
            ...defaultTheme,
            ...savedTheme,
            backgroundImage: savedTheme.backgroundImage || defaultTheme.backgroundImage,
            boardSkinImage: savedTheme.boardSkinImage || defaultTheme.boardSkinImage,
            pieceSkins: {
                ...defaultTheme.pieceSkins,
                ...(savedTheme.pieceSkins || {}),
                white: {
                    ...defaultTheme.pieceSkins.white,
                    ...(savedTheme.pieceSkins?.white || {})
                },
                black: {
                    ...defaultTheme.pieceSkins.black,
                    ...(savedTheme.pieceSkins?.black || {})
                }
            },
            characterDisplayMode:
                savedTheme.characterDisplayMode || defaultTheme.characterDisplayMode
        });

        setWorldMechanics(worldData.worldMechanics || DEFAULT_WORLD_MECHANICS);
        setWorldFeatures(worldData.worldFeatures || DEFAULT_WORLD_FEATURES);
        setCharacterLibrary(worldData.characterLibrary || {});
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

        setCellHistory([]);
        setCellFuture([]);

        const startingTurnTeam = sessionGameState?.turnTeam || "white";

        const startingMoveNumber = Number.isFinite(Number(sessionGameState?.moveNumber))
            ? Number(sessionGameState.moveNumber)
            : 1;

        const startingActionLog = Array.isArray(sessionGameState?.actionLog)
            ? sessionGameState.actionLog
            : [];

        const startingGameState = createSessionGameState({
            cells: Array.isArray(sessionGameState?.cells)
                ? sessionGameState.cells
                : createStandardSetupCells(),
            pieceNames: sessionGameState?.pieceNames || createPieceRecord(""),
            pieceNameLocked: sessionGameState?.pieceNameLocked || createPieceRecord(false),
            turnTeam: startingTurnTeam,
            moveNumber: startingMoveNumber,
            actionLog: startingActionLog
        });

        lastSavedGameStateJsonRef.current = getGameStateJson(startingGameState);
        setSessionSyncStatus("");

        clearAllSelections();
        setActivePiece(null);
    }

    function pushCellsToHistory(previousCells) {
        setCellHistory((currentHistory) => {
            const nextHistory = [...currentHistory, previousCells];

            if (nextHistory.length > MAX_CELL_HISTORY) {
                return nextHistory.slice(nextHistory.length - MAX_CELL_HISTORY);
            }

            return nextHistory;
        });

        setCellFuture([]);
    }

    function updateCellsWithHistory(updateFunction) {
        setCells((currentCells) => {
            pushCellsToHistory(currentCells);
            return updateFunction(currentCells);
        });
    }

    function handleUndo() {
        if (cellHistory.length === 0) return;

        const previousCells = cellHistory[cellHistory.length - 1];

        setCellFuture((currentFuture) => [cells, ...currentFuture]);
        setCellHistory((currentHistory) => currentHistory.slice(0, -1));
        setCells(previousCells);
        setMovingPiece(null);
    }

    function handleRedo() {
        if (cellFuture.length === 0) return;

        const nextCells = cellFuture[0];

        setCellHistory((currentHistory) => {
            const nextHistory = [...currentHistory, cells];

            if (nextHistory.length > MAX_CELL_HISTORY) {
                return nextHistory.slice(nextHistory.length - MAX_CELL_HISTORY);
            }

            return nextHistory;
        });

        setCellFuture((currentFuture) => currentFuture.slice(1));
        setCells(nextCells);
        setMovingPiece(null);
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
                const terrainList = worldMechanics.terrains || [];
                const terrainIndex = terrainShortcutKeys.indexOf(key);
                const terrain = terrainList[terrainIndex];

                if (terrain) {
                    event.preventDefault();
                    handleSelectTerrain(terrain.key);
                }

                return;
            }

            if (conditionShortcutKeys.includes(key)) {
                const conditionList = worldMechanics.conditions || [];
                const conditionIndex = conditionShortcutKeys.indexOf(key);
                const condition = conditionList[conditionIndex];

                if (condition) {
                    event.preventDefault();
                    handleSelectCondition(condition.key);
                }

                return;
            }

            if (counterShortcutKeys.includes(key)) {
                const counterList = getCounterListFromMechanics(worldMechanics);
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
                handleUndo();
                return;
            }

            if (isRedo) {
                event.preventDefault();
                handleRedo();
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
        movingPiece
    ]);

    function getTeamLabel(team) {
        return team === "black" ? "Black" : "White";
    }

    function createActionLogEntry(message, category = "action") {
        return {
            id:
                typeof crypto !== "undefined" && crypto.randomUUID
                    ? crypto.randomUUID()
                    : `${Date.now()}-${Math.random()}`,
            message,
            category,
            turnTeam,
            moveNumber,
            createdAt: new Date().toISOString()
        };
    }

    function addActionLogEntry(message, category = "action") {
        const nextEntry = createActionLogEntry(message, category);

        setActionLog((currentLog) => {
            const nextLog = [nextEntry, ...(currentLog || [])];

            return nextLog.slice(0, MAX_ACTION_LOG);
        });
    }

    function getPieceLabel(team, pieceKey) {
        if (!pieceKey) return "piece";

        const assignedName = pieceNames?.[team]?.[pieceKey];

        if (assignedName?.trim()) {
            return assignedName.trim();
        }

        return pieceKey;
    }

    function showSessionSyncStatus(message) {
        setSessionSyncStatus(message);

        if (sessionSyncStatusTimeoutRef.current) {
            clearTimeout(sessionSyncStatusTimeoutRef.current);
        }

        if (message === "Saved." || message === "Synced.") {
            sessionSyncStatusTimeoutRef.current = setTimeout(() => {
                setSessionSyncStatus("");
            }, 1200);
        }
    }

    useEffect(() => {
        if (!playSessionId || !isWorldLoaded || !hasSupabaseConfig() || !supabase) {
            return;
        }

        const nextGameState = createSessionGameState({
            cells,
            pieceNames,
            pieceNameLocked,
            turnTeam,
            moveNumber,
            actionLog
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

        showSessionSyncStatus("Saving...");

        saveSessionTimeoutRef.current = setTimeout(async () => {
            try {
                const { error } = await supabase
                    .from("play_sessions")
                    .update({
                        game_state: nextGameState
                    })
                    .eq("id", playSessionId);

                if (error) {
                    console.warn("Could not save play session:", error.message);
                    showSessionSyncStatus("Save failed.");
                    return;
                }

                lastSavedGameStateJsonRef.current = nextGameStateJson;
                showSessionSyncStatus("Saved.");
            } catch (error) {
                console.warn("Could not reach Supabase to save play session:", error);
                showSessionSyncStatus("Save failed.");
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
        playSessionId,
        isWorldLoaded
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
                    const remoteGameState = payload.new?.game_state;

                    if (!remoteGameState) return;

                    const remoteGameStateJson = getGameStateJson(remoteGameState);

                    if (remoteGameStateJson === lastSavedGameStateJsonRef.current) {
                        return;
                    }

                    lastSavedGameStateJsonRef.current = remoteGameStateJson;
                    suppressAutosaveForGameStateJsonRef.current = remoteGameStateJson;

                    setCells(
                        Array.isArray(remoteGameState.cells)
                            ? remoteGameState.cells
                            : createStandardSetupCells()
                    );

                    setPieceNames(remoteGameState.pieceNames || createPieceRecord(""));
                    setPieceNameLocked(
                        remoteGameState.pieceNameLocked || createPieceRecord(false)
                    );

                    setTurnTeam(remoteGameState.turnTeam || "white");
                    setMoveNumber(
                        Number.isFinite(Number(remoteGameState.moveNumber))
                            ? Number(remoteGameState.moveNumber)
                            : 1
                    );

                    setActionLog(
                        Array.isArray(remoteGameState.actionLog)
                            ? remoteGameState.actionLog
                            : []
                    );

                    setMovingPiece(null);
                    setActivePiece(null);
                    setCellHistory([]);
                    setCellFuture([]);

                    showSessionSyncStatus("Synced.");
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [playSessionId]);

    useEffect(() => {
        return () => {
            if (saveSessionTimeoutRef.current) {
                clearTimeout(saveSessionTimeoutRef.current);
            }

            if (sessionSyncStatusTimeoutRef.current) {
                clearTimeout(sessionSyncStatusTimeoutRef.current);
            }
        };
    }, []);

    function handleSelectCounterDelta(counterKey, delta) {
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

        setSelectedCondition(conditionKey);
        setSelectedConditionAction("toggle");

        clearCounterSelections();
        clearTerrainSelections();
        clearPlacementSelections();

        setSelectedBoardAction(null);
    }

    function handleSelectClearConditions() {
        if (!worldFeatures.conditions) return;

        setSelectedCondition(null);
        setSelectedConditionAction("clear");

        clearCounterSelections();
        clearTerrainSelections();
        clearPlacementSelections();

        setSelectedBoardAction(null);
    }

    function handleSelectTerrain(terrainKey) {
        if (!worldFeatures.terrains) return;

        setSelectedTerrain(terrainKey);
        setSelectedTerrainAction("paint");

        clearCounterSelections();
        clearConditionSelections();
        clearPlacementSelections();

        setSelectedBoardAction(null);
    }

    function handleSelectClearTerrain() {
        if (!worldFeatures.terrains) return;

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
                currentCells.map((cell) => ({
                    ...cloneCell(cell),
                    tile: "neutral"
                }))
            );

            return;
        }

        if (!selectedTerrain) return;

        updateCellsWithHistory((currentCells) =>
            currentCells.map((cell) => ({
                ...cloneCell(cell),
                tile: selectedTerrain
            }))
        );
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
        updateCellsWithHistory(() => createStandardSetupCells());
        addActionLogEntry("Board reset to standard setup.", "board");
        clearAllSelections();
        setActivePiece(null);
    }

    function handleClearBoard() {
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
        const clickedCell = cells[index];
        const clickedToken = getPrimaryToken(clickedCell);

        if (selectedBoardAction === "delete-piece") {
            updateCellsWithHistory((currentCells) => {
                const nextCells = currentCells.map(cloneCell);
                const targetCell = nextCells[index];

                if (!cellHasOccupant(targetCell)) return nextCells;

                clearPieceFromCell(targetCell);

                return nextCells;
            });

            if (!event?.shiftKey) {
                setSelectedBoardAction(null);
            }

            setActivePiece(null);
            setMovingPiece(null);

            return;
        }

        if (selectedCounterAction === "adjust" && selectedCounterDelta !== null) {
            updateCellsWithHistory((currentCells) => {
                const nextCells = currentCells.map(cloneCell);
                const targetCell = nextCells[index];

                if (!cellHasOccupant(targetCell)) return nextCells;

                adjustCounterOnCell(
                    targetCell,
                    selectedCounterKey,
                    selectedCounterDelta
                );

                return nextCells;
            });

            if (!event?.shiftKey) {
                setSelectedCounterDelta(null);
                setSelectedCounterAction(null);
            }

            return;
        }

        if (selectedCounterAction === "set") {
            updateCellsWithHistory((currentCells) => {
                const nextCells = currentCells.map(cloneCell);
                const targetCell = nextCells[index];

                if (!cellHasOccupant(targetCell)) return nextCells;

                setCounterOnCell(targetCell, selectedCounterKey, counterSetValue);

                return nextCells;
            });

            if (!event?.shiftKey) {
                setSelectedCounterAction(null);
            }

            return;
        }

        if (selectedCounterAction === "clear") {
            updateCellsWithHistory((currentCells) => {
                const nextCells = currentCells.map(cloneCell);
                const targetCell = nextCells[index];

                if (!cellHasOccupant(targetCell)) return nextCells;

                clearCounterOnCell(targetCell, selectedCounterKey);

                return nextCells;
            });

            if (!event?.shiftKey) {
                setSelectedCounterAction(null);
            }

            return;
        }

        if (selectedConditionAction === "toggle" && selectedCondition) {
            updateCellsWithHistory((currentCells) => {
                const nextCells = currentCells.map(cloneCell);
                const targetCell = nextCells[index];

                if (!cellHasOccupant(targetCell)) return nextCells;

                toggleConditionOnCell(targetCell, selectedCondition, event?.shiftKey);

                return nextCells;
            });

            if (!event?.shiftKey) {
                setSelectedCondition(null);
                setSelectedConditionAction(null);
            }

            return;
        }

        if (selectedConditionAction === "clear") {
            updateCellsWithHistory((currentCells) => {
                const nextCells = currentCells.map(cloneCell);
                const targetCell = nextCells[index];

                if (!cellHasOccupant(targetCell)) return nextCells;

                clearConditionsOnCell(targetCell);

                return nextCells;
            });

            if (!event?.shiftKey) {
                setSelectedConditionAction(null);
            }

            return;
        }

        if (selectedTerrainAction === "paint" && selectedTerrain) {
            updateCellsWithHistory((currentCells) => {
                const nextCells = currentCells.map(cloneCell);

                nextCells[index].tile = selectedTerrain;

                return nextCells;
            });

            if (!event?.shiftKey) {
                setSelectedTerrain(null);
                setSelectedTerrainAction(null);
            }

            return;
        }

        if (selectedTerrainAction === "clear") {
            updateCellsWithHistory((currentCells) => {
                const nextCells = currentCells.map(cloneCell);

                nextCells[index].tile = "neutral";

                return nextCells;
            });

            if (!event?.shiftKey) {
                setSelectedTerrainAction(null);
            }

            return;
        }

        if (!movingPiece) {
            if (selectedToken) {
                updateCellsWithHistory((currentCells) => {
                    const nextCells = currentCells.map(cloneCell);
                    const targetCell = nextCells[index];

                    clearPieceFromCell(targetCell);
                    targetCell.tokens = [selectedToken];

                    return nextCells;
                });

                if (!event?.shiftKey) {
                    setSelectedToken(null);
                }

                return;
            }

            if (selectedTeam && selectedPiece) {
                const placedPieceKey =
                    selectedPiece === GENERIC_PIECE_KEY
                        ? createGenericPieceInstanceKey()
                        : selectedPiece;

                updateCellsWithHistory((currentCells) => {
                    const nextCells = currentCells.map(cloneCell);
                    const targetCell = nextCells[index];

                    clearPieceFromCell(targetCell);
                    targetCell.pieceType = placedPieceKey;
                    targetCell.team = selectedTeam;

                    return nextCells;
                });

                if (selectedPiece === GENERIC_PIECE_KEY) {
                    setPieceNames((currentNames) => ({
                        ...currentNames,
                        [selectedTeam]: {
                            ...(currentNames[selectedTeam] || {}),
                            [placedPieceKey]: ""
                        }
                    }));

                    setPieceNameLocked((currentLocked) => ({
                        ...currentLocked,
                        [selectedTeam]: {
                            ...(currentLocked[selectedTeam] || {}),
                            [placedPieceKey]: false
                        }
                    }));
                }

                setActivePiece({
                    team: selectedTeam,
                    pieceKey: placedPieceKey
                });

                addActionLogEntry(
                    `${getTeamLabel(selectedTeam)} placed ${getPieceLabel(selectedTeam, placedPieceKey)}.`,
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

        updateCellsWithHistory((currentCells) => {
            const nextCells = currentCells.map(cloneCell);
            const sourceCell = nextCells[movingPiece.fromIndex];
            const targetCell = nextCells[index];

            clearPieceFromCell(targetCell);

            targetCell.counters = {
                ...(movingPiece.counters || {})
            };

            targetCell.conditions = [...(movingPiece.conditions || [])];

            if (movingPiece.kind === "token") {
                targetCell.tokens = [movingPiece.tokenName];
            } else {
                targetCell.pieceType = movingPiece.pieceType;
                targetCell.team = movingPiece.team;
            }

            clearPieceFromCell(sourceCell);

            return nextCells;
        });

        if (movingPiece.kind === "token") {
            addActionLogEntry(
                `Token moved.`,
                "token"
            );

            setActivePiece(null);
        } else {
            addActionLogEntry(
                `${getTeamLabel(movingPiece.team)} moved ${getPieceLabel(
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

        setMovingPiece(null);
        setSelectedBoardAction(null);
        clearAllSelections();
    }

    function handleToggleCharacterDisplayMode() {
        setWorldTheme((currentTheme) => {
            const currentMode =
                currentTheme.characterDisplayMode || "piece-with-portrait";

            const nextMode =
                currentMode === "piece-with-portrait"
                    ? "portrait-with-piece"
                    : "piece-with-portrait";

            return {
                ...currentTheme,
                characterDisplayMode: nextMode
            };
        });
    }

    async function handleCopyInviteLink() {
        if (!playSessionId) {
            showSessionSyncStatus("No session link yet.");
            return;
        }

        const inviteUrl = `${window.location.origin}/join?session=${playSessionId}`;

        try {
            await navigator.clipboard.writeText(inviteUrl);
            showSessionSyncStatus("Invite link copied.");
        } catch (error) {
            console.warn("Could not copy invite link:", error);
            showSessionSyncStatus("Copy failed.");
        }
    }

    function handleBackToWorld() {
        if (playWorldId) {
            router.push(`/worlds/${playWorldId}`);
            return;
        }

        router.push("/worlds");
    }

    if (!isWorldLoaded) {
        return (
            <main className="simple-page">
                <SiteHeader />

                <section className="simple-page-card">
                    <p className="home-kicker">Play Board</p>

                    <h1>{loadStatus}</h1>

                    <p>
                        Choose a published world first, then open its board from the world page.
                    </p>

                    <div className="home-action-row">
                        <Link className="home-primary-link" href="/worlds">
                            Browse Worlds
                        </Link>

                        <Link className="home-secondary-link" href="/lobby">
                            Open Lobby
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
                            </div>

                            <div className="top-command-actions">
                                <div className="top-command-button-row play-command-button-row">
                                    <button type="button" onClick={handleBackToWorld}>
                                        Back
                                    </button>

                                    <button type="button" onClick={handleCopyInviteLink}>
                                        Invite
                                    </button>

                                    <button type="button" onClick={handleStandardSetup}>
                                        Reset
                                    </button>

                                    <button type="button" onClick={handleToggleCharacterDisplayMode}>
                                        Portrait
                                    </button>

                                    <button type="button" onClick={() => router.push("/worlds")}>
                                        Worlds
                                    </button>
                                </div>

                                <p className="command-menu-status play-mode-status">
                                    {loadStatus}
                                    {sessionSyncStatus ? ` · ${sessionSyncStatus}` : ""}
                                </p>

                                <div className="world-name-input play-world-name-readonly">
                                    {worldDetails.name}
                                </div>
                            </div>
                        </header>

                        <LeftSidebar
                            isPlayMode={true}
                            worldDetails={worldDetails}
                            worldTheme={worldTheme}
                            worldFeatures={worldFeatures}
                            worldMechanics={worldMechanics}
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
                            onCharacterLibraryChange={() => { }}
                            characterUploadStatus="Character editing is disabled in Play Mode."
                            worldTokens={worldTokens}
                            selectedCounterKey={selectedCounterKey}
                            selectedCounterDelta={selectedCounterDelta}
                            selectedCounterAction={selectedCounterAction}
                            counterSetValue={counterSetValue}
                            selectedCondition={selectedCondition}
                            selectedConditionAction={selectedConditionAction}
                            selectedTerrain={selectedTerrain}
                            selectedTerrainAction={selectedTerrainAction}
                            onCounterSetValueChange={setCounterSetValue}
                            onCharacterCsvUpload={() => { }}
                            onSaveCharacter={() => { }}
                            onAddWorldToken={() => { }}
                            onDeleteWorldToken={() => { }}
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
                            worldTheme={worldTheme}
                            worldMechanics={worldMechanics}
                            onCellClick={handleCellClick}
                            onClearSelections={clearAllSelections}
                        />

                        <RightPanel
                            worldFeatures={worldFeatures}
                            worldTheme={worldTheme}
                            characterLibrary={characterLibrary}
                            worldTokens={worldTokens}
                            selectedTeam={selectedTeam}
                            selectedPiece={selectedPiece}
                            selectedToken={selectedToken}
                            activePiece={activePiece}
                            pieceNames={pieceNames}
                            pieceNameLocked={pieceNameLocked}
                            turnTeam={turnTeam}
                            moveNumber={moveNumber}
                            onPassTurn={handlePassTurn}
                            actionLog={actionLog}
                            onClearSelections={clearAllSelections}
                            onSelectPiece={handleSelectPiece}
                            onSelectToken={handleSelectToken}
                            onNameChange={handleNameChange}
                            onLockName={handleLockName}
                            onUnlockName={handleUnlockName}
                            onAssignCharacter={handleAssignCharacter}
                            selectedBoardAction={selectedBoardAction}
                            onDeletePiece={handleDeleteSelectedPiece}
                            onStandardSetup={handleStandardSetup}
                            onClearBoard={handleClearBoard}
                            onUndo={handleUndo}
                            onRedo={handleRedo}
                        />
                    </div>
                </div>
            </div>
        </main>
    );
}
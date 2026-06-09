"use client";

// **************************************************************
// IMPORTS
// **************************************************************

import { useEffect, useRef, useState } from "react";
import TopCommandBar from "./TopCommandBar";
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
  getCounterListFromMechanics,
  humanizeTokenName
} from "@/lib/defaultWorld";
import { buildCharacterLibraryFromCSV, normalizeName } from "@/lib/csv";
import {
  deleteLocalItem,
  downloadJsonFile,
  getLocalItemList,
  loadLocalItem,
  makeSafeFileName,
  readJsonFile,
  saveLocalItem
} from "@/lib/saveLoad";

const FALLBACK_STAGE_WIDTH = 1460;
const FALLBACK_STAGE_HEIGHT = 840;
const STAGE_SCREEN_PADDING = 12;
const MAX_CELL_HISTORY = 30;

// **************************************************************
// HELPER FUNCTIONS
// **************************************************************

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

function clearAllCountersOnCell(cell) {
  cell.counters = {};

  // Legacy cleanup
  cell.counter = "";
  cell.counterColor = "neutral";
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

function getPrimaryToken(cell) {
  if (!cell.tokens || cell.tokens.length === 0) return null;

  return cell.tokens[0];
}

function createMovingToken(cell, index) {
  return {
    kind: "token",
    fromIndex: index,
    tokenName: getPrimaryToken(cell),
    counter: cell.counter,
    counterColor: cell.counterColor,
    conditions: [...cell.conditions]
  };
}

function clearCellOccupant(cell) {
  cell.pieceType = null;
  cell.team = null;
  cell.tokens = [];
}

function cellHasOccupant(cell) {
  return Boolean(cell.pieceType || getPrimaryToken(cell));
}

function clearOccupantMarkers(cell) {
  cell.counter = "";
  cell.counterColor = "neutral";
  cell.conditions = [];
}

// **************************************************************
// WORLD CREATOR COMPONENT
// **************************************************************

export default function WorldCreator() {

  // STATE VARIABLES

  const [worldFeatures, setWorldFeatures] = useState(DEFAULT_WORLD_FEATURES);

  const [worldDetails, setWorldDetails] = useState({
    name: "Elemental Chess",
    description: "",
    rulesNotes: ""
  });

  const [worldTheme, setWorldTheme] = useState(createDefaultWorldTheme());

  const [worldMechanics, setWorldMechanics] = useState(DEFAULT_WORLD_MECHANICS);

  const [stageLayout, setStageLayout] = useState({
    scale: 1,
    width: FALLBACK_STAGE_WIDTH,
    height: FALLBACK_STAGE_HEIGHT
  });

  const baseDevicePixelRatioRef = useRef(null);

  const [savedWorlds, setSavedWorlds] = useState([]);
  const [selectedSavedWorldId, setSelectedSavedWorldId] = useState("");

  const [savedTestGames, setSavedTestGames] = useState([]);
  const [selectedSavedTestGameId, setSelectedSavedTestGameId] = useState("");

  const [saveStatus, setSaveStatus] = useState("");

  const [characterLibrary, setCharacterLibrary] = useState({});
  const [characterUploadStatus, setCharacterUploadStatus] = useState(
    "No character spreadsheet uploaded."
  );

  const [worldTokens, setWorldTokens] = useState({});

  const [cellHistory, setCellHistory] = useState([]);
  const [cellFuture, setCellFuture] = useState([]);

  const [cells, setCells] = useState(createStandardSetupCells);
  const [movingPiece, setMovingPiece] = useState(null);
  const [selectedBoardAction, setSelectedBoardAction] = useState(null);

  const [selectedTeam, setSelectedTeam] = useState(null);
  const [selectedPiece, setSelectedPiece] = useState(null);
  const [selectedToken, setSelectedToken] = useState(null);

  const [selectedCounterKey, setSelectedCounterKey] = useState("main-counter");
  const [selectedCounterDelta, setSelectedCounterDelta] = useState(null);
  const [selectedCounterAction, setSelectedCounterAction] = useState(null);
  const [counterSetValue, setCounterSetValue] = useState("3");

  const [selectedCondition, setSelectedCondition] = useState(null);
  const [selectedConditionAction, setSelectedConditionAction] = useState(null);

  const [selectedTerrain, setSelectedTerrain] = useState(null);
  const [selectedTerrainAction, setSelectedTerrainAction] = useState(null);

  const [activePiece, setActivePiece] = useState(null);
  const [pieceNames, setPieceNames] = useState(() => createPieceRecord(""));
  const [pieceNameLocked, setPieceNameLocked] = useState(() => createPieceRecord(false));

  useEffect(() => {
    refreshSavedLists();
  }, []);

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
      const currentDevicePixelRatio = window.devicePixelRatio || baseDevicePixelRatio;

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

      const availableWidth = Math.max(viewportSize.width - viewportPadding * 2, 1);
      const availableHeight = Math.max(viewportSize.height - viewportPadding * 2, 1);

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

  //  SAVE DATA

  function createWorldSaveData() {
    return {
      version: 1,
      worldDetails,
      worldTheme,
      worldMechanics,
      worldFeatures,
      characterLibrary,
      worldTokens,
      pieceNames,
      pieceNameLocked
    };
  }

  function createTestGameSaveData() {
    return {
      version: 1,
      worldDetails,
      worldData: createWorldSaveData(),
      cells
    };
  }

  function applyWorldSaveData(worldData) {
    if (!worldData) return;

    setWorldDetails(
      worldData.worldDetails || {
        name: "Untitled World",
        description: "",
        rulesNotes: ""
      }
    );

    const defaultTheme = createDefaultWorldTheme();

    setWorldTheme({
      ...defaultTheme,
      ...(worldData.worldTheme || {}),
      backgroundImage:
        worldData.worldTheme?.backgroundImage || defaultTheme.backgroundImage,
      boardSkinImage:
        worldData.worldTheme?.boardSkinImage || defaultTheme.boardSkinImage,
      pieceSkins: {
        ...defaultTheme.pieceSkins,
        ...(worldData.worldTheme?.pieceSkins || {}),
        white: {
          ...defaultTheme.pieceSkins.white,
          ...(worldData.worldTheme?.pieceSkins?.white || {})
        },
        black: {
          ...defaultTheme.pieceSkins.black,
          ...(worldData.worldTheme?.pieceSkins?.black || {})
        }
      },
      characterDisplayMode:
        worldData.worldTheme?.characterDisplayMode ||
        defaultTheme.characterDisplayMode
    });

    setWorldMechanics(worldData.worldMechanics || DEFAULT_WORLD_MECHANICS);
    setWorldFeatures(worldData.worldFeatures || DEFAULT_WORLD_FEATURES);
    setCharacterLibrary(worldData.characterLibrary || {});
    setWorldTokens(worldData.worldTokens || {});
    setPieceNames(worldData.pieceNames || createPieceRecord(""));
    setPieceNameLocked(worldData.pieceNameLocked || createPieceRecord(false));

    setMovingPiece(null);
    setSelectedTeam(null);
    setSelectedPiece(null);
    setSelectedToken(null);
    setActivePiece(null);
  }

  function handleExportWorld() {
    const exportData = {
      type: "chess-multiverse-world",
      exportedAt: new Date().toISOString(),
      version: 1,
      data: createWorldSaveData()
    };

    const fileName = `${makeSafeFileName(worldDetails.name)}-world.json`;

    downloadJsonFile(fileName, exportData);
    setSaveStatus(`World exported: ${fileName}`);
  }

  async function handleImportWorld(file) {
    try {
      const importedWorld = await readJsonFile(file);

      const worldData =
        importedWorld?.type === "chess-multiverse-world"
          ? importedWorld.data
          : importedWorld;

      if (!worldData || typeof worldData !== "object") {
        setSaveStatus("Import failed: this file does not contain world data.");
        return;
      }

      applyWorldSaveData(worldData);
      setSaveStatus("World imported. Review it, then click Save World if you want to store it locally.");
    } catch (error) {
      setSaveStatus(error.message || "Import failed.");
    }
  }

  // SMALL SELECTION/HELPER HANDLERS

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
      }

      if (isDeleteKey) {
        event.preventDefault();
        handleDeleteSelectedPiece();
        return;
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

  function handleToggleWorldFeature(featureKey) {
    setWorldFeatures((currentFeatures) => ({
      ...currentFeatures,
      [featureKey]: !currentFeatures[featureKey]
    }));
  }

  function handleWorldDetailsChange(field, value) {
    setWorldDetails((currentDetails) => ({
      ...currentDetails,
      [field]: value
    }));
  }

  function handleThemeChange(field, value) {
    setWorldTheme((currentTheme) => ({
      ...currentTheme,
      [field]: value
    }));
  }

  function handlePieceSkinChange(team, pieceKey, imageData) {
    setWorldTheme((currentTheme) => ({
      ...currentTheme,
      pieceSkins: {
        ...currentTheme.pieceSkins,
        [team]: {
          ...currentTheme.pieceSkins?.[team],
          [pieceKey]: imageData
        }
      }
    }));
  }

  function handleCharacterDisplayModeChange(nextMode) {
    setWorldTheme((currentTheme) => ({
      ...currentTheme,
      characterDisplayMode: nextMode
    }));
  }

  function handleWorldMechanicsChange(nextMechanics) {
    setWorldMechanics(nextMechanics);
  }

  function handleTerrainListChange(nextTerrains) {
    setWorldMechanics((currentMechanics) => ({
      ...currentMechanics,
      terrains: nextTerrains
    }));
  }

  function handleCounterSettingsChange(nextCounters) {
    setWorldMechanics((currentMechanics) => ({
      ...currentMechanics,
      counters: Array.isArray(nextCounters) ? nextCounters : currentMechanics.counters
    }));
  }

  function handleConditionListChange(nextConditions) {
    setWorldMechanics((currentMechanics) => ({
      ...currentMechanics,
      conditions: nextConditions
    }));
  }

  function clearPlacementSelections() {
    setSelectedTeam(null);
    setSelectedPiece(null);
    setSelectedToken(null);
    setMovingPiece(null);
  }

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
  }

  function handleSelectSetCounter(counterKey) {
    setSelectedCounterKey(counterKey);
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
  }

  function handleSelectCondition(conditionKey) {
    if (!worldFeatures.conditions) return;

    setSelectedCondition(conditionKey);
    setSelectedConditionAction("toggle");

    setSelectedCounterDelta(null);
    setSelectedCounterAction(null);
    clearTerrainSelections();
    clearPlacementSelections();
  }

  function handleSelectClearConditions() {
    if (!worldFeatures.conditions) return;

    setSelectedCondition(null);
    setSelectedConditionAction("clear");

    setSelectedCounterDelta(null);
    setSelectedCounterAction(null);
    clearTerrainSelections();
    clearPlacementSelections();
  }

  function handleSelectTerrain(terrainKey) {
    if (!worldFeatures.terrains) return;

    setSelectedTerrain(terrainKey);
    setSelectedTerrainAction("paint");

    clearCounterSelections();
    clearConditionSelections();
    clearPlacementSelections();
  }

  function handleSelectClearTerrain() {
    if (!worldFeatures.terrains) return;

    setSelectedTerrain(null);
    setSelectedTerrainAction("clear");

    clearCounterSelections();
    clearConditionSelections();
    clearPlacementSelections();
  }

  function paintTerrainOnCell(cell, terrainKey) {
    cell.tile = terrainKey;
  }

  function clearTerrainOnCell(cell) {
    cell.tile = "neutral";
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

  function handleApplyTerrainToWholeBoard() {
    if (!worldFeatures.terrains) return;

    if (selectedTerrainAction === "clear") {
      updateCellsWithHistory((currentCells) =>
        currentCells.map((cell) => ({
          ...cell,
          tile: "neutral",
          conditions: [...cell.conditions],
          tokens: [...cell.tokens]
        }))
      );

      return;
    }

    if (!selectedTerrain) return;

    updateCellsWithHistory((currentCells) =>
      currentCells.map((cell) => ({
        ...cell,
        tile: selectedTerrain,
        conditions: [...cell.conditions],
        tokens: [...cell.tokens]
      }))
    );
  }

  function handleClearAllTerrains() {
    updateCellsWithHistory((currentCells) =>
      currentCells.map((cell) => ({
        ...cell,
        tile: "neutral",
        conditions: [...cell.conditions],
        tokens: [...cell.tokens]
      }))
    );

    clearTerrainSelections();
  }

  // BOARD/RESET HANDLERS

  function handleStandardSetup() {
    updateCellsWithHistory(() => createStandardSetupCells());
    clearAllSelections();
    setMovingPiece(null);
    setSelectedTeam(null);
    setSelectedToken(null);
    setSelectedPiece(null);
    setSelectedCounterDelta(null);
    setSelectedCounterAction(null);
    setSelectedCondition(null);
    setSelectedConditionAction(null);
    setSelectedTerrain(null);
    setSelectedTerrainAction(null);
    setActivePiece(null);
  }

  function handleClearBoard() {
    updateCellsWithHistory(() => createBoardCells());
    clearAllSelections();
    setMovingPiece(null);
    setSelectedTeam(null);
    setSelectedToken(null);
    setSelectedPiece(null);
    setSelectedCounterDelta(null);
    setSelectedCounterAction(null);
    setSelectedCondition(null);
    setSelectedConditionAction(null);
    setSelectedTerrain(null);
    setSelectedTerrainAction(null);
    setActivePiece(null);
  }

  function handleSelectDeletePiece() {
    setSelectedBoardAction("delete-piece");

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
  }

  function handleDeleteSelectedPiece() {
    if (!movingPiece || movingPiece.kind === "token") {
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

  function refreshSavedLists() {
    setSavedWorlds(getLocalItemList("worlds"));
    setSavedTestGames(getLocalItemList("test-games"));
  }

  function handleSaveWorld() {
    const savedWorld = saveLocalItem(
      "worlds",
      worldDetails.name,
      createWorldSaveData()
    );

    setSelectedSavedWorldId(savedWorld.id);
    refreshSavedLists();
    setSaveStatus(`World saved: ${savedWorld.name}`);
  }

  function handleLoadWorld() {
    const savedWorld = loadLocalItem("worlds", selectedSavedWorldId);

    if (!savedWorld) {
      setSaveStatus("Choose a saved world first.");
      return;
    }

    applyWorldSaveData(savedWorld.data);

    setSaveStatus(`World loaded: ${savedWorld.name}. Board setup unchanged.`);
  }

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const worldIdFromUrl = searchParams.get("world");

    if (!worldIdFromUrl) return;

    const savedWorld = loadLocalItem("worlds", worldIdFromUrl);

    if (!savedWorld) {
      setSaveStatus("Could not find that local world.");
      return;
    }

    applyWorldSaveData(savedWorld.data);
    setSelectedSavedWorldId(savedWorld.id);
    refreshSavedLists();

    setSaveStatus(`World loaded from Library: ${savedWorld.name}`);

    // Remove ?world=... from the URL after loading, so refreshing does not keep reloading it.
    window.history.replaceState({}, "", window.location.pathname);
  }, []);

  function handleDeleteWorld() {
    if (!selectedSavedWorldId) {
      setSaveStatus("Choose a saved world to delete.");
      return;
    }

    deleteLocalItem("worlds", selectedSavedWorldId);

    setSelectedSavedWorldId("");
    refreshSavedLists();
    setSaveStatus("Saved world deleted.");
  }

  function handleSaveTestGame() {
    const savedGame = saveLocalItem(
      "test-games",
      `${worldDetails.name || "Untitled World"} Test Game`,
      createTestGameSaveData()
    );

    setSelectedSavedTestGameId(savedGame.id);
    refreshSavedLists();
    setSaveStatus(`Test game saved: ${savedGame.name}`);
  }

  function handleLoadTestGame() {
    const savedGame = loadLocalItem("test-games", selectedSavedTestGameId);

    if (!savedGame) {
      setSaveStatus("Choose a saved test game first.");
      return;
    }

    const gameData = savedGame.data;

    applyWorldSaveData(gameData.worldData);
    setCells(gameData.cells || createStandardSetupCells());

    setMovingPiece(null);
    setSaveStatus(`Test game loaded: ${savedGame.name}`);
  }

  function handleDeleteTestGame() {
    if (!selectedSavedTestGameId) {
      setSaveStatus("Choose a saved test game to delete.");
      return;
    }

    deleteLocalItem("test-games", selectedSavedTestGameId);

    setSelectedSavedTestGameId("");
    refreshSavedLists();
    setSaveStatus("Saved test game deleted.");
  }

  // PIECE/TOKEN/CHARACTER HANDLERS

  function handleSelectPiece(team, pieceKey) {
    setSelectedTeam(team);
    setSelectedPiece(pieceKey);
    setSelectedToken(null);
    setSelectedCounterDelta(null);
    setSelectedCounterAction(null);
    setSelectedCondition(null);
    setSelectedConditionAction(null);
    clearTerrainSelections();
    setMovingPiece(null);
    setActivePiece({ team, pieceKey });
  }

  function handleSelectToken(tokenName) {
    setSelectedToken(tokenName);
    setSelectedTeam(null);
    setSelectedPiece(null);
    setSelectedCounterDelta(null);
    setSelectedCounterAction(null);
    setSelectedCondition(null);
    setSelectedConditionAction(null);
    clearTerrainSelections();
    setMovingPiece(null);
  }

  function handleNameChange(team, pieceKey, value) {
    setPieceNames((currentNames) => ({
      ...currentNames,
      [team]: {
        ...currentNames[team],
        [pieceKey]: value
      }
    }));
  }

  function handleLockName(team, pieceKey) {
    setPieceNameLocked((currentLocked) => ({
      ...currentLocked,
      [team]: {
        ...currentLocked[team],
        [pieceKey]: true
      }
    }));
  }

  function handleUnlockName(team, pieceKey) {
    setPieceNameLocked((currentLocked) => ({
      ...currentLocked,
      [team]: {
        ...currentLocked[team],
        [pieceKey]: false
      }
    }));
  }

  // MAIN BOARD CLICK HANDLER

  function handleCellClick(index, event) {
    const clickedCell = cells[index];
    const clickedToken = getPrimaryToken(clickedCell);

    if (selectedBoardAction === "delete-piece") {
      updateCellsWithHistory((currentCells) => {
        const nextCells = currentCells.map(cloneCell);
        const targetCell = nextCells[index];

        if (!targetCell.pieceType) return nextCells;

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

        setCounterOnCell(
          targetCell,
          selectedCounterKey,
          counterSetValue
        );

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
        const targetCell = nextCells[index];

        paintTerrainOnCell(targetCell, selectedTerrain);

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
        const targetCell = nextCells[index];

        clearTerrainOnCell(targetCell);

        return nextCells;
      });

      if (!event?.shiftKey) {
        setSelectedTerrainAction(null);
      }

      return;
    }

    // If nothing is picked up, either pick up an occupant or place the selected item.
    if (!movingPiece) {
      if (clickedCell.pieceType) {
        setMovingPiece(createMovingPiece(clickedCell, index));
        setSelectedTeam(null);
        setSelectedPiece(null);
        setSelectedToken(null);
        setActivePiece({
          team: clickedCell.team,
          pieceKey: clickedCell.pieceType
        });
        return;
      }

      if (clickedToken) {
        setMovingPiece(createMovingToken(clickedCell, index));
        setSelectedTeam(null);
        setSelectedPiece(null);
        setSelectedToken(null);
        setActivePiece(null);
        return;
      }

      if (selectedToken) {
        updateCellsWithHistory((currentCells) => {
          const nextCells = currentCells.map(cloneCell);
          const targetCell = nextCells[index];

          clearCellOccupant(targetCell);
          clearOccupantMarkers(targetCell);
          targetCell.tokens = [selectedToken];

          return nextCells;
        });

        if (!event?.shiftKey) {
          setSelectedToken(null);
        }

        return;
      }

      if (!selectedTeam || !selectedPiece) {
        return;
      }

      setCells((currentCells) => {
        const nextCells = currentCells.map(cloneCell);
        const targetCell = nextCells[index];

        clearCellOccupant(targetCell);
        targetCell.pieceType = selectedPiece;
        targetCell.team = selectedTeam;

        return nextCells;
      });

      setActivePiece({
        team: selectedTeam,
        pieceKey: selectedPiece
      });

      if (!event?.shiftKey) {
        setSelectedTeam(null);
        setSelectedPiece(null);
      }

      return;
    }

    // Clicking the same square cancels the pickup.
    if (movingPiece.fromIndex === index) {
      setMovingPiece(null);
      return;
    }

    // If moving a piece, clicking another friendly piece switches the pickup.
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

    // Otherwise, move/capture/replace.
    updateCellsWithHistory((currentCells) => {
      const nextCells = currentCells.map(cloneCell);

      const sourceCell = nextCells[movingPiece.fromIndex];
      const targetCell = nextCells[index];

      clearCellOccupant(targetCell);
      clearOccupantMarkers(targetCell);

      targetCell.counters = {
        ...(movingPiece.counters || {})
      };

      targetCell.conditions = [...(movingPiece.conditions || [])];

      if (movingPiece.kind === "token") {
        targetCell.tokens = [movingPiece.tokenName];
      } else {
        targetCell.pieceType = movingPiece.pieceType;
        targetCell.team = movingPiece.team;
        targetCell.tokens = [];
      }

      clearCellOccupant(sourceCell);
      sourceCell.counter = "";
      sourceCell.counterColor = "neutral";
      sourceCell.counters = {};
      sourceCell.conditions = [];

      return nextCells;
    });

    if (movingPiece.kind === "token") {
      setActivePiece(null);
    } else {
      setActivePiece({
        team: movingPiece.team,
        pieceKey: movingPiece.pieceType
      });
    }

    setMovingPiece(null);
  }

  // IMPORT/SAVE//EDITOR HANDLERS

  function handleCharacterCsvUpload(file) {
    if (!file) return;

    const reader = new FileReader();

    reader.onload = function (event) {
      const csvText = event.target.result;
      const nextCharacterLibrary = buildCharacterLibraryFromCSV(csvText);
      const characterCount = Object.keys(nextCharacterLibrary).length;

      setCharacterLibrary(nextCharacterLibrary);

      setCharacterUploadStatus(
        characterCount > 0
          ? `${characterCount} characters imported. Previous character library replaced.`
          : "No valid characters found. Check the CSV headers."
      );
    };

    reader.readAsText(file);
  }

  function handleAssignCharacter(team, pieceKey, characterName) {
    setPieceNames((currentNames) => ({
      ...currentNames,
      [team]: {
        ...currentNames[team],
        [pieceKey]: characterName
      }
    }));

    setPieceNameLocked((currentLocked) => ({
      ...currentLocked,
      [team]: {
        ...currentLocked[team],
        [pieceKey]: true
      }
    }));

    setActivePiece({ team, pieceKey });
  }

  function handleSaveCharacter(character) {
    setCharacterLibrary((currentLibrary) => ({
      ...currentLibrary,
      [normalizeName(character.name)]: character
    }));

    setCharacterUploadStatus(`Saved character: ${character.name}`);
  }

  function handleAddWorldToken(tokenName) {
    const cleanName = tokenName.trim();

    if (!cleanName) return;

    setWorldTokens((currentTokens) => ({
      ...currentTokens,
      [cleanName]: {
        name: cleanName,
        label: humanizeTokenName(cleanName)
      }
    }));
  }

  function handleDeleteWorldToken(tokenName) {
    setWorldTokens((currentTokens) => {
      const nextTokens = { ...currentTokens };
      delete nextTokens[tokenName];
      return nextTokens;
    });

    setCells((currentCells) =>
      currentCells.map((cell) => {
        if (!cell.tokens?.includes(tokenName)) return cell;

        return {
          ...cell,
          tokens: []
        };
      })
    );

    if (selectedToken === tokenName) {
      setSelectedToken(null);
    }
  }

  return (
    <main
      className="viewport-frame"
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

            <TopCommandBar
              worldDetails={worldDetails}
              worldFeatures={worldFeatures}
              worldTheme={worldTheme}

              savedWorlds={savedWorlds}
              selectedSavedWorldId={selectedSavedWorldId}
              savedTestGames={savedTestGames}
              selectedSavedTestGameId={selectedSavedTestGameId}
              saveStatus={saveStatus}

              onWorldDetailsChange={handleWorldDetailsChange}
              onThemeChange={handleThemeChange}
              onToggleWorldFeature={handleToggleWorldFeature}
              onPieceSkinChange={handlePieceSkinChange}
              onCharacterDisplayModeChange={handleCharacterDisplayModeChange}

              onSaveWorld={handleSaveWorld}
              onLoadWorld={handleLoadWorld}
              onDeleteWorld={handleDeleteWorld}
              onExportWorld={handleExportWorld}
              onImportWorld={handleImportWorld}
              onSelectedSavedWorldChange={setSelectedSavedWorldId}

              onSaveTestGame={handleSaveTestGame}
              onLoadTestGame={handleLoadTestGame}
              onDeleteTestGame={handleDeleteTestGame}
              onSelectedSavedTestGameChange={setSelectedSavedTestGameId}
            />

            <LeftSidebar

              worldDetails={worldDetails}
              worldTheme={worldTheme}
              worldFeatures={worldFeatures}
              worldMechanics={worldMechanics}

              onClearSelections={clearAllSelections}

              onWorldDetailsChange={handleWorldDetailsChange}
              onThemeChange={handleThemeChange}
              onPieceSkinChange={handlePieceSkinChange}
              onCharacterDisplayModeChange={handleCharacterDisplayModeChange}

              onToggleWorldFeature={handleToggleWorldFeature}
              onTerrainListChange={handleTerrainListChange}
              onCounterSettingsChange={handleCounterSettingsChange}
              onConditionListChange={handleConditionListChange}

              characterLibrary={characterLibrary}
              onCharacterLibraryChange={setCharacterLibrary}
              characterUploadStatus={characterUploadStatus}
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
              onCharacterCsvUpload={handleCharacterCsvUpload}
              onSaveCharacter={handleSaveCharacter}
              onAddWorldToken={handleAddWorldToken}
              onDeleteWorldToken={handleDeleteWorldToken}

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
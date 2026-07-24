"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import TopCommandBar from "./TopCommandBar";
import LeftSidebar from "./LeftSidebar";
import Workspace from "./Workspace";
import RightPanel from "./RightPanel";
import PlayLeftSystemsRail from "./PlayLeftSystemsRail";
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

import {
  createAdvancedSystemsRuntime,
  normalizeWorldFeatures,
  normalizeWorldMechanics,
  paintFogCell,
  clearFogCell,
  applyFogToWholeBoard,
  tickTimers
} from "@/lib/worldSystems";

import {
  buildCharacterCsvFromLibrary,
  buildCharacterImportFromCSV,
  createDefaultCharacterFields,
  normalizeName
} from "@/lib/csv";

import {
  deleteLocalItem,
  downloadJsonFile,
  getLocalItemList,
  loadLocalItem,
  makeSafeFileName,
  readJsonFile,
  saveLocalItem
} from "@/lib/saveLoad";

import { isImageDataUrl, uploadDataUrlAsset } from "@/lib/assetStorage";
import { getAssetNameFromPortraitFilename } from "@/lib/portraitAssets";
import { hasSupabaseConfig, supabase } from "@/lib/supabaseClient";
import { getWorldComplexity, normalizeWorldComplexity, normalizeWorldTheme } from "@/lib/worldData";
import {
  getDisplayWorldName,
  UNNAMED_WORLD_LABEL
} from "@/lib/stageLayoutConfig";
import { uploadWorldAssets } from "@/lib/worldAssetStorage";
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
  moveOccupantForCreator,
  paintTerrainOnCell,
  placePieceOnCellForCreator,
  placeTokenOnCellForCreator,
  setCounterOnCell,
  toggleConditionOnCell,
  updateCellAtIndex
} from "@/lib/boardCellActions";

import { useResponsiveStageLayout } from "@/lib/useResponsiveStageLayout";
import { STAGE_DESIGN_HEIGHT, STAGE_DESIGN_WIDTH } from "@/lib/stageLayoutConfig";

import { useLocalCellHistory } from "@/lib/useLocalCellHistory";

const MAX_CELL_HISTORY = 30;

// **************************************************************
// WORLD CREATOR COMPONENT
// **************************************************************

export default function WorldCreator() {

  // STATE VARIABLES

  const [worldFeatures, setWorldFeatures] = useState(DEFAULT_WORLD_FEATURES);

  const [worldDetails, setWorldDetails] = useState({
    name: UNNAMED_WORLD_LABEL,
    description: "",
    rulesNotes: "",
    complexity: "Basic"
  });

  const [worldTheme, setWorldTheme] = useState(createDefaultWorldTheme());

  const [worldMechanics, setWorldMechanics] = useState(DEFAULT_WORLD_MECHANICS);
  const [systemsRuntime, setSystemsRuntime] = useState(null);
  const stageContentRef = useRef(null);

  const hasScrollablePlaySystems = useMemo(
    () => Boolean(normalizeWorldFeatures(worldFeatures).cardDecks),
    [worldFeatures]
  );

  const stageLayout = useResponsiveStageLayout({
    fallbackWidth: STAGE_DESIGN_WIDTH,
    fallbackHeight: STAGE_DESIGN_HEIGHT,
    contentRef: stageContentRef,
    measureContentHeight: hasScrollablePlaySystems
  });

  const [savedWorlds, setSavedWorlds] = useState([]);
  const [selectedSavedWorldId, setSelectedSavedWorldId] = useState("");

  const [savedTestGames, setSavedTestGames] = useState([]);
  const [selectedSavedTestGameId, setSelectedSavedTestGameId] = useState("");

  const [saveStatus, setSaveStatus] = useState("");
  const [onlineSaveStatus, setOnlineSaveStatus] = useState("");
  const [onlineWorldId, setOnlineWorldId] = useState(null);
  const [isSavingOnline, setIsSavingOnline] = useState(false);
  const [isSavingLocal, setIsSavingLocal] = useState(false);
  const [exitHref, setExitHref] = useState("/worlds");
  const universeBaselineRef = useRef(null);

  const [characterLibrary, setCharacterLibrary] = useState({});
  const [characterFields, setCharacterFields] = useState(() =>
    createDefaultCharacterFields()
  );
  const [portraitAssets, setPortraitAssets] = useState({});

  const [characterUploadStatus, setCharacterUploadStatus] = useState(
    "No character spreadsheet uploaded."
  );

  const [worldTokens, setWorldTokens] = useState({});

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
  const [selectedCounterBaseValue, setSelectedCounterBaseValue] = useState(null);
  const [counterSetValue, setCounterSetValue] = useState("3");

  const [selectedCondition, setSelectedCondition] = useState(null);
  const [selectedConditionAction, setSelectedConditionAction] = useState(null);

  const [selectedTerrain, setSelectedTerrain] = useState(null);
  const [selectedTerrainAction, setSelectedTerrainAction] = useState(null);
  const [selectedFogAction, setSelectedFogAction] = useState(null);

  const [activePiece, setActivePiece] = useState(null);
  const [pieceNames, setPieceNames] = useState(() => createPieceRecord(""));
  const [pieceNameLocked, setPieceNameLocked] = useState(() => createPieceRecord(false));

  useEffect(() => {
    setSystemsRuntime(
      createAdvancedSystemsRuntime({
        worldFeatures,
        worldMechanics,
        turnTeam: "white"
      })
    );
  }, [
    worldFeatures,
    worldMechanics.cardDecks,
    worldMechanics.diceSystem,
    worldMechanics.timers,
    worldMechanics.objectives
  ]);

  useEffect(() => {
    if (!systemsRuntime?.timers || !systemsRuntime.timers.isRunning) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setSystemsRuntime((currentRuntime) => {
        if (!currentRuntime?.timers?.isRunning) {
          return currentRuntime;
        }

        return {
          ...currentRuntime,
          timers: tickTimers(currentRuntime.timers, "white")
        };
      });
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [systemsRuntime?.timers?.isRunning]);

  function handleToggleTimer() {
    setSystemsRuntime((currentRuntime) => {
      if (!currentRuntime?.timers) {
        return currentRuntime;
      }

      return {
        ...currentRuntime,
        timers: {
          ...currentRuntime.timers,
          isRunning: !currentRuntime.timers.isRunning
        }
      };
    });
  }

  useEffect(() => {
    refreshSavedLists();
  }, []);

  //  SAVE DATA

  function buildUniverseSnapshotPayload({
    details = worldDetails,
    theme = worldTheme,
    mechanics = worldMechanics,
    features = worldFeatures,
    library = characterLibrary,
    fields = characterFields,
    portraits = portraitAssets,
    tokens = worldTokens
  } = {}) {
    return {
      version: 2,
      worldDetails: details,
      worldTheme: theme,
      worldMechanics: normalizeWorldMechanics(mechanics),
      worldFeatures: normalizeWorldFeatures(features),
      characterLibrary: library,
      characterFields: fields,
      portraitAssets: portraits,
      worldTokens: tokens
    };
  }

  function createWorldSaveData(detailsOverride = null) {
    return buildUniverseSnapshotPayload({
      details: detailsOverride
        ? { ...worldDetails, ...detailsOverride }
        : worldDetails
    });
  }

  function captureUniverseBaseline(snapshotPayload = null) {
    const payload = snapshotPayload || createWorldSaveData();
    universeBaselineRef.current = JSON.stringify(payload);
  }

  function hasUnsavedUniverseChanges() {
    if (universeBaselineRef.current == null) {
      return false;
    }

    return JSON.stringify(createWorldSaveData()) !== universeBaselineRef.current;
  }

  useEffect(() => {
    if (universeBaselineRef.current == null) {
      captureUniverseBaseline();
    }
    // Capture the initial blank universe once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function getOnlineWorldFields(worldData) {
    const details = worldData.worldDetails || {};

    const name = getDisplayWorldName(details.name);
    const description = details.description || "";
    const rulesNotes = details.rulesNotes || "";

    return {
      name,
      description,
      rules_notes: rulesNotes,
      complexity_label: getWorldComplexity({ data: worldData })
    };
  }

  function getTextByteSize(text) {
    if (typeof TextEncoder !== "undefined") {
      return new TextEncoder().encode(text).length;
    }

    return text.length;
  }

  function formatDataSize(bytes) {
    if (bytes < 1024) {
      return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  function findEmbeddedImageDataUrlPaths(value, currentPath = "worldData") {
    if (typeof value === "string") {
      return value.startsWith("data:image/") ? [currentPath] : [];
    }

    if (Array.isArray(value)) {
      return value.flatMap((item, index) =>
        findEmbeddedImageDataUrlPaths(item, `${currentPath}[${index}]`)
      );
    }

    if (value && typeof value === "object") {
      return Object.entries(value).flatMap(([key, nestedValue]) =>
        findEmbeddedImageDataUrlPaths(nestedValue, `${currentPath}.${key}`)
      );
    }

    return [];
  }

  function createOnlineWorldDataAudit(worldData) {
    const jsonText = JSON.stringify(worldData);
    const embeddedImagePaths = findEmbeddedImageDataUrlPaths(worldData);

    return {
      sizeBytes: getTextByteSize(jsonText),
      sizeLabel: formatDataSize(getTextByteSize(jsonText)),
      embeddedImageCount: embeddedImagePaths.length,
      embeddedImagePaths
    };
  }

  function getOnlineWorldAuditMessage(audit) {
    if (audit.embeddedImageCount === 0) {
      return `Online data: ${audit.sizeLabel}. No embedded images left.`;
    }

    return `Online data: ${audit.sizeLabel}. ${audit.embeddedImageCount} embedded image(s) still inside world_data.`;
  }

  async function uploadCharacterPortraitsForOnlineSave({
    characterLibrary,
    userId,
    worldId
  }) {
    if (!characterLibrary) {
      return characterLibrary;
    }

    const isLibraryArray = Array.isArray(characterLibrary);

    const characterEntries = isLibraryArray
      ? characterLibrary.map((character, index) => [String(index), character])
      : Object.entries(characterLibrary);

    let uploadedPortraitCount = 0;

    const nextCharacterEntries = [];

    for (const [characterKey, character] of characterEntries) {
      if (!character || typeof character !== "object") {
        nextCharacterEntries.push([characterKey, character]);
        continue;
      }

      const portrait = character.portrait;

      if (!isImageDataUrl(portrait)) {
        nextCharacterEntries.push([characterKey, character]);
        continue;
      }

      uploadedPortraitCount += 1;

      setOnlineSaveStatus(
        `Uploading character portrait ${uploadedPortraitCount}...`
      );

      const portraitUpload = await uploadDataUrlAsset({
        userId,
        worldId,
        assetType: "character-portraits",
        assetName: `${characterKey}-${character.name || "character"}`,
        dataUrl: portrait
      });

      nextCharacterEntries.push([
        characterKey,
        {
          ...character,
          portrait: portraitUpload.publicUrl || portrait
        }
      ]);
    }

    if (isLibraryArray) {
      return nextCharacterEntries.map(([, character]) => character);
    }

    return Object.fromEntries(nextCharacterEntries);
  }

  async function uploadPortraitAssetsForOnlineSave({
    portraitAssets: assets,
    userId,
    worldId
  }) {
    if (!assets || typeof assets !== "object") {
      return assets || {};
    }

    const nextAssets = { ...assets };
    let uploadedAssetCount = 0;

    for (const [filename, assetValue] of Object.entries(assets)) {
      if (!isImageDataUrl(assetValue)) {
        continue;
      }

      uploadedAssetCount += 1;

      setOnlineSaveStatus(
        `Uploading portrait library image ${uploadedAssetCount}...`
      );

      const assetUpload = await uploadDataUrlAsset({
        userId,
        worldId,
        assetType: "character-portraits",
        assetName: getAssetNameFromPortraitFilename(filename),
        dataUrl: assetValue
      });

      if (assetUpload.publicUrl) {
        nextAssets[filename] = assetUpload.publicUrl;
      }
    }

    return nextAssets;
  }

  async function uploadTerrainImagesForOnlineSave({
    worldMechanics,
    userId,
    worldId
  }) {
    if (!worldMechanics) {
      return worldMechanics;
    }

    const terrains = Array.isArray(worldMechanics.terrains)
      ? worldMechanics.terrains
      : [];

    let uploadedTerrainCount = 0;

    const nextTerrains = [];

    for (const [terrainIndex, terrain] of terrains.entries()) {
      if (!terrain || typeof terrain !== "object") {
        nextTerrains.push(terrain);
        continue;
      }

      const terrainImage = terrain.image;

      if (terrain.fillType !== "image" || !isImageDataUrl(terrainImage)) {
        nextTerrains.push(terrain);
        continue;
      }

      uploadedTerrainCount += 1;

      setOnlineSaveStatus(
        `Uploading terrain image ${uploadedTerrainCount}...`
      );

      const terrainUpload = await uploadDataUrlAsset({
        userId,
        worldId,
        assetType: "terrain-images",
        assetName: `${terrain.key || terrainIndex}-${terrain.label || "terrain"}`,
        dataUrl: terrainImage
      });

      nextTerrains.push({
        ...terrain,
        image: terrainUpload.publicUrl || terrainImage
      });
    }

    return {
      ...worldMechanics,
      terrains: nextTerrains
    };
  }

  async function uploadPieceSkinsForOnlineSave({
    worldTheme,
    userId,
    worldId
  }) {
    if (!worldTheme) {
      return worldTheme;
    }

    const pieceSkins = worldTheme.pieceSkins || {};

    const nextPieceSkins = {
      ...pieceSkins,
      white: {
        ...(pieceSkins.white || {})
      },
      black: {
        ...(pieceSkins.black || {})
      }
    };

    let uploadedPieceSkinCount = 0;

    for (const teamKey of ["white", "black"]) {
      const teamPieceSkins = nextPieceSkins[teamKey] || {};

      for (const [pieceKey, pieceSkinImage] of Object.entries(teamPieceSkins)) {
        if (!isImageDataUrl(pieceSkinImage)) {
          continue;
        }

        uploadedPieceSkinCount += 1;

        setOnlineSaveStatus(
          `Uploading piece skin ${uploadedPieceSkinCount}...`
        );

        const pieceSkinUpload = await uploadDataUrlAsset({
          userId,
          worldId,
          assetType: "piece-skins",
          assetName: `${teamKey}-${pieceKey}`,
          dataUrl: pieceSkinImage
        });

        teamPieceSkins[pieceKey] = pieceSkinUpload.publicUrl || pieceSkinImage;
      }

      nextPieceSkins[teamKey] = teamPieceSkins;
    }

    return {
      ...worldTheme,
      pieceSkins: nextPieceSkins
    };
  }

  async function prepareWorldDataForOnlineSave({ worldData, userId, worldId }) {
    const originalWorldTheme = worldData.worldTheme || {};
    const originalPieceSkins = originalWorldTheme.pieceSkins || {};

    const nextWorldData = {
      ...worldData,

      worldTheme: {
        ...originalWorldTheme,
        pieceSkins: {
          ...originalPieceSkins,
          white: {
            ...(originalPieceSkins.white || {})
          },
          black: {
            ...(originalPieceSkins.black || {})
          }
        }
      },

      worldMechanics: {
        ...(worldData.worldMechanics || {}),
        terrains: Array.isArray(worldData.worldMechanics?.terrains)
          ? [...worldData.worldMechanics.terrains]
          : []
      },

      characterLibrary: Array.isArray(worldData.characterLibrary)
        ? [...worldData.characterLibrary]
        : {
          ...(worldData.characterLibrary || {})
        }
    };

    const backgroundImage = nextWorldData.worldTheme.backgroundImage;

    if (backgroundImage) {
      setOnlineSaveStatus("Uploading background image...");

      const backgroundUpload = await uploadDataUrlAsset({
        userId,
        worldId,
        assetType: "backgrounds",
        assetName: "world-background",
        dataUrl: backgroundImage
      });

      if (backgroundUpload.publicUrl) {
        nextWorldData.worldTheme.backgroundImage = backgroundUpload.publicUrl;
      }
    }

    const boardSkinImage = nextWorldData.worldTheme.boardSkinImage;

    if (boardSkinImage) {
      setOnlineSaveStatus("Uploading board skin...");

      const boardSkinUpload = await uploadDataUrlAsset({
        userId,
        worldId,
        assetType: "board-skins",
        assetName: "board-skin",
        dataUrl: boardSkinImage
      });

      if (boardSkinUpload.publicUrl) {
        nextWorldData.worldTheme.boardSkinImage = boardSkinUpload.publicUrl;
      }
    }

    nextWorldData.characterLibrary =
      await uploadCharacterPortraitsForOnlineSave({
        characterLibrary: nextWorldData.characterLibrary,
        userId,
        worldId
      });

    nextWorldData.portraitAssets =
      await uploadPortraitAssetsForOnlineSave({
        portraitAssets: nextWorldData.portraitAssets,
        userId,
        worldId
      });

    nextWorldData.worldMechanics =
      await uploadTerrainImagesForOnlineSave({
        worldMechanics: nextWorldData.worldMechanics,
        userId,
        worldId
      });

    nextWorldData.worldTheme =
      await uploadPieceSkinsForOnlineSave({
        worldTheme: nextWorldData.worldTheme,
        userId,
        worldId
      });

    return nextWorldData;
  }

  function createTestGameSaveData() {
    return {
      version: 2,
      worldDetails,

      // World template at the moment of testing.
      worldData: createWorldSaveData(),

      // Actual test-board state.
      cells,

      // Test-game character assignments.
      // These are NOT part of the universe template.
      pieceNames,
      pieceNameLocked
    };
  }

  function applyWorldSaveData(worldData) {
    if (!worldData) return;

    const loadedDetails = worldData.worldDetails || {};

    const nextDetails = {
      name: loadedDetails.name || "Unnamed Universe",
      description: loadedDetails.description || "",
      rulesNotes: loadedDetails.rulesNotes || "",
      ...loadedDetails,
      complexity: normalizeWorldComplexity(loadedDetails.complexity)
    };

    const defaultTheme = createDefaultWorldTheme();
    const nextTheme = normalizeWorldTheme(
      worldData.worldTheme || {},
      defaultTheme
    );
    const nextMechanics = normalizeWorldMechanics(worldData.worldMechanics);
    const nextFeatures = normalizeWorldFeatures(worldData.worldFeatures);
    const nextLibrary = worldData.characterLibrary || {};
    const nextFields = Array.isArray(worldData.characterFields)
      ? worldData.characterFields
      : createDefaultCharacterFields();
    const nextPortraits =
      worldData.portraitAssets && typeof worldData.portraitAssets === "object"
        ? { ...worldData.portraitAssets }
        : {};
    const nextTokens = worldData.worldTokens || {};

    setWorldDetails(nextDetails);
    setWorldTheme(nextTheme);
    setWorldMechanics(nextMechanics);
    setWorldFeatures(nextFeatures);
    setCharacterLibrary(nextLibrary);
    setCharacterFields(nextFields);
    setPortraitAssets(nextPortraits);
    setWorldTokens(nextTokens);

    captureUniverseBaseline(
      buildUniverseSnapshotPayload({
        details: nextDetails,
        theme: nextTheme,
        mechanics: nextMechanics,
        features: nextFeatures,
        library: nextLibrary,
        fields: nextFields,
        portraits: nextPortraits,
        tokens: nextTokens
      })
    );

    // Important:
    // Loading a world template should not restore old playtest character assignments.
    // Those belong to test games / future play sessions, not to the universe itself.
    setPieceNames(createPieceRecord(""));
    setPieceNameLocked(createPieceRecord(false));

    setMovingPiece(null);
    setSelectedTeam(null);
    setSelectedPiece(null);
    setSelectedToken(null);
    setActivePiece(null);
    clearLocalCellHistory();
  }

  function downloadTextFile(fileName, text, mimeType = "text/plain") {
    const blob = new Blob([text], { type: mimeType });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;

    document.body.appendChild(link);
    link.click();

    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function handleExportCharacterCsv() {
    const csvText = buildCharacterCsvFromLibrary(
      characterLibrary,
      characterFields
    );

    const fileName = `${makeSafeFileName(worldDetails.name)}-characters.csv`;

    downloadTextFile(fileName, csvText, "text/csv;charset=utf-8");
    setCharacterUploadStatus(`Character CSV exported: ${fileName}`);
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
    setSaveStatus(`Universe exported: ${fileName}`);
  }

  async function handleImportWorld(file) {
    try {
      const importedWorld = await readJsonFile(file);

      const worldData =
        importedWorld?.type === "chess-multiverse-world"
          ? importedWorld.data
          : importedWorld;

      if (!worldData || typeof worldData !== "object") {
        setSaveStatus("Import failed: this file does not contain universe data.");
        return;
      }

      applyWorldSaveData(worldData);
      setSaveStatus("Universe imported. Review it, then click Save Universe if you want to store it locally.");
    } catch (error) {
      setSaveStatus(error.message || "Import failed.");
    }
  }

  // SMALL SELECTION/HELPER HANDLERS

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

  function handleWorldDetailsPatch(patch) {
    setWorldDetails((currentDetails) => ({
      ...currentDetails,
      ...patch
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

  function handleCardDecksChange(nextCardDecks) {
    setWorldMechanics((currentMechanics) => ({
      ...currentMechanics,
      cardDecks: nextCardDecks
    }));
  }

  function handleDiceSystemChange(nextDiceSystem) {
    setWorldMechanics((currentMechanics) => ({
      ...currentMechanics,
      diceSystem: nextDiceSystem
    }));
  }

  function handleTimersChange(nextTimers) {
    setWorldMechanics((currentMechanics) => ({
      ...currentMechanics,
      timers: nextTimers
    }));
  }

  function handleObjectivesChange(nextObjectives) {
    setWorldMechanics((currentMechanics) => ({
      ...currentMechanics,
      objectives: nextObjectives
    }));
  }

  function handleFogOfWarChange(nextFogOfWar) {
    setWorldMechanics((currentMechanics) => ({
      ...currentMechanics,
      fogOfWar: nextFogOfWar
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
    setSelectedCounterBaseValue(null);

    setSelectedTeam(null);
    setSelectedPiece(null);
    setSelectedToken(null);

    setSelectedCondition(null);
    setSelectedConditionAction(null);

    setSelectedTerrain(null);
    setSelectedTerrainAction(null);

    setMovingPiece(null);
  }

  function handleSelectBaseCounter(counterKey, baseValue = 0) {
    setSelectedCounterKey(counterKey);
    setSelectedCounterBaseValue(Number(baseValue) || 0);
    setSelectedCounterAction("base");
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

  function handleSelectSetCounter(counterKey) {
    setSelectedCounterKey(counterKey);
    setSelectedCounterAction("set");
    setSelectedCounterDelta(null);
    setSelectedCounterBaseValue(null);

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
    setSelectedCounterBaseValue(null);

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

  function updateDefaultFogCells(updater) {
    setWorldMechanics((currentMechanics) => {
      const currentFog = currentMechanics.fogOfWar || {};
      const currentCells = Array.isArray(currentFog.defaultFogCells)
        ? currentFog.defaultFogCells
        : [];

      return {
        ...currentMechanics,
        fogOfWar: {
          ...currentFog,
          defaultFogCells: updater(currentCells)
        }
      };
    });
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

    updateDefaultFogCells(() => applyFogToWholeBoard(8));
    clearFogSelections();
  }

  function handleClearAllFog() {
    if (!worldFeatures.fogOfWar) return;

    updateDefaultFogCells(() => []);
    clearFogSelections();
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

  function getUniverseSaveBlocker(details = worldDetails) {
    const description = String(details?.description || "").trim();
    const rulesNotes = String(details?.rulesNotes || "").trim();

    if (!description && !rulesNotes) {
      return "Add a description and rules summary before saving this universe.";
    }

    if (!description) {
      return "Add a description before saving this universe.";
    }

    if (!rulesNotes) {
      return "Add a rules summary before saving this universe.";
    }

    return "";
  }

  function handleSaveWorld() {
    if (isSavingLocal || isSavingOnline) {
      setSaveStatus("Please wait for the current save to finish.");
      return;
    }

    const saveBlocker = getUniverseSaveBlocker();

    if (saveBlocker) {
      setSaveStatus(saveBlocker);
      return;
    }

    setIsSavingLocal(true);
    setSaveStatus("Saving universe locally...");

    try {
      const worldData = createWorldSaveData();
      const savedWorld = saveLocalItem(
        "worlds",
        worldDetails.name,
        worldData
      );

      setSelectedSavedWorldId(savedWorld.id);
      refreshSavedLists();
      captureUniverseBaseline(worldData);
      setSaveStatus(`Local backup saved: ${savedWorld.name}`);
    } catch (error) {
      console.error("Local world save failed:", error);
      setSaveStatus("Could not save this universe locally.");
    } finally {
      setIsSavingLocal(false);
    }
  }

  async function handleSaveWorldOnline(
    detailsOverride = null,
    options = {}
  ) {
    const { skipDescriptionGate = false } = options;

    if (!hasSupabaseConfig() || !supabase) {
      setOnlineSaveStatus("Supabase is not configured.");
      return false;
    }

    if (isSavingOnline || isSavingLocal) {
      setOnlineSaveStatus("Please wait for the current save to finish.");
      return false;
    }

    const nextDetails = detailsOverride
      ? { ...worldDetails, ...detailsOverride }
      : worldDetails;

    if (!skipDescriptionGate) {
      const saveBlocker = getUniverseSaveBlocker(nextDetails);

      if (saveBlocker) {
        setOnlineSaveStatus(saveBlocker);
        return false;
      }
    }

    if (detailsOverride) {
      handleWorldDetailsPatch(detailsOverride);
    }

    setIsSavingOnline(true);
    setOnlineSaveStatus(
      skipDescriptionGate
        ? "Saving current changes..."
        : "Checking account..."
    );

    try {
      const {
        data: { user },
        error: userError
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setOnlineSaveStatus("Please sign in before saving online.");
        return false;
      }

      const targetOnlineWorldId = onlineWorldId || crypto.randomUUID();

      const rawWorldData = createWorldSaveData(detailsOverride);

      const worldData = await prepareWorldDataForOnlineSave({
        worldData: rawWorldData,
        userId: user.id,
        worldId: targetOnlineWorldId
      });

      const onlineFields = getOnlineWorldFields(worldData);

      const onlineAudit = createOnlineWorldDataAudit(worldData);

      if (onlineAudit.embeddedImageCount > 0) {
        console.warn(
          "Embedded images still inside online universe_data:",
          onlineAudit.embeddedImagePaths
        );
      }

      const rowPayload = {
        id: targetOnlineWorldId,
        owner_id: user.id,
        name: onlineFields.name,
        slug: null,
        description: onlineFields.description,
        rules_notes: onlineFields.rules_notes,
        world_data: worldData,
        is_public: false,
        complexity_label: onlineFields.complexity_label,
        updated_at: new Date().toISOString()
      };

      setOnlineSaveStatus("Saving universe data online...");

      const { data: savedWorld, error } = await supabase
        .from("worlds")
        .upsert(rowPayload, {
          onConflict: "id"
        })
        .select("*")
        .single();

      if (error) {
        setOnlineSaveStatus(error.message);
        return false;
      }

      setOnlineWorldId(savedWorld.id);
      captureUniverseBaseline(rawWorldData);
      setOnlineSaveStatus(
        `Universe saved: ${savedWorld.name}. ${getOnlineWorldAuditMessage(onlineAudit)}`
      );
      return true;
    } catch (error) {
      console.error("Online world save failed:", error);
      setOnlineSaveStatus("Could not reach Supabase to save this universe.");
      return false;
    } finally {
      setIsSavingOnline(false);
    }
  }

  async function handleQuietSaveWorldOnline() {
    return handleSaveWorldOnline(null, { skipDescriptionGate: true });
  }

  function handleLoadWorld() {
    const savedWorld = loadLocalItem("worlds", selectedSavedWorldId);

    if (!savedWorld) {
      setSaveStatus("Choose a saved universe first.");
      return;
    }

    applyWorldSaveData(savedWorld.data);

    setSaveStatus(`Local backup loaded: ${savedWorld.name}. Board setup unchanged.`);
  }

  useEffect(() => {
    async function loadWorldFromUrl() {
      const searchParams = new URLSearchParams(window.location.search);

      const localWorldIdFromUrl = searchParams.get("world");
      const onlineWorldIdFromUrl = searchParams.get("onlineWorld");

      if (searchParams.get("from") === "account") {
        setExitHref("/account");
      }

      if (localWorldIdFromUrl) {
        const savedWorld = loadLocalItem("worlds", localWorldIdFromUrl);

        if (!savedWorld) {
          setSaveStatus("Could not find that local universe.");
          return;
        }

        applyWorldSaveData(savedWorld.data);
        setSelectedSavedWorldId(savedWorld.id);
        refreshSavedLists();

        setSaveStatus(`Universe loaded from Library: ${savedWorld.name}`);

        window.history.replaceState({}, "", window.location.pathname);
        return;
      }

      if (onlineWorldIdFromUrl) {
        if (!hasSupabaseConfig() || !supabase) {
          setSaveStatus("Supabase is not configured.");
          return;
        }

        setSaveStatus("Loading online universe…");

        try {
          const {
            data: { user },
            error: userError
          } = await supabase.auth.getUser();

          if (userError || !user) {
            setSaveStatus("Please sign in before opening online universes.");
            return;
          }

          const { data: onlineWorld, error } = await supabase
            .from("worlds")
            .select("id, name, world_data, owner_id")
            .eq("id", onlineWorldIdFromUrl)
            .eq("owner_id", user.id)
            .single();

          if (error || !onlineWorld) {
            setSaveStatus(
              error?.message || "Could not find that online universe."
            );
            return;
          }

          applyWorldSaveData(onlineWorld.world_data);
          setOnlineWorldId(onlineWorld.id);

          setSaveStatus(`Online universe loaded: ${onlineWorld.name}`);

          window.history.replaceState({}, "", window.location.pathname);
        } catch (error) {
          console.error("Online world load failed:", error);
          setSaveStatus("Could not reach Supabase to load this online universe.");
        }
      }
    }

    loadWorldFromUrl();
  }, []);

  function handleDeleteWorld() {
    if (!selectedSavedWorldId) {
      setSaveStatus("Choose a saved universe to delete.");
      return;
    }

    deleteLocalItem("worlds", selectedSavedWorldId);

    setSelectedSavedWorldId("");
    refreshSavedLists();
    setSaveStatus("Local backup deleted.");
  }

  function handleSaveTestGame() {
    const savedGame = saveLocalItem(
      "test-games",
      `${worldDetails.name || "Untitled Universe"} Test Game`,
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

    // Restore test-game assignments separately from the universe template.
    // The fallback keeps older saved test games working.
    setPieceNames(
      gameData.pieceNames ||
      gameData.worldData?.pieceNames ||
      createPieceRecord("")
    );

    setPieceNameLocked(
      gameData.pieceNameLocked ||
      gameData.worldData?.pieceNameLocked ||
      createPieceRecord(false)
    );

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
    if (!team || !pieceKey) return;

    setSelectedTeam(team);
    setSelectedPiece(pieceKey);

    setSelectedToken(null);

    setSelectedCounterDelta(null);
    setSelectedCounterAction(null);

    setSelectedCondition(null);
    setSelectedConditionAction(null);

    clearTerrainSelections();

    setMovingPiece(null);
    setSelectedBoardAction(null);

    // Generic pieces are placement templates.
    // The real editable character card opens after the piece is placed on the board.
    if (pieceKey === GENERIC_PIECE_KEY) {
      setActivePiece(null);
      return;
    }

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

  // MAIN BOARD CLICK HANDLER

  function handleCellClick(index, event) {
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

    if (selectedCounterAction === "base") {
      updateCellsWithHistory((currentCells) =>
        updateCellAtIndex(currentCells, index, (targetCell) => {
          if (!cellHasOccupant(targetCell)) return;

          setCounterOnCell(
            targetCell,
            selectedCounterKey,
            selectedCounterBaseValue
          );
        })
      );

      if (!event?.shiftKey) {
        setSelectedCounterAction(null);
        setSelectedCounterBaseValue(null);
      }

      return;
    }

    if (selectedCounterAction === "set") {
      updateCellsWithHistory((currentCells) =>
        updateCellAtIndex(currentCells, index, (targetCell) => {
          if (!cellHasOccupant(targetCell)) return;

          setCounterOnCell(
            targetCell,
            selectedCounterKey,
            counterSetValue
          );
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
      updateDefaultFogCells((currentCells) => paintFogCell(currentCells, index));

      if (!event?.shiftKey) {
        setSelectedFogAction(null);
      }

      return;
    }

    if (selectedFogAction === "clear") {
      updateDefaultFogCells((currentCells) => clearFogCell(currentCells, index));

      if (!event?.shiftKey) {
        setSelectedFogAction(null);
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

          placeTokenOnCellForCreator(targetCell, selectedToken);

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

      const placedPieceKey = resolvePlacementPieceKey(selectedPiece);

      updateCellsWithHistory((currentCells) => {
        const nextCells = currentCells.map(cloneCell);
        const targetCell = nextCells[index];

        placePieceOnCellForCreator(targetCell, placedPieceKey, selectedTeam);

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
    updateCellsWithHistory((currentCells) =>
      moveOccupantForCreator(currentCells, movingPiece, index)
    );

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
      const importResult = buildCharacterImportFromCSV(csvText);

      const nextCharacterLibrary = importResult.characterLibrary;
      const nextCharacterFields = importResult.characterFields;

      const characterCount = Array.isArray(nextCharacterLibrary)
        ? nextCharacterLibrary.length
        : Object.keys(nextCharacterLibrary || {}).length;

      const customFieldCount = nextCharacterFields.filter(
        (field) => !field.core
      ).length;

      setCharacterLibrary(nextCharacterLibrary);
      setCharacterFields(nextCharacterFields);

      setCharacterUploadStatus(
        characterCount > 0
          ? `${characterCount} characters imported. ${customFieldCount} custom field(s) detected. Previous roster and fields replaced.`
          : "No valid characters found. Check the CSV headers."
      );
    };

    reader.readAsText(file);
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

  function handleSaveCharacter(character) {
    setCharacterLibrary((currentLibrary) => {
      const cleanName = normalizeName(character.name);

      if (Array.isArray(currentLibrary)) {
        const existingIndex = currentLibrary.findIndex(
          (existingCharacter) =>
            normalizeName(existingCharacter.name) === cleanName
        );

        if (existingIndex >= 0) {
          return currentLibrary.map((existingCharacter, index) =>
            index === existingIndex ? character : existingCharacter
          );
        }

        return [...currentLibrary, character];
      }

      return {
        ...currentLibrary,
        [cleanName]: character
      };
    });

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
      <div
        className={
          hasScrollablePlaySystems
            ? "game-stage game-stage--scrollable"
            : "game-stage"
        }
      >

        <div
          className="stage-scale-frame"
          style={{
            width: `${stageLayout.width}px`,
            height: `${stageLayout.height}px`
          }}
        >
          <div
            ref={stageContentRef}
            className={[
              "stage-content",
              hasScrollablePlaySystems ? "stage-content--scrollable" : ""
            ]
              .filter(Boolean)
              .join(" ")}
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

              onSaveWorldOnline={handleSaveWorldOnline}
              onQuietSaveWorldOnline={handleQuietSaveWorldOnline}
              hasUnsavedChanges={hasUnsavedUniverseChanges}
              onlineSaveStatus={onlineSaveStatus}
              isSavingOnline={isSavingOnline}
              isSavingLocal={isSavingLocal}
              exitHref={exitHref}

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
              onCardDecksChange={handleCardDecksChange}
              onDiceSystemChange={handleDiceSystemChange}
              onTimersChange={handleTimersChange}
              onObjectivesChange={handleObjectivesChange}
              onFogOfWarChange={handleFogOfWarChange}

              characterLibrary={characterLibrary}
              characterFields={characterFields}
              portraitAssets={portraitAssets}
              onCharacterLibraryChange={setCharacterLibrary}
              onCharacterFieldsChange={setCharacterFields}
              onPortraitAssetsChange={setPortraitAssets}
              characterUploadStatus={characterUploadStatus}

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
              onCharacterCsvUpload={handleCharacterCsvUpload}
              onCharacterCsvExport={handleExportCharacterCsv}
              onSaveCharacter={handleSaveCharacter}

              onSelectCounterDelta={handleSelectCounterDelta}
              onSelectBaseCounter={handleSelectBaseCounter}
              onSelectSetCounter={handleSelectSetCounter}
              onSelectClearCounter={handleSelectClearCounter}

              onSelectCondition={handleSelectCondition}
              onSelectClearConditions={handleSelectClearConditions}

              onSelectTerrain={handleSelectTerrain}
              onSelectClearTerrain={handleSelectClearTerrain}
              onApplyTerrainToWholeBoard={handleApplyTerrainToWholeBoard}
            />

            <aside className="stage-rail stage-rail-left" aria-label="Board systems">
              <PlayLeftSystemsRail
                worldFeatures={worldFeatures}
                systemsRuntime={systemsRuntime}
                onSystemsRuntimeChange={setSystemsRuntime}
              />
            </aside>

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
              turnTeam="white"
              isPlayMode={true}
              fogCells={worldMechanics?.fogOfWar?.defaultFogCells || []}
              viewerTeam=""
              selectedBoardAction={selectedBoardAction}
              onToggleCharacterDisplayMode={handleToggleCharacterDisplayMode}
              onStandardSetup={handleStandardSetup}
              onUndo={handleUndo}
              onRedo={handleRedo}
              onDeletePiece={handleDeleteSelectedPiece}
              onClearBoard={handleClearBoard}
              onCellClick={handleCellClick}
              onClearSelections={clearAllSelections}
            />

            <RightPanel
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
              timers={
                worldFeatures?.timers ? systemsRuntime?.timers || null : null
              }
              onToggleTimer={handleToggleTimer}
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

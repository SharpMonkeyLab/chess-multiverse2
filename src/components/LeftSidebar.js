"use client";

import { useEffect, useMemo, useState } from "react";

import { getCounterListFromMechanics } from "@/lib/defaultWorld";
import {
  DEFAULT_TOOL_SHELF_ORDER,
  getToolShelfOrder,
  isDefaultToolShelfOrder,
  normalizeToolShelfOrder,
  resetToolShelfOrder,
  saveToolShelfOrder
} from "@/lib/userPreferences";
import CharacterEditor from "./CharacterEditor";
import TerrainEditor from "./TerrainEditor";
import CounterEditor from "./CounterEditor";
import ConditionEditor from "./ConditionEditor";
import {
  DeckSystemEditor,
  DiceSystemEditor,
  TimerSystemEditor,
  ObjectivesEditor,
  FogOfWarEditor
} from "./AdvancedSystemEditors";

function parseCounterAmount(value) {
  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? numberValue : null;
}

function parseCounterAmountFromLabel(label) {
  if (!label) return null;

  const cleanedLabel = String(label).replace(/[^0-9.+-]/g, "");
  const numberValue = Number(cleanedLabel);

  return Number.isFinite(numberValue) && numberValue !== 0
    ? numberValue
    : null;
}

function getCounterActionAmount(counter, actionType) {
  if (actionType === "decrease") {
    const directAmount = parseCounterAmount(counter.decreaseAmount);

    if (directAmount !== null && directAmount !== 0) {
      return -Math.abs(directAmount);
    }

    const labelAmount = parseCounterAmountFromLabel(counter.decreaseLabel);

    if (labelAmount !== null) {
      return labelAmount < 0 ? labelAmount : -Math.abs(labelAmount);
    }

    return -1;
  }

  const directAmount = parseCounterAmount(counter.increaseAmount);

  if (directAmount !== null && directAmount !== 0) {
    return Math.abs(directAmount);
  }

  const labelAmount = parseCounterAmountFromLabel(counter.increaseLabel);

  if (labelAmount !== null) {
    return labelAmount > 0 ? labelAmount : Math.abs(labelAmount);
  }

  return 1;
}

function getCounterActionLabel(counter, actionType) {
  if (actionType === "decrease") {
    return counter.decreaseLabel || String(getCounterActionAmount(counter, "decrease"));
  }

  const amount = getCounterActionAmount(counter, "increase");

  return counter.increaseLabel || `+${amount}`;
}

function ToolModuleHeader({
  title,
  moduleKey,
  canReorder,
  canMoveUp,
  canMoveDown,
  onMove,
  onDragStart,
  onDragEnd
}) {
  return (
    <div className="play-tool-module-header">
      {canReorder ? (
        <button
          type="button"
          className="play-tool-module-grip"
          draggable
          title="Drag to reorder"
          aria-label={`Drag to reorder ${title}`}
          onDragStart={(event) => onDragStart(event, moduleKey)}
          onDragEnd={onDragEnd}
        >
          ⠿
        </button>
      ) : (
        <span className="play-tool-module-grip" aria-hidden="true" />
      )}
      <h2>{title}</h2>
      {canReorder ? (
        <div className="play-tool-module-move">
          <button
            type="button"
            disabled={!canMoveUp}
            aria-label={`Move ${title} up`}
            onClick={() => onMove(moduleKey, -1)}
          >
            ▲
          </button>
          <button
            type="button"
            disabled={!canMoveDown}
            aria-label={`Move ${title} down`}
            onClick={() => onMove(moduleKey, 1)}
          >
            ▼
          </button>
        </div>
      ) : (
        <span aria-hidden="true" />
      )}
    </div>
  );
}

export default function LeftSidebar({
  isPlayMode = false,
  prefsUserId = "guest",

  worldDetails,
  worldTheme,
  worldFeatures,
  worldMechanics,

  onClearSelections,

  onWorldDetailsChange,
  onThemeChange,
  onPieceSkinChange,
  onCharacterDisplayModeChange,

  onToggleWorldFeature,
  onTerrainListChange,
  onCounterSettingsChange,
  onConditionListChange,
  onCardDecksChange,
  onDiceSystemChange,
  onTimersChange,
  onObjectivesChange,
  onFogOfWarChange,

  characterLibrary,
  characterFields,
  portraitAssets = {},
  onCharacterLibraryChange,
  onCharacterFieldsChange,
  onPortraitAssetsChange,
  characterUploadStatus,

  selectedCounterDelta,
  selectedCounterAction,
  counterSetValue,
  selectedCounterKey,

  selectedCondition,
  selectedConditionAction,

  selectedTerrain,
  selectedTerrainAction,

  selectedFogAction,
  onSelectPaintFog,
  onSelectClearFog,
  onApplyFogToWholeBoard,
  onClearAllFog,

  onCounterSetValueChange,
  onCharacterCsvUpload,
  onCharacterCsvExport,
  onSaveCharacter,

  onSelectCounterDelta,
  onSelectSetCounter,
  onSelectClearCounter,

  onSelectCondition,
  onSelectClearConditions,

  onSelectTerrain,
  onSelectClearTerrain,
  onApplyTerrainToWholeBoard,
}) {

  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [moduleOrder, setModuleOrder] = useState(() => [
    ...DEFAULT_TOOL_SHELF_ORDER
  ]);
  const [draggingKey, setDraggingKey] = useState("");
  const [dropTargetKey, setDropTargetKey] = useState("");
  const counterList = getCounterListFromMechanics(worldMechanics);

  const showTerrains = Boolean(worldFeatures.terrains);
  const showFog = Boolean(worldFeatures.fogOfWar);
  const showCounters = Boolean(worldFeatures.counters);
  const showConditions = Boolean(worldFeatures.conditions);
  const hasPaintTools = showTerrains || showFog || showCounters || showConditions;
  const showTerrainsModule = showTerrains || showFog;

  useEffect(() => {
    setModuleOrder(getToolShelfOrder(prefsUserId));
  }, [prefsUserId]);

  const visibleModuleKeys = useMemo(() => {
    return moduleOrder.filter((key) => {
      if (key === "terrains") return showTerrainsModule;
      if (key === "conditions") return showConditions;
      if (key === "counters") return showCounters;
      return false;
    });
  }, [moduleOrder, showTerrainsModule, showConditions, showCounters]);

  const canReorderShelf = visibleModuleKeys.length > 1;
  const showResetLayout = !isDefaultToolShelfOrder(moduleOrder);

  function persistOrder(nextOrder) {
    const normalized = normalizeToolShelfOrder(nextOrder);
    setModuleOrder(normalized);
    saveToolShelfOrder(prefsUserId, normalized);
  }

  function moveModule(moduleKey, delta) {
    const visibleIndex = visibleModuleKeys.indexOf(moduleKey);
    if (visibleIndex < 0) return;

    const targetVisibleIndex = visibleIndex + delta;
    if (
      targetVisibleIndex < 0 ||
      targetVisibleIndex >= visibleModuleKeys.length
    ) {
      return;
    }

    reorderModule(moduleKey, visibleModuleKeys[targetVisibleIndex]);
  }

  function reorderModule(fromKey, toKey) {
    if (!fromKey || !toKey || fromKey === toKey) return;

    const fromIndex = moduleOrder.indexOf(fromKey);
    const toIndex = moduleOrder.indexOf(toKey);
    if (fromIndex < 0 || toIndex < 0) return;

    const nextOrder = [...moduleOrder];
    const [item] = nextOrder.splice(fromIndex, 1);
    nextOrder.splice(toIndex, 0, item);
    persistOrder(nextOrder);
  }

  function handleGripDragStart(event, moduleKey) {
    setDraggingKey(moduleKey);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", moduleKey);
  }

  function handleGripDragEnd() {
    setDraggingKey("");
    setDropTargetKey("");
  }

  function handleModuleDragOver(event, moduleKey) {
    if (!draggingKey || draggingKey === moduleKey) return;
    event.preventDefault();
    setDropTargetKey(moduleKey);
  }

  function handleModuleDrop(event, moduleKey) {
    event.preventDefault();
    const fromKey = event.dataTransfer.getData("text/plain") || draggingKey;
    reorderModule(fromKey, moduleKey);
    setDraggingKey("");
    setDropTargetKey("");
  }

  function handleResetLayout() {
    resetToolShelfOrder(prefsUserId);
    setModuleOrder([...DEFAULT_TOOL_SHELF_ORDER]);
  }

  if (isPlayMode && !hasPaintTools) {
    return null;
  }

  function renderModuleHeader(moduleKey, title) {
    const visibleIndex = visibleModuleKeys.indexOf(moduleKey);

    return (
      <ToolModuleHeader
        title={title}
        moduleKey={moduleKey}
        canReorder={canReorderShelf}
        canMoveUp={visibleIndex > 0}
        canMoveDown={
          visibleIndex >= 0 && visibleIndex < visibleModuleKeys.length - 1
        }
        onMove={moveModule}
        onDragStart={handleGripDragStart}
        onDragEnd={handleGripDragEnd}
      />
    );
  }

  function renderTerrainsModule() {
    return (
      <section
        key="terrains"
        className={`panel-box play-tool-module play-tool-module-terrains${
          selectedTerrainAction || selectedFogAction ? " has-armed-tool" : ""
        }${draggingKey === "terrains" ? " is-dragging" : ""}${
          dropTargetKey === "terrains" ? " is-drop-target" : ""
        }`}
        onDragOver={(event) => handleModuleDragOver(event, "terrains")}
        onDrop={(event) => handleModuleDrop(event, "terrains")}
      >
        {renderModuleHeader("terrains", showTerrains ? "Terrains" : "Fog")}

        {showTerrains ? (
          <>
            <div className="compact-palette">
              {worldMechanics.terrains.map((terrain) => (
                <button
                  key={terrain.key}
                  type="button"
                  className={
                    selectedTerrainAction === "paint" &&
                    selectedTerrain === terrain.key
                      ? "terrain-tool-btn play-tool-armed active"
                      : "terrain-tool-btn"
                  }
                  style={{
                    "--terrain-color": terrain.color || "#4b5563",
                    "--terrain-image":
                      terrain.fillType === "image" && terrain.image
                        ? `url("${terrain.image}")`
                        : "none"
                  }}
                  title={
                    terrain.description
                      ? `${terrain.label}: ${terrain.description}`
                      : terrain.label
                  }
                  onClick={() => onSelectTerrain(terrain.key)}
                >
                  <span className="terrain-tool-swatch" />
                </button>
              ))}
            </div>

            <div className="terrain-clear-apply-row">
              <button
                type="button"
                className={
                  selectedTerrainAction === "clear"
                    ? "terrain-clear-btn play-tool-armed active"
                    : "terrain-clear-btn"
                }
                onClick={onSelectClearTerrain}
              >
                Clear Terrain
              </button>

              <button
                type="button"
                className="terrain-apply-board-btn"
                onClick={onApplyTerrainToWholeBoard}
                disabled={
                  selectedTerrainAction !== "clear" && !selectedTerrain
                }
                title="Apply selected terrain action to the whole board"
              >
                Whole Board
              </button>
            </div>
          </>
        ) : null}

        {showFog ? (
          <div
            className={`play-tool-special-fog${
              showTerrains ? " is-nested" : ""
            }`}
          >
            {showTerrains ? (
              <h3 className="play-tool-special-label">Special</h3>
            ) : null}

            <div className="compact-palette play-tool-fog-palette">
              <button
                type="button"
                className={
                  selectedFogAction === "paint"
                    ? "fog-special-btn play-tool-armed active"
                    : "fog-special-btn"
                }
                onClick={onSelectPaintFog}
                title="Paint fog of war"
              >
                <span className="fog-special-swatch" aria-hidden="true" />
                <span className="fog-special-caption">Fog</span>
              </button>

              <button
                type="button"
                className={
                  selectedFogAction === "clear"
                    ? "fog-special-btn fog-special-btn-clear play-tool-armed active"
                    : "fog-special-btn fog-special-btn-clear"
                }
                onClick={onSelectClearFog}
                title="Clear fog from a cell"
              >
                <span className="fog-special-swatch" aria-hidden="true" />
                <span className="fog-special-caption">Clear</span>
              </button>
            </div>

            <div className="terrain-clear-apply-row">
              <button
                type="button"
                className="terrain-apply-board-btn"
                onClick={onApplyFogToWholeBoard}
                title="Cover the whole board in fog"
              >
                Fog Board
              </button>

              <button
                type="button"
                className="terrain-clear-btn"
                onClick={onClearAllFog}
              >
                Clear All
              </button>
            </div>
          </div>
        ) : null}
      </section>
    );
  }

  function renderConditionsModule() {
    return (
      <section
        key="conditions"
        className={`panel-box play-tool-module play-tool-module-conditions${
          selectedConditionAction ? " has-armed-tool" : ""
        }${draggingKey === "conditions" ? " is-dragging" : ""}${
          dropTargetKey === "conditions" ? " is-drop-target" : ""
        }`}
        onDragOver={(event) => handleModuleDragOver(event, "conditions")}
        onDrop={(event) => handleModuleDrop(event, "conditions")}
      >
        {renderModuleHeader("conditions", "Conditions")}

        <div className="compact-palette">
          {worldMechanics.conditions.map((condition) => (
            <button
              key={condition.key}
              type="button"
              className={
                selectedConditionAction === "toggle" &&
                selectedCondition === condition.key
                  ? "condition-tool-btn play-tool-armed active"
                  : "condition-tool-btn"
              }
              title={
                condition.description
                  ? `${condition.label}: ${condition.description}`
                  : condition.label
              }
              onClick={() => onSelectCondition(condition.key)}
            >
              {condition.icon}
            </button>
          ))}
        </div>

        <button
          type="button"
          className={
            selectedConditionAction === "clear"
              ? "condition-clear-btn play-tool-armed active"
              : "condition-clear-btn"
          }
          onClick={onSelectClearConditions}
        >
          Clear Conditions
        </button>
      </section>
    );
  }

  function renderCountersModule() {
    return (
      <section
        key="counters"
        className={`panel-box tool-panel-box counter-tool-panel play-tool-module play-tool-module-counters${
          selectedCounterKey ? " has-armed-tool" : ""
        }${draggingKey === "counters" ? " is-dragging" : ""}${
          dropTargetKey === "counters" ? " is-drop-target" : ""
        }`}
        onDragOver={(event) => handleModuleDragOver(event, "counters")}
        onDrop={(event) => handleModuleDrop(event, "counters")}
      >
        {renderModuleHeader("counters", "Counters")}

        <div className="counter-tool-list">
          {counterList.map((counter) => {
            const decreaseAmount = getCounterActionAmount(counter, "decrease");
            const increaseAmount = getCounterActionAmount(counter, "increase");

            return (
              <div
                key={counter.key}
                className="counter-tool-row"
                title={
                  counter.description
                    ? `${counter.label}: ${counter.description}`
                    : counter.label
                }
              >
                <div
                  className="counter-tool-dot"
                  style={{
                    "--counter-tool-color": counter.color || "#e7c97a"
                  }}
                />

                <div className="counter-tool-name">{counter.label}</div>

                <button
                  type="button"
                  className={
                    selectedCounterKey === counter.key &&
                    selectedCounterAction === "adjust" &&
                    selectedCounterDelta === decreaseAmount
                      ? "counter-tool-btn play-tool-armed active"
                      : "counter-tool-btn"
                  }
                  style={{
                    "--cell-counter-color": counter.color || "#e7c97a"
                  }}
                  onClick={() =>
                    onSelectCounterDelta(counter.key, decreaseAmount)
                  }
                >
                  {getCounterActionLabel(counter, "decrease")}
                </button>

                <button
                  type="button"
                  className={
                    selectedCounterKey === counter.key &&
                    selectedCounterAction === "adjust" &&
                    selectedCounterDelta === increaseAmount
                      ? "counter-tool-btn play-tool-armed active"
                      : "counter-tool-btn"
                  }
                  style={{
                    "--cell-counter-color": counter.color || "#e7c97a"
                  }}
                  onClick={() =>
                    onSelectCounterDelta(counter.key, increaseAmount)
                  }
                >
                  {getCounterActionLabel(counter, "increase")}
                </button>

                {counter.allowSetCounter && (
                  <button
                    type="button"
                    className={
                      selectedCounterKey === counter.key &&
                      selectedCounterAction === "set"
                        ? "counter-tool-btn play-tool-armed active"
                        : "counter-tool-btn"
                    }
                    title={
                      counter.setDescription
                        ? `${counter.setLabel || "Set"}: ${counter.setDescription}`
                        : counter.setLabel || "Set"
                    }
                    onClick={() =>
                      onSelectSetCounter(
                        counter.key,
                        counter.initialValue ?? counter.setValue ?? 0
                      )
                    }
                  >
                    {counter.setLabel || "Set"}
                  </button>
                )}

                <button
                  type="button"
                  className={
                    selectedCounterKey === counter.key &&
                    selectedCounterAction === "clear"
                      ? "counter-clear-btn play-tool-armed active"
                      : "counter-clear-btn"
                  }
                  onClick={() => onSelectClearCounter(counter.key)}
                >
                  Clear
                </button>
              </div>
            );
          })}
        </div>

        {counterList.some((counter) => counter.allowSetCounter) && (
          <div className="counter-set-row">
            <input
              type="number"
              value={counterSetValue}
              onChange={(event) =>
                onCounterSetValueChange(event.target.value)
              }
              aria-label="Counter value"
            />
          </div>
        )}
      </section>
    );
  }

  const moduleRenderers = {
    terrains: showTerrainsModule ? renderTerrainsModule : null,
    conditions: showConditions ? renderConditionsModule : null,
    counters: showCounters ? renderCountersModule : null
  };

  const shelfColumns = useMemo(() => {
    const left = [];
    const right = [];

    for (const key of visibleModuleKeys) {
      if (left.length === 0 && right.length === 0) {
        left.push(key);
      } else if (right.length <= left.length) {
        right.push(key);
      } else {
        left.push(key);
      }
    }

    return { left, right };
  }, [visibleModuleKeys]);

  function renderShelfModule(key) {
    const render = moduleRenderers[key];
    return render ? render() : null;
  }

  return (
    <aside
      className="sidebar"
      onClick={(event) => {
        const clickedInteractiveElement = event.target.closest(
          "button, input, select, textarea, label, summary, a, [role='button']"
        );

        if (clickedInteractiveElement) return;

        onClearSelections();
      }}
    >
      <header className="sidebar-title-row">
        <h1>Toolbox</h1>
        <div className="sidebar-title-actions">
          {showResetLayout ? (
            <button
              type="button"
              className="play-tool-shelf-reset"
              onClick={handleResetLayout}
              title="Reset toolbox layout"
            >
              Reset layout
            </button>
          ) : null}
          <button
            className="shortcut-help-btn"
            type="button"
            onClick={() => setIsHelpOpen((current) => !current)}
            aria-expanded={isHelpOpen}
          >
            ?
          </button>
        </div>
      </header>

      {!isPlayMode && (
        <p className="sidebar-description">
          Use play tools during testing, or edit the universe systems below.
        </p>
      )}

      {isHelpOpen && (
        <section className="shortcut-help-panel">
          <h2>Shortcuts</h2>

          <div className="shortcut-help-group">
            <h3>Tools</h3>
            <p><kbd>Q W E R T Y</kbd> Terrain tools</p>
            <p><kbd>A S D</kbd> Counter tools</p>
            <p><kbd>Z X C V B N</kbd> Condition tools</p>
            <p>Drag module grips to reorder the toolbox</p>
          </div>

          <div className="shortcut-help-group">
            <h3>Board Editing</h3>
            <p><kbd>Shift</kbd> + click: keep placing selected item</p>
            <p><kbd>Shift</kbd> + condition click: stack duplicate condition</p>
            <p><kbd>Ctrl</kbd> + <kbd>Z</kbd>: undo</p>
            <p><kbd>Ctrl</kbd> + <kbd>Y</kbd>: redo</p>
            <p><kbd>Esc</kbd>: clear current selection</p>
          </div>
        </section>
      )}

      {hasPaintTools ? (
        <section className="sidebar-major-section">
          <div className="sidebar-major-content play-tool-shelf">
            {visibleModuleKeys.length === 1 ? (
              <div className="play-tool-shelf-col play-tool-shelf-col-full">
                {renderShelfModule(visibleModuleKeys[0])}
              </div>
            ) : (
              <>
                <div className="play-tool-shelf-col">
                  {shelfColumns.left.map((key) => renderShelfModule(key))}
                </div>
                <div className="play-tool-shelf-col">
                  {shelfColumns.right.map((key) => renderShelfModule(key))}
                </div>
              </>
            )}
          </div>
        </section>
      ) : null}

      {!isPlayMode && (
        <section className="sidebar-major-section">
          <h2 className="sidebar-major-title">Universe Editors</h2>

          <div className="sidebar-major-content editor-section-content">

            {worldFeatures.terrains && (
              <details>
                <summary>Terrain Editor</summary>

                <TerrainEditor
                  terrains={worldMechanics.terrains}
                  onTerrainListChange={onTerrainListChange}
                />
              </details>
            )}

            {worldFeatures.counters && (
              <details>
                <summary>Counter Editor</summary>

                <CounterEditor
                  counters={worldMechanics.counters}
                  counter={worldMechanics.counter}
                  onCounterListChange={(nextCounters) =>
                    onCounterSettingsChange(nextCounters)
                  }
                />
              </details>
            )}

            {worldFeatures.conditions && (
              <details>
                <summary>Condition Editor</summary>

                <ConditionEditor
                  conditions={worldMechanics.conditions}
                  onConditionListChange={onConditionListChange}
                />
              </details>
            )}

            {worldFeatures.characters && (
              <details>
                <summary>Character Creator</summary>

                <CharacterEditor
                  characterLibrary={characterLibrary}
                  characterFields={characterFields}
                  portraitAssets={portraitAssets}
                  characterUploadStatus={characterUploadStatus}
                  onCharacterLibraryChange={onCharacterLibraryChange}
                  onCharacterFieldsChange={onCharacterFieldsChange}
                  onPortraitAssetsChange={onPortraitAssetsChange}
                  onCharacterCsvUpload={onCharacterCsvUpload}
                  onCharacterCsvExport={onCharacterCsvExport}
                  onSaveCharacter={onSaveCharacter}
                />
              </details>
            )}

            {worldFeatures.cardDecks && (
              <details>
                <summary>Deck of Cards</summary>
                <DeckSystemEditor
                  cardDecks={worldMechanics.cardDecks}
                  onChange={onCardDecksChange}
                />
              </details>
            )}

            {worldFeatures.diceSystem && (
              <details>
                <summary>Dice System</summary>
                <DiceSystemEditor
                  diceSystem={worldMechanics.diceSystem}
                  onChange={onDiceSystemChange}
                />
              </details>
            )}

            {worldFeatures.timers && (
              <details>
                <summary>Timers</summary>
                <TimerSystemEditor
                  timers={worldMechanics.timers}
                  onChange={onTimersChange}
                />
              </details>
            )}

            {worldFeatures.objectives && (
              <details>
                <summary>Objectives</summary>
                <ObjectivesEditor
                  objectives={worldMechanics.objectives}
                  onChange={onObjectivesChange}
                />
              </details>
            )}

            {worldFeatures.fogOfWar && (
              <details>
                <summary>Fog of War</summary>
                <FogOfWarEditor
                  fogOfWar={worldMechanics.fogOfWar}
                  onChange={onFogOfWarChange}
                />
              </details>
            )}
          </div>
        </section>
      )}
    </aside>
  );
}

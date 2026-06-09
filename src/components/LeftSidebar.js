"use client";

import { useState } from "react";

import { getCounterListFromMechanics } from "@/lib/defaultWorld";
import CharacterEditor from "./CharacterEditor";
import TokenEditor from "./TokenEditor";
import TerrainEditor from "./TerrainEditor";
import CounterEditor from "./CounterEditor";
import ConditionEditor from "./ConditionEditor";

export default function LeftSidebar({
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

  characterLibrary,
  onCharacterLibraryChange,
  characterUploadStatus,
  worldTokens,

  selectedCounterDelta,
  selectedCounterAction,
  counterSetValue,
  selectedCounterKey,

  selectedCondition,
  selectedConditionAction,

  selectedTerrain,
  selectedTerrainAction,

  onCounterSetValueChange,
  onCharacterCsvUpload,
  onSaveCharacter,
  onAddWorldToken,
  onDeleteWorldToken,

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
  const counterList = getCounterListFromMechanics(worldMechanics);

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
        <button
          className="shortcut-help-btn"
          type="button"
          onClick={() => setIsHelpOpen((current) => !current)}
          aria-expanded={isHelpOpen}
        >
          ?
        </button>
      </header>

      <p className="sidebar-description">
        Use play tools during testing, or edit the world systems below.
      </p>

      {isHelpOpen && (
        <section className="shortcut-help-panel">
          <h2>Shortcuts</h2>

          <div className="shortcut-help-group">
            <h3>Tools</h3>
            <p><kbd>Q W E R T Y</kbd> Terrain tools</p>
            <p><kbd>A S D F G H</kbd> Counter tools</p>
            <p><kbd>Z X C V B N</kbd> Condition tools</p>
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

      <section className="sidebar-major-section">
        <h2 className="sidebar-major-title">Play Tools</h2>

        <div className="sidebar-major-content">

          {worldFeatures.terrains && (
            <section className="panel-box">
              <h2>Terrains</h2>

              <div className="compact-palette">
                {worldMechanics.terrains.map((terrain) => (
                  <button
                    key={terrain.key}
                    className={
                      selectedTerrainAction === "paint" &&
                        selectedTerrain === terrain.key
                        ? "terrain-tool-btn active"
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
                      ? "terrain-clear-btn active"
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
                  disabled={selectedTerrainAction !== "clear" && !selectedTerrain}
                  title="Apply selected terrain action to the whole board"
                >
                  Whole Board
                </button>
              </div>
            </section>
          )}

          {worldFeatures.counters && (
            <section className="panel-box tool-panel-box counter-tool-panel">
              <h2>Counters</h2>

              <div className="counter-tool-list">
                {counterList.map((counter) => (
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
                      style={{ "--counter-tool-color": counter.color || "#e7c97a" }}
                    />

                    <div className="counter-tool-name">
                      {counter.label}
                    </div>

                    <button
                      type="button"
                      className={
                        selectedCounterKey === counter.key &&
                          selectedCounterAction === "adjust" &&
                          selectedCounterDelta === -1
                          ? "counter-tool-btn active"
                          : "counter-tool-btn"
                      }
                      style={{ "--cell-counter-color": counter.color || "#e7c97a" }}
                      onClick={() => onSelectCounterDelta(counter.key, -1)}
                    >
                      {counter.decreaseLabel || "-1"}
                    </button>

                    <button
                      type="button"
                      className={
                        selectedCounterKey === counter.key &&
                          selectedCounterAction === "adjust" &&
                          selectedCounterDelta === 1
                          ? "counter-tool-btn active"
                          : "counter-tool-btn"
                      }
                      style={{ "--cell-counter-color": counter.color || "#e7c97a" }}
                      onClick={() => onSelectCounterDelta(counter.key, 1)}
                    >
                      {counter.increaseLabel || "+1"}
                    </button>

                    {counter.allowSetCounter && (
                      <button
                        type="button"
                        className={
                          selectedCounterKey === counter.key &&
                            selectedCounterAction === "set"
                            ? "counter-tool-btn active"
                            : "counter-tool-btn"
                        }
                        title={
                          counter.setDescription
                            ? `${counter.setLabel || "Set"}: ${counter.setDescription}`
                            : counter.setLabel || "Set"
                        }
                        onClick={() => onSelectSetCounter(counter.key)}
                      >
                        {counter.setLabel || "Set"}
                      </button>
                    )}

                    <button
                      type="button"
                      className={
                        selectedCounterKey === counter.key &&
                          selectedCounterAction === "clear"
                          ? "counter-clear-btn active"
                          : "counter-clear-btn"
                      }
                      onClick={() => onSelectClearCounter(counter.key)}
                    >
                      Clear
                    </button>
                  </div>
                ))}
              </div>

              {counterList.some((counter) => counter.allowSetCounter) && (
                <div className="counter-set-row">
                  <input
                    type="number"
                    value={counterSetValue}
                    onChange={(event) => onCounterSetValueChange(event.target.value)}
                    aria-label="Counter value"
                  />
                </div>
              )}
            </section>
          )}

          {worldFeatures.conditions && (
            <section className="panel-box">
              <h2>Conditions</h2>

              <div className="compact-palette">
                {worldMechanics.conditions.map((condition) => (
                  <button
                    key={condition.key}
                    className={
                      selectedConditionAction === "toggle" &&
                        selectedCondition === condition.key
                        ? "condition-tool-btn active"
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
                className={
                  selectedConditionAction === "clear"
                    ? "condition-clear-btn active"
                    : "condition-clear-btn"
                }
                onClick={onSelectClearConditions}
              >
                Clear Conditions
              </button>
            </section>
          )}
        </div>
      </section >

      <section className="sidebar-major-section">
        <h2 className="sidebar-major-title">World Editors</h2>

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
                characterUploadStatus={characterUploadStatus}
                onCharacterLibraryChange={onCharacterLibraryChange}
                onCharacterCsvUpload={onCharacterCsvUpload}
                onSaveCharacter={onSaveCharacter}
              />
            </details>
          )}

          {worldFeatures.worldTokens && (
            <details>
              <summary>Token Creator</summary>

              <TokenEditor
                worldTokens={worldTokens}
                onAddWorldToken={onAddWorldToken}
                onDeleteWorldToken={onDeleteWorldToken}
              />
            </details>
          )}
        </div>
      </section>
    </aside >
  );
}

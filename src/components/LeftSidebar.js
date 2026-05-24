import FeatureToggleEditor from "./FeatureToggleEditor";
import CharacterEditor from "./CharacterEditor";
import TokenEditor from "./TokenEditor";
import ThemeEditor from "./ThemeEditor";
import TerrainEditor from "./TerrainEditor";
import CounterEditor from "./CounterEditor";
import ConditionEditor from "./ConditionEditor";

export default function LeftSidebar({
  worldDetails,
  worldTheme,
  worldFeatures,
  worldMechanics,

  onWorldDetailsChange,
  onThemeChange,
  onToggleWorldFeature,
  onTerrainListChange,
  onCounterSettingsChange,
  onConditionListChange,

  characterLibrary,
  characterUploadStatus,
  worldTokens,

  selectedCounterDelta,
  selectedCounterAction,
  counterSetValue,

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
  onClearAllTerrains
}) {
  return (
    <aside className="sidebar">
      <header className="sidebar-title-row">
        <h1>Tools</h1>
        <button className="shortcut-help-btn" type="button">?</button>
      </header>

      <p className="sidebar-description">
        Shape the battlefield with terrains, use counters and affect pieces with conditions.
      </p>

      {worldFeatures.counters && (
        <section className="panel-box">
          <h2>{worldMechanics.counter.name}</h2>

          <div className="compact-palette">
            <button
              className={
                selectedCounterAction === "adjust" && selectedCounterDelta === -1
                  ? "counter-tool-btn active"
                  : "counter-tool-btn"
              }
              onClick={() => onSelectCounterDelta(-1)}
            >
              {worldMechanics.counter.decreaseLabel}
            </button>

            <button
              className={
                selectedCounterAction === "adjust" && selectedCounterDelta === 1
                  ? "counter-tool-btn active"
                  : "counter-tool-btn"
              }
              onClick={() => onSelectCounterDelta(1)}
            >
              {worldMechanics.counter.increaseLabel}
            </button>
          </div>

          <div className="counter-set-row">
            <input
              type="number"
              value={counterSetValue}
              onChange={(event) => onCounterSetValueChange(event.target.value)}
              aria-label="Counter value"
            />

            <button
              className={
                selectedCounterAction === "set"
                  ? "counter-tool-btn active"
                  : "counter-tool-btn"
              }
              onClick={onSelectSetCounter}
            >
              Set Number
            </button>
          </div>

          <button
            className={
              selectedCounterAction === "clear"
                ? "counter-clear-btn active"
                : "counter-clear-btn"
            }
            onClick={onSelectClearCounter}
          >
            Clear Counter
          </button>
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
                title={condition.label}
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
                  "--terrain-color": terrain.color || "#4b5563"
                }}
                title={terrain.label}
                onClick={() => onSelectTerrain(terrain.key)}
              >
                {terrain.label}
              </button>
            ))}
          </div>

          <div className="two-button-row">
            <button
              type="button"
              onClick={onApplyTerrainToWholeBoard}
              disabled={!selectedTerrain}
            >
              Apply to Whole Board
            </button>

            <button type="button" onClick={onClearAllTerrains}>
              Clear Board Terrains
            </button>
          </div>

          <button
            className={
              selectedTerrainAction === "clear"
                ? "terrain-clear-btn active"
                : "terrain-clear-btn"
            }
            onClick={onSelectClearTerrain}
          >
            Clear Tile Terrain
          </button>
        </section>
      )}

      <section className="panel-box world-editor-box">
        <h2>World Editor</h2>

        <details open>
          <summary>World Details</summary>

          <div className="world-details-form">
            <label>World Name</label>
            <input
              value={worldDetails.name}
              placeholder="e.g. Elemental Chess"
              onChange={(event) =>
                onWorldDetailsChange("name", event.target.value)
              }
            />

            <label>World Description</label>
            <textarea
              value={worldDetails.description}
              maxLength={180}
              placeholder="Briefly describe this world."
              onChange={(event) =>
                onWorldDetailsChange("description", event.target.value)
              }
            />

            <div className="field-counter">
              {worldDetails.description.length}/180
            </div>

            <label>Rules Summary / Creator Notes</label>
            <textarea
              value={worldDetails.rulesNotes}
              placeholder="Write the main custom rules or reminders."
              onChange={(event) =>
                onWorldDetailsChange("rulesNotes", event.target.value)
              }
            />
          </div>
        </details>

        <details>
          <summary>World Features</summary>

          <FeatureToggleEditor
            worldFeatures={worldFeatures}
            onToggleWorldFeature={onToggleWorldFeature}
          />
        </details>

        <details>
          <summary>Theme Images</summary>

          <ThemeEditor
            worldTheme={worldTheme}
            onThemeChange={onThemeChange}
          />
        </details>

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
              counter={worldMechanics.counter}
              onCounterSettingsChange={onCounterSettingsChange}
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
            <summary>Character Editor</summary>

            <CharacterEditor
              characterLibrary={characterLibrary}
              characterUploadStatus={characterUploadStatus}
              onSaveCharacter={onSaveCharacter}
              onCharacterCsvUpload={onCharacterCsvUpload}
            />
          </details>
        )}

        {worldFeatures.worldTokens && (
          <details>
            <summary>Token Editor</summary>

            <TokenEditor
              worldTokens={worldTokens}
              onAddWorldToken={onAddWorldToken}
              onDeleteWorldToken={onDeleteWorldToken}
            />
          </details>
        )}
      </section>
    </aside>
  );
}
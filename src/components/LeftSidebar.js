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

  onWorldDetailsChange,
  onThemeChange,
  onPieceSkinChange,
  onCharacterDisplayModeChange,

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
}) {
  return (
    <aside className="sidebar">
      <header className="sidebar-title-row">
        <h1>Toolbox</h1>
        <button className="shortcut-help-btn" type="button">?</button>
      </header>

      <p className="sidebar-description">
        Use play tools during testing, or edit the world systems below.
      </p>

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
                      "--terrain-image": terrain.image ? `url("${terrain.image}")` : "none"
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

              <button
                type="button"
                onClick={onApplyTerrainToWholeBoard}
                disabled={selectedTerrainAction !== "clear" && !selectedTerrain}
              >
                Apply to Board
              </button>

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

          {worldFeatures.counters && (
            <section className="panel-box">
              <h2 title={worldMechanics.counter.description || worldMechanics.counter.name}>
                {worldMechanics.counter.name}
              </h2>

              <div className="compact-palette">
                <button
                  className={
                    selectedCounterAction === "adjust" && selectedCounterDelta === -1
                      ? "counter-tool-btn active"
                      : "counter-tool-btn"
                  }
                  title={
                    worldMechanics.counter.description
                      ? `${worldMechanics.counter.name}: ${worldMechanics.counter.description}`
                      : worldMechanics.counter.name
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
                  title={
                    worldMechanics.counter.description
                      ? `${worldMechanics.counter.name}: ${worldMechanics.counter.description}`
                      : worldMechanics.counter.name
                  }
                  onClick={() => onSelectCounterDelta(1)}
                >
                  {worldMechanics.counter.increaseLabel}
                </button>
              </div>

              {worldMechanics.counter.allowSetCounter && (
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
                    title={
                      worldMechanics.counter.setDescription
                        ? `${worldMechanics.counter.setLabel || "Set Number"}: ${worldMechanics.counter.setDescription}`
                        : worldMechanics.counter.setLabel || "Set Number"
                    }
                    onClick={onSelectSetCounter}
                  >
                    {worldMechanics.counter.setLabel || "Set Number"}
                  </button>
                </div>
              )}

              <button
                className={
                  selectedCounterAction === "clear"
                    ? "counter-clear-btn active"
                    : "counter-clear-btn"
                }
                title={`Clear ${worldMechanics.counter.name}`}
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
      </section>

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
        </div>
      </section>
    </aside>
  );
}

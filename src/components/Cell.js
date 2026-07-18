import {
  GENERIC_TOKEN_SYMBOL,
  getCounterDefinitionFromMechanics,
  getConditionDefinitionFromMechanics,
  getPieceSkin,
  getPieceSymbol,
  getTerrainDefinitionFromMechanics,
  humanizeTokenName
} from "@/lib/defaultWorld";
import { getCharacterByName } from "@/lib/csv";
import {
  GENERIC_PIECE_SYMBOL,
  isGenericPieceKey
} from "@/lib/genericPiece";

export default function Cell({
  coordinate,
  isLightSquare,
  cellData,
  isSelected,
  pieceNames,
  characterLibrary,
  worldTheme,
  worldMechanics,
  hasBoardSkin,
  isFogged = false,
  hideOccupants = false,
  onClick
}) {
  const squareClass = isLightSquare ? "light-square" : "dark-square";
  const fogClass = isFogged ? "has-fog" : "";

  const terrain = getTerrainDefinitionFromMechanics(
    worldMechanics,
    cellData.tile
  );

  const hasTerrain = terrain?.key && terrain.key !== "neutral";

  const terrainClass = hasTerrain
    ? terrain.fillType === "image"
      ? "has-terrain terrain-image"
      : "has-terrain terrain-color"
    : "";

  const terrainStyle = hasTerrain
    ? {
      "--cell-terrain-color": terrain.color || "transparent",
      "--cell-terrain-image":
        terrain.fillType === "image" && terrain.image
          ? `url("${terrain.image}")`
          : "none"
    }
    : {};

  const cellCounters = cellData.counters || {};

  const visibleCounters = Object.entries(cellCounters)
    .filter(([, value]) => Number(value) !== 0)
    .map(([counterKey, value]) => {
      const counterDefinition = getCounterDefinitionFromMechanics(
        worldMechanics,
        counterKey
      );

      return {
        key: counterKey,
        value,
        label: counterDefinition?.label || "Counter",
        color: counterDefinition?.color || "#e7c97a"
      };
    });

  const isGenericPiece = isGenericPieceKey(cellData.pieceType);

  const pieceSymbol =
    cellData.team && cellData.pieceType
      ? isGenericPiece
        ? GENERIC_PIECE_SYMBOL
        : getPieceSymbol(cellData.team, cellData.pieceType)
      : "";

  const pieceSkin =
    cellData.team && cellData.pieceType && !isGenericPiece
      ? getPieceSkin(worldTheme, cellData.team, cellData.pieceType)
      : "";

  const characterDisplayMode =
    worldTheme?.characterDisplayMode || "piece-with-portrait";

  const assignedCharacterName =
    cellData.team && cellData.pieceType
      ? pieceNames?.[cellData.team]?.[cellData.pieceType] || ""
      : "";

  const assignedCharacter = getCharacterByName(
    characterLibrary,
    assignedCharacterName
  );

  const tokenName = cellData.tokens?.[0] || "";

  return (
    <div
      className={`cell ${squareClass} ${terrainClass} ${fogClass} ${hasBoardSkin ? "board-skin-cell" : ""
        } ${isSelected ? "selected-moving" : ""}`}
      style={terrainStyle}
      onClick={onClick}
    >
      {hasTerrain && (
        <div
          className={`cell-terrain-layer ${terrain.fillType === "image" ? "terrain-image" : "terrain-color"
            }`}
          style={terrainStyle}
        />
      )}

      {isFogged && <div className="cell-fog-layer" aria-hidden="true" />}

      {!hideOccupants && pieceSymbol && (
        <div
          className={`cell-piece ${cellData.team} ${isGenericPiece ? "generic-piece" : ""
            } ${assignedCharacter?.portrait
              ? `has-character ${characterDisplayMode}`
              : ""
            }`}
        >
          {assignedCharacter?.portrait &&
            characterDisplayMode === "portrait-with-piece" ? (
            <div className="board-character-main">
              <div className="board-character-main-portrait-frame">
                <img
                  className="board-character-main-portrait"
                  src={assignedCharacter.portrait}
                  alt={assignedCharacter.name}
                />
              </div>

              <div className="board-character-mini-piece">
                {pieceSkin ? (
                  <img
                    src={pieceSkin}
                    alt={`${cellData.team} ${cellData.pieceType}`}
                  />
                ) : (
                  <span>{pieceSymbol}</span>
                )}
              </div>
            </div>
          ) : (
            <>
              {pieceSkin ? (
                <img
                  className="board-piece-skin"
                  src={pieceSkin}
                  alt={`${cellData.team} ${cellData.pieceType}`}
                />
              ) : (
                <span className="board-piece-symbol">{pieceSymbol}</span>
              )}

              {assignedCharacter?.portrait && (
                <div className="board-character-badge">
                  <img
                    className="board-character-badge-image"
                    src={assignedCharacter.portrait}
                    alt={assignedCharacter.name}
                  />
                </div>
              )}
            </>
          )}
        </div>
      )}

      {!hideOccupants && tokenName && (
        <div className="board-token">
          <span className="board-token-symbol">{GENERIC_TOKEN_SYMBOL}</span>
          <span className="board-token-label">
            {humanizeTokenName(tokenName)}
          </span>
        </div>
      )}

      {!hideOccupants && visibleCounters.length > 0 && (
        <div className="cell-counter-stack">
          {visibleCounters.map((counter) => (
            <span
              key={counter.key}
              className="cell-counter"
              style={{ "--cell-counter-color": counter.color }}
              title={`${counter.label}: ${counter.value}`}
            >
              {Number(counter.value) > 0
                ? `+${counter.value}`
                : counter.value}
            </span>
          ))}
        </div>
      )}

      {!hideOccupants && cellData.conditions?.length > 0 && (
        <div className="cell-condition-stack">
          {cellData.conditions.map((conditionKey, conditionIndex) => {
            const condition = getConditionDefinitionFromMechanics(
              worldMechanics,
              conditionKey
            );

            if (!condition) return null;

            return (
              <span
                key={`${conditionKey}-${conditionIndex}`}
                className="cell-condition-icon"
                title={
                  condition.description
                    ? `${condition.label}: ${condition.description}`
                    : condition.label
                }
              >
                {condition.icon}
              </span>
            );
          })}
        </div>
      )}

      <span className="coords">{coordinate}</span>
    </div>
  );
}

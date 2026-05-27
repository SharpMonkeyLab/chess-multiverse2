import {
  GENERIC_TOKEN_SYMBOL,
  getConditionDefinitionFromMechanics,
  getPieceSkin,
  getPieceSymbol,
  getTerrainDefinitionFromMechanics,
  humanizeTokenName
} from "@/lib/defaultWorld";
import { getCharacterByName } from "@/lib/csv";

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
  onClick
}) {
  const squareClass = isLightSquare ? "light-square" : "dark-square";

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

  const pieceSymbol =
    cellData.team && cellData.pieceType
      ? getPieceSymbol(cellData.team, cellData.pieceType)
      : "";

  const pieceSkin =
    cellData.team && cellData.pieceType
      ? getPieceSkin(worldTheme, cellData.team, cellData.pieceType)
      : "";

  const characterDisplayMode =
    worldTheme?.characterDisplayMode || "piece-with-portrait";

  const assignedCharacterName =
    cellData.team && cellData.pieceType
      ? pieceNames[cellData.team][cellData.pieceType]
      : "";

  const assignedCharacter = getCharacterByName(
    characterLibrary,
    assignedCharacterName
  );

  const tokenName = cellData.tokens?.[0] || "";

  return (
    <div
      className={`cell ${squareClass} ${terrainClass} ${hasBoardSkin ? "board-skin-cell" : ""
        } ${isSelected ? "selected-moving" : ""}`}
      style={terrainStyle}
      onClick={onClick}
    >
      {pieceSymbol && (
        <div
          className={`cell-piece ${cellData.team} ${assignedCharacter?.portrait
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

      {tokenName && (
        <div className="board-token">
          <span className="board-token-symbol">{GENERIC_TOKEN_SYMBOL}</span>
          <span className="board-token-label">
            {humanizeTokenName(tokenName)}
          </span>
        </div>
      )}

      {cellData.counter && (
        <div className={`cell-counter ${cellData.counterColor}`}>
          {Number(cellData.counter) > 0
            ? `+${cellData.counter}`
            : cellData.counter}
        </div>
      )}

      {cellData.conditions?.length > 0 && (
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
import {
  GENERIC_TOKEN_SYMBOL,
  getConditionDefinitionFromMechanics,
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
  worldMechanics,
  hasBoardSkin,
  onClick
}) {
  const squareClass = isLightSquare ? "light-square" : "dark-square";

  const terrain = getTerrainDefinitionFromMechanics(
    worldMechanics,
    cellData.tile
  );

  const terrainClass =
    terrain?.key !== "neutral"
      ? terrain?.fillType === "image"
        ? "has-terrain terrain-image"
        : "has-terrain terrain-color"
      : "";

  const terrainStyle =
    terrain?.key !== "neutral" &&
    terrain?.fillType === "image" &&
    terrain?.image
      ? { "--cell-terrain-image": `url("${terrain.image}")` }
      : terrain?.color
        ? { "--cell-terrain-color": terrain.color }
        : {};

  const pieceSymbol =
    cellData.team && cellData.pieceType
      ? getPieceSymbol(cellData.team, cellData.pieceType)
      : "";

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
      className={`cell ${squareClass} ${terrainClass} ${
        hasBoardSkin ? "board-skin-cell" : ""
      } ${isSelected ? "selected-moving" : ""}`}
      style={terrainStyle}
      onClick={onClick}
    >
      {pieceSymbol && (
        <div className={`cell-piece ${cellData.team}`}>
          {assignedCharacter?.portrait ? (
            <img
              className="board-character-portrait"
              src={assignedCharacter.portrait}
              alt={assignedCharacter.name}
            />
          ) : (
            pieceSymbol
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
          {cellData.conditions.map((conditionKey) => {
            const condition = getConditionDefinitionFromMechanics(
              worldMechanics,
              conditionKey
            );

            if (!condition) return null;

            return (
              <span
                key={conditionKey}
                className="cell-condition-icon"
                title={condition.label}
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
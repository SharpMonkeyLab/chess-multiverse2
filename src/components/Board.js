import Cell from "./Cell";
import { BOARD_SIZE } from "@/lib/defaultWorld";

export default function Board({
  cells,
  movingPiece,
  pieceNames,
  characterLibrary,
  worldTheme,
  worldMechanics,
  onCellClick
}) {
  return (
    <div
      className={worldTheme?.boardSkinImage ? "board has-board-skin" : "board"}
      style={
        worldTheme?.boardSkinImage
          ? { backgroundImage: `url("${worldTheme.boardSkinImage}")` }
          : {}
      }
    >
      <div className="board-grid">
        {cells.map((cellData, index) => {
          const row = Math.floor(index / BOARD_SIZE);
          const col = index % BOARD_SIZE;

          const fileLetter = String.fromCharCode(65 + col);
          const rankNumber = BOARD_SIZE - row;
          const coordinate = `${fileLetter}${rankNumber}`;

          const isLightSquare = (row + col) % 2 === 1;
          const isSelected = movingPiece?.fromIndex === index;

          return (
            <Cell
              key={index}
              coordinate={coordinate}
              isLightSquare={isLightSquare}
              cellData={cellData}
              isSelected={isSelected}
              pieceNames={pieceNames}
              characterLibrary={characterLibrary}
              worldMechanics={worldMechanics}
              worldTheme={worldTheme}
              hasBoardSkin={Boolean(worldTheme?.boardSkinImage)}
              onClick={(event) => onCellClick(index, event)}
            />
          );
        })}
      </div>
    </div>
  );
}
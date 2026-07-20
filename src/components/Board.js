import Cell from "./Cell";
import { BOARD_SIZE } from "@/lib/defaultWorld";
import { isPieceHiddenByFog } from "@/lib/worldSystems";

export default function Board({
  cells,
  movingPiece,
  legalMoveIndexes = [],
  legalCaptureIndexes = [],
  pieceNames,
  characterLibrary,
  portraitAssets = {},
  worldTheme,
  worldMechanics,
  fogCells = [],
  viewerTeam = "",
  revealOwnPiecesInFog = true,
  onCellClick
}) {
  const legalMoveSet = new Set(legalMoveIndexes);
  const legalCaptureSet = new Set(legalCaptureIndexes);

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
          const isLegalMove = legalMoveSet.has(index);
          const isLegalCapture = legalCaptureSet.has(index);
          const isFogged = Array.isArray(fogCells) && fogCells.includes(index);
          const hideOccupants = isPieceHiddenByFog({
            cellIndex: index,
            cellTeam: cellData.team,
            viewerTeam,
            fogCells,
            revealOwnPieces: revealOwnPiecesInFog
          });

          return (
            <Cell
              key={index}
              coordinate={coordinate}
              isLightSquare={isLightSquare}
              cellData={cellData}
              isSelected={isSelected}
              isLegalMove={isLegalMove}
              isLegalCapture={isLegalCapture}
              pieceNames={pieceNames}
              characterLibrary={characterLibrary}
              portraitAssets={portraitAssets}
              worldMechanics={worldMechanics}
              worldTheme={worldTheme}
              hasBoardSkin={Boolean(worldTheme?.boardSkinImage)}
              isFogged={isFogged}
              hideOccupants={hideOccupants}
              onClick={(event) => onCellClick(index, event)}
            />
          );
        })}
      </div>
    </div>
  );
}

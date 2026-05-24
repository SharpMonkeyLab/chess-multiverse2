import Board from "./Board";

export default function Workspace({
  cells,
  movingPiece,
  pieceNames,
  characterLibrary,
  worldTheme,
  worldMechanics,
  onCellClick,
  onClearSelections
}) {
  return (
    <section className="workspace">
      <section
        className="board-area"
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            onClearSelections();
          }
        }}
      >
        <div className="board-shell">
          <Board
            cells={cells}
            movingPiece={movingPiece}
            pieceNames={pieceNames}
            characterLibrary={characterLibrary}
            worldTheme={worldTheme}
            worldMechanics={worldMechanics}
            onCellClick={onCellClick}
          />
        </div>
      </section>
    </section>
  );
}
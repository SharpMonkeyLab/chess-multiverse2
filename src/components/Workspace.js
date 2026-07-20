import Board from "./Board";
import BoardToolbar from "./BoardToolbar";
import PlaySystemsDock from "./PlaySystemsDock";

export default function Workspace({
  cells,
  movingPiece,
  pieceNames,
  characterLibrary,
  portraitAssets = {},
  worldTheme,
  worldMechanics,
  worldFeatures,
  systemsRuntime,
  onSystemsRuntimeChange,
  turnTeam,
  isPlayMode = false,
  fogCells = [],
  viewerTeam = "",
  revealOwnPiecesInFog = true,
  onLogAction,
  selectedBoardAction,
  boardStatus = "",
  actionLog = null,
  onToggleCharacterDisplayMode,
  onStandardSetup,
  onUndo,
  onRedo,
  onDeletePiece,
  onClearBoard,
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
        <div className="board-stage">
          <BoardToolbar
            selectedBoardAction={selectedBoardAction}
            actionLog={actionLog}
            characterDisplayMode={
              worldTheme?.characterDisplayMode || "piece-with-portrait"
            }
            onToggleCharacterDisplayMode={onToggleCharacterDisplayMode}
            onStandardSetup={onStandardSetup}
            onUndo={onUndo}
            onRedo={onRedo}
            onDeletePiece={onDeletePiece}
            onClearBoard={onClearBoard}
          />

          <div className="board-shell">
            <Board
              cells={cells}
              movingPiece={movingPiece}
              pieceNames={pieceNames}
              characterLibrary={characterLibrary}
              portraitAssets={portraitAssets}
              worldTheme={worldTheme}
              worldMechanics={worldMechanics}
              fogCells={fogCells}
              viewerTeam={viewerTeam}
              revealOwnPiecesInFog={revealOwnPiecesInFog}
              onCellClick={onCellClick}
            />
          </div>

          {boardStatus ? (
            <p className="board-status" aria-live="polite" title={boardStatus}>
              {boardStatus}
            </p>
          ) : null}
        </div>

        <PlaySystemsDock
          worldFeatures={worldFeatures}
          worldMechanics={worldMechanics}
          systemsRuntime={systemsRuntime}
          onSystemsRuntimeChange={onSystemsRuntimeChange}
          turnTeam={turnTeam}
          isPlayMode={isPlayMode}
          onLogAction={onLogAction}
        />
      </section>
    </section>
  );
}

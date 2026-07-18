"use client";

import { useEffect, useState } from "react";

export default function BoardToolbar({
  selectedBoardAction,
  actionLog = null,
  onToggleCharacterDisplayMode,
  onStandardSetup,
  onUndo,
  onRedo,
  onDeletePiece,
  onClearBoard
}) {
  const showPortraitToggle = typeof onToggleCharacterDisplayMode === "function";
  const showActionLog = Array.isArray(actionLog);
  const [isLogOpen, setIsLogOpen] = useState(false);

  const latestEntry = showActionLog && actionLog.length > 0 ? actionLog[0] : null;

  useEffect(() => {
    if (!isLogOpen) return;

    function handlePointerDown(event) {
      if (
        event.target.closest(
          ".board-action-log-trigger, .board-action-log-drawer"
        )
      ) {
        return;
      }

      setIsLogOpen(false);
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setIsLogOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isLogOpen]);

  return (
    <div className="board-toolbar-stack">
      <div className="board-toolbar" aria-label="Board tools">
        {showPortraitToggle && (
          <button
            type="button"
            className="board-toolbar-portrait"
            onClick={onToggleCharacterDisplayMode}
            title="Toggle piece with portrait badge, or portrait with piece badge"
          >
            Portrait View
          </button>
        )}

        {showActionLog ? (
          <button
            type="button"
            className={`board-action-log-trigger${isLogOpen ? " open" : ""}`}
            onClick={() => setIsLogOpen((current) => !current)}
            aria-expanded={isLogOpen}
            title={
              latestEntry
                ? `${latestEntry.message} — click to ${isLogOpen ? "close" : "open"} action log`
                : "Action log"
            }
          >
            <span className="board-action-log-label">Action Log</span>
            <span className="board-action-log-latest">
              {latestEntry ? latestEntry.message : "No actions yet."}
            </span>
            <span className="board-action-log-chevron" aria-hidden="true">
              {isLogOpen ? "▴" : "▾"}
            </span>
          </button>
        ) : (
          <div className="board-toolbar-spacer" />
        )}

        <div className="board-toolbar-controls" aria-label="Board controls">
          <button
            type="button"
            className="board-controls-setup"
            onClick={onStandardSetup}
            title="Reset to standard chess setup"
          >
            Reset Board
          </button>

          <button type="button" onClick={onUndo} title="Undo (Ctrl+Z)">
            ↶ Undo
          </button>

          <button type="button" onClick={onRedo} title="Redo (Ctrl+Y)">
            ↷ Redo
          </button>

          <button
            type="button"
            className={
              selectedBoardAction === "delete-piece"
                ? "board-controls-delete active"
                : "board-controls-delete"
            }
            onClick={onDeletePiece}
            title="Delete selected piece, or activate delete tool"
          >
            Delete Piece
          </button>

          <button
            type="button"
            className="board-controls-clear"
            onClick={onClearBoard}
            title="Clear the board"
          >
            Clear Board
          </button>
        </div>
      </div>

      {showActionLog && (
        <div
          className={`board-action-log-drawer${isLogOpen ? " open" : ""}`}
          aria-hidden={!isLogOpen}
        >
          <div className="board-action-log-drawer-inner">
            <div className="board-action-log-drawer-header">
              <strong>Action Log</strong>
              <span>{actionLog.length} entries</span>
            </div>

            {actionLog.length === 0 ? (
              <p className="board-action-log-empty">No actions yet.</p>
            ) : (
              <div className="board-action-log-list">
                {actionLog.map((entry, index) => {
                  const sequenceNumber = actionLog.length - index;

                  return (
                    <article className="board-action-log-entry" key={entry.id}>
                      <span className="board-action-log-number" aria-hidden="true">
                        {sequenceNumber}
                      </span>

                      <div className="board-action-log-entry-body">
                        <strong>{entry.message}</strong>
                        <span>
                          Move {entry.moveNumber} ·{" "}
                          {entry.turnTeam === "black" ? "Black" : "White"}
                        </span>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

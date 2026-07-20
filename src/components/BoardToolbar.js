"use client";

import { useEffect, useState } from "react";

export default function BoardToolbar({
  selectedBoardAction,
  actionLog = null,
  characterDisplayMode = "piece-with-portrait",
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
  const isPortraitMode = characterDisplayMode === "portrait-with-piece";

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
          <div
            className={`board-display-switch${isPortraitMode ? " portrait" : " piece"}`}
            role="group"
            aria-label="Board display mode"
          >
            <button
              type="button"
              className={!isPortraitMode ? "active" : ""}
              aria-pressed={!isPortraitMode}
              onClick={() => {
                if (isPortraitMode) onToggleCharacterDisplayMode();
              }}
              title="Show piece with portrait badge"
            >
              Piece
            </button>
            <button
              type="button"
              className={isPortraitMode ? "active" : ""}
              aria-pressed={isPortraitMode}
              onClick={() => {
                if (!isPortraitMode) onToggleCharacterDisplayMode();
              }}
              title="Show portrait with piece badge"
            >
              Portrait
            </button>
            <span className="board-display-switch-thumb" aria-hidden="true" />
          </div>
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
            onClick={onStandardSetup}
            title="Reset Board"
          >
            Reset Board
          </button>

          <button type="button" onClick={onUndo} title="Undo">
            Undo
          </button>

          <button type="button" onClick={onRedo} title="Redo">
            Redo
          </button>

          <button
            type="button"
            className={
              selectedBoardAction === "delete-piece" ? "active" : ""
            }
            onClick={onDeletePiece}
            title="Delete Piece"
          >
            Delete Piece
          </button>

          <button type="button" onClick={onClearBoard} title="Clear Board">
            Clear Board
          </button>
        </div>
      </div>

      {showActionLog && isLogOpen && (
        <div className="board-action-log-drawer" role="dialog" aria-label="Action log">
          {actionLog.length === 0 ? (
            <p className="board-action-log-empty">No actions yet.</p>
          ) : (
            <ol className="board-action-log-list">
              {actionLog.map((entry, index) => (
                <li key={`${entry.id || entry.message}-${index}`}>
                  <span className="board-action-log-index">
                    {actionLog.length - index}
                  </span>
                  <span>{entry.message}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </div>
  );
}

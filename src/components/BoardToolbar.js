"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

function ActionLogCardPreview({ card, anchorRect }) {
  if (!card || !anchorRect || typeof document === "undefined") {
    return null;
  }

  const style = {
    position: "fixed",
    top: Math.min(anchorRect.bottom + 8, window.innerHeight - 150),
    left: Math.min(anchorRect.left, window.innerWidth - 110),
    zIndex: 3000
  };

  return createPortal(
    <div
      className="board-action-log-card-preview play-hand-card"
      style={style}
      aria-hidden="true"
    >
      <strong className="play-hand-card-name">{card.name || "Card"}</strong>
      <small className="play-hand-card-body">
        {card.effectHint || card.description || "Play, then edit the board"}
      </small>
      <span className="play-hand-card-pip" />
    </div>,
    document.body
  );
}

function ActionLogMessage({ entry }) {
  const card = entry?.card || null;
  const cardName = card?.name?.trim();
  const [previewAnchor, setPreviewAnchor] = useState(null);

  if (!cardName) {
    return <>{entry.message}</>;
  }

  const nameIndex = entry.message.indexOf(cardName);

  if (nameIndex < 0) {
    return <>{entry.message}</>;
  }

  const before = entry.message.slice(0, nameIndex);
  const after = entry.message.slice(nameIndex + cardName.length);

  return (
    <>
      {before}
      <span
        className="board-action-log-card-name"
        onMouseEnter={(event) => {
          setPreviewAnchor(event.currentTarget.getBoundingClientRect());
        }}
        onMouseLeave={() => setPreviewAnchor(null)}
      >
        {cardName}
      </span>
      {after}
      <ActionLogCardPreview card={card} anchorRect={previewAnchor} />
    </>
  );
}

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
      <div className="board-toolbar">
        {showPortraitToggle ? (
          <div
            className={`board-display-switch${isPortraitMode ? " portrait" : ""}`}
            role="group"
            aria-label="Character display mode"
          >
            <button
              type="button"
              className={!isPortraitMode ? "active" : ""}
              aria-pressed={!isPortraitMode}
              onClick={() => {
                if (isPortraitMode) {
                  onToggleCharacterDisplayMode();
                }
              }}
              title="Piece with portrait"
            >
              Piece
            </button>
            <button
              type="button"
              className={isPortraitMode ? "active" : ""}
              aria-pressed={isPortraitMode}
              onClick={() => {
                if (!isPortraitMode) {
                  onToggleCharacterDisplayMode();
                }
              }}
              title="Portrait with piece"
            >
              Portrait
            </button>
            <span className="board-display-switch-thumb" aria-hidden="true" />
          </div>
        ) : null}

        {showActionLog ? (
          <button
            type="button"
            className={`board-action-log-trigger${isLogOpen ? " open" : ""}`}
            onClick={() => setIsLogOpen((current) => !current)}
            aria-expanded={isLogOpen}
            title="Action log"
          >
            <span className="board-action-log-label">Action Log</span>
            <span className="board-action-log-latest">
              {latestEntry ? (
                <ActionLogMessage entry={latestEntry} />
              ) : (
                "No actions yet."
              )}
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

      {showActionLog && (
        <div
          className={`board-action-log-drawer${isLogOpen ? " open" : ""}`}
          role="dialog"
          aria-label="Action log"
          aria-hidden={!isLogOpen}
        >
          <div className="board-action-log-drawer-inner">
            {actionLog.length === 0 ? (
              <p className="board-action-log-empty">No actions yet.</p>
            ) : (
              <ol className="board-action-log-list">
                {actionLog.map((entry, index) => (
                  <li
                    className="board-action-log-entry"
                    key={`${entry.id || entry.message}-${index}`}
                  >
                    <span className="board-action-log-number">
                      {actionLog.length - index}
                    </span>
                    <span className="board-action-log-entry-body">
                      <strong>
                        <ActionLogMessage entry={entry} />
                      </strong>
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

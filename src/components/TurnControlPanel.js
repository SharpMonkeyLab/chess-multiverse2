"use client";

export default function TurnControlPanel({
  isPlayerTurn = false,
  onPassTurn,
  showInteractionMode = false,
  playInteractionMode = "rules",
  onPlayInteractionModeChange
}) {
  const canPass = typeof onPassTurn === "function" && isPlayerTurn;
  const isFreeMode = playInteractionMode === "free";

  return (
    <div className="play-pass-turn-dock">
      {showInteractionMode ? (
        <div
          className={`play-interaction-mode-switch${isFreeMode ? " free" : " rules"}`}
          role="group"
          aria-label="Play interaction mode"
        >
          <button
            type="button"
            className={!isFreeMode ? "active" : ""}
            aria-pressed={!isFreeMode}
            onClick={() => {
              if (isFreeMode) {
                onPlayInteractionModeChange?.("rules");
              }
            }}
            title="Legal moves: only valid chess moves for the side to play"
          >
            <span>Legal</span>
            <span>Moves</span>
          </button>
          <button
            type="button"
            className={isFreeMode ? "active" : ""}
            aria-pressed={isFreeMode}
            onClick={() => {
              if (!isFreeMode) {
                onPlayInteractionModeChange?.("free");
              }
            }}
            title="Free moves: move and place pieces like the editor"
          >
            <span>Free</span>
            <span>Moves</span>
          </button>
          <span className="play-interaction-mode-switch-thumb" aria-hidden="true" />
        </div>
      ) : (
        <button
          type="button"
          className={`play-pass-turn-btn${isPlayerTurn ? " is-player-turn" : " is-waiting"}`}
          onClick={onPassTurn}
          disabled={!canPass}
          aria-label={
            isPlayerTurn
              ? "Pass turn to the other team"
              : "Waiting for opponent turn"
          }
          title={
            isPlayerTurn
              ? "Pass turn to the other team"
              : "Waiting for opponent turn"
          }
        >
          <span>Pass</span>
          <span>Turn</span>
        </button>
      )}
    </div>
  );
}

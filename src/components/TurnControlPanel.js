"use client";

export default function TurnControlPanel({
  isPlayerTurn = false,
  onPassTurn
}) {
  const canPass = typeof onPassTurn === "function" && isPlayerTurn;

  return (
    <div className="play-pass-turn-dock">
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
    </div>
  );
}

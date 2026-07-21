"use client";

import {
  DEFAULT_PIECES,
  getPieceSkin,
  getPieceSymbol
} from "@/lib/defaultWorld";

import {
  GENERIC_PIECE_KEY,
  GENERIC_PIECE_LABEL,
  GENERIC_PIECE_SYMBOL
} from "@/lib/genericPiece";

import CharacterCard from "./CharacterCard";
import MatchChatPanel from "./MatchChatPanel";
import { resolveCharacterPortrait } from "@/lib/portraitAssets";

function formatClock(totalSeconds) {
  const safeSeconds = Math.max(0, Number(totalSeconds) || 0);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function TeamTray({
  team,
  worldTheme,
  pieceNames,
  characterLibrary,
  portraitAssets = {},
  selectedTeam,
  selectedPiece,
  onSelectPiece,
  playerLabel = "",
  timers = null,
  turnTeam = "white",
  onToggleTimer
}) {
  const characterList = Array.isArray(characterLibrary)
    ? characterLibrary
    : Object.values(characterLibrary || {});

  const trayPieces = [
    ...DEFAULT_PIECES.map((piece) => ({
      key: piece.key,
      label: piece.label,
      symbol: getPieceSymbol(team, piece.key),
      isGeneric: false
    })),
    {
      key: GENERIC_PIECE_KEY,
      label: GENERIC_PIECE_LABEL,
      symbol: GENERIC_PIECE_SYMBOL,
      isGeneric: true
    }
  ];

  const isActiveTeam = turnTeam === team;
  const isFlagged = timers?.flaggedTeam === team;

  let clockLabel = "";
  if (timers) {
    if (timers.mode === "per_side_total") {
      clockLabel = formatClock(
        team === "black" ? timers.blackRemaining : timers.whiteRemaining
      );
    } else {
      // Per-turn: both trays show the shared turn clock (same starting value).
      clockLabel = formatClock(timers.turnSeconds);
    }
  }

  return (
    <section className="panel-box team-tray-box">
      <div className="team-tray-heading">
        <h2>{team === "black" ? "Black Team" : "White Team"}</h2>

        {timers ? (
          <div
            className={[
              "team-tray-clock",
              isActiveTeam ? "is-active" : "",
              isFlagged ? "is-flagged" : ""
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <span className="team-tray-clock-time" title={
              timers.mode === "per_side_total" ? "Per side total" : "Per turn"
            }>
              {clockLabel}
            </span>
            {isActiveTeam && typeof onToggleTimer === "function" ? (
              <button
                type="button"
                className="team-tray-clock-toggle"
                onClick={onToggleTimer}
                title={timers.isRunning ? "Pause timer" : "Start timer"}
              >
                {timers.isRunning ? "Pause" : "Start"}
              </button>
            ) : null}
          </div>
        ) : null}

        {playerLabel ? (
          <span className="team-tray-player">{playerLabel}</span>
        ) : null}
      </div>

      <div className="piece-row">
        {trayPieces.map((piece) => {
          const isSelected =
            selectedTeam === team && selectedPiece === piece.key;

          const pieceSkin = piece.isGeneric
            ? ""
            : getPieceSkin(worldTheme, team, piece.key);

          const assignedCharacterName = pieceNames?.[team]?.[piece.key] || "";

          const assignedCharacter = characterList.find(
            (character) =>
              character.name?.trim().toLowerCase() ===
              assignedCharacterName.trim().toLowerCase()
          );

          const assignedPortraitSrc = resolveCharacterPortrait(
            assignedCharacter,
            portraitAssets
          );

          return (
            <button
              key={piece.key}
              type="button"
              className={[
                "piece-tray-slot",
                team,
                piece.isGeneric ? "generic" : "",
                isSelected ? "active" : "",
                assignedCharacter ? "has-character" : ""
              ]
                .filter(Boolean)
                .join(" ")}
              title={
                assignedCharacter
                  ? `${team} ${piece.label}: ${assignedCharacter.name}`
                  : `Select ${team} ${piece.label}`
              }
              onClick={() => onSelectPiece(team, piece.key)}
            >
              <span className="piece-tray-face">
                {assignedPortraitSrc ? (
                  <img
                    className="piece-tray-portrait"
                    src={assignedPortraitSrc}
                    alt={assignedCharacter.name}
                  />
                ) : pieceSkin ? (
                  <img
                    className="piece-tray-image"
                    src={pieceSkin}
                    alt={`${team} ${piece.label}`}
                  />
                ) : (
                  <span className="piece-tray-face-symbol">{piece.symbol}</span>
                )}
              </span>

              <span className="piece-tray-role-symbol" aria-hidden="true">
                {piece.symbol}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export default function RightPanel({
  isPlayMode = false,
  worldFeatures,
  worldTheme,
  characterLibrary,
  portraitAssets = {},
  selectedTeam,
  selectedPiece,
  selectedToken,
  activePiece,
  pieceNames,
  pieceNameLocked,

  turnTeam = "white",
  moveNumber = 1,
  onPassTurn,

  playSessionId = "",
  sessionLifecycleStatus = "open",
  sessionParticipants = [],
  currentUserId = "",

  timers = null,
  onToggleTimer,

  onClearSelections,

  onSelectPiece,
  onSelectToken,
  onNameChange,
  onLockName,
  onUnlockName,
  onAssignCharacter
}) {
  const whitePlayer = sessionParticipants.find(
    (participant) =>
      participant.team === "white" &&
      participant.participant_status !== "left" &&
      !participant.left_at
  );

  const blackPlayer = sessionParticipants.find(
    (participant) =>
      participant.team === "black" &&
      participant.participant_status !== "left" &&
      !participant.left_at
  );

  function formatTrayPlayer(participant) {
    if (!participant) {
      return isPlayMode ? "Open seat" : "";
    }

    const name = participant.displayName || "Player";
    const role = participant.role === "host" ? "Host" : "Player";
    const you = participant.user_id === currentUserId ? " · you" : "";

    return `${name} · ${role}${you}`;
  }

  return (
    <aside
      className="right-panel"
      onClick={(event) => {
        const clickedInteractiveElement = event.target.closest(
          "button, input, select, textarea, label, summary, a, [role='button']"
        );

        if (clickedInteractiveElement) return;

        onClearSelections();
      }}
    >
      <TeamTray
        team="black"
        worldTheme={worldTheme}
        pieceNames={pieceNames}
        characterLibrary={characterLibrary}
        portraitAssets={portraitAssets}
        selectedTeam={selectedTeam}
        selectedPiece={selectedPiece}
        onSelectPiece={onSelectPiece}
        playerLabel={formatTrayPlayer(blackPlayer)}
        timers={timers}
        turnTeam={turnTeam}
        onToggleTimer={onToggleTimer}
      />

      <TeamTray
        team="white"
        worldTheme={worldTheme}
        pieceNames={pieceNames}
        characterLibrary={characterLibrary}
        portraitAssets={portraitAssets}
        selectedTeam={selectedTeam}
        selectedPiece={selectedPiece}
        onSelectPiece={onSelectPiece}
        playerLabel={formatTrayPlayer(whitePlayer)}
        timers={timers}
        turnTeam={turnTeam}
        onToggleTimer={onToggleTimer}
      />

      {worldFeatures?.characters && (
        <CharacterCard
          activePiece={activePiece}
          pieceNames={pieceNames}
          pieceNameLocked={pieceNameLocked}
          characterLibrary={characterLibrary}
          portraitAssets={portraitAssets}
          selectedToken={selectedToken}
          onSelectToken={onSelectToken}
          onNameChange={onNameChange}
          onLockName={onLockName}
          onUnlockName={onUnlockName}
          onAssignCharacter={onAssignCharacter}
        />
      )}

      {isPlayMode && (
        <MatchChatPanel
          sessionId={playSessionId}
          currentUserId={currentUserId}
          disabled={
            Boolean(playSessionId) && sessionLifecycleStatus !== "open"
          }
        />
      )}
    </aside>
  );
}

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

function TeamTray({
  team,
  worldTheme,
  pieceNames,
  characterLibrary,
  selectedTeam,
  selectedPiece,
  onSelectPiece,
  playerLabel = ""
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

  return (
    <section className="panel-box team-tray-box">
      <div className="team-tray-heading">
        <h2>{team === "black" ? "Black Team" : "White Team"}</h2>
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
                {assignedCharacter?.portrait ? (
                  <img
                    className="piece-tray-portrait"
                    src={assignedCharacter.portrait}
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

function TurnControlPanel({ turnTeam, moveNumber, onPassTurn }) {
  const teamLabel = turnTeam === "black" ? "Black" : "White";

  return (
    <section className="turn-strip" aria-label="Turn control">
      <div className="turn-strip-info">
        <span className="turn-strip-move">Move {moveNumber}</span>
        <span className="turn-strip-dot" aria-hidden="true">
          ·
        </span>
        <span className={`turn-strip-team ${turnTeam}`}>{teamLabel}</span>
      </div>

      <button
        type="button"
        className="turn-strip-pass"
        onClick={onPassTurn}
        disabled={typeof onPassTurn !== "function"}
        title="Pass turn to the other team"
      >
        Pass Turn
      </button>
    </section>
  );
}

export default function RightPanel({
  isPlayMode = false,
  worldFeatures,
  worldTheme,
  characterLibrary,
  worldTokens: _worldTokens,
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
        selectedTeam={selectedTeam}
        selectedPiece={selectedPiece}
        onSelectPiece={onSelectPiece}
        playerLabel={formatTrayPlayer(blackPlayer)}
      />

      {isPlayMode && (
        <TurnControlPanel
          turnTeam={turnTeam}
          moveNumber={moveNumber}
          onPassTurn={onPassTurn}
        />
      )}

      <TeamTray
        team="white"
        worldTheme={worldTheme}
        pieceNames={pieceNames}
        characterLibrary={characterLibrary}
        selectedTeam={selectedTeam}
        selectedPiece={selectedPiece}
        onSelectPiece={onSelectPiece}
        playerLabel={formatTrayPlayer(whitePlayer)}
      />

      {worldFeatures?.characters && (
        <CharacterCard
          activePiece={activePiece}
          pieceNames={pieceNames}
          pieceNameLocked={pieceNameLocked}
          characterLibrary={characterLibrary}
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

"use client";

import { useState } from "react";

import {
  DEFAULT_PIECES,
  GENERIC_TOKEN_SYMBOL,
  getPieceSkin,
  getPieceSymbol
} from "@/lib/defaultWorld";

import {
  GENERIC_PIECE_KEY,
  GENERIC_PIECE_LABEL,
  GENERIC_PIECE_SYMBOL
} from "@/lib/genericPiece";

import CharacterCard from "./CharacterCard";

function TeamTray({
  team,
  worldTheme,
  pieceNames,
  characterLibrary,
  selectedTeam,
  selectedPiece,
  onSelectPiece
}) {
  return (
    <section className="panel-box">
      <h2>{team === "black" ? "Black Team" : "White Team"}</h2>

      <div className="piece-row">
        {DEFAULT_PIECES.map((piece) => {
          const isSelected =
            selectedTeam === team && selectedPiece === piece.key;

          const pieceSkin = getPieceSkin(worldTheme, team, piece.key);
          const assignedCharacterName = pieceNames?.[team]?.[piece.key] || "";

          const characterList = Array.isArray(characterLibrary)
            ? characterLibrary
            : Object.values(characterLibrary || {});

          const assignedCharacter = characterList.find(
            (character) =>
              character.name?.trim().toLowerCase() ===
              assignedCharacterName.trim().toLowerCase()
          );

          return (
            <button
              key={piece.key}
              type="button"
              className={`piece-tray-button ${team} ${isSelected ? "active" : ""}`}
              title={`Select ${team} ${piece.label}`}
              onClick={() => onSelectPiece(team, piece.key)}
            >
              {assignedCharacter?.portrait ? (
                <div className="piece-tray-character-stack">
                  <img
                    className="piece-tray-portrait"
                    src={assignedCharacter.portrait}
                    alt={assignedCharacter.name}
                  />

                  <div className="piece-tray-identity-badge">
                    <span className="piece-tray-mini-symbol">
                      {getPieceSymbol(team, piece.key)}
                    </span>
                  </div>
                </div>
              ) : pieceSkin ? (
                <img
                  className="piece-tray-image"
                  src={pieceSkin}
                  alt={`${team} ${piece.label}`}
                />
              ) : (
                <span className="piece-tray-symbol">
                  {getPieceSymbol(team, piece.key)}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function TokenTray({
  worldTokens,
  selectedToken,
  selectedTeam,
  selectedPiece,
  onSelectToken,
  onSelectPiece
}) {
  const [isAddPieceOpen, setIsAddPieceOpen] = useState(false);

  const tokenList = Object.values(worldTokens).sort((a, b) =>
    a.label.localeCompare(b.label)
  );

  const isWhiteGenericSelected =
    selectedTeam === "white" && selectedPiece === GENERIC_PIECE_KEY;

  const isBlackGenericSelected =
    selectedTeam === "black" && selectedPiece === GENERIC_PIECE_KEY;

  return (
    <section className="panel-box">
      <h2>World Tokens</h2>

      <div className="generic-piece-tray">
        <button
          type="button"
          className={isAddPieceOpen ? "add-piece-toggle active" : "add-piece-toggle"}
          onClick={() => setIsAddPieceOpen((current) => !current)}
          aria-expanded={isAddPieceOpen}
        >
          + Add New Piece
        </button>

        {isAddPieceOpen && (
          <div className="generic-piece-tray-grid">
            <button
              type="button"
              className={
                isWhiteGenericSelected
                  ? "world-token-btn generic-piece-token-btn active"
                  : "world-token-btn generic-piece-token-btn"
              }
              onClick={() => onSelectPiece("white", GENERIC_PIECE_KEY)}
              title="Place a white generic piece. After placing it, click the piece to assign a character."
            >
              <span>{GENERIC_PIECE_SYMBOL}</span>
              <strong>White {GENERIC_PIECE_LABEL}</strong>
            </button>

            <button
              type="button"
              className={
                isBlackGenericSelected
                  ? "world-token-btn generic-piece-token-btn active"
                  : "world-token-btn generic-piece-token-btn"
              }
              onClick={() => onSelectPiece("black", GENERIC_PIECE_KEY)}
              title="Place a black generic piece. After placing it, click the piece to assign a character."
            >
              <span>{GENERIC_PIECE_SYMBOL}</span>
              <strong>Black {GENERIC_PIECE_LABEL}</strong>
            </button>
          </div>
        )}
      </div>

      {tokenList.length === 0 ? (
        <p className="small muted">No world tokens yet.</p>
      ) : (
        <div className="token-tray-list">
          {tokenList.map((token) => (
            <button
              key={token.name}
              type="button"
              className={
                selectedToken === token.name
                  ? "world-token-btn active"
                  : "world-token-btn"
              }
              onClick={() => onSelectToken(token.name)}
            >
              <span>{GENERIC_TOKEN_SYMBOL}</span>
              <strong>{token.label}</strong>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

export default function RightPanel({
  worldFeatures,
  worldTheme,
  characterLibrary,
  worldTokens,
  selectedTeam,
  selectedPiece,
  selectedToken,
  activePiece,
  pieceNames,
  pieceNameLocked,
  onClearSelections,
  onSelectPiece,
  onSelectToken,
  onNameChange,
  onLockName,
  onUnlockName,
  onAssignCharacter,
  selectedBoardAction,
  onDeletePiece,
  onStandardSetup,
  onClearBoard,
  onUndo,
  onRedo
}) {
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
      <section className="panel-box board-controls-box">
        <button
          type="button"
          className="primary-button standard-setup-btn"
          onClick={onStandardSetup}
        >
          Standard Setup
        </button>

        <div className="board-history-row">
          <button type="button" onClick={onUndo}>
            ↶ Undo
            <small>Ctrl+Z</small>
          </button>

          <button type="button" onClick={onRedo}>
            ↷ Redo
            <small>Ctrl+Y</small>
          </button>
        </div>

        <button
          type="button"
          className={
            selectedBoardAction === "delete-piece"
              ? "delete-piece-btn active"
              : "delete-piece-btn"
          }
          onClick={onDeletePiece}
          title="Delete selected piece, or activate delete piece tool"
        >
          Delete Piece
        </button>

        <button type="button" className="clear-board-btn" onClick={onClearBoard}>
          Clear Board
        </button>
      </section>

      <TeamTray
        team="black"
        worldTheme={worldTheme}
        pieceNames={pieceNames}
        characterLibrary={characterLibrary}
        selectedTeam={selectedTeam}
        selectedPiece={selectedPiece}
        onSelectPiece={onSelectPiece}
      />

      <TeamTray
        team="white"
        worldTheme={worldTheme}
        pieceNames={pieceNames}
        characterLibrary={characterLibrary}
        selectedTeam={selectedTeam}
        selectedPiece={selectedPiece}
        onSelectPiece={onSelectPiece}
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

      {worldFeatures.worldTokens && (
        <TokenTray
          worldTokens={worldTokens}
          selectedToken={selectedToken}
          selectedTeam={selectedTeam}
          selectedPiece={selectedPiece}
          onSelectToken={onSelectToken}
          onSelectPiece={onSelectPiece}
        />
      )}
    </aside>
  );
}

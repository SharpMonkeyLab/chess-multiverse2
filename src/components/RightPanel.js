import {
  DEFAULT_PIECES,
  GENERIC_TOKEN_SYMBOL,
  getPieceSymbol
} from "@/lib/defaultWorld";

import CharacterCard from "./CharacterCard";

function TeamTray({ team, selectedTeam, selectedPiece, onSelectPiece }) {
  return (
    <section className="panel-box">
      <h2>{team === "black" ? "Black Team" : "White Team"}</h2>

      <div className="piece-row">
        {DEFAULT_PIECES.map((piece) => {
          const isSelected =
            selectedTeam === team && selectedPiece === piece.key;

          return (
            <button
              key={piece.key}
              className={`piece-tray-button ${isSelected ? "active" : ""}`}
              title={`Select ${team} ${piece.label}`}
              onClick={() => onSelectPiece(team, piece.key)}
            >
              {getPieceSymbol(team, piece.key)}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function TokenTray({ worldTokens, selectedToken, onSelectToken }) {
  const tokenList = Object.values(worldTokens).sort((a, b) =>
    a.label.localeCompare(b.label)
  );

  return (
    <section className="panel-box">
      <h2>World Tokens</h2>

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
  characterLibrary,
  worldTokens,
  selectedTeam,
  selectedPiece,
  selectedToken,
  activePiece,
  pieceNames,
  pieceNameLocked,
  onSelectPiece,
  onSelectToken,
  onNameChange,
  onLockName,
  onUnlockName,
  onAssignCharacter,
  onStandardSetup,
  onClearBoard
}) {
  return (
    <aside className="right-panel">
      <button className="primary-button" onClick={onStandardSetup}>
        Standard Setup
      </button>

      <div className="board-action-row">
        <button>
          ↶ Undo
          <br />
          <small>Ctrl+Z</small>
        </button>

        <button onClick={onClearBoard}>
          Clear Board
        </button>
      </div>

      <TeamTray
        team="black"
        selectedTeam={selectedTeam}
        selectedPiece={selectedPiece}
        onSelectPiece={onSelectPiece}
      />

      <TeamTray
        team="white"
        selectedTeam={selectedTeam}
        selectedPiece={selectedPiece}
        onSelectPiece={onSelectPiece}
      />

      {worldFeatures.worldTokens && (
        <TokenTray
          worldTokens={worldTokens}
          selectedToken={selectedToken}
          onSelectToken={onSelectToken}
        />
      )}

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
    </aside>
  );
}
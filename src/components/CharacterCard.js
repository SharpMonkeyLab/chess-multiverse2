import {
  GENERIC_TOKEN_SYMBOL,
  getPieceDefinition,
  getPieceSymbol,
  humanizeTokenName
} from "@/lib/defaultWorld";
import { getCharacterByName } from "@/lib/csv";

export default function CharacterCard({
  activePiece,
  pieceNames,
  pieceNameLocked,
  characterLibrary,
  selectedToken,
  onNameChange,
  onLockName,
  onUnlockName,
  onAssignCharacter,
  onSelectToken
}) {
  if (!activePiece) {
    return (
      <section className="panel-box character-card-box">
        <h2>Character Card</h2>
        <p>Click a piece to edit/view a character.</p>
      </section>
    );
  }

  const { team, pieceKey } = activePiece;

  const piece = getPieceDefinition(pieceKey);
  const pieceLabel = piece?.label || pieceKey;
  const pieceSymbol = getPieceSymbol(team, pieceKey);

  const pieceName = pieceNames[team][pieceKey];
  const isLocked = pieceNameLocked[team][pieceKey];
  const matchedCharacter = getCharacterByName(characterLibrary, pieceName);
  const abilityTokens = matchedCharacter?.tokens || [];
  const characterOptions = Object.values(characterLibrary).sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  return (
    <section className="panel-box character-card-box">
      <h2>Character Card</h2>

      <div className="character-card-top">
        <div className={`character-card-symbol ${team}`}>
          {matchedCharacter?.portrait ? (
            <img
              className="character-card-portrait-img"
              src={matchedCharacter.portrait}
              alt={matchedCharacter.name}
            />
          ) : (
            pieceSymbol
          )}
        </div>

        <div className="character-card-info">
          <div className="character-card-piece-label">
            {team} {pieceLabel}
          </div>

          {isLocked ? (
            <button
              className="character-card-name-button"
              onClick={() => onUnlockName(team, pieceKey)}
              title="Click to edit character name"
            >
              {pieceName || "Unnamed Character"}
            </button>
          ) : (
            <>
              <input
                className="character-name-input"
                value={pieceName}
                placeholder="Character name"
                onChange={(event) =>
                  onNameChange(team, pieceKey, event.target.value)
                }
              />

              <button
                className="character-ok-btn"
                onClick={() => onLockName(team, pieceKey)}
              >
                OK / Lock
              </button>
            </>
          )}
        </div>
      </div>

      <div className="character-card-ability">
        {!pieceName ? (
          <div className="ability-empty">
            Type a character name and lock it to connect this piece to the Character Library.
          </div>
        ) : !matchedCharacter ? (
          <div className="ability-missing">
            <strong>No character found</strong>
            <span>
              Check that this name matches a character in the Character Library.
            </span>
          </div>
        ) : (
          <>
            <div className="ability-name">{matchedCharacter.ability}</div>

            <div className="ability-text">
              {matchedCharacter.description}
            </div>

            {matchedCharacter.cost && (
              <div className="ability-cost">
                Cost: {matchedCharacter.cost}
              </div>
            )}

            {abilityTokens.length > 0 && (
              <div className="ability-token-list">
                <div className="ability-token-title">Ability Tokens</div>

                {abilityTokens.map((tokenName) => (
                  <button
                    key={tokenName}
                    type="button"
                    className={
                      selectedToken === tokenName
                        ? "ability-token-btn active"
                        : "ability-token-btn"
                    }
                    onClick={() => onSelectToken(tokenName)}
                  >
                    <span className="ability-token-symbol">
                      {GENERIC_TOKEN_SYMBOL}
                    </span>

                    <span>{humanizeTokenName(tokenName)}</span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {!isLocked && characterOptions.length > 0 && (
        <div className="character-picker">
          <div className="character-picker-title">
            Choose from Character Library
          </div>

          <div className="character-picker-list">
            {characterOptions.map((character) => (
              <button
                key={character.name}
                className={
                  matchedCharacter?.name === character.name
                    ? "character-picker-btn active"
                    : "character-picker-btn"
                }
                onClick={() => onAssignCharacter(team, pieceKey, character.name)}
              >
                <div className="character-picker-portrait">
                  {character.portrait ? (
                    <img src={character.portrait} alt={character.name} />
                  ) : (
                    <span>{character.name.slice(0, 1).toUpperCase()}</span>
                  )}
                </div>

                <div className="character-picker-text">
                  <strong>{character.name}</strong>
                  <span>{character.ability || "No ability name"}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
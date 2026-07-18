"use client";

import { useState } from "react";

import {
  GENERIC_TOKEN_SYMBOL,
  getPieceDefinition,
  getPieceSymbol,
  humanizeTokenName
} from "@/lib/defaultWorld";

import { getCharacterByName } from "@/lib/csv";
import {
  GENERIC_PIECE_LABEL,
  GENERIC_PIECE_SYMBOL,
  isGenericPieceKey
} from "@/lib/genericPiece";

function getCharacterList(characterLibrary) {
  if (Array.isArray(characterLibrary)) {
    return characterLibrary.map((character, index) => ({
      ...character,
      pickerKey: character.id || `${character.name || "character"}-${index}`
    }));
  }

  return Object.entries(characterLibrary || {}).map(
    ([characterKey, character], index) => ({
      ...character,
      pickerKey: character.id || `${characterKey}-${index}`
    })
  );
}

function getCharacterAbilityName(character) {
  return character?.ability || character?.abilityName || character?.name || "Character";
}

function getCharacterDescription(character) {
  return character?.description || character?.abilityDescription || "";
}

function getCharacterTitle(character) {
  const name = character?.name || "Unnamed Character";
  const ability = getCharacterAbilityName(character);

  return `${name}: ${ability}`;
}

function humanizeFieldLabel(fieldKey) {
  return String(fieldKey || "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getVisibleCustomFields(character) {
  return Object.entries({
    ...(character?.meta || {}),
    ...(character?.customFields || {})
  })
    .filter(([, value]) => String(value || "").trim())
    .slice(0, 8)
    .map(([fieldKey, value]) => ({
      key: fieldKey,
      label: humanizeFieldLabel(fieldKey),
      value
    }));
}

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
  onSelectToken,
  onToggleCharacterDisplayMode
}) {
  const [pickerView, setPickerView] = useState("grid");

  if (!activePiece) {
    return (
      <section className="panel-box character-card-box">
        <div className="character-card-heading-row">
          <h2>Character Card</h2>
        </div>
        <p className="character-card-empty-hint">
          Select a piece from the tray to assign a character.
        </p>
      </section>
    );
  }

  const { team, pieceKey } = activePiece;
  const isGenericPiece = isGenericPieceKey(pieceKey);

  const piece = isGenericPiece ? null : getPieceDefinition(pieceKey);
  const pieceLabel = isGenericPiece
    ? GENERIC_PIECE_LABEL
    : piece?.label || pieceKey;

  const pieceSymbol = isGenericPiece
    ? GENERIC_PIECE_SYMBOL
    : getPieceSymbol(team, pieceKey);

  const pieceName = pieceNames?.[team]?.[pieceKey] || "";
  const isLocked = Boolean(pieceNameLocked?.[team]?.[pieceKey]);
  const matchedCharacter = getCharacterByName(characterLibrary, pieceName);

  const abilityTokens = matchedCharacter?.tokens || [];
  const visibleCustomFields = getVisibleCustomFields(matchedCharacter);

  const characterOptions = getCharacterList(characterLibrary).sort((a, b) =>
    (a.name || "").localeCompare(b.name || "")
  );

  const showAbilityPanel = Boolean(pieceName);

  return (
    <section className="panel-box character-card-box has-active-piece">
      <div className="character-card-heading-row">
        <h2>Character Card</h2>
      </div>

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
              type="button"
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
                type="button"
                onClick={() => onLockName(team, pieceKey)}
              >
                OK / Lock
              </button>
            </>
          )}
        </div>
      </div>

      {showAbilityPanel && (
        <div className="character-card-ability">
          {!matchedCharacter ? (
            <div className="ability-missing">
              <strong>No character found</strong>
              <span>
                Pick one from the library below, or type an exact character name.
              </span>
            </div>
          ) : (
            <>
              <div className="ability-name">
                {getCharacterAbilityName(matchedCharacter)}
              </div>

              <div className="ability-text">
                {getCharacterDescription(matchedCharacter)}
              </div>

              {matchedCharacter.cost && (
                <div className="ability-cost">
                  Cost: {matchedCharacter.cost}
                </div>
              )}

              {visibleCustomFields.length > 0 && (
                <div className="character-meta-chip-row">
                  {visibleCustomFields.map((field) => (
                    <span className="character-meta-chip" key={field.key}>
                      <strong>{field.label}</strong>
                      {field.value}
                    </span>
                  ))}
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
      )}

      {!isLocked && characterOptions.length > 0 && (
        <div className="character-picker">
          <div className="character-picker-header">
            <div className="character-picker-title">
              Character Library
            </div>

            <div className="character-picker-view-toggle">
              <button
                type="button"
                className={pickerView === "grid" ? "active" : ""}
                onClick={() => setPickerView("grid")}
              >
                Grid
              </button>

              <button
                type="button"
                className={pickerView === "list" ? "active" : ""}
                onClick={() => setPickerView("list")}
              >
                List
              </button>
            </div>
          </div>

          {pickerView === "grid" ? (
            <div className="character-picker-grid">
              {characterOptions.map((character) => (
                <button
                  key={character.pickerKey}
                  type="button"
                  className={
                    matchedCharacter?.name === character.name
                      ? "character-picker-grid-card active"
                      : "character-picker-grid-card"
                  }
                  title={getCharacterTitle(character)}
                  onClick={() =>
                    onAssignCharacter(team, pieceKey, character.name)
                  }
                >
                  {character.portrait ? (
                    <img src={character.portrait} alt={character.name} />
                  ) : (
                    <span>
                      {(character.name || "?").slice(0, 1).toUpperCase()}
                    </span>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="character-picker-list">
              {characterOptions.map((character) => (
                <button
                  key={character.pickerKey}
                  type="button"
                  className={
                    matchedCharacter?.name === character.name
                      ? "character-picker-btn active"
                      : "character-picker-btn"
                  }
                  title={getCharacterTitle(character)}
                  onClick={() =>
                    onAssignCharacter(team, pieceKey, character.name)
                  }
                >
                  <div className="character-picker-portrait">
                    {character.portrait ? (
                      <img src={character.portrait} alt={character.name} />
                    ) : (
                      <span>
                        {(character.name || "?").slice(0, 1).toUpperCase()}
                      </span>
                    )}
                  </div>

                  <div className="character-picker-text">
                    <strong>{character.name}</strong>
                    <span>{getCharacterAbilityName(character)}</span>

                    {getCharacterDescription(character) && (
                      <p>{getCharacterDescription(character)}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

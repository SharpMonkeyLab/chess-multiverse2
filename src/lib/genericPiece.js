export const GENERIC_PIECE_KEY = "generic-piece";
export const GENERIC_PIECE_LABEL = "Generic Piece";
export const GENERIC_PIECE_SYMBOL = "◆";

export function createGenericPieceInstanceKey() {
  const randomPart = Math.random().toString(36).slice(2, 8);

  return `${GENERIC_PIECE_KEY}-${Date.now()}-${randomPart}`;
}

export function isGenericPieceKey(pieceKey) {
  return typeof pieceKey === "string" && pieceKey.startsWith(GENERIC_PIECE_KEY);
}

export function resolvePlacementPieceKey(selectedPiece) {
  return selectedPiece === GENERIC_PIECE_KEY
    ? createGenericPieceInstanceKey()
    : selectedPiece;
}

export function registerGenericPieceInstance(
  team,
  placedPieceKey,
  setPieceNames,
  setPieceNameLocked
) {
  if (!team || !placedPieceKey) return;

  setPieceNames((currentNames) => ({
    ...currentNames,
    [team]: {
      ...(currentNames[team] || {}),
      [placedPieceKey]: ""
    }
  }));

  setPieceNameLocked((currentLocked) => ({
    ...currentLocked,
    [team]: {
      ...(currentLocked[team] || {}),
      [placedPieceKey]: false
    }
  }));
}

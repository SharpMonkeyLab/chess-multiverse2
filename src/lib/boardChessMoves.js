import { BOARD_SIZE } from "@/lib/defaultWorld";

const KNIGHT_DELTAS = [
    [-2, -1],
    [-2, 1],
    [-1, -2],
    [-1, 2],
    [1, -2],
    [1, 2],
    [2, -1],
    [2, 1]
];

const KING_DELTAS = [
    [-1, -1],
    [-1, 0],
    [-1, 1],
    [0, -1],
    [0, 1],
    [1, -1],
    [1, 0],
    [1, 1]
];

const BISHOP_RAYS = [
    [-1, -1],
    [-1, 1],
    [1, -1],
    [1, 1]
];

const ROOK_RAYS = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1]
];

const QUEEN_RAYS = [...BISHOP_RAYS, ...ROOK_RAYS];

export function indexToCoord(index) {
    return {
        row: Math.floor(index / BOARD_SIZE),
        col: index % BOARD_SIZE
    };
}

export function coordToIndex(row, col) {
    return row * BOARD_SIZE + col;
}

export function isOnBoard(row, col) {
    return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

function getCellAt(cells, row, col) {
    if (!isOnBoard(row, col) || !Array.isArray(cells)) {
        return null;
    }

    return cells[coordToIndex(row, col)] || null;
}

function normalizePieceType(pieceType) {
    if (!pieceType || typeof pieceType !== "string") {
        return "";
    }

    // Generic instances look like "generic-3" — not standard chess pieces.
    if (pieceType.startsWith("generic")) {
        return "";
    }

    return pieceType.toLowerCase();
}

function pushMove(moves, toIndex, flags) {
    moves.push({ toIndex, flags });
}

function addLeapMoves(cells, fromRow, fromCol, team, deltas, moves) {
    for (const [dRow, dCol] of deltas) {
        const row = fromRow + dRow;
        const col = fromCol + dCol;

        if (!isOnBoard(row, col)) continue;

        const target = getCellAt(cells, row, col);

        if (!target?.pieceType) {
            pushMove(moves, coordToIndex(row, col), ["quiet"]);
            continue;
        }

        if (target.team && target.team !== team) {
            pushMove(moves, coordToIndex(row, col), ["capture"]);
        }
    }
}

function addRayMoves(cells, fromRow, fromCol, team, rays, moves) {
    for (const [dRow, dCol] of rays) {
        let row = fromRow + dRow;
        let col = fromCol + dCol;

        while (isOnBoard(row, col)) {
            const target = getCellAt(cells, row, col);
            const toIndex = coordToIndex(row, col);

            if (!target?.pieceType) {
                pushMove(moves, toIndex, ["quiet"]);
            } else {
                if (target.team && target.team !== team) {
                    pushMove(moves, toIndex, ["capture"]);
                }
                break;
            }

            row += dRow;
            col += dCol;
        }
    }
}

function addPawnMoves(
    cells,
    fromRow,
    fromCol,
    team,
    enPassantTargetIndex,
    moves
) {
    const direction = team === "white" ? -1 : 1;
    const startRow = team === "white" ? BOARD_SIZE - 2 : 1;
    const promotionRow = team === "white" ? 0 : BOARD_SIZE - 1;

    const oneRow = fromRow + direction;
    if (isOnBoard(oneRow, fromCol)) {
        const ahead = getCellAt(cells, oneRow, fromCol);

        if (!ahead?.pieceType) {
            const flags = oneRow === promotionRow ? ["quiet", "promotion"] : ["quiet"];
            pushMove(moves, coordToIndex(oneRow, fromCol), flags);

            if (fromRow === startRow) {
                const twoRow = fromRow + direction * 2;
                const twoAhead = getCellAt(cells, twoRow, fromCol);

                if (isOnBoard(twoRow, fromCol) && !twoAhead?.pieceType) {
                    pushMove(moves, coordToIndex(twoRow, fromCol), [
                        "quiet",
                        "doublePawn"
                    ]);
                }
            }
        }
    }

    for (const dCol of [-1, 1]) {
        const captureRow = fromRow + direction;
        const captureCol = fromCol + dCol;

        if (!isOnBoard(captureRow, captureCol)) continue;

        const toIndex = coordToIndex(captureRow, captureCol);
        const target = getCellAt(cells, captureRow, captureCol);

        if (target?.pieceType && target.team && target.team !== team) {
            const flags =
                captureRow === promotionRow
                    ? ["capture", "promotion"]
                    : ["capture"];
            pushMove(moves, toIndex, flags);
            continue;
        }

        if (
            enPassantTargetIndex != null &&
            toIndex === enPassantTargetIndex
        ) {
            pushMove(moves, toIndex, ["capture", "enPassant"]);
        }
    }
}

/**
 * Pseudo-legal chess moves from a square (geometry + occupancy + EP).
 * Does not filter for king safety / check.
 */
export function getPseudoLegalMoves(
    cells,
    fromIndex,
    { enPassantTargetIndex = null } = {}
) {
    if (!Array.isArray(cells) || fromIndex == null) {
        return [];
    }

    const fromCell = cells[fromIndex];
    if (!fromCell?.pieceType || !fromCell?.team) {
        return [];
    }

    const pieceType = normalizePieceType(fromCell.pieceType);
    if (!pieceType) {
        return [];
    }

    const { row, col } = indexToCoord(fromIndex);
    const team = fromCell.team;
    const moves = [];

    switch (pieceType) {
        case "knight":
            addLeapMoves(cells, row, col, team, KNIGHT_DELTAS, moves);
            break;
        case "king":
            addLeapMoves(cells, row, col, team, KING_DELTAS, moves);
            break;
        case "bishop":
            addRayMoves(cells, row, col, team, BISHOP_RAYS, moves);
            break;
        case "rook":
            addRayMoves(cells, row, col, team, ROOK_RAYS, moves);
            break;
        case "queen":
            addRayMoves(cells, row, col, team, QUEEN_RAYS, moves);
            break;
        case "pawn":
            addPawnMoves(
                cells,
                row,
                col,
                team,
                enPassantTargetIndex,
                moves
            );
            break;
        default:
            break;
    }

    return moves;
}

export function findPseudoLegalMove(
    cells,
    fromIndex,
    toIndex,
    { enPassantTargetIndex = null } = {}
) {
    return (
        getPseudoLegalMoves(cells, fromIndex, { enPassantTargetIndex }).find(
            (move) => move.toIndex === toIndex
        ) || null
    );
}

export function isPseudoLegalMove(
    cells,
    fromIndex,
    toIndex,
    { enPassantTargetIndex = null } = {}
) {
    return Boolean(
        findPseudoLegalMove(cells, fromIndex, toIndex, {
            enPassantTargetIndex
        })
    );
}

export function getPseudoLegalMoveIndexes(
    cells,
    fromIndex,
    { enPassantTargetIndex = null } = {}
) {
    return getPseudoLegalMoves(cells, fromIndex, { enPassantTargetIndex }).map(
        (move) => move.toIndex
    );
}

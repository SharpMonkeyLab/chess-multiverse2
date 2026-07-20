import { applyChessMoveForPlay } from "@/lib/boardCellActions";
import {
    findPseudoLegalMove,
    getPseudoLegalMoveIndexes
} from "@/lib/boardChessMoves";

/**
 * Whether it is this viewer's turn to act.
 * Shared by Pass Turn lighting, piece pickup, and future move locks.
 */
export function isPlayersTurn({
    viewerTeam = "",
    turnTeam = "white",
    requireSeated = false
}) {
    if (!turnTeam) {
        return false;
    }

    if (requireSeated && !viewerTeam) {
        return false;
    }

    if (!viewerTeam) {
        return true;
    }

    return viewerTeam === turnTeam;
}

/**
 * Whether the viewer may pick up the piece on this cell in Play Mode.
 */
export function canPickPiece({
    cell,
    viewerTeam = "",
    turnTeam = "white",
    requireSeated = false
}) {
    if (!cell?.pieceType || !cell?.team) {
        return false;
    }

    if (
        !isPlayersTurn({
            viewerTeam,
            turnTeam,
            requireSeated
        })
    ) {
        return false;
    }

    if (cell.team !== turnTeam) {
        return false;
    }

    return true;
}

/**
 * Resolve a piece drop under Play Mode chess rules.
 * Tokens are not handled here.
 */
export function resolvePlayOccupantDrop({
    cells,
    movingPiece,
    toIndex,
    enPassantTargetIndex = null
}) {
    if (!Array.isArray(cells) || !movingPiece || movingPiece.kind === "token") {
        return { ok: false, reason: "invalid" };
    }

    const move = findPseudoLegalMove(cells, movingPiece.fromIndex, toIndex, {
        enPassantTargetIndex
    });

    if (!move) {
        return { ok: false, reason: "illegal" };
    }

    const applied = applyChessMoveForPlay(cells, movingPiece, move);

    return {
        ok: true,
        move,
        cells: applied.cells,
        enPassantTargetIndex: applied.enPassantTargetIndex
    };
}

export function getLegalMoveIndexesForPiece(
    cells,
    fromIndex,
    enPassantTargetIndex = null
) {
    return getPseudoLegalMoveIndexes(cells, fromIndex, {
        enPassantTargetIndex
    });
}

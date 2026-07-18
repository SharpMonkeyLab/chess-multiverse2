export function getCellCounters(cell) {
    return {
        ...(cell?.counters || {})
    };
}

export function cleanCounterValue(value) {
    const numberValue = Number(value);

    if (!Number.isFinite(numberValue) || numberValue === 0) {
        return null;
    }

    return numberValue;
}

export function adjustCounterOnCell(cell, counterKey, delta) {
    if (!cell || !counterKey) return;

    const counters = getCellCounters(cell);
    const currentValue = Number(counters[counterKey] || 0);
    const nextValue = cleanCounterValue(currentValue + delta);

    if (nextValue === null) {
        delete counters[counterKey];
    } else {
        counters[counterKey] = nextValue;
    }

    cell.counters = counters;
}

export function setCounterOnCell(cell, counterKey, value) {
    if (!cell || !counterKey) return;

    const counters = getCellCounters(cell);
    const nextValue = cleanCounterValue(value);

    if (nextValue === null) {
        delete counters[counterKey];
    } else {
        counters[counterKey] = nextValue;
    }

    cell.counters = counters;
}

export function clearCounterOnCell(cell, counterKey) {
    if (!cell || !counterKey) return;

    const counters = getCellCounters(cell);

    delete counters[counterKey];

    cell.counters = counters;
}

export function clearAllCountersOnCell(cell) {
    if (!cell) return;

    cell.counters = {};

    // Legacy cleanup from older single-counter system.
    cell.counter = "";
    cell.counterColor = "neutral";
}

export function toggleConditionOnCell(cell, conditionKey, shouldStack = false) {
    if (!cell || !conditionKey) return;

    const currentConditions = cell.conditions || [];

    if (shouldStack) {
        cell.conditions = [...currentConditions, conditionKey];
        return;
    }

    const alreadyHasCondition = currentConditions.includes(conditionKey);

    if (alreadyHasCondition) {
        cell.conditions = currentConditions.filter(
            (condition) => condition !== conditionKey
        );
        return;
    }

    cell.conditions = [...currentConditions, conditionKey];
}

export function clearConditionsOnCell(cell) {
    if (!cell) return;

    cell.conditions = [];
}

export function cloneCell(cell) {
    return {
        ...cell,
        conditions: [...(cell.conditions || [])],
        tokens: [...(cell.tokens || [])],
        counters: {
            ...(cell.counters || {})
        }
    };
}

export function updateCellAtIndex(cells, index, updateCell) {
    if (!Array.isArray(cells)) {
        return [];
    }

    return cells.map((cell, cellIndex) => {
        const nextCell = cloneCell(cell);

        if (cellIndex === index && typeof updateCell === "function") {
            updateCell(nextCell);
        }

        return nextCell;
    });
}

export function paintTerrainOnCell(cell, terrainKey) {
    if (!cell) return;

    cell.tile = terrainKey || "neutral";
}

export function clearTerrainOnCell(cell) {
    paintTerrainOnCell(cell, "neutral");
}

export function applyTerrainToCells(cells, terrainKey = "neutral") {
    if (!Array.isArray(cells)) {
        return [];
    }

    return cells.map((cell) => {
        const nextCell = cloneCell(cell);

        paintTerrainOnCell(nextCell, terrainKey);

        return nextCell;
    });
}

export function clearPieceFromCell(cell) {
    if (!cell) return;

    cell.pieceType = null;
    cell.team = null;

    // Legacy single-counter cleanup.
    cell.counter = "";
    cell.counterColor = "neutral";

    cell.counters = {};
    cell.conditions = [];
    cell.tokens = [];
}

export function clearCellOccupant(cell) {
    if (!cell) return;

    cell.pieceType = null;
    cell.team = null;
    cell.tokens = [];
}

export function clearOccupantMarkers(cell) {
    if (!cell) return;

    cell.counter = "";
    cell.counterColor = "neutral";
    cell.conditions = [];
}

export function getPrimaryToken(cell) {
    if (!cell?.tokens || cell.tokens.length === 0) return null;

    return cell.tokens[0];
}

export function cellHasOccupant(cell) {
    return Boolean(cell?.pieceType || getPrimaryToken(cell));
}

export function createMovingPiece(cell, index) {
    return {
        kind: "piece",
        fromIndex: index,
        pieceType: cell.pieceType,
        team: cell.team,
        counters: {
            ...(cell.counters || {})
        },
        conditions: [...(cell.conditions || [])],
        tokens: [...(cell.tokens || [])]
    };
}

export function createMovingToken(cell, index) {
    return {
        kind: "token",
        fromIndex: index,
        tokenName: getPrimaryToken(cell),

        // Current multi-counter system.
        counters: {
            ...(cell.counters || {})
        },

        // Legacy fields kept harmlessly for older saved test states.
        counter: cell.counter,
        counterColor: cell.counterColor,

        conditions: [...(cell.conditions || [])]
    };
}

// Creator placement keeps terrain/tile state and uses lighter occupant clearing.
export function placeTokenOnCellForCreator(cell, tokenName) {
    if (!cell || !tokenName) return;

    clearCellOccupant(cell);
    clearOccupantMarkers(cell);
    cell.tokens = [tokenName];
}

export function placePieceOnCellForCreator(cell, pieceType, team) {
    if (!cell || !pieceType || !team) return;

    clearCellOccupant(cell);
    cell.pieceType = pieceType;
    cell.team = team;
}

// Play placement fully clears prior occupant markers/counters/conditions.
export function placeTokenOnCellForPlay(cell, tokenName) {
    if (!cell || !tokenName) return;

    clearPieceFromCell(cell);
    cell.tokens = [tokenName];
}

export function placePieceOnCellForPlay(cell, pieceType, team) {
    if (!cell || !pieceType || !team) return;

    clearPieceFromCell(cell);
    cell.pieceType = pieceType;
    cell.team = team;
}

function applyMovingOccupantToTarget(targetCell, movingPiece) {
    if (!targetCell || !movingPiece) return;

    targetCell.counters = {
        ...(movingPiece.counters || {})
    };

    targetCell.conditions = [...(movingPiece.conditions || [])];

    if (movingPiece.kind === "token") {
        targetCell.tokens = [movingPiece.tokenName];
        return;
    }

    targetCell.pieceType = movingPiece.pieceType;
    targetCell.team = movingPiece.team;
}

// Creator move: lighter clear on target; clear source occupant + markers manually.
export function moveOccupantForCreator(cells, movingPiece, toIndex) {
    if (!Array.isArray(cells) || !movingPiece) {
        return Array.isArray(cells) ? cells : [];
    }

    const nextCells = cells.map(cloneCell);
    const sourceCell = nextCells[movingPiece.fromIndex];
    const targetCell = nextCells[toIndex];

    clearCellOccupant(targetCell);
    clearOccupantMarkers(targetCell);
    applyMovingOccupantToTarget(targetCell, movingPiece);

    if (movingPiece.kind !== "token") {
        targetCell.tokens = [];
    }

    clearCellOccupant(sourceCell);
    sourceCell.counter = "";
    sourceCell.counterColor = "neutral";
    sourceCell.counters = {};
    sourceCell.conditions = [];

    return nextCells;
}

// Play move: full clearPieceFromCell on both target and source.
export function moveOccupantForPlay(cells, movingPiece, toIndex) {
    if (!Array.isArray(cells) || !movingPiece) {
        return Array.isArray(cells) ? cells : [];
    }

    const nextCells = cells.map(cloneCell);
    const sourceCell = nextCells[movingPiece.fromIndex];
    const targetCell = nextCells[toIndex];

    clearPieceFromCell(targetCell);
    applyMovingOccupantToTarget(targetCell, movingPiece);
    clearPieceFromCell(sourceCell);

    return nextCells;
}
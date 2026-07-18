"use client";

import { useState } from "react";

function cloneCellForHistory(cell) {
    return {
        ...cell,
        conditions: [...(cell.conditions || [])],
        tokens: [...(cell.tokens || [])],
        counters: {
            ...(cell.counters || {})
        }
    };
}

function cloneCellsForHistory(cells) {
    return Array.isArray(cells)
        ? cells.map(cloneCellForHistory)
        : [];
}

function getCellsHistoryKey(cells) {
    return JSON.stringify(cells || []);
}

function findLatestDifferentHistoryIndex(history, currentCells) {
    const currentKey = getCellsHistoryKey(currentCells);

    for (let index = history.length - 1; index >= 0; index -= 1) {
        const historyKey = getCellsHistoryKey(history[index]);

        if (historyKey !== currentKey) {
            return index;
        }
    }

    return -1;
}

export function useLocalCellHistory({
    cells,
    setCells,
    maxHistory = 30,
    onAfterHistoryRestore = () => { }
}) {
    const [cellHistory, setCellHistory] = useState([]);
    const [cellFuture, setCellFuture] = useState([]);

    function clearLocalCellHistory() {
        setCellHistory([]);
        setCellFuture([]);
    }

    function updateCellsWithHistory(updateFunction) {
        const previousCells = cloneCellsForHistory(cells);
        const nextCells = updateFunction(previousCells);

        if (!Array.isArray(nextCells)) {
            return;
        }

        const previousKey = getCellsHistoryKey(previousCells);
        const nextKey = getCellsHistoryKey(nextCells);

        // Do not record an undo step if the board did not actually change.
        if (previousKey === nextKey) {
            return;
        }

        setCellHistory((currentHistory) => {
            const lastHistoryItem = currentHistory[currentHistory.length - 1];
            const lastHistoryKey = lastHistoryItem
                ? getCellsHistoryKey(lastHistoryItem)
                : "";

            // Avoid storing the same previous board twice in a row.
            const historyWithNextSnapshot =
                lastHistoryKey === previousKey
                    ? currentHistory
                    : [...currentHistory, previousCells];

            if (historyWithNextSnapshot.length > maxHistory) {
                return historyWithNextSnapshot.slice(
                    historyWithNextSnapshot.length - maxHistory
                );
            }

            return historyWithNextSnapshot;
        });

        setCellFuture([]);
        setCells(cloneCellsForHistory(nextCells));
    }

    function handleUndo() {
        if (cellHistory.length === 0) return;

        const currentCellsSnapshot = cloneCellsForHistory(cells);
        const targetHistoryIndex = findLatestDifferentHistoryIndex(
            cellHistory,
            currentCellsSnapshot
        );

        // If every history item is identical to the current board,
        // clear the useless history ghosts.
        if (targetHistoryIndex === -1) {
            setCellHistory([]);
            return;
        }

        const previousCells = cellHistory[targetHistoryIndex];

        setCellFuture((currentFuture) => [
            currentCellsSnapshot,
            ...currentFuture
        ]);

        // Remove the target item and any duplicate/current-state items after it.
        setCellHistory(cellHistory.slice(0, targetHistoryIndex));
        setCells(cloneCellsForHistory(previousCells));

        onAfterHistoryRestore();
    }

    function handleRedo() {
        if (cellFuture.length === 0) return;

        const currentCellsSnapshot = cloneCellsForHistory(cells);
        const currentKey = getCellsHistoryKey(currentCellsSnapshot);

        const targetFutureIndex = cellFuture.findIndex(
            (futureCells) => getCellsHistoryKey(futureCells) !== currentKey
        );

        if (targetFutureIndex === -1) {
            setCellFuture([]);
            return;
        }

        const nextCells = cellFuture[targetFutureIndex];

        setCellHistory((currentHistory) => {
            const lastHistoryItem = currentHistory[currentHistory.length - 1];
            const lastHistoryKey = lastHistoryItem
                ? getCellsHistoryKey(lastHistoryItem)
                : "";

            const nextHistory =
                lastHistoryKey === currentKey
                    ? currentHistory
                    : [...currentHistory, currentCellsSnapshot];

            if (nextHistory.length > maxHistory) {
                return nextHistory.slice(nextHistory.length - maxHistory);
            }

            return nextHistory;
        });

        setCellFuture(cellFuture.slice(targetFutureIndex + 1));
        setCells(cloneCellsForHistory(nextCells));

        onAfterHistoryRestore();
    }

    return {
        cellHistory,
        cellFuture,
        clearLocalCellHistory,
        updateCellsWithHistory,
        handleUndo,
        handleRedo
    };
}
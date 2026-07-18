export function createSessionGameState({
    cells,
    pieceNames,
    pieceNameLocked,
    turnTeam = "white",
    moveNumber = 1,
    actionLog = [],
    systemsRuntime = null
}) {
    return {
        version: 3,

        // Current match board.
        cells,

        // Current match character assignments.
        pieceNames,
        pieceNameLocked,

        // Current turn state.
        turnTeam,
        moveNumber,

        // Shared visible action history for this session.
        actionLog: Array.isArray(actionLog) ? actionLog : [],

        // Advanced systems runtime (decks, dice, timers, objectives, fog).
        systemsRuntime: systemsRuntime || null
    };
}

export function stableStringify(value) {
    if (value === undefined) {
        return "null";
    }

    if (value === null || typeof value !== "object") {
        return JSON.stringify(value) ?? "null";
    }

    if (Array.isArray(value)) {
        return `[${value.map((item) => stableStringify(item)).join(",")}]`;
    }

    const sortedKeys = Object.keys(value).sort();

    return `{${sortedKeys
        .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
        .join(",")}}`;
}

export function getGameStateJson(gameState) {
    // Supabase stores game_state as jsonb. jsonb can return object keys in a
    // different order from the original JavaScript object. A normal
    // JSON.stringify comparison can therefore think the state changed when the
    // board is actually identical, causing a save/sync echo loop.
    return stableStringify(gameState || {});
}

export function getActionSummaryFromGameStates(beforeGameState, afterGameState) {
    const beforeLatestEntry = beforeGameState?.actionLog?.[0];
    const afterLatestEntry = afterGameState?.actionLog?.[0];

    const hasNewVisibleAction =
        afterLatestEntry?.id &&
        afterLatestEntry.id !== beforeLatestEntry?.id;

    if (hasNewVisibleAction) {
        return {
            actionType: afterLatestEntry.category || "action",
            description: afterLatestEntry.message || "Match action."
        };
    }

    return {
        actionType: "board_update",
        description: "Updated match state."
    };
}
export function getTeamLabel(team) {
    return team === "black" ? "Black" : "White";
}

export function getPieceLabel(pieceNames, team, pieceKey) {
    if (!pieceKey) return "piece";

    const assignedName = pieceNames?.[team]?.[pieceKey];

    if (assignedName?.trim()) {
        return assignedName.trim();
    }

    return pieceKey;
}

export function createActionLogEntry({
    message,
    category = "action",
    turnTeam = "white",
    moveNumber = 1
}) {
    return {
        id:
            typeof crypto !== "undefined" && crypto.randomUUID
                ? crypto.randomUUID()
                : `${Date.now()}-${Math.random()}`,
        message,
        category,
        turnTeam,
        moveNumber,
        createdAt: new Date().toISOString()
    };
}

export function addActionLogEntryToLog(
    currentLog,
    {
        message,
        category = "action",
        turnTeam = "white",
        moveNumber = 1,
        maxActionLog = 40
    }
) {
    const nextEntry = createActionLogEntry({
        message,
        category,
        turnTeam,
        moveNumber
    });

    const safeCurrentLog = Array.isArray(currentLog) ? currentLog : [];
    const nextLog = [nextEntry, ...safeCurrentLog];

    return nextLog.slice(0, maxActionLog);
}
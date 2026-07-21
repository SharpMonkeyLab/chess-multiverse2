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

export function getActionActorLabel(team, sessionParticipants = []) {
    if (!Array.isArray(sessionParticipants)) {
        return getTeamLabel(team);
    }

    const participant = sessionParticipants.find(
        (entry) =>
            entry.team === team &&
            entry.participant_status !== "left" &&
            !entry.left_at
    );

    const displayName = participant?.displayName?.trim();
    if (displayName) {
        return displayName;
    }

    return getTeamLabel(team);
}

export function getColoredPieceLabel(pieceNames, team, pieceKey) {
    const color = team === "black" ? "black" : "white";
    return `${color} ${getPieceLabel(pieceNames, team, pieceKey)}`;
}

export function createActionLogEntry({
    message,
    category = "action",
    turnTeam = "white",
    moveNumber = 1,
    card = null
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
        card: card
            ? {
                  name: card.name || "Card",
                  effectHint: card.effectHint || "",
                  description: card.description || ""
              }
            : null,
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
        card = null,
        maxActionLog = 40
    }
) {
    const nextEntry = createActionLogEntry({
        message,
        category,
        turnTeam,
        moveNumber,
        card
    });

    const safeCurrentLog = Array.isArray(currentLog) ? currentLog : [];
    const nextLog = [nextEntry, ...safeCurrentLog];

    return nextLog.slice(0, maxActionLog);
}

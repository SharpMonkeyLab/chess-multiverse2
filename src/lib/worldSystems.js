import {
    DEFAULT_WORLD_FEATURES,
    DEFAULT_WORLD_MECHANICS,
    makeKeyFromLabel
} from "@/lib/defaultWorld";

export const ACCOUNT_CARDS_STORAGE_KEY = "chess-multiverse:account-cards";

export function normalizeWorldFeatures(features = {}) {
    const nextFeatures = {
        ...DEFAULT_WORLD_FEATURES,
        ...(features || {})
    };

    delete nextFeatures.playerStats;
    delete nextFeatures.worldTokens;

    return nextFeatures;
}

export function createDefaultCard() {
    const label = "New Card";

    return {
        key: `${makeKeyFromLabel(label)}-${Date.now()}`,
        name: label,
        description: "",
        effectHint: "Describe the board change this card should cause."
    };
}

export function createDefaultObjective() {
    const label = "New Objective";

    return {
        key: `${makeKeyFromLabel(label)}-${Date.now()}`,
        title: label,
        description: "",
        victoryHint: ""
    };
}

export function createDefaultDie() {
    return {
        key: `die-${Date.now()}`,
        label: "D6",
        sides: 6,
        count: 1
    };
}

export function normalizeWorldMechanics(mechanics = {}) {
    const source = mechanics || {};
    const defaults = DEFAULT_WORLD_MECHANICS;

    return {
        ...defaults,
        ...source,
        terrains: Array.isArray(source.terrains)
            ? source.terrains
            : defaults.terrains,
        counters: Array.isArray(source.counters)
            ? source.counters
            : defaults.counters,
        conditions: Array.isArray(source.conditions)
            ? source.conditions
            : defaults.conditions,
        counter: {
            ...defaults.counter,
            ...(source.counter || {})
        },
        cardDecks: {
            ...defaults.cardDecks,
            ...(source.cardDecks || {}),
            cards: Array.isArray(source.cardDecks?.cards)
                ? source.cardDecks.cards
                : defaults.cardDecks.cards
        },
        diceSystem: {
            ...defaults.diceSystem,
            ...(source.diceSystem || {}),
            dice: Array.isArray(source.diceSystem?.dice)
                ? source.diceSystem.dice
                : defaults.diceSystem.dice
        },
        timers: {
            ...defaults.timers,
            ...(source.timers || {})
        },
        objectives: {
            ...defaults.objectives,
            ...(source.objectives || {}),
            items: Array.isArray(source.objectives?.items)
                ? source.objectives.items
                : defaults.objectives.items
        },
        fogOfWar: {
            ...defaults.fogOfWar,
            ...(source.fogOfWar || {}),
            defaultFogCells: Array.isArray(source.fogOfWar?.defaultFogCells)
                ? source.fogOfWar.defaultFogCells
                : defaults.fogOfWar.defaultFogCells
        }
    };
}

export function shuffleList(items) {
    const nextItems = [...items];

    for (let index = nextItems.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(Math.random() * (index + 1));
        const temp = nextItems[index];
        nextItems[index] = nextItems[swapIndex];
        nextItems[swapIndex] = temp;
    }

    return nextItems;
}

export function readAccountCards() {
    if (typeof window === "undefined") return {};

    try {
        const rawValue = window.localStorage.getItem(ACCOUNT_CARDS_STORAGE_KEY);
        const parsedValue = rawValue ? JSON.parse(rawValue) : {};

        return parsedValue && typeof parsedValue === "object" ? parsedValue : {};
    } catch {
        return {};
    }
}

export function writeAccountCards(cardsByKey) {
    if (typeof window === "undefined") return;

    window.localStorage.setItem(
        ACCOUNT_CARDS_STORAGE_KEY,
        JSON.stringify(cardsByKey || {})
    );
}

export function collectWorldCardsIntoAccount(worldCards = []) {
    const owned = readAccountCards();

    worldCards.forEach((card) => {
        if (!card?.key) return;

        owned[card.key] = {
            ...card,
            ownedAt: owned[card.key]?.ownedAt || new Date().toISOString()
        };
    });

    writeAccountCards(owned);
    return owned;
}

export function getBuildableCardsForWorld(worldCards = []) {
    const owned = readAccountCards();
    const ownedKeys = new Set(Object.keys(owned));

    // Players build from cards they own that also exist in this world.
    // If they own none yet, unlock the world set into their account first.
    if (ownedKeys.size === 0 && worldCards.length > 0) {
        collectWorldCardsIntoAccount(worldCards);
        return worldCards.map((card) => ({ ...card }));
    }

    const fromAccount = worldCards.filter((card) => ownedKeys.has(card.key));

    return fromAccount.length > 0
        ? fromAccount.map((card) => ({ ...card }))
        : worldCards.map((card) => ({ ...card }));
}

export function buildShuffledLibrary(cards, deckSize) {
    const safeCards = Array.isArray(cards) ? cards.filter(Boolean) : [];
    const targetSize = Math.max(0, Number(deckSize) || 0);

    if (!safeCards.length || targetSize === 0) {
        return [];
    }

    const pool = [];

    while (pool.length < targetSize) {
        safeCards.forEach((card) => {
            if (pool.length >= targetSize) return;

            pool.push({
                ...card,
                instanceId: `${card.key}-${pool.length}-${Math.random()
                    .toString(36)
                    .slice(2, 7)}`
            });
        });
    }

    return shuffleList(pool).slice(0, targetSize);
}

export function dealOpeningHand(library, handSize) {
    const safeLibrary = [...(library || [])];
    const count = Math.max(0, Number(handSize) || 0);
    const hand = safeLibrary.splice(0, count);

    return {
        library: safeLibrary,
        hand
    };
}

export function resolveObjectivesForSetup(objectivesConfig, chosenKeys = []) {
    const items = Array.isArray(objectivesConfig?.items)
        ? objectivesConfig.items
        : [];
    const mode = objectivesConfig?.selectionMode || "player_choice";

    if (items.length === 0) {
        return [];
    }

    if (mode === "all") {
        return items.map((item) => ({ ...item }));
    }

    if (mode === "random") {
        const pickCount = Math.min(2, items.length);
        return shuffleList(items)
            .slice(0, pickCount)
            .map((item) => ({ ...item }));
    }

    const chosenSet = new Set(chosenKeys);
    const selected = items.filter((item) => chosenSet.has(item.key));

    return selected.length > 0
        ? selected.map((item) => ({ ...item }))
        : items.slice(0, 1).map((item) => ({ ...item }));
}

export function getSystemsSetupRequirements(worldFeatures, worldMechanics) {
    const features = normalizeWorldFeatures(worldFeatures);
    const mechanics = normalizeWorldMechanics(worldMechanics);

    // Flags kept for future in-play / pre-game setup UX.
    // needsAny stays false so Play never blocks behind a Match Setup overlay.
    const requirements = {
        needsObjectives: false,
        needsDeckBuild: false,
        needsDiceEdit: false,
        needsTimerEdit: false,
        needsAny: false
    };

    if (
        features.objectives &&
        mechanics.objectives.selectionMode === "player_choice" &&
        (mechanics.objectives.items || []).length > 0
    ) {
        requirements.needsObjectives = true;
    }

    if (
        features.cardDecks &&
        mechanics.cardDecks.allowPlayerDeckBuilding &&
        (mechanics.cardDecks.cards || []).length > 0
    ) {
        requirements.needsDeckBuild = true;
    }

    if (features.diceSystem && mechanics.diceSystem.mode === "player_editable") {
        requirements.needsDiceEdit = true;
    }

    if (features.timers && mechanics.timers.allowPlayerEdit) {
        requirements.needsTimerEdit = true;
    }

    return requirements;
}

function createTeamCardState(mechanics, selectedCardKeys = null) {
    const worldCards = mechanics.cardDecks.cards || [];
    const buildableCards = getBuildableCardsForWorld(worldCards);

    let sourceCards = buildableCards;

    if (Array.isArray(selectedCardKeys) && selectedCardKeys.length > 0) {
        const selectedSet = new Set(selectedCardKeys);
        sourceCards = buildableCards.filter((card) => selectedSet.has(card.key));

        if (sourceCards.length === 0) {
            sourceCards = buildableCards;
        }
    }

    const library = buildShuffledLibrary(
        sourceCards,
        mechanics.cardDecks.deckSize
    );
    const dealt = dealOpeningHand(
        library,
        mechanics.cardDecks.startingHandSize
    );

    return {
        library: dealt.library,
        hand: dealt.hand,
        discard: []
    };
}

export function createAdvancedSystemsRuntime({
    worldFeatures,
    worldMechanics,
    turnTeam = "white",
    setupChoices = null
}) {
    const features = normalizeWorldFeatures(worldFeatures);
    const mechanics = normalizeWorldMechanics(worldMechanics);
    const requirements = getSystemsSetupRequirements(features, mechanics);

    // Always complete: Play opens the raw board with universe defaults.
    // Future pre-game setup can pass setupChoices without gating behind an overlay.
    const runtime = {
        setup: {
            isComplete: true,
            requirements
        }
    };

    if (features.cardDecks) {
        collectWorldCardsIntoAccount(mechanics.cardDecks.cards || []);

        const whiteKeys = setupChoices?.deckCardKeys?.white || null;
        const blackKeys = setupChoices?.deckCardKeys?.black || null;

        runtime.cardDecks = {
            white: createTeamCardState(mechanics, whiteKeys),
            black: createTeamCardState(mechanics, blackKeys || whiteKeys),
            config: {
                deckSize: mechanics.cardDecks.deckSize,
                startingHandSize: mechanics.cardDecks.startingHandSize,
                allowPlayerDeckBuilding: mechanics.cardDecks.allowPlayerDeckBuilding,
                cardCount: mechanics.cardDecks.cards.length
            }
        };
    }

    if (features.diceSystem) {
        runtime.dice = {
            definitions: Array.isArray(setupChoices?.dice)
                ? setupChoices.dice
                : mechanics.diceSystem.dice,
            mode: mechanics.diceSystem.mode,
            allowReroll: mechanics.diceSystem.allowReroll,
            lastRoll: null
        };
    }

    if (features.timers) {
        const seconds = Math.max(
            5,
            Number(setupChoices?.timerSeconds ?? mechanics.timers.seconds) || 90
        );

        runtime.timers = {
            mode: setupChoices?.timerMode || mechanics.timers.mode,
            allowPlayerEdit: mechanics.timers.allowPlayerEdit,
            whiteRemaining: seconds,
            blackRemaining: seconds,
            turnSeconds: seconds,
            configuredSeconds: seconds,
            activeTeam: turnTeam,
            isRunning: false,
            flaggedTeam: null
        };
    }

    if (features.objectives) {
        runtime.objectives = {
            selectionMode: mechanics.objectives.selectionMode,
            available: mechanics.objectives.items,
            selected: resolveObjectivesForSetup(
                mechanics.objectives,
                setupChoices?.objectiveKeys || []
            ),
            completedKeys: []
        };
    }

    if (features.fogOfWar) {
        runtime.fogOfWar = {
            revealOwnPieces: mechanics.fogOfWar.revealOwnPieces,
            allowPlayerEdit: mechanics.fogOfWar.allowPlayerEdit,
            fogCells: [...(mechanics.fogOfWar.defaultFogCells || [])]
        };
    }

    return runtime;
}

export function applySystemsSetupChoices(runtime, worldFeatures, worldMechanics, setupChoices) {
    return createAdvancedSystemsRuntime({
        worldFeatures,
        worldMechanics,
        turnTeam: runtime?.timers?.activeTeam || "white",
        setupChoices: {
            ...setupChoices,
            // Force completion path even when requirements existed.
            completed: true
        }
    });
}

export function completeSystemsSetup(runtime) {
    if (!runtime) return runtime;

    return {
        ...runtime,
        setup: {
            ...(runtime.setup || {}),
            isComplete: true
        }
    };
}

export function toggleFogCell(fogCells, cellIndex) {
    const safeCells = Array.isArray(fogCells) ? [...fogCells] : [];
    const existingIndex = safeCells.indexOf(cellIndex);

    if (existingIndex >= 0) {
        safeCells.splice(existingIndex, 1);
    } else {
        safeCells.push(cellIndex);
    }

    return safeCells;
}

export function paintFogCell(fogCells, cellIndex) {
    const safeCells = Array.isArray(fogCells) ? [...fogCells] : [];

    if (!safeCells.includes(cellIndex)) {
        safeCells.push(cellIndex);
    }

    return safeCells;
}

export function clearFogCell(fogCells, cellIndex) {
    return (Array.isArray(fogCells) ? fogCells : []).filter(
        (index) => index !== cellIndex
    );
}

export function applyFogToWholeBoard(boardSize = 8) {
    const total = boardSize * boardSize;
    return Array.from({ length: total }, (_, index) => index);
}

export function isPieceHiddenByFog({
    cellIndex,
    cellTeam,
    viewerTeam,
    fogCells,
    revealOwnPieces = true
}) {
    if (!Array.isArray(fogCells) || !fogCells.includes(cellIndex)) {
        return false;
    }

    if (!cellTeam) {
        return false;
    }

    // Local free view / unknown viewer: still hide nothing for setup convenience
    // unless a viewer team is known.
    if (!viewerTeam) {
        return false;
    }

    if (cellTeam === viewerTeam) {
        return revealOwnPieces === false;
    }

    return true;
}

export function tickTimers(timers, turnTeam = "white") {
    if (!timers || !timers.isRunning) {
        return timers;
    }

    if (timers.mode === "per_side_total") {
        const teamKey =
            turnTeam === "black" ? "blackRemaining" : "whiteRemaining";
        const nextRemaining = Math.max(0, (Number(timers[teamKey]) || 0) - 1);
        const flagged = nextRemaining <= 0;

        return {
            ...timers,
            [teamKey]: nextRemaining,
            flaggedTeam: flagged ? turnTeam : timers.flaggedTeam,
            isRunning: flagged ? false : timers.isRunning
        };
    }

    const nextTurnSeconds = Math.max(0, (Number(timers.turnSeconds) || 0) - 1);
    const flagged = nextTurnSeconds <= 0;

    return {
        ...timers,
        turnSeconds: nextTurnSeconds,
        flaggedTeam: flagged ? turnTeam : timers.flaggedTeam,
        isRunning: flagged ? false : timers.isRunning
    };
}

export function resetTurnTimer(timers, nextTeam) {
    if (!timers) return timers;

    if (timers.mode === "per_side_total") {
        return {
            ...timers,
            activeTeam: nextTeam
        };
    }

    return {
        ...timers,
        activeTeam: nextTeam,
        turnSeconds: Number(timers.configuredSeconds) || Number(timers.turnSeconds) || 90
    };
}

export function rollDiceDefinitions(definitions = []) {
    return (definitions || []).flatMap((die) => {
        const count = Math.max(1, Number(die.count) || 1);
        const sides = Math.max(2, Number(die.sides) || 6);

        return Array.from({ length: count }, () => ({
            label: die.label || `D${sides}`,
            value: 1 + Math.floor(Math.random() * sides)
        }));
    });
}

export function hasAnyAdvancedPlaySystem(worldFeatures = {}) {
    const features = normalizeWorldFeatures(worldFeatures);

    return Boolean(
        features.cardDecks ||
            features.diceSystem ||
            features.timers ||
            features.objectives ||
            features.fogOfWar
    );
}

export function getViewerTeam(sessionParticipants, currentUserId) {
    if (!currentUserId || !Array.isArray(sessionParticipants)) {
        return "";
    }

    const participant = sessionParticipants.find(
        (entry) =>
            entry.user_id === currentUserId &&
            entry.participant_status !== "left" &&
            !entry.left_at
    );

    return participant?.team || "";
}

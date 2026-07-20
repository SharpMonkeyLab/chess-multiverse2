"use client";

import { useEffect, useMemo, useState } from "react";

import SystemsSetupOverlay from "./SystemsSetupOverlay";

import {
    completeSystemsSetup,
    createAdvancedSystemsRuntime,
    getMatchLoadoutCatalog,
    hasAnyAdvancedPlaySystem,
    normalizeWorldFeatures,
    normalizeWorldMechanics,
    rollDiceDefinitions,
    tickTimers
} from "@/lib/worldSystems";

function formatClock(totalSeconds) {
    const safeSeconds = Math.max(0, Number(totalSeconds) || 0);
    const minutes = Math.floor(safeSeconds / 60);
    const seconds = safeSeconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export default function PlaySystemsDock({
    worldFeatures,
    worldMechanics,
    systemsRuntime,
    onSystemsRuntimeChange,
    turnTeam = "white",
    isPlayMode = true,
    onLogAction = () => {}
}) {
    const features = normalizeWorldFeatures(worldFeatures);
    const mechanics = normalizeWorldMechanics(worldMechanics);
    const [selectedCardInstanceId, setSelectedCardInstanceId] = useState("");

    const showDock = hasAnyAdvancedPlaySystem(features);
    const setupIncomplete =
        Boolean(systemsRuntime?.setup) && !systemsRuntime.setup.isComplete;
    const loadoutCatalog = useMemo(
        () => getMatchLoadoutCatalog(features, mechanics),
        [features, mechanics]
    );

    const activeHand = systemsRuntime?.cardDecks?.[turnTeam]?.hand || [];
    const libraryCount = systemsRuntime?.cardDecks?.[turnTeam]?.library?.length || 0;

    const selectedObjectives = useMemo(() => {
        return systemsRuntime?.objectives?.selected || [];
    }, [systemsRuntime]);

    useEffect(() => {
        if (!systemsRuntime?.timers || !systemsRuntime.timers.isRunning) {
            return undefined;
        }

        const intervalId = window.setInterval(() => {
            onSystemsRuntimeChange?.((currentRuntime) => {
                if (!currentRuntime?.timers?.isRunning) {
                    return currentRuntime;
                }

                return {
                    ...currentRuntime,
                    timers: tickTimers(currentRuntime.timers, turnTeam)
                };
            });
        }, 1000);

        return () => window.clearInterval(intervalId);
    }, [
        systemsRuntime?.timers?.isRunning,
        turnTeam,
        onSystemsRuntimeChange
    ]);

    if (!isPlayMode || (!showDock && !setupIncomplete)) {
        return null;
    }

    function updateRuntime(patchOrUpdater) {
        if (typeof patchOrUpdater === "function") {
            onSystemsRuntimeChange?.(patchOrUpdater);
            return;
        }

        onSystemsRuntimeChange?.((current) => ({
            ...(current || {}),
            ...patchOrUpdater
        }));
    }

    function handleSetupConfirm(setupChoices) {
        const nextRuntime = createAdvancedSystemsRuntime({
            worldFeatures: features,
            worldMechanics: mechanics,
            turnTeam,
            setupChoices
        });

        onSystemsRuntimeChange?.(completeSystemsSetup(nextRuntime));
        onLogAction("Match started. Play tools locked to loadout.", "systems");
    }

    function handleSetupDefaults() {
        const nextRuntime = createAdvancedSystemsRuntime({
            worldFeatures: features,
            worldMechanics: mechanics,
            turnTeam,
            setupChoices: {
                terrainKeys: loadoutCatalog.terrainKeys,
                counterKeys: loadoutCatalog.counterKeys,
                conditionKeys: loadoutCatalog.conditionKeys,
                objectiveKeys: (mechanics.objectives.items || [])
                    .slice(0, 1)
                    .map((item) => item.key),
                deckCardKeys: {
                    white: (mechanics.cardDecks.cards || []).map((card) => card.key),
                    black: (mechanics.cardDecks.cards || []).map((card) => card.key)
                },
                dice: mechanics.diceSystem.dice,
                timerSeconds: mechanics.timers.seconds,
                timerMode: mechanics.timers.mode
            }
        });

        onSystemsRuntimeChange?.(completeSystemsSetup(nextRuntime));
        onLogAction("Match started with default loadout.", "systems");
    }

    function handleDrawCard() {
        if (!systemsRuntime?.cardDecks) return;

        const teamState = systemsRuntime.cardDecks[turnTeam] || {
            library: [],
            hand: [],
            discard: []
        };

        const library = [...(teamState.library || [])];

        if (library.length === 0) {
            onLogAction(`${turnTeam} library is empty.`, "cards");
            return;
        }

        const [drawnCard, ...rest] = library;

        updateRuntime({
            cardDecks: {
                ...systemsRuntime.cardDecks,
                [turnTeam]: {
                    ...teamState,
                    library: rest,
                    hand: [...(teamState.hand || []), drawnCard]
                }
            }
        });

        onLogAction(
            `${turnTeam} drew ${drawnCard.name || "a card"}.`,
            "cards"
        );
    }

    function handlePlaySelectedCard() {
        if (!selectedCardInstanceId || !systemsRuntime?.cardDecks) return;

        const teamState = systemsRuntime.cardDecks[turnTeam];
        const hand = teamState?.hand || [];
        const playedCard = hand.find(
            (card) =>
                (card.instanceId || card.key) === selectedCardInstanceId
        );

        if (!playedCard) return;

        updateRuntime({
            cardDecks: {
                ...systemsRuntime.cardDecks,
                [turnTeam]: {
                    ...teamState,
                    hand: hand.filter(
                        (card) =>
                            (card.instanceId || card.key) !== selectedCardInstanceId
                    ),
                    discard: [...(teamState.discard || []), playedCard]
                }
            }
        });

        setSelectedCardInstanceId("");
        onLogAction(
            `${turnTeam} played ${playedCard.name || "a card"}${
                playedCard.effectHint ? ` — ${playedCard.effectHint}` : ""
            }. Modify the board to resolve the effect.`,
            "cards"
        );
    }

    function handleRollDice({ isReroll = false } = {}) {
        if (!systemsRuntime?.dice) return;

        if (isReroll && !systemsRuntime.dice.allowReroll) {
            return;
        }

        const results = rollDiceDefinitions(systemsRuntime.dice.definitions);

        updateRuntime({
            dice: {
                ...systemsRuntime.dice,
                lastRoll: {
                    at: new Date().toISOString(),
                    results,
                    isReroll
                }
            }
        });

        onLogAction(
            `${isReroll ? "Reroll" : "Roll"}: ${results
                .map((result) => `${result.label} ${result.value}`)
                .join(", ")}.`,
            "dice"
        );
    }

    function handleToggleTimer() {
        if (!systemsRuntime?.timers) return;

        updateRuntime({
            timers: {
                ...systemsRuntime.timers,
                isRunning: !systemsRuntime.timers.isRunning
            }
        });
    }

    function handleToggleObjectiveComplete(objectiveKey) {
        if (!systemsRuntime?.objectives) return;

        const completedKeys = new Set(
            systemsRuntime.objectives.completedKeys || []
        );

        if (completedKeys.has(objectiveKey)) {
            completedKeys.delete(objectiveKey);
        } else {
            completedKeys.add(objectiveKey);
        }

        updateRuntime({
            objectives: {
                ...systemsRuntime.objectives,
                completedKeys: Array.from(completedKeys)
            }
        });
    }

    return (
        <>
            {setupIncomplete && (
                <SystemsSetupOverlay
                    worldFeatures={features}
                    worldMechanics={mechanics}
                    onConfirm={handleSetupConfirm}
                    onSkipDefaults={handleSetupDefaults}
                />
            )}

            {showDock && (
            <section className="play-systems-dock" aria-label="Advanced play systems">
                {features.timers && systemsRuntime?.timers && (
                    <div className="play-system-card">
                        <h3>Timer</h3>
                        <p className="play-system-clock">
                            {systemsRuntime.timers.mode === "per_side_total"
                                ? `W ${formatClock(systemsRuntime.timers.whiteRemaining)} · B ${formatClock(systemsRuntime.timers.blackRemaining)}`
                                : formatClock(systemsRuntime.timers.turnSeconds)}
                        </p>
                        <div className="play-system-card-actions">
                            <button type="button" onClick={handleToggleTimer}>
                                {systemsRuntime.timers.isRunning ? "Pause" : "Start"}
                            </button>
                        </div>
                        <p className="small muted">
                            {systemsRuntime.timers.mode === "per_side_total"
                                ? "Per side total"
                                : "Per turn"}
                            {systemsRuntime.timers.flaggedTeam
                                ? ` · ${systemsRuntime.timers.flaggedTeam} flagged`
                                : ""}
                        </p>
                    </div>
                )}

                {features.diceSystem && systemsRuntime?.dice && (
                    <div className="play-system-card">
                        <h3>Dice</h3>
                        <div className="play-system-card-actions">
                            <button type="button" onClick={() => handleRollDice()}>
                                Roll
                            </button>
                            {systemsRuntime.dice.allowReroll && (
                                <button
                                    type="button"
                                    disabled={!systemsRuntime.dice.lastRoll}
                                    onClick={() => handleRollDice({ isReroll: true })}
                                >
                                    Reroll
                                </button>
                            )}
                        </div>
                        {systemsRuntime.dice.lastRoll ? (
                            <p className="play-system-roll">
                                {systemsRuntime.dice.lastRoll.results
                                    .map((result) => `${result.label}: ${result.value}`)
                                    .join(" · ")}
                            </p>
                        ) : (
                            <p className="small muted">No rolls yet.</p>
                        )}
                    </div>
                )}

                {features.cardDecks && systemsRuntime?.cardDecks && (
                    <div className="play-system-card play-system-card-wide">
                        <h3>Cards · {turnTeam} · {libraryCount} left</h3>
                        <div className="play-system-card-actions">
                            <button type="button" onClick={handleDrawCard}>
                                Draw
                            </button>
                            <button
                                type="button"
                                disabled={!selectedCardInstanceId}
                                onClick={handlePlaySelectedCard}
                            >
                                Play Selected
                            </button>
                        </div>
                        <div className="play-system-hand">
                            {activeHand.length === 0 ? (
                                <p className="small muted">Hand empty — draw a card.</p>
                            ) : (
                                activeHand.map((card) => {
                                    const cardId = card.instanceId || card.key;

                                    return (
                                        <button
                                            type="button"
                                            key={cardId}
                                            className={
                                                selectedCardInstanceId === cardId
                                                    ? "play-hand-card active"
                                                    : "play-hand-card"
                                            }
                                            onClick={() => setSelectedCardInstanceId(cardId)}
                                            title={card.effectHint || card.description || ""}
                                        >
                                            <strong>{card.name || "Card"}</strong>
                                            <small>
                                                {card.effectHint ||
                                                    card.description ||
                                                    "Play, then edit the board"}
                                            </small>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>
                )}

                {features.objectives && systemsRuntime?.objectives && (
                    <div className="play-system-card">
                        <h3>Objectives</h3>
                        {selectedObjectives.length === 0 ? (
                            <p className="small muted">No objectives selected.</p>
                        ) : (
                            <ul className="play-system-objectives">
                                {selectedObjectives.map((item) => {
                                    const isComplete = (
                                        systemsRuntime.objectives.completedKeys || []
                                    ).includes(item.key);

                                    return (
                                        <li key={item.key}>
                                            <button
                                                type="button"
                                                className={
                                                    isComplete
                                                        ? "play-objective-toggle done"
                                                        : "play-objective-toggle"
                                                }
                                                onClick={() =>
                                                    handleToggleObjectiveComplete(item.key)
                                                }
                                            >
                                                {isComplete ? "✓ " : ""}
                                                {item.title || "Objective"}
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>
                )}

                {features.fogOfWar && systemsRuntime?.fogOfWar && (
                    <div className="play-system-card">
                        <h3>Fog of War</h3>
                        <p className="small muted">
                            {(systemsRuntime.fogOfWar.fogCells || []).length} fogged
                            cells. Enemy pieces inside fog stay hidden.
                        </p>
                        {systemsRuntime.fogOfWar.allowPlayerEdit ? (
                            <p className="small muted">
                                Use Fog tools in the left panel to paint or clear.
                            </p>
                        ) : (
                            <p className="small muted">Fog zones are fixed by the creator.</p>
                        )}
                    </div>
                )}
            </section>
            )}
        </>
    );
}

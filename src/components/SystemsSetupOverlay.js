"use client";

import { useEffect, useMemo, useState } from "react";

import {
    getBuildableCardsForWorld,
    normalizeWorldFeatures,
    normalizeWorldMechanics,
    resolveObjectivesForSetup
} from "@/lib/worldSystems";

export default function SystemsSetupOverlay({
    worldFeatures,
    worldMechanics,
    onConfirm,
    onSkipDefaults
}) {
    const features = normalizeWorldFeatures(worldFeatures);
    const mechanics = normalizeWorldMechanics(worldMechanics);

    const buildableCards = useMemo(
        () => getBuildableCardsForWorld(mechanics.cardDecks.cards || []),
        [mechanics.cardDecks.cards]
    );

    const [objectiveKeys, setObjectiveKeys] = useState([]);
    const [deckCardKeys, setDeckCardKeys] = useState([]);
    const [dice, setDice] = useState(mechanics.diceSystem.dice || []);
    const [timerSeconds, setTimerSeconds] = useState(
        mechanics.timers.seconds || 90
    );
    const [timerMode, setTimerMode] = useState(
        mechanics.timers.mode || "per_turn"
    );

    useEffect(() => {
        const items = mechanics.objectives.items || [];

        if (
            features.objectives &&
            mechanics.objectives.selectionMode === "player_choice" &&
            items.length > 0
        ) {
            setObjectiveKeys([items[0].key]);
        }

        if (
            features.cardDecks &&
            mechanics.cardDecks.allowPlayerDeckBuilding &&
            buildableCards.length > 0
        ) {
            setDeckCardKeys(buildableCards.slice(0, Math.min(8, buildableCards.length)).map((card) => card.key));
        }
    }, [
        features.objectives,
        features.cardDecks,
        mechanics.objectives,
        mechanics.cardDecks.allowPlayerDeckBuilding,
        buildableCards
    ]);

    function toggleObjective(key) {
        setObjectiveKeys((current) =>
            current.includes(key)
                ? current.filter((item) => item !== key)
                : [...current, key]
        );
    }

    function toggleDeckCard(key) {
        setDeckCardKeys((current) =>
            current.includes(key)
                ? current.filter((item) => item !== key)
                : [...current, key]
        );
    }

    function updateDie(index, field, value) {
        setDice((current) =>
            current.map((die, dieIndex) =>
                dieIndex === index ? { ...die, [field]: value } : die
            )
        );
    }

    function handleConfirm() {
        onConfirm({
            objectiveKeys,
            deckCardKeys: {
                white: deckCardKeys,
                black: deckCardKeys
            },
            dice,
            timerSeconds,
            timerMode
        });
    }

    const previewObjectives = resolveObjectivesForSetup(
        mechanics.objectives,
        objectiveKeys
    );

    return (
        <div className="systems-setup-overlay" role="dialog" aria-label="Match systems setup">
            <div className="systems-setup-panel">
                <header>
                    <h2>Match Setup</h2>
                    <p>
                        Configure this universe&apos;s advanced systems before play.
                    </p>
                </header>

                {features.objectives &&
                    mechanics.objectives.selectionMode === "player_choice" && (
                        <section>
                            <h3>Objectives</h3>
                            <p className="small muted">Choose one or more missions.</p>
                            <div className="systems-setup-chip-row">
                                {(mechanics.objectives.items || []).map((item) => (
                                    <button
                                        type="button"
                                        key={item.key}
                                        className={
                                            objectiveKeys.includes(item.key)
                                                ? "systems-setup-chip active"
                                                : "systems-setup-chip"
                                        }
                                        onClick={() => toggleObjective(item.key)}
                                    >
                                        {item.title || "Objective"}
                                    </button>
                                ))}
                            </div>
                            {previewObjectives.length > 0 && (
                                <p className="small muted">
                                    Selected:{" "}
                                    {previewObjectives
                                        .map((item) => item.title)
                                        .join(", ")}
                                </p>
                            )}
                        </section>
                    )}

                {features.cardDecks &&
                    mechanics.cardDecks.allowPlayerDeckBuilding && (
                        <section>
                            <h3>Build Deck</h3>
                            <p className="small muted">
                                Pick cards you own that are legal in this universe. Both
                                sides use this pool for now.
                            </p>
                            <div className="systems-setup-chip-row">
                                {buildableCards.map((card) => (
                                    <button
                                        type="button"
                                        key={card.key}
                                        className={
                                            deckCardKeys.includes(card.key)
                                                ? "systems-setup-chip active"
                                                : "systems-setup-chip"
                                        }
                                        onClick={() => toggleDeckCard(card.key)}
                                        title={card.effectHint || card.description || ""}
                                    >
                                        {card.name || "Card"}
                                    </button>
                                ))}
                            </div>
                        </section>
                    )}

                {features.diceSystem &&
                    mechanics.diceSystem.mode === "player_editable" && (
                        <section>
                            <h3>Dice</h3>
                            <div className="systems-setup-dice-list">
                                {dice.map((die, index) => (
                                    <div className="systems-setup-dice-row" key={die.key || index}>
                                        <input
                                            value={die.label || ""}
                                            onChange={(event) =>
                                                updateDie(index, "label", event.target.value)
                                            }
                                        />
                                        <label>
                                            Sides
                                            <input
                                                type="number"
                                                min="2"
                                                max="100"
                                                value={die.sides ?? 6}
                                                onChange={(event) =>
                                                    updateDie(
                                                        index,
                                                        "sides",
                                                        Number(event.target.value) || 6
                                                    )
                                                }
                                            />
                                        </label>
                                        <label>
                                            Count
                                            <input
                                                type="number"
                                                min="1"
                                                max="12"
                                                value={die.count ?? 1}
                                                onChange={(event) =>
                                                    updateDie(
                                                        index,
                                                        "count",
                                                        Number(event.target.value) || 1
                                                    )
                                                }
                                            />
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                {features.timers && mechanics.timers.allowPlayerEdit && (
                    <section>
                        <h3>Timer</h3>
                        <div className="systems-setup-grid">
                            <label>
                                Mode
                                <select
                                    value={timerMode}
                                    onChange={(event) => setTimerMode(event.target.value)}
                                >
                                    <option value="per_turn">Per turn</option>
                                    <option value="per_side_total">Per side total</option>
                                </select>
                            </label>
                            <label>
                                Seconds
                                <input
                                    type="number"
                                    min="5"
                                    max="7200"
                                    value={timerSeconds}
                                    onChange={(event) =>
                                        setTimerSeconds(Number(event.target.value) || 90)
                                    }
                                />
                            </label>
                        </div>
                    </section>
                )}

                <footer className="systems-setup-actions">
                    <button type="button" className="systems-setup-secondary" onClick={onSkipDefaults}>
                        Use defaults
                    </button>
                    <button type="button" className="systems-setup-primary" onClick={handleConfirm}>
                        Start with these settings
                    </button>
                </footer>
            </div>
        </div>
    );
}

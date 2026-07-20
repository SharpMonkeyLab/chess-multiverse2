"use client";

import { useEffect, useMemo, useState } from "react";

import {
    getBuildableCardsForWorld,
    getMatchLoadoutCatalog,
    normalizeWorldFeatures,
    normalizeWorldMechanics,
    resolveObjectivesForSetup
} from "@/lib/worldSystems";

function toggleKey(list, key) {
    return list.includes(key)
        ? list.filter((item) => item !== key)
        : [...list, key];
}

export default function SystemsSetupOverlay({
    worldFeatures,
    worldMechanics,
    onConfirm,
    onSkipDefaults
}) {
    const features = normalizeWorldFeatures(worldFeatures);
    const mechanics = normalizeWorldMechanics(worldMechanics);
    const loadoutCatalog = useMemo(
        () => getMatchLoadoutCatalog(features, mechanics),
        [features, mechanics]
    );

    const buildableCards = useMemo(
        () => getBuildableCardsForWorld(mechanics.cardDecks.cards || []),
        [mechanics.cardDecks.cards]
    );

    const [terrainKeys, setTerrainKeys] = useState([]);
    const [counterKeys, setCounterKeys] = useState([]);
    const [conditionKeys, setConditionKeys] = useState([]);
    const [objectiveKeys, setObjectiveKeys] = useState([]);
    const [deckCardKeys, setDeckCardKeys] = useState([]);
    const [dice, setDice] = useState(mechanics.diceSystem.dice || []);
    const [timerSeconds, setTimerSeconds] = useState(
        mechanics.timers.seconds || 90
    );
    const [timerMode, setTimerMode] = useState(
        mechanics.timers.mode || "per_turn"
    );
    const [isStarting, setIsStarting] = useState(false);

    useEffect(() => {
        setTerrainKeys(loadoutCatalog.terrainKeys);
        setCounterKeys(loadoutCatalog.counterKeys);
        setConditionKeys(loadoutCatalog.conditionKeys);
    }, [loadoutCatalog]);

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
            setDeckCardKeys(
                buildableCards
                    .slice(0, Math.min(8, buildableCards.length))
                    .map((card) => card.key)
            );
        }
    }, [
        features.objectives,
        features.cardDecks,
        mechanics.objectives,
        mechanics.cardDecks.allowPlayerDeckBuilding,
        buildableCards
    ]);

    function updateDie(index, field, value) {
        setDice((current) =>
            current.map((die, dieIndex) =>
                dieIndex === index ? { ...die, [field]: value } : die
            )
        );
    }

    function buildSetupChoices() {
        return {
            terrainKeys,
            counterKeys,
            conditionKeys,
            objectiveKeys,
            deckCardKeys: {
                white: deckCardKeys,
                black: deckCardKeys
            },
            dice,
            timerSeconds,
            timerMode
        };
    }

    function handleConfirm() {
        if (isStarting) return;
        setIsStarting(true);
        window.setTimeout(() => {
            onConfirm(buildSetupChoices());
        }, 220);
    }

    const previewObjectives = resolveObjectivesForSetup(
        mechanics.objectives,
        objectiveKeys
    );

    const hasAdvancedSections =
        (features.objectives &&
            mechanics.objectives.selectionMode === "player_choice") ||
        (features.cardDecks && mechanics.cardDecks.allowPlayerDeckBuilding) ||
        (features.diceSystem &&
            mechanics.diceSystem.mode === "player_editable") ||
        (features.timers && mechanics.timers.allowPlayerEdit);

    return (
        <div
            className={
                isStarting
                    ? "systems-setup-overlay is-exiting"
                    : "systems-setup-overlay"
            }
            role="dialog"
            aria-label="Match setup"
            aria-modal="true"
        >
            <div className="systems-setup-panel">
                <header>
                    <h2>Match Setup</h2>
                    <p>
                        Choose which tools are available this match, then start
                        the game. The toolbox locks to your selection.
                    </p>
                </header>

                {loadoutCatalog.hasLoadoutOptions && (
                    <section className="systems-setup-loadout">
                        <div className="systems-setup-section-head">
                            <h3>Match loadout</h3>
                            <div className="systems-setup-inline-actions">
                                <button
                                    type="button"
                                    className="systems-setup-text-btn"
                                    onClick={() => {
                                        setTerrainKeys(loadoutCatalog.terrainKeys);
                                        setCounterKeys(loadoutCatalog.counterKeys);
                                        setConditionKeys(loadoutCatalog.conditionKeys);
                                    }}
                                >
                                    Select all
                                </button>
                                <button
                                    type="button"
                                    className="systems-setup-text-btn"
                                    onClick={() => {
                                        setTerrainKeys([]);
                                        setCounterKeys([]);
                                        setConditionKeys([]);
                                    }}
                                >
                                    Clear all
                                </button>
                            </div>
                        </div>
                        <p className="small muted">
                            Tap to include or leave out. Only selected items appear
                            in Play tools after start.
                        </p>

                        {loadoutCatalog.terrains.length > 0 && (
                            <div className="systems-setup-loadout-group">
                                <h4>Terrains</h4>
                                <div className="systems-setup-chip-row">
                                    {loadoutCatalog.terrains.map((terrain) => (
                                        <button
                                            type="button"
                                            key={terrain.key}
                                            className={
                                                terrainKeys.includes(terrain.key)
                                                    ? "systems-setup-chip active"
                                                    : "systems-setup-chip"
                                            }
                                            style={{
                                                "--chip-accent":
                                                    terrain.color || "#4b5563"
                                            }}
                                            onClick={() =>
                                                setTerrainKeys((current) =>
                                                    toggleKey(current, terrain.key)
                                                )
                                            }
                                            title={terrain.description || terrain.label}
                                        >
                                            <span
                                                className="systems-setup-chip-swatch"
                                                aria-hidden="true"
                                            />
                                            {terrain.label || "Terrain"}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {loadoutCatalog.counters.length > 0 && (
                            <div className="systems-setup-loadout-group">
                                <h4>Counters</h4>
                                <div className="systems-setup-chip-row">
                                    {loadoutCatalog.counters.map((counter) => (
                                        <button
                                            type="button"
                                            key={counter.key}
                                            className={
                                                counterKeys.includes(counter.key)
                                                    ? "systems-setup-chip active"
                                                    : "systems-setup-chip"
                                            }
                                            style={{
                                                "--chip-accent":
                                                    counter.color || "#e7c97a"
                                            }}
                                            onClick={() =>
                                                setCounterKeys((current) =>
                                                    toggleKey(current, counter.key)
                                                )
                                            }
                                            title={
                                                counter.description || counter.label
                                            }
                                        >
                                            <span
                                                className="systems-setup-chip-swatch"
                                                aria-hidden="true"
                                            />
                                            {counter.label || "Counter"}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {loadoutCatalog.conditions.length > 0 && (
                            <div className="systems-setup-loadout-group">
                                <h4>Conditions</h4>
                                <div className="systems-setup-chip-row">
                                    {loadoutCatalog.conditions.map((condition) => (
                                        <button
                                            type="button"
                                            key={condition.key}
                                            className={
                                                conditionKeys.includes(condition.key)
                                                    ? "systems-setup-chip active"
                                                    : "systems-setup-chip"
                                            }
                                            onClick={() =>
                                                setConditionKeys((current) =>
                                                    toggleKey(current, condition.key)
                                                )
                                            }
                                            title={
                                                condition.description ||
                                                condition.label
                                            }
                                        >
                                            {condition.icon ? (
                                                <span
                                                    className="systems-setup-chip-icon"
                                                    aria-hidden="true"
                                                >
                                                    {condition.icon}
                                                </span>
                                            ) : null}
                                            {condition.label || "Condition"}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </section>
                )}

                {hasAdvancedSections && (
                    <div className="systems-setup-divider" aria-hidden="true" />
                )}

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
                                        onClick={() =>
                                            setObjectiveKeys((current) =>
                                                toggleKey(current, item.key)
                                            )
                                        }
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
                                        onClick={() =>
                                            setDeckCardKeys((current) =>
                                                toggleKey(current, card.key)
                                            )
                                        }
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
                                    <div
                                        className="systems-setup-dice-row"
                                        key={die.key || index}
                                    >
                                        <input
                                            value={die.label || ""}
                                            onChange={(event) =>
                                                updateDie(
                                                    index,
                                                    "label",
                                                    event.target.value
                                                )
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
                                    onChange={(event) =>
                                        setTimerMode(event.target.value)
                                    }
                                >
                                    <option value="per_turn">Per turn</option>
                                    <option value="per_side_total">
                                        Per side total
                                    </option>
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
                                        setTimerSeconds(
                                            Number(event.target.value) || 90
                                        )
                                    }
                                />
                            </label>
                        </div>
                    </section>
                )}

                <footer className="systems-setup-actions">
                    <button
                        type="button"
                        className="systems-setup-secondary"
                        onClick={onSkipDefaults}
                        disabled={isStarting}
                    >
                        Use defaults
                    </button>
                    <button
                        type="button"
                        className={
                            isStarting
                                ? "systems-setup-primary systems-setup-start is-locking"
                                : "systems-setup-primary systems-setup-start"
                        }
                        onClick={handleConfirm}
                        disabled={isStarting}
                    >
                        {isStarting ? "Starting…" : "Start Game"}
                    </button>
                </footer>
            </div>
        </div>
    );
}

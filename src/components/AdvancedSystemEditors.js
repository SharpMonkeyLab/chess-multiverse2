"use client";

import {
    createDefaultCard,
    createDefaultDie,
    createDefaultObjective
} from "@/lib/worldSystems";

function Field({ label, children }) {
    return (
        <label className="advanced-system-field">
            <span>{label}</span>
            {children}
        </label>
    );
}

export function DeckSystemEditor({ cardDecks, onChange }) {
    const config = cardDecks || { cards: [] };
    const cards = Array.isArray(config.cards) ? config.cards : [];

    function updateConfig(patch) {
        onChange({ ...config, ...patch });
    }

    function updateCard(cardKey, field, value) {
        updateConfig({
            cards: cards.map((card) =>
                card.key === cardKey ? { ...card, [field]: value } : card
            )
        });
    }

    function addCard() {
        updateConfig({ cards: [...cards, createDefaultCard()] });
    }

    function removeCard(cardKey) {
        updateConfig({ cards: cards.filter((card) => card.key !== cardKey) });
    }

    return (
        <div className="advanced-system-editor">
            <p className="small muted">
                Define this universe&apos;s card set. Players build decks from these cards,
                then draw and play them to change the board.
            </p>

            <div className="advanced-system-grid">
                <Field label="Deck size">
                    <input
                        type="number"
                        min="1"
                        max="80"
                        value={config.deckSize ?? 30}
                        onChange={(event) =>
                            updateConfig({ deckSize: Number(event.target.value) || 30 })
                        }
                    />
                </Field>

                <Field label="Starting hand">
                    <input
                        type="number"
                        min="0"
                        max="20"
                        value={config.startingHandSize ?? 5}
                        onChange={(event) =>
                            updateConfig({
                                startingHandSize: Number(event.target.value) || 0
                            })
                        }
                    />
                </Field>
            </div>

            <label className="advanced-system-check">
                <input
                    type="checkbox"
                    checked={Boolean(config.allowPlayerDeckBuilding)}
                    onChange={(event) =>
                        updateConfig({ allowPlayerDeckBuilding: event.target.checked })
                    }
                />
                Allow players to build decks from this set
            </label>

            <div className="creator-header-row">
                <h3>Universe Cards</h3>
                <button type="button" onClick={addCard}>
                    + Add Card
                </button>
            </div>

            {cards.length === 0 ? (
                <p className="small muted">No cards yet.</p>
            ) : (
                <div className="advanced-system-list">
                    {cards.map((card) => (
                        <div className="advanced-system-item" key={card.key}>
                            <input
                                value={card.name || ""}
                                placeholder="Card name"
                                onChange={(event) =>
                                    updateCard(card.key, "name", event.target.value)
                                }
                            />
                            <textarea
                                value={card.description || ""}
                                placeholder="Description"
                                rows={2}
                                onChange={(event) =>
                                    updateCard(card.key, "description", event.target.value)
                                }
                            />
                            <textarea
                                value={card.effectHint || ""}
                                placeholder="Board effect hint"
                                rows={2}
                                onChange={(event) =>
                                    updateCard(card.key, "effectHint", event.target.value)
                                }
                            />
                            <button type="button" onClick={() => removeCard(card.key)}>
                                Remove
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export function DiceSystemEditor({ diceSystem, onChange }) {
    const config = diceSystem || { dice: [] };
    const dice = Array.isArray(config.dice) ? config.dice : [];

    function updateConfig(patch) {
        onChange({ ...config, ...patch });
    }

    function updateDie(dieKey, field, value) {
        updateConfig({
            dice: dice.map((die) =>
                die.key === dieKey ? { ...die, [field]: value } : die
            )
        });
    }

    return (
        <div className="advanced-system-editor">
            <p className="small muted">
                Choose dice for this universe. Fixed mode locks creator settings;
                player-editable lets players adjust at game setup.
            </p>

            <div className="advanced-system-grid">
                <Field label="Control mode">
                    <select
                        value={config.mode || "fixed"}
                        onChange={(event) => updateConfig({ mode: event.target.value })}
                    >
                        <option value="fixed">Fixed by creator</option>
                        <option value="player_editable">Players can edit at setup</option>
                    </select>
                </Field>

                <label className="advanced-system-check">
                    <input
                        type="checkbox"
                        checked={Boolean(config.allowReroll)}
                        onChange={(event) =>
                            updateConfig({ allowReroll: event.target.checked })
                        }
                    />
                    Allow rerolls
                </label>
            </div>

            <div className="creator-header-row">
                <h3>Dice</h3>
                <button
                    type="button"
                    onClick={() => updateConfig({ dice: [...dice, createDefaultDie()] })}
                >
                    + Add Die
                </button>
            </div>

            <div className="advanced-system-list">
                {dice.map((die) => (
                    <div className="advanced-system-item dice-item" key={die.key}>
                        <input
                            value={die.label || ""}
                            placeholder="Label"
                            onChange={(event) =>
                                updateDie(die.key, "label", event.target.value)
                            }
                        />
                        <Field label="Sides">
                            <input
                                type="number"
                                min="2"
                                max="100"
                                value={die.sides ?? 6}
                                onChange={(event) =>
                                    updateDie(
                                        die.key,
                                        "sides",
                                        Number(event.target.value) || 6
                                    )
                                }
                            />
                        </Field>
                        <Field label="Count">
                            <input
                                type="number"
                                min="1"
                                max="12"
                                value={die.count ?? 1}
                                onChange={(event) =>
                                    updateDie(
                                        die.key,
                                        "count",
                                        Number(event.target.value) || 1
                                    )
                                }
                            />
                        </Field>
                        <button
                            type="button"
                            onClick={() =>
                                updateConfig({
                                    dice: dice.filter((item) => item.key !== die.key)
                                })
                            }
                        >
                            Remove
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}

export function TimerSystemEditor({ timers, onChange }) {
    const config = timers || {};

    function updateConfig(patch) {
        onChange({ ...config, ...patch });
    }

    return (
        <div className="advanced-system-editor">
            <p className="small muted">
                Timers can track each turn or a total clock per side. Players may
                edit amounts only if you allow it.
            </p>

            <div className="advanced-system-grid">
                <Field label="Timer mode">
                    <select
                        value={config.mode || "per_turn"}
                        onChange={(event) => updateConfig({ mode: event.target.value })}
                    >
                        <option value="per_turn">Per turn</option>
                        <option value="per_side_total">Per side total</option>
                    </select>
                </Field>

                <Field label="Seconds">
                    <input
                        type="number"
                        min="5"
                        max="7200"
                        value={config.seconds ?? 90}
                        onChange={(event) =>
                            updateConfig({ seconds: Number(event.target.value) || 90 })
                        }
                    />
                </Field>
            </div>

            <label className="advanced-system-check">
                <input
                    type="checkbox"
                    checked={Boolean(config.allowPlayerEdit)}
                    onChange={(event) =>
                        updateConfig({ allowPlayerEdit: event.target.checked })
                    }
                />
                Allow players to edit timer values at setup
            </label>
        </div>
    );
}

export function ObjectivesEditor({ objectives, onChange }) {
    const config = objectives || { items: [] };
    const items = Array.isArray(config.items) ? config.items : [];

    function updateConfig(patch) {
        onChange({ ...config, ...patch });
    }

    function updateItem(itemKey, field, value) {
        updateConfig({
            items: items.map((item) =>
                item.key === itemKey ? { ...item, [field]: value } : item
            )
        });
    }

    return (
        <div className="advanced-system-editor">
            <p className="small muted">
                Create missions for this universe. Players pick from the list or get a
                random selection when the game starts.
            </p>

            <Field label="Selection mode">
                <select
                    value={config.selectionMode || "player_choice"}
                    onChange={(event) =>
                        updateConfig({ selectionMode: event.target.value })
                    }
                >
                    <option value="player_choice">Players choose</option>
                    <option value="random">Randomize for players</option>
                    <option value="all">Use all objectives</option>
                </select>
            </Field>

            <div className="creator-header-row">
                <h3>Objectives</h3>
                <button
                    type="button"
                    onClick={() =>
                        updateConfig({ items: [...items, createDefaultObjective()] })
                    }
                >
                    + Add Objective
                </button>
            </div>

            {items.length === 0 ? (
                <p className="small muted">No objectives yet.</p>
            ) : (
                <div className="advanced-system-list">
                    {items.map((item) => (
                        <div className="advanced-system-item" key={item.key}>
                            <input
                                value={item.title || ""}
                                placeholder="Objective title"
                                onChange={(event) =>
                                    updateItem(item.key, "title", event.target.value)
                                }
                            />
                            <textarea
                                value={item.description || ""}
                                placeholder="Description"
                                rows={2}
                                onChange={(event) =>
                                    updateItem(item.key, "description", event.target.value)
                                }
                            />
                            <input
                                value={item.victoryHint || ""}
                                placeholder="Victory hint"
                                onChange={(event) =>
                                    updateItem(item.key, "victoryHint", event.target.value)
                                }
                            />
                            <button
                                type="button"
                                onClick={() =>
                                    updateConfig({
                                        items: items.filter(
                                            (entry) => entry.key !== item.key
                                        )
                                    })
                                }
                            >
                                Remove
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export function FogOfWarEditor({ fogOfWar, onChange }) {
    const config = fogOfWar || {};

    function updateConfig(patch) {
        onChange({ ...config, ...patch });
    }

    return (
        <div className="advanced-system-editor">
            <p className="small muted">
                Fog hides enemy pieces on fogged cells from the opponent. Use Paint Fog
                / Clear Fog tools on the board to set default fog zones.
            </p>

            <label className="advanced-system-check">
                <input
                    type="checkbox"
                    checked={config.revealOwnPieces !== false}
                    onChange={(event) =>
                        updateConfig({ revealOwnPieces: event.target.checked })
                    }
                />
                Always reveal your own pieces inside fog
            </label>

            <label className="advanced-system-check">
                <input
                    type="checkbox"
                    checked={Boolean(config.allowPlayerEdit)}
                    onChange={(event) =>
                        updateConfig({ allowPlayerEdit: event.target.checked })
                    }
                />
                Allow players to edit fog setup before the match
            </label>
        </div>
    );
}

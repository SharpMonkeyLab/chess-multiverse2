"use client";

import { useEffect, useState } from "react";

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

function ItemStrip({ items, selectedKey, onSelect, onAdd, onRemove, getLabel, addLabel }) {
    return (
        <div className="advanced-system-strip">
            {items.map((item) => {
                const label = getLabel(item) || "?";
                const isSelected = item.key === selectedKey;

                return (
                    <div
                        key={item.key}
                        role="button"
                        tabIndex={0}
                        className={
                            isSelected
                                ? "advanced-system-chip active"
                                : "advanced-system-chip"
                        }
                        title={label}
                        onClick={() => onSelect(item.key)}
                        onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                onSelect(item.key);
                            }
                        }}
                    >
                        <span className="advanced-system-chip-letter">
                            {String(label).charAt(0).toUpperCase()}
                        </span>
                        <span className="advanced-system-chip-name">{label}</span>
                        <button
                            type="button"
                            className="advanced-system-chip-delete"
                            title={`Remove ${label}`}
                            onClick={(event) => {
                                event.stopPropagation();
                                onRemove(item.key);
                            }}
                        >
                            ×
                        </button>
                    </div>
                );
            })}

            <button
                type="button"
                className="advanced-system-chip advanced-system-chip-add"
                onClick={onAdd}
            >
                <span>+</span>
                <strong>{addLabel}</strong>
            </button>
        </div>
    );
}

export function DeckSystemEditor({ cardDecks, onChange }) {
    const config = cardDecks || { cards: [] };
    const cards = Array.isArray(config.cards) ? config.cards : [];
    const [selectedKey, setSelectedKey] = useState(cards[0]?.key || "");

    useEffect(() => {
        if (!cards.length) {
            setSelectedKey("");
            return;
        }

        if (!cards.some((card) => card.key === selectedKey)) {
            setSelectedKey(cards[0].key);
        }
    }, [cards, selectedKey]);

    const selectedCard = cards.find((card) => card.key === selectedKey) || null;

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
        const next = createDefaultCard();
        updateConfig({ cards: [...cards, next] });
        setSelectedKey(next.key);
    }

    function removeCard(cardKey) {
        const nextCards = cards.filter((card) => card.key !== cardKey);
        updateConfig({ cards: nextCards });
        if (selectedKey === cardKey) {
            setSelectedKey(nextCards[0]?.key || "");
        }
    }

    return (
        <div className="advanced-system-editor">
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
                Players can build decks
            </label>

            <ItemStrip
                items={cards}
                selectedKey={selectedKey}
                onSelect={setSelectedKey}
                onAdd={addCard}
                onRemove={removeCard}
                getLabel={(card) => card.name || "Card"}
                addLabel="Add"
            />

            {selectedCard ? (
                <div className="advanced-system-detail">
                    <Field label="Name">
                        <input
                            value={selectedCard.name || ""}
                            placeholder="Card name"
                            onChange={(event) =>
                                updateCard(selectedCard.key, "name", event.target.value)
                            }
                        />
                    </Field>
                    <Field label="Description">
                        <input
                            value={selectedCard.description || ""}
                            placeholder="What this card does"
                            onChange={(event) =>
                                updateCard(
                                    selectedCard.key,
                                    "description",
                                    event.target.value
                                )
                            }
                        />
                    </Field>
                    <Field label="Board effect">
                        <input
                            value={selectedCard.effectHint || ""}
                            placeholder="Effect hint"
                            onChange={(event) =>
                                updateCard(
                                    selectedCard.key,
                                    "effectHint",
                                    event.target.value
                                )
                            }
                        />
                    </Field>
                </div>
            ) : (
                <p className="small muted">No cards yet. Add one to start.</p>
            )}
        </div>
    );
}

export function DiceSystemEditor({ diceSystem, onChange }) {
    const config = diceSystem || { dice: [] };
    const dice = Array.isArray(config.dice) ? config.dice : [];
    const [selectedKey, setSelectedKey] = useState(dice[0]?.key || "");

    useEffect(() => {
        if (!dice.length) {
            setSelectedKey("");
            return;
        }

        if (!dice.some((die) => die.key === selectedKey)) {
            setSelectedKey(dice[0].key);
        }
    }, [dice, selectedKey]);

    const selectedDie = dice.find((die) => die.key === selectedKey) || null;

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

    function addDie() {
        const next = createDefaultDie();
        updateConfig({ dice: [...dice, next] });
        setSelectedKey(next.key);
    }

    function removeDie(dieKey) {
        const nextDice = dice.filter((die) => die.key !== dieKey);
        updateConfig({ dice: nextDice });
        if (selectedKey === dieKey) {
            setSelectedKey(nextDice[0]?.key || "");
        }
    }

    return (
        <div className="advanced-system-editor">
            <div className="advanced-system-grid">
                <Field label="Control mode">
                    <select
                        value={config.mode || "fixed"}
                        onChange={(event) => updateConfig({ mode: event.target.value })}
                    >
                        <option value="fixed">Fixed by creator</option>
                        <option value="player_editable">Players can edit</option>
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

            <ItemStrip
                items={dice}
                selectedKey={selectedKey}
                onSelect={setSelectedKey}
                onAdd={addDie}
                onRemove={removeDie}
                getLabel={(die) => die.label || "Die"}
                addLabel="Add"
            />

            {selectedDie ? (
                <div className="advanced-system-detail advanced-system-detail-inline">
                    <Field label="Label">
                        <input
                            value={selectedDie.label || ""}
                            placeholder="Label"
                            onChange={(event) =>
                                updateDie(selectedDie.key, "label", event.target.value)
                            }
                        />
                    </Field>
                    <Field label="Sides">
                        <input
                            type="number"
                            min="2"
                            max="100"
                            value={selectedDie.sides ?? 6}
                            onChange={(event) =>
                                updateDie(
                                    selectedDie.key,
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
                            value={selectedDie.count ?? 1}
                            onChange={(event) =>
                                updateDie(
                                    selectedDie.key,
                                    "count",
                                    Number(event.target.value) || 1
                                )
                            }
                        />
                    </Field>
                </div>
            ) : (
                <p className="small muted">No dice yet. Add one to start.</p>
            )}
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
                Players can edit timer at setup
            </label>
        </div>
    );
}

export function ObjectivesEditor({ objectives, onChange }) {
    const config = objectives || { items: [] };
    const items = Array.isArray(config.items) ? config.items : [];
    const [selectedKey, setSelectedKey] = useState(items[0]?.key || "");

    useEffect(() => {
        if (!items.length) {
            setSelectedKey("");
            return;
        }

        if (!items.some((item) => item.key === selectedKey)) {
            setSelectedKey(items[0].key);
        }
    }, [items, selectedKey]);

    const selectedItem = items.find((item) => item.key === selectedKey) || null;

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

    function addItem() {
        const next = createDefaultObjective();
        updateConfig({ items: [...items, next] });
        setSelectedKey(next.key);
    }

    function removeItem(itemKey) {
        const nextItems = items.filter((item) => item.key !== itemKey);
        updateConfig({ items: nextItems });
        if (selectedKey === itemKey) {
            setSelectedKey(nextItems[0]?.key || "");
        }
    }

    return (
        <div className="advanced-system-editor">
            <Field label="Selection mode">
                <select
                    value={config.selectionMode || "player_choice"}
                    onChange={(event) =>
                        updateConfig({ selectionMode: event.target.value })
                    }
                >
                    <option value="player_choice">Players choose</option>
                    <option value="random">Randomize</option>
                    <option value="all">Use all</option>
                </select>
            </Field>

            <ItemStrip
                items={items}
                selectedKey={selectedKey}
                onSelect={setSelectedKey}
                onAdd={addItem}
                onRemove={removeItem}
                getLabel={(item) => item.title || "Objective"}
                addLabel="Add"
            />

            {selectedItem ? (
                <div className="advanced-system-detail">
                    <Field label="Title">
                        <input
                            value={selectedItem.title || ""}
                            placeholder="Objective title"
                            onChange={(event) =>
                                updateItem(selectedItem.key, "title", event.target.value)
                            }
                        />
                    </Field>
                    <Field label="Description">
                        <input
                            value={selectedItem.description || ""}
                            placeholder="Description"
                            onChange={(event) =>
                                updateItem(
                                    selectedItem.key,
                                    "description",
                                    event.target.value
                                )
                            }
                        />
                    </Field>
                    <Field label="Victory hint">
                        <input
                            value={selectedItem.victoryHint || ""}
                            placeholder="Victory hint"
                            onChange={(event) =>
                                updateItem(
                                    selectedItem.key,
                                    "victoryHint",
                                    event.target.value
                                )
                            }
                        />
                    </Field>
                </div>
            ) : (
                <p className="small muted">No objectives yet. Add one to start.</p>
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
                Players can edit fog before the match
            </label>
        </div>
    );
}

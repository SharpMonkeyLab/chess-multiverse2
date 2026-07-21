"use client";

import { useState } from "react";

import { normalizeWorldFeatures } from "@/lib/worldSystems";

export default function PlaySystemsDock({
    worldFeatures,
    worldMechanics: _worldMechanics,
    systemsRuntime,
    onSystemsRuntimeChange,
    turnTeam = "white",
    isPlayMode = true,
    onLogAction = () => {}
}) {
    const features = normalizeWorldFeatures(worldFeatures);
    const [selectedCardInstanceId, setSelectedCardInstanceId] = useState("");
    const [enteringCardId, setEnteringCardId] = useState("");

    const showDock =
        isPlayMode && features.cardDecks && systemsRuntime?.cardDecks;

    const activeHand = systemsRuntime?.cardDecks?.[turnTeam]?.hand || [];
    const libraryCount = systemsRuntime?.cardDecks?.[turnTeam]?.library?.length || 0;

    if (!showDock) {
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
        const cardId = drawnCard.instanceId || drawnCard.key;

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

        setEnteringCardId(cardId);
        window.setTimeout(() => {
            setEnteringCardId((current) => (current === cardId ? "" : current));
        }, 320);

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
        onLogAction(`${turnTeam} played ${playedCard.name || "a card"}.`, "cards", {
            card: {
                name: playedCard.name || "Card",
                effectHint: playedCard.effectHint || "",
                description: playedCard.description || ""
            }
        });
    }

    return (
        <section className="play-systems-dock play-card-felt" aria-label="Card deck">
            <header className="play-card-felt-header">
                <h3>Cards · {turnTeam}</h3>
            </header>

            <div className="play-card-felt-row">
                <button
                    type="button"
                    className={`play-draw-pile${libraryCount === 0 ? " is-empty" : ""}`}
                    onClick={handleDrawCard}
                    disabled={libraryCount === 0}
                    title={
                        libraryCount === 0
                            ? "Library empty"
                            : `Draw a card (${libraryCount} left)`
                    }
                    aria-label={`Draw a card, ${libraryCount} remaining`}
                >
                    <span className="play-draw-pile-face" aria-hidden="true" />
                    <span className="play-draw-pile-count">{libraryCount}</span>
                    <span className="play-draw-pile-label">Draw</span>
                </button>

                <div className="play-card-hand" role="list">
                    {activeHand.length === 0 ? (
                        <div className="play-card-hand-empty" aria-hidden="true">
                            <span className="play-hand-card play-hand-card-ghost" />
                            <span className="play-card-hand-empty-label">Draw to begin</span>
                        </div>
                    ) : (
                        activeHand.map((card) => {
                            const cardId = card.instanceId || card.key;
                            const isSelected = selectedCardInstanceId === cardId;
                            const isEntering = enteringCardId === cardId;

                            return (
                                <button
                                    type="button"
                                    key={cardId}
                                    role="listitem"
                                    className={[
                                        "play-hand-card",
                                        isSelected ? "active" : "",
                                        isEntering ? "is-entering" : ""
                                    ]
                                        .filter(Boolean)
                                        .join(" ")}
                                    onClick={() =>
                                        setSelectedCardInstanceId(
                                            isSelected ? "" : cardId
                                        )
                                    }
                                    title={card.effectHint || card.description || ""}
                                >
                                    <strong className="play-hand-card-name">
                                        {card.name || "Card"}
                                    </strong>
                                    <small className="play-hand-card-body">
                                        {card.effectHint ||
                                            card.description ||
                                            "Play, then edit the board"}
                                    </small>
                                    <span className="play-hand-card-pip" aria-hidden="true" />
                                </button>
                            );
                        })
                    )}
                </div>

                <button
                    type="button"
                    className="play-card-play-btn"
                    disabled={!selectedCardInstanceId}
                    onClick={handlePlaySelectedCard}
                    title={
                        selectedCardInstanceId
                            ? "Play selected card"
                            : "Select a card to play"
                    }
                >
                    Play
                </button>
            </div>
        </section>
    );
}

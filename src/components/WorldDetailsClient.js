"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { loadLocalItem } from "@/lib/saveLoad";

import { hasSupabaseConfig, supabase } from "@/lib/supabaseClient";

import {
    MATCHMAKING_EVENT_NAME,
    readStoredWaitingMatch
} from "@/lib/matchmakingClient";

import {
    getCharacterList,
    getConditionList,
    getCounterList,
    getEnabledFeatureLabels,
    getTerrainList,
    getTokenList,
    getWorldCreatorStats,
    getWorldDescription,
    getWorldDetails,
    getWorldPreviewImages,
    getWorldRulesPreview
} from "@/lib/worldData";

import MatchmakingReadyButton from "@/components/MatchmakingReadyButton";

export default function WorldDetailsClient({ worldId }) {
    const [world, setWorld] = useState(null);
    const [worldSource, setWorldSource] = useState("");
    const [status, setStatus] = useState("Loading world...");
    const [playStatus, setPlayStatus] = useState("");

    const [selectedCharacterIndex, setSelectedCharacterIndex] = useState(0);
    const [selectedTerrainIndex, setSelectedTerrainIndex] = useState(0);
    const [selectedCounterIndex, setSelectedCounterIndex] = useState(0);
    const [selectedConditionIndex, setSelectedConditionIndex] = useState(0);
    const [selectedTokenIndex, setSelectedTokenIndex] = useState(0);

    useEffect(() => {
        async function loadWorldDetails() {
            setStatus("Loading world...");
            setWorld(null);
            setWorldSource("");

            // Keep local support as a fallback for old links/dev use.
            const savedWorld = loadLocalItem("worlds", worldId);

            if (savedWorld) {
                setWorld(savedWorld);
                setWorldSource("local");
                setStatus("");
                return;
            }

            if (!hasSupabaseConfig() || !supabase) {
                setStatus("Could not find this world.");
                return;
            }

            try {
                const { data: onlineWorld, error } = await supabase
                    .from("worlds")
                    .select("id, name, description, is_public, updated_at, world_data")
                    .eq("id", worldId)
                    .eq("is_public", true)
                    .single();

                if (error || !onlineWorld) {
                    setStatus("Could not find this published world.");
                    setWorld(null);
                    return;
                }

                setWorld({
                    id: onlineWorld.id,
                    name: onlineWorld.name,
                    updatedAt: onlineWorld.updated_at,
                    isPublic: onlineWorld.is_public,
                    data: onlineWorld.world_data
                });

                setWorldSource("online");
                setStatus("");
            } catch (error) {
                console.error("Online world details load failed:", error);
                setStatus("Could not reach Supabase to load this world.");
                setWorld(null);
            }
        }

        loadWorldDetails();
    }, [worldId]);

    useEffect(() => {
        function syncLocalPlayStatusWithGlobalMatchmaking() {
            const waitingMatch = readStoredWaitingMatch();

            if (!waitingMatch) {
                setPlayStatus((currentStatus) =>
                    currentStatus === "Waiting for opponent..." ||
                        currentStatus === "Looking for opponent..."
                        ? ""
                        : currentStatus
                );
            }
        }

        window.addEventListener(
            MATCHMAKING_EVENT_NAME,
            syncLocalPlayStatusWithGlobalMatchmaking
        );

        window.addEventListener(
            "storage",
            syncLocalPlayStatusWithGlobalMatchmaking
        );

        return () => {
            window.removeEventListener(
                MATCHMAKING_EVENT_NAME,
                syncLocalPlayStatusWithGlobalMatchmaking
            );

            window.removeEventListener(
                "storage",
                syncLocalPlayStatusWithGlobalMatchmaking
            );
        };
    }, []);

    if (!world) {
        return (
            <div className="world-details-content">
                <section className="world-details-missing-card">
                    <p className="home-kicker">World Details</p>
                    <h1>{status}</h1>

                    <p>
                        This world may be private, unpublished, deleted, or saved in another
                        browser.
                    </p>

                    <Link className="home-secondary-link" href="/worlds">
                        Back to Worlds
                    </Link>
                </section>
            </div>
        );
    }

    const details = getWorldDetails(world);
    const previewImages = getWorldPreviewImages(world);

    const description = getWorldDescription(world);
    const rulesNotes = getWorldRulesPreview(world);

    const enabledFeatures = getEnabledFeatureLabels(world);
    const worldStats = getWorldCreatorStats(world);

    const characters = getCharacterList(world);
    const terrains = getTerrainList(world);
    const counters = getCounterList(world);
    const conditions = getConditionList(world);
    const tokens = getTokenList(world);

    const selectedCharacter = characters[selectedCharacterIndex] || characters[0];
    const selectedTerrain = terrains[selectedTerrainIndex] || terrains[0];
    const selectedCounter = counters[selectedCounterIndex] || counters[0];
    const selectedCondition = conditions[selectedConditionIndex] || conditions[0];
    const selectedToken = tokens[selectedTokenIndex] || tokens[0];

    const playHref = `/play?world=${encodeURIComponent(world.id)}`;

    return (
        <div className="world-details-content">
            <section className="world-details-hero">
                <div className="world-details-preview">
                    {previewImages.backgroundImage && (
                        <img
                            className="world-details-background-img"
                            src={previewImages.backgroundImage}
                            alt=""
                            aria-hidden="true"
                        />
                    )}

                    <div className="world-details-preview-overlay" />

                    {previewImages.boardSkinImage ? (
                        <img
                            className="world-details-board-img"
                            src={previewImages.boardSkinImage}
                            alt={`${world.name} board preview`}
                        />
                    ) : (
                        <span className="world-details-preview-letter">
                            {world.name.slice(0, 1)}
                        </span>
                    )}
                </div>

                <div className="world-details-main">
                    <p className="home-kicker">
                        {worldSource === "online" ? "Enter World" : "Local World"}
                    </p>

                    <h1>{world.name}</h1>

                    <p>{description}</p>

                    <div className="world-details-action-row">
                        <Link
                            className="home-primary-link world-details-play-button"
                            href={playHref}
                        >
                            Visit Board
                        </Link>

                        <MatchmakingReadyButton
                            className="home-secondary-link world-details-ready-button"
                            worldId={world.id}
                            worldName={world.name}
                            disabled={worldSource !== "online"}
                            disabledLabel="Online Only"
                            readyLabel="Ready"
                            loadingLabel="Finding Match..."
                            onStatusChange={setPlayStatus}
                        />

                        {playStatus && (
                            <p className="world-details-play-status">
                                {playStatus}
                            </p>
                        )}

                        <Link className="home-secondary-link" href="/worlds">
                            Back to Worlds
                        </Link>

                        {worldSource === "local" && (
                            <Link
                                className="home-secondary-link"
                                href={`/creator?world=${world.id}`}
                            >
                                Open in Creator
                            </Link>
                        )}
                    </div>
                </div>
            </section>

            <section className="world-details-grid">
                <article className="world-details-panel world-details-rules-panel">
                    <p className="home-kicker">Rules</p>
                    <h2>Rules Summary</h2>
                    <p>{rulesNotes}</p>
                </article>

                <article className="world-details-panel">
                    <p className="home-kicker">Systems</p>
                    <h2>Enabled Features</h2>

                    <div className="world-feature-row">
                        {enabledFeatures.length === 0 ? (
                            <span>No systems enabled</span>
                        ) : (
                            enabledFeatures.map((feature) => (
                                <span key={feature}>{feature}</span>
                            ))
                        )}
                    </div>
                </article>
            </section>

            <section className="world-details-panel">
                <p className="home-kicker">World Data</p>
                <h2>World Stats</h2>

                <div className="world-details-stat-grid">
                    {worldStats.map((stat) => (
                        <div
                            className={
                                stat.value === 0
                                    ? "world-details-stat-card empty"
                                    : "world-details-stat-card"
                            }
                            key={stat.label}
                        >
                            <strong>{stat.value}</strong>
                            <span>{stat.label}</span>
                        </div>
                    ))}
                </div>
            </section>

            <section className="world-details-single-row">
                <article className="world-details-panel">
                    <p className="home-kicker">Characters</p>
                    <h2>Character Roster</h2>

                    {characters.length === 0 ? (
                        <p>No characters created yet.</p>
                    ) : (
                        <div className="world-entity-section world-character-section">
                            {selectedCharacter && (
                                <div className="world-entity-detail-card character-detail-card">
                                    <div className="world-entity-detail-image">
                                        {selectedCharacter.portrait ? (
                                            <img
                                                src={selectedCharacter.portrait}
                                                alt={selectedCharacter.name}
                                            />
                                        ) : (
                                            <span>{(selectedCharacter.name || "?").slice(0, 1)}</span>
                                        )}
                                    </div>

                                    <div className="world-entity-detail-text">
                                        <h3>{selectedCharacter.name || "Unnamed Character"}</h3>

                                        <p className="world-entity-subtitle">
                                            {selectedCharacter.ability ||
                                                selectedCharacter.abilityName ||
                                                "No ability name"}
                                        </p>

                                        <p>
                                            {selectedCharacter.description ||
                                                selectedCharacter.abilityDescription ||
                                                "No ability description."}
                                        </p>

                                        {selectedCharacter.cost && (
                                            <p className="world-entity-meta">
                                                Cost: {selectedCharacter.cost}
                                            </p>
                                        )}

                                        {Object.entries({
                                            ...(selectedCharacter.meta || {}),
                                            ...(selectedCharacter.customFields || {})
                                        }).filter(([, value]) => String(value || "").trim()).length > 0 && (
                                                <div className="world-character-meta-row">
                                                    {Object.entries({
                                                        ...(selectedCharacter.meta || {}),
                                                        ...(selectedCharacter.customFields || {})
                                                    })
                                                        .filter(([, value]) => String(value || "").trim())
                                                        .slice(0, 8)
                                                        .map(([fieldName, fieldValue]) => (
                                                            <span key={fieldName}>
                                                                <strong>
                                                                    {String(fieldName)
                                                                        .replace(/[-_]+/g, " ")
                                                                        .replace(/\b\w/g, (letter) => letter.toUpperCase())}
                                                                </strong>
                                                                {fieldValue}
                                                            </span>
                                                        ))}
                                                </div>
                                            )}

                                        {selectedCharacter.tokens?.length > 0 && (
                                            <div className="world-entity-chip-row">
                                                {selectedCharacter.tokens.map((tokenName) => (
                                                    <span key={tokenName}>{tokenName}</span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="world-details-mini-grid world-character-scroll-grid">
                                {characters.map((character, characterIndex) => (
                                    <button
                                        type="button"
                                        className={
                                            characterIndex === selectedCharacterIndex
                                                ? "world-details-mini-card selected"
                                                : "world-details-mini-card"
                                        }
                                        key={character.id || character.name || characterIndex}
                                        title={character.name}
                                        onClick={() => setSelectedCharacterIndex(characterIndex)}
                                    >
                                        {character.portrait ? (
                                            <img src={character.portrait} alt={character.name} />
                                        ) : (
                                            <span>{(character.name || "?").slice(0, 1)}</span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </article>
            </section>

            <section className="world-details-three-grid">
                <article className="world-details-panel">
                    <p className="home-kicker">Terrains</p>
                    <h2>Terrain Types</h2>

                    {terrains.length === 0 ? (
                        <p>No terrain types created yet.</p>
                    ) : (
                        <div className="world-entity-section">
                            {selectedTerrain && (
                                <div className="world-entity-detail-card">
                                    <div
                                        className="world-entity-detail-image terrain-detail-image"
                                        style={{
                                            "--terrain-preview-color": selectedTerrain.color || "#4b5563",
                                            "--terrain-preview-image":
                                                selectedTerrain.fillType === "image" && selectedTerrain.image
                                                    ? `url("${selectedTerrain.image}")`
                                                    : "none"
                                        }}
                                    >
                                        <span />
                                    </div>

                                    <div className="world-entity-detail-text">
                                        <h3>{selectedTerrain.label || "Unnamed Terrain"}</h3>

                                        <p className="world-entity-subtitle">
                                            {selectedTerrain.fillType === "image" ? "Image Terrain" : "Colour Terrain"}
                                        </p>

                                        <p>{selectedTerrain.description || "No terrain description."}</p>
                                    </div>
                                </div>
                            )}

                            <div className="world-details-mini-grid">
                                {terrains.map((terrain, terrainIndex) => (
                                    <button
                                        type="button"
                                        className={
                                            terrainIndex === selectedTerrainIndex
                                                ? "world-details-terrain-card selected"
                                                : "world-details-terrain-card"
                                        }
                                        key={terrain.key || terrainIndex}
                                        title={terrain.label}
                                        style={{
                                            "--terrain-preview-color": terrain.color || "#4b5563",
                                            "--terrain-preview-image":
                                                terrain.fillType === "image" && terrain.image
                                                    ? `url("${terrain.image}")`
                                                    : "none"
                                        }}
                                        onClick={() => setSelectedTerrainIndex(terrainIndex)}
                                    >
                                        <span />
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </article>

                <article className="world-details-panel">
                    <p className="home-kicker">Markers</p>
                    <h2>Counters</h2>

                    {counters.length === 0 ? (
                        <p>No counters created yet.</p>
                    ) : (
                        <div className="world-entity-section">
                            {selectedCounter && (
                                <div className="world-entity-detail-card compact">
                                    <div
                                        className="world-entity-detail-icon"
                                        style={{ "--chip-color": selectedCounter.color || "#e7c97a" }}
                                    >
                                        #
                                    </div>

                                    <div className="world-entity-detail-text">
                                        <h3>{selectedCounter.label || "Unnamed Counter"}</h3>
                                        <p>{selectedCounter.description || "No counter description."}</p>

                                        <div className="world-entity-chip-row">
                                            <span>{selectedCounter.decreaseLabel || "-1"}</span>
                                            <span>{selectedCounter.increaseLabel || "+1"}</span>

                                            {selectedCounter.allowSetCounter && (
                                                <span>{selectedCounter.setLabel || "Set"}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="world-details-chip-row">
                                {counters.map((counter, counterIndex) => (
                                    <button
                                        type="button"
                                        className={
                                            counterIndex === selectedCounterIndex
                                                ? "world-details-chip-button selected"
                                                : "world-details-chip-button"
                                        }
                                        key={counter.key || counterIndex}
                                        style={{ "--chip-color": counter.color || "#e7c97a" }}
                                        onClick={() => setSelectedCounterIndex(counterIndex)}
                                    >
                                        {counter.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </article>

                <article className="world-details-panel">
                    <p className="home-kicker">Status</p>
                    <h2>Conditions</h2>

                    {conditions.length === 0 ? (
                        <p>No conditions created yet.</p>
                    ) : (
                        <div className="world-entity-section">
                            {selectedCondition && (
                                <div className="world-entity-detail-card compact">
                                    <div className="world-entity-detail-icon condition-detail-icon">
                                        {selectedCondition.icon || "✨"}
                                    </div>

                                    <div className="world-entity-detail-text">
                                        <h3>{selectedCondition.label || "Unnamed Condition"}</h3>
                                        <p>{selectedCondition.description || "No condition description."}</p>
                                    </div>
                                </div>
                            )}

                            <div className="world-details-condition-row">
                                {conditions.map((condition, conditionIndex) => (
                                    <button
                                        type="button"
                                        className={
                                            conditionIndex === selectedConditionIndex
                                                ? "world-details-condition-button selected"
                                                : "world-details-condition-button"
                                        }
                                        key={condition.key || conditionIndex}
                                        title={condition.label}
                                        onClick={() => setSelectedConditionIndex(conditionIndex)}
                                    >
                                        {condition.icon || "✨"}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </article>
            </section>

            <section className="world-details-panel">
                <p className="home-kicker">Tokens</p>
                <h2>World Tokens</h2>

                {tokens.length === 0 ? (
                    <p>No world tokens created yet.</p>
                ) : (
                    <div className="world-entity-section">
                        {selectedToken && (
                            <div className="world-entity-detail-card compact">
                                <div className="world-entity-detail-icon">✦</div>

                                <div className="world-entity-detail-text">
                                    <h3>{selectedToken.label || "Unnamed Token"}</h3>
                                    <p>Token key: {selectedToken.name}</p>
                                </div>
                            </div>
                        )}

                        <div className="world-details-token-row">
                            {tokens.map((token, tokenIndex) => (
                                <button
                                    type="button"
                                    className={
                                        tokenIndex === selectedTokenIndex
                                            ? "world-details-token-button selected"
                                            : "world-details-token-button"
                                    }
                                    key={token.name || tokenIndex}
                                    onClick={() => setSelectedTokenIndex(tokenIndex)}
                                >
                                    {token.label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </section>
        </div>
    );
}
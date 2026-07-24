"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { loadLocalItem } from "@/lib/saveLoad";

import { hasSupabaseConfig, supabase } from "@/lib/supabaseClient";

import {
    getCharacterList,
    getConditionList,
    getCounterList,
    getEnabledFeatureLabels,
    getTerrainList,
    getWorldCreatorStats,
    getWorldData,
    getWorldDescription,
    getWorldDetails,
    getWorldPreviewImages,
    getWorldRulesPreview
} from "@/lib/worldData";

import { resolveCharacterPortrait } from "@/lib/portraitAssets";

import InvitePlayersPanel from "@/components/InvitePlayersPanel";
import MatchmakingReadyButton from "@/components/MatchmakingReadyButton";
import WorldPostsSection from "@/components/WorldPostsSection";

export default function WorldDetailsClient({ worldId }) {
    const [world, setWorld] = useState(null);
    const [worldSource, setWorldSource] = useState("");
    const [status, setStatus] = useState("Loading universe overview…");
    const [isLoading, setIsLoading] = useState(true);
    const [playStatus, setPlayStatus] = useState("");
    const [currentUser, setCurrentUser] = useState(null);
    const [openPostsInitially, setOpenPostsInitially] = useState(false);
    const [fromAccount, setFromAccount] = useState(false);
    const [isInvitePanelOpen, setIsInvitePanelOpen] = useState(false);
    const [inviteSessionId, setInviteSessionId] = useState("");

    const [selectedCharacterIndex, setSelectedCharacterIndex] = useState(0);
    const [selectedTerrainIndex, setSelectedTerrainIndex] = useState(0);
    const [selectedCounterIndex, setSelectedCounterIndex] = useState(0);
    const [selectedConditionIndex, setSelectedConditionIndex] = useState(0);

    useEffect(() => {
        async function loadWorldDetails() {
            setIsLoading(true);
            setStatus("Loading universe overview…");
            setWorld(null);
            setWorldSource("");
            setInviteSessionId("");
            setIsInvitePanelOpen(false);
            setPlayStatus("");

            // Keep local support as a fallback for old links/dev use.
            const savedWorld = loadLocalItem("worlds", worldId);

            if (savedWorld) {
                setWorld(savedWorld);
                setWorldSource("local");
                setStatus("");
                setIsLoading(false);
                return;
            }

            if (!hasSupabaseConfig() || !supabase) {
                setStatus("Could not find this universe.");
                setIsLoading(false);
                return;
            }

            try {
                const {
                    data: { user }
                } = await supabase.auth.getUser();

                const { data: onlineWorld, error } = await supabase
                    .from("worlds")
                    .select("id, owner_id, name, description, is_public, updated_at, world_data")
                    .eq("id", worldId)
                    .single();

                const canView =
                    onlineWorld &&
                    (onlineWorld.is_public ||
                        (user?.id && onlineWorld.owner_id === user.id));

                if (error || !canView) {
                    setStatus("Could not find this universe.");
                    setWorld(null);
                    setIsLoading(false);
                    return;
                }

                setWorld({
                    id: onlineWorld.id,
                    ownerId: onlineWorld.owner_id,
                    name: onlineWorld.name,
                    updatedAt: onlineWorld.updated_at,
                    isPublic: onlineWorld.is_public,
                    data: onlineWorld.world_data
                });

                setWorldSource("online");
                setStatus("");
                setIsLoading(false);
            } catch (error) {
                console.error("Online world details load failed:", error);
                setStatus("Could not reach Supabase to load this universe.");
                setWorld(null);
                setIsLoading(false);
            }
        }

        loadWorldDetails();
    }, [worldId]);

    useEffect(() => {
        if (typeof window === "undefined") return;

        const params = new URLSearchParams(window.location.search);
        setOpenPostsInitially(params.get("tab") === "posts");
        setFromAccount(params.get("from") === "account");
    }, [worldId]);

    useEffect(() => {
        async function loadCurrentUser() {
            if (!hasSupabaseConfig() || !supabase) {
                setCurrentUser(null);
                return;
            }

            try {
                const {
                    data: { user }
                } = await supabase.auth.getUser();
                setCurrentUser(user || null);
            } catch {
                setCurrentUser(null);
            }
        }

        loadCurrentUser();

        if (!supabase) return;

        const {
            data: { subscription }
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setCurrentUser(session?.user || null);
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    function handleInviteSessionReady(sessionId) {
        if (!sessionId) return;

        setInviteSessionId(sessionId);
        setPlayStatus("Private playtest table ready. Share the invite, then enter the board.");
    }

    const backHref = fromAccount ? "/account" : "/worlds";
    const backLabel = fromAccount ? "Back to Account" : "Back to Universes";

    if (!world) {
        return (
            <div className="world-details-content">
                <section className="world-details-missing-card">
                    <img
                        className="brand-loading-lockup"
                        src="/brand/lockup.png"
                        alt="Chess Multiverse"
                        width={180}
                        height={180}
                    />

                    <p className="home-kicker">Universe Details</p>
                    <h1>
                        {isLoading
                            ? "Loading universe overview…"
                            : status}
                    </h1>

                    <p>
                        {isLoading
                            ? "Explore this universe&apos;s content to plan your battles more effectively."
                            : "This universe may be private, unpublished, deleted, or saved in another browser."}
                    </p>

                    {!isLoading && (
                        <Link className="home-secondary-link" href={backHref}>
                            {backLabel}
                        </Link>
                    )}
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
    const portraitAssets = getWorldData(world)?.portraitAssets || {};
    const terrains = getTerrainList(world);
    const counters = getCounterList(world);
    const conditions = getConditionList(world);

    const selectedCharacter = characters[selectedCharacterIndex] || characters[0];
    const selectedCharacterPortrait = resolveCharacterPortrait(
        selectedCharacter,
        portraitAssets
    );
    const selectedTerrain = terrains[selectedTerrainIndex] || terrains[0];
    const selectedCounter = counters[selectedCounterIndex] || counters[0];
    const selectedCondition = conditions[selectedConditionIndex] || conditions[0];

    const playHref = inviteSessionId
        ? `/play?session=${encodeURIComponent(inviteSessionId)}${
              fromAccount ? "&from=account" : ""
          }`
        : `/play?world=${encodeURIComponent(world.id)}${
              fromAccount ? "&from=account" : ""
          }`;

    return (
        <div className="world-details-content">
            <Link className="world-details-back-link" href={backHref}>
                {backLabel}
            </Link>

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
                    <h1>{world.name}</h1>

                    <p>{description}</p>

                    <div className="world-details-play-choices">
                        {fromAccount ? (
                            <div className="world-details-invite-wrap">
                                <button
                                    type="button"
                                    className="world-details-invite-choice"
                                    disabled={
                                        worldSource !== "online" || !currentUser
                                    }
                                    onClick={() =>
                                        setIsInvitePanelOpen((current) => !current)
                                    }
                                >
                                    <span className="world-details-choice-copy">
                                        <strong>
                                            {worldSource !== "online"
                                                ? "Online Only"
                                                : !currentUser
                                                  ? "Sign In to Invite"
                                                  : "Invite"}
                                        </strong>
                                        <small>
                                            {worldSource !== "online"
                                                ? "Publish this universe online to invite friends to a playtest."
                                                : !currentUser
                                                  ? "Sign in to invite friends to a private playtest in this universe."
                                                  : "Invite friends to a private playtest in this universe."}
                                        </small>
                                    </span>
                                </button>

                                <InvitePlayersPanel
                                    isOpen={isInvitePanelOpen}
                                    onClose={() => setIsInvitePanelOpen(false)}
                                    currentUserId={currentUser?.id || ""}
                                    playSessionId={inviteSessionId}
                                    onSessionReady={handleInviteSessionReady}
                                    worldId={world.id}
                                    onStatusChange={setPlayStatus}
                                />
                            </div>
                        ) : (
                            <MatchmakingReadyButton
                                className="world-details-ready-choice"
                                worldId={world.id}
                                worldName={world.name}
                                disabled={worldSource !== "online"}
                                disabledLabel="Online Only"
                                readyLabel="Ready"
                                loadingLabel="Finding Match..."
                                description={
                                    worldSource === "online"
                                        ? "Find a public opponent and start a live match in this universe."
                                        : "Publish this universe online to match with other players."
                                }
                                onStatusChange={setPlayStatus}
                            />
                        )}

                        <Link
                            className="world-details-visit-choice"
                            href={playHref}
                        >
                            <span className="world-details-choice-copy">
                                <strong>
                                    {fromAccount && inviteSessionId
                                        ? "Enter Playtest"
                                        : "Visit Board"}
                                </strong>
                                <small>
                                    {fromAccount && inviteSessionId
                                        ? "Join the private table you just opened for this playtest."
                                        : "Open this universe&apos;s board for local play, setup, or private invites."}
                                </small>
                            </span>
                        </Link>

                        {playStatus && (
                            <p className="world-details-play-status">
                                {playStatus}
                            </p>
                        )}

                        {worldSource === "local" && (
                            <Link
                                className="home-secondary-link world-details-creator-link"
                                href={`/creator?world=${world.id}`}
                            >
                                Open in Creator
                            </Link>
                        )}
                    </div>
                </div>
            </section>

            <WorldPostsSection
                worldId={world.id}
                ownerId={world.ownerId}
                currentUser={currentUser}
                worldSource={worldSource}
                openPostsInitially={openPostsInitially}
            />

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
                <p className="home-kicker">Universe Data</p>
                <h2>Universe Stats</h2>

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
                                        {selectedCharacterPortrait ? (
                                            <img
                                                src={selectedCharacterPortrait}
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
                                {characters.map((character, characterIndex) => {
                                    const portraitSrc = resolveCharacterPortrait(
                                        character,
                                        portraitAssets
                                    );

                                    return (
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
                                        {portraitSrc ? (
                                            <img src={portraitSrc} alt={character.name} />
                                        ) : (
                                            <span>{(character.name || "?").slice(0, 1)}</span>
                                        )}
                                    </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </article>
            </section>

            <section className="world-details-three-grid">
                <article className="world-details-panel">
                    <h2>Terrains</h2>

                    {terrains.length === 0 ? (
                        <p>No terrains created yet.</p>
                    ) : (
                        <div className="world-entity-section">
                            {selectedTerrain && (
                                <div className="world-entity-detail-card world-details-system-detail">
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
                    <h2>Counters</h2>

                    {counters.length === 0 ? (
                        <p>No counters created yet.</p>
                    ) : (
                        <div className="world-entity-section">
                            {selectedCounter && (
                                <div className="world-entity-detail-card world-details-system-detail">
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

                                            {selectedCounter.allowBaseValue && (
                                                <span>
                                                    {`${selectedCounter.baseLabel || "Base"} (${selectedCounter.baseValue ?? 0})`}
                                                </span>
                                            )}

                                            {selectedCounter.allowSetValue && (
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
                    <h2>Conditions</h2>

                    {conditions.length === 0 ? (
                        <p>No conditions created yet.</p>
                    ) : (
                        <div className="world-entity-section">
                            {selectedCondition && (
                                <div className="world-entity-detail-card world-details-system-detail">
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
        </div>
    );
}
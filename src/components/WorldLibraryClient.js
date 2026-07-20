"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import {
    getEnabledFeatureLabels,
    getWorldComplexity,
    getWorldData,
    getWorldDescription,
    getWorldName,
    getWorldPreviewImages,
    getWorldRulesPreview
} from "@/lib/worldData";
import { fetchLatestPostsByWorldIds } from "@/lib/worldPostsClient";

import { hasSupabaseConfig, supabase } from "@/lib/supabaseClient";

function formatDate(value) {
    if (!value) return "Unknown date";

    try {
        return new Intl.DateTimeFormat("en-AU", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }).format(new Date(value));
    } catch {
        return "Unknown date";
    }
}

function worldMatchesSearch(world, searchText) {
    const cleanSearchText = searchText.trim().toLowerCase();

    if (!cleanSearchText) return true;

    const worldData = getWorldData(world);
    const details = worldData.worldDetails || {};

    const searchableText = [
        world.name,
        details.name,
        details.description,
        details.rulesNotes
    ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

    return searchableText.includes(cleanSearchText);
}

function worldHasFeature(world, featureKey) {
    if (featureKey === "all") return true;

    const worldData = getWorldData(world);
    const features = worldData.worldFeatures || {};

    return Boolean(features[featureKey]);
}

function getPublicWorldCardStats(world) {
    return [
        {
            icon: "★",
            label: "Rating",
            value: world.rating_average ? Number(world.rating_average).toFixed(1) : "New"
        },
        {
            icon: "👥",
            label: "Players",
            value: "0"
        },
        {
            icon: "⚔",
            label: "Matches",
            value: String(world.total_match_count || 0)
        },
        {
            icon: "🧠",
            label: "Complexity",
            value: getWorldComplexity(world)
        }
    ];
}

export default function WorldLibraryClient() {
    const [worldSearchText, setWorldSearchText] = useState("");
    const [selectedFeatureFilter, setSelectedFeatureFilter] = useState("all");

    const [publicWorlds, setPublicWorlds] = useState([]);
    const [publicWorldsStatus, setPublicWorldsStatus] = useState("");
    const [isLoadingPublicWorlds, setIsLoadingPublicWorlds] = useState(false);
    const [latestPostsByWorldId, setLatestPostsByWorldId] = useState({});

    const [currentUser, setCurrentUser] = useState(null);
    const [creatorNamesById, setCreatorNamesById] = useState({});

    async function loadCurrentLibraryUser() {
        if (!hasSupabaseConfig() || !supabase) {
            setCurrentUser(null);
            return;
        }

        try {
            const {
                data: { user },
                error
            } = await supabase.auth.getUser();

            if (error) {
                console.warn("Could not load current library user:", error.message);
                setCurrentUser(null);
                return;
            }

            setCurrentUser(user || null);
        } catch (error) {
            console.warn("Could not reach Supabase for library user:", error);
            setCurrentUser(null);
        }
    }

    async function loadCreatorNamesForWorlds(worldRows) {
        if (!hasSupabaseConfig() || !supabase) {
            setCreatorNamesById({});
            return;
        }

        const ownerIds = [
            ...new Set(
                (worldRows || [])
                    .map((world) => world.owner_id)
                    .filter(Boolean)
            )
        ];

        if (ownerIds.length === 0) {
            setCreatorNamesById({});
            return;
        }

        try {
            const { data: profiles, error } = await supabase
                .from("profiles")
                .select("id, display_name")
                .in("id", ownerIds);

            if (error) {
                console.warn("Could not load creator names:", error.message);
                setCreatorNamesById({});
                return;
            }

            const nextCreatorNamesById = {};

            for (const profile of profiles || []) {
                nextCreatorNamesById[profile.id] =
                    profile.display_name || "Unknown Creator";
            }

            setCreatorNamesById(nextCreatorNamesById);
        } catch (error) {
            console.warn("Could not reach Supabase for creator names:", error);
            setCreatorNamesById({});
        }
    }

    async function loadPublicWorlds() {
        if (!hasSupabaseConfig() || !supabase) {
            setPublicWorlds([]);
            setPublicWorldsStatus("Supabase is not configured.");
            return;
        }

        setIsLoadingPublicWorlds(true);
        setPublicWorldsStatus("Loading universes…");

        try {
            const { data, error } = await supabase
                .from("worlds")
                .select(
                    "id, owner_id, name, description, is_public, complexity_label, rating_average, total_match_count, updated_at, world_data"
                )
                .eq("is_public", true)
                .order("updated_at", { ascending: false })
                .limit(12);

            if (error) {
                setPublicWorlds([]);
                setPublicWorldsStatus(error.message);
                return;
            }

            const nextPublicWorlds = data || [];

            setPublicWorlds(nextPublicWorlds);
            setPublicWorldsStatus("");

            await loadCreatorNamesForWorlds(nextPublicWorlds);

            const { postsByWorldId } = await fetchLatestPostsByWorldIds(
                nextPublicWorlds.map((world) => world.id)
            );
            setLatestPostsByWorldId(postsByWorldId || {});
        } catch (error) {
            console.error("Public worlds fetch failed:", error);

            setPublicWorlds([]);
            setPublicWorldsStatus("Could not reach Supabase to load published universes.");
        } finally {
            setIsLoadingPublicWorlds(false);
        }
    }

    useEffect(() => {
        loadCurrentLibraryUser();
        loadPublicWorlds();

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

    const filteredPublicWorlds = publicWorlds.filter((world) => {
        const worldForHelpers = {
            name: world.name,
            data: world.world_data
        };

        const matchesSearch = worldMatchesSearch(worldForHelpers, worldSearchText);
        const matchesFeature = worldHasFeature(worldForHelpers, selectedFeatureFilter);

        return matchesSearch && matchesFeature;
    });

    return (
        <div className="world-library-content">
            <section className="platform-hero worlds-hero">
                <p className="home-kicker">Universe Library</p>

                <h1>Universes</h1>

                <p>
                    Choose your Universe and prepare to challenge fellow players in epic chess battles.
                </p>
            </section>

            <section className="world-grid-section">
                <div className="section-heading-row">
                    <div>
                        <p className="home-kicker">Published Universes</p>
                        <h2>Enter the Multiverse</h2>
                    </div>

                    <button
                        type="button"
                        className="world-library-disabled-pill"
                        onClick={loadPublicWorlds}
                        disabled={isLoadingPublicWorlds}
                    >
                        {isLoadingPublicWorlds ? "Loading..." : "Refresh"}
                    </button>
                </div>

                <div className="world-library-filter-bar">
                    <input
                        value={worldSearchText}
                        placeholder="Search published universes…"
                        onChange={(event) => setWorldSearchText(event.target.value)}
                    />

                    <select
                        value={selectedFeatureFilter}
                        onChange={(event) => setSelectedFeatureFilter(event.target.value)}
                    >
                        <option value="all">All systems</option>
                        <option value="characters">Characters</option>
                        <option value="terrains">Terrains</option>
                        <option value="counters">Counters</option>
                        <option value="conditions">Conditions</option>
                        <option value="cardDecks">Cards</option>
                        <option value="diceSystem">Dice</option>
                        <option value="timers">Timers</option>
                        <option value="objectives">Objectives</option>
                        <option value="fogOfWar">Fog</option>
                    </select>
                </div>

                {isLoadingPublicWorlds && (
                    <div className="empty-worlds-card">
                        <h3>Loading universes…</h3>
                        <p>Fetching the public library…</p>
                    </div>
                )}

                {!isLoadingPublicWorlds && publicWorldsStatus && (
                    <div className="empty-worlds-card">
                        <h3>Could not load universes</h3>
                        <p>{publicWorldsStatus}</p>
                    </div>
                )}

                {!isLoadingPublicWorlds &&
                    !publicWorldsStatus &&
                    publicWorlds.length === 0 && (
                        <div className="empty-worlds-card">
                            <h3>No published universes yet</h3>
                            <p>
                                Publish a universe from your Account page to list it here.
                                The multiverse is currently quiet. Suspiciously quiet.
                            </p>
                        </div>
                    )}

                {!isLoadingPublicWorlds &&
                    !publicWorldsStatus &&
                    publicWorlds.length > 0 &&
                    filteredPublicWorlds.length === 0 && (
                        <div className="empty-worlds-card">
                            <h3>No matching universes</h3>
                            <p>
                                Try another search term or system filter.
                            </p>
                        </div>
                    )}

                {!isLoadingPublicWorlds &&
                    !publicWorldsStatus &&
                    filteredPublicWorlds.length > 0 && (
                        <div className="world-card-grid published-world-card-grid">
                            {filteredPublicWorlds.map((world) => {
                                const worldForHelpers = {
                                    name: world.name,
                                    data: world.world_data
                                };

                                const previewImages = getWorldPreviewImages(worldForHelpers);
                                const publicStats = getPublicWorldCardStats({
                                    ...world,
                                    data: world.world_data
                                });

                                const isOwnedByCurrentUser = Boolean(
                                    currentUser?.id && world.owner_id === currentUser.id
                                );

                                const creatorDisplayName = isOwnedByCurrentUser
                                    ? "You"
                                    : creatorNamesById[world.owner_id] || "Unknown Creator";

                                const latestPost = latestPostsByWorldId[world.id];

                                return (
                                    <article
                                        className={
                                            isOwnedByCurrentUser
                                                ? "world-card community-world-card published-world-card published-world-card-owned"
                                                : "world-card community-world-card published-world-card"
                                        }
                                        key={world.id}
                                    >
                                        <div className="world-card-preview world-card-preview-theme">
                                            {previewImages.backgroundImage && (
                                                <img
                                                    className="world-card-preview-background-img"
                                                    src={previewImages.backgroundImage}
                                                    alt=""
                                                    aria-hidden="true"
                                                />
                                            )}

                                            <div className="world-card-preview-overlay" />

                                            {isOwnedByCurrentUser && (
                                                <span className="owned-world-badge">
                                                    Your Universe
                                                </span>
                                            )}

                                            {previewImages.boardSkinImage ? (
                                                <img
                                                    className="world-card-preview-board-img"
                                                    src={previewImages.boardSkinImage}
                                                    alt={`${world.name} board preview`}
                                                />
                                            ) : (
                                                <span className="world-card-preview-fallback">
                                                    {world.name.slice(0, 1)}
                                                </span>
                                            )}
                                        </div>

                                        <div className="world-card-content">
                                            <p
                                                className={
                                                    latestPost
                                                        ? "world-card-last-update"
                                                        : "world-card-last-update empty"
                                                }
                                            >
                                                {latestPost
                                                    ? `Last update · ${formatDate(latestPost.created_at)}${
                                                          latestPost.body
                                                              ? ` — ${latestPost.body.slice(0, 72)}${
                                                                    latestPost.body.length > 72
                                                                        ? "…"
                                                                        : ""
                                                                }`
                                                              : ""
                                                      }`
                                                    : "No posts yet"}
                                            </p>

                                            <div className="world-card-topline">
                                                <span>{isOwnedByCurrentUser ? "Your Universe" : `By ${creatorDisplayName}`}</span>
                                                <span>{formatDate(world.updated_at)}</span>
                                            </div>

                                            <h3>{world.name}</h3>

                                            <div className="world-card-action-row world-card-action-row-inline">
                                                <Link
                                                    className="world-play-link"
                                                    href={`/worlds/${world.id}`}
                                                    title={`Enter ${world.name}`}
                                                >
                                                    Enter Universe
                                                </Link>
                                            </div>

                                            <p>
                                                {world.description ||
                                                    "No description yet. This universe is public, mysterious, and still negotiating with causality."}
                                            </p>

                                            <div className="world-card-stat-strip">
                                                {publicStats.map((stat) => (
                                                    <div className="world-card-stat" key={stat.label}>
                                                        <span className="world-card-stat-icon">{stat.icon}</span>

                                                        <span className="world-card-stat-text">
                                                            <strong>{stat.value}</strong>
                                                            <small>{stat.label}</small>
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    )}
            </section>

            <section className="world-create-nudge">
                <div>
                    <p className="home-kicker">Create your own Universe</p>

                    <p>
                        None of these universes called to you? Tragic. Build your own Universe,
                        give it rules, create unique characters and abilities, and toggle
                        various modes of play. The multiverse is what you make of it.
                    </p>
                </div>

                <Link className="home-secondary-link" href="/creator">
                    Create a Universe
                </Link>
            </section>
        </div>
    );
}
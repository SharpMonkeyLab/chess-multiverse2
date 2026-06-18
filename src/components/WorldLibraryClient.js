"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import {
    getEnabledFeatureLabels,
    getWorldCardStats,
    getWorldData,
    getWorldDescription,
    getWorldName,
    getWorldPreviewImages,
    getWorldRulesPreview
} from "@/lib/worldData";

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
            value: world.complexity_label || "Simple"
        }
    ];
}

export default function WorldLibraryClient() {
    const [localWorlds, setLocalWorlds] = useState([]);
    const [importStatus, setImportStatus] = useState("");

    const [worldSearchText, setWorldSearchText] = useState("");
    const [selectedFeatureFilter, setSelectedFeatureFilter] = useState("all");

    const [publicWorlds, setPublicWorlds] = useState([]);
    const [publicWorldsStatus, setPublicWorldsStatus] = useState("");
    const [isLoadingPublicWorlds, setIsLoadingPublicWorlds] = useState(false);

    async function loadPublicWorlds() {
        if (!hasSupabaseConfig() || !supabase) {
            setPublicWorlds([]);
            setPublicWorldsStatus("Supabase is not configured.");
            return;
        }

        setIsLoadingPublicWorlds(true);
        setPublicWorldsStatus("Loading published worlds...");

        try {
            const { data, error } = await supabase
                .from("worlds")
                .select(
                    "id, name, description, is_public, complexity_label, rating_average, total_match_count, updated_at, world_data"
                )
                .eq("is_public", true)
                .order("updated_at", { ascending: false })
                .limit(12);

            if (error) {
                setPublicWorlds([]);
                setPublicWorldsStatus(error.message);
                return;
            }

            setPublicWorlds(data || []);
            setPublicWorldsStatus("");
        } catch (error) {
            console.error("Public worlds fetch failed:", error);

            setPublicWorlds([]);
            setPublicWorldsStatus("Could not reach Supabase to load published worlds.");
        } finally {
            setIsLoadingPublicWorlds(false);
        }
    }

    useEffect(() => {
        loadPublicWorlds();
    }, []);

    const filteredLocalWorlds = localWorlds.filter((world) => {
        const matchesSearch = worldMatchesSearch(world, worldSearchText);
        const matchesFeature = worldHasFeature(world, selectedFeatureFilter);

        return matchesSearch && matchesFeature;
    });

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
                <p className="home-kicker">World Library</p>

                <h1>Worlds</h1>

                <p>
                    Choose the world you want to enter and prepare to challenge fellow players in epic chess battles.
                </p>
            </section>

            <section className="world-grid-section">
                <div className="section-heading-row">
                    <div>
                        <p className="home-kicker">Published Worlds</p>
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
                        placeholder="Search published worlds..."
                        onChange={(event) => setWorldSearchText(event.target.value)}
                    />

                    <select
                        value={selectedFeatureFilter}
                        onChange={(event) => setSelectedFeatureFilter(event.target.value)}
                    >
                        <option value="all">All systems</option>
                        <option value="characters">Characters</option>
                        <option value="worldTokens">Tokens</option>
                        <option value="terrains">Terrains</option>
                        <option value="counters">Counters</option>
                        <option value="conditions">Conditions</option>
                    </select>
                </div>

                {isLoadingPublicWorlds && (
                    <div className="empty-worlds-card">
                        <h3>Loading published worlds...</h3>
                        <p>
                            Checking the public library. The archive goblin is finding the right shelf.
                        </p>
                    </div>
                )}

                {!isLoadingPublicWorlds && publicWorldsStatus && (
                    <div className="empty-worlds-card">
                        <h3>Could not load published worlds</h3>
                        <p>{publicWorldsStatus}</p>
                    </div>
                )}

                {!isLoadingPublicWorlds &&
                    !publicWorldsStatus &&
                    publicWorlds.length === 0 && (
                        <div className="empty-worlds-card">
                            <h3>No published worlds yet</h3>
                            <p>
                                Publish a world from your account page, then it will appear here.
                                The multiverse is currently quiet. Suspiciously quiet.
                            </p>
                        </div>
                    )}

                {!isLoadingPublicWorlds &&
                    !publicWorldsStatus &&
                    publicWorlds.length > 0 &&
                    filteredPublicWorlds.length === 0 && (
                        <div className="empty-worlds-card">
                            <h3>No matching published worlds</h3>
                            <p>
                                Try a different search or system filter.
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
                                const publicStats = getPublicWorldCardStats(world);

                                return (
                                    <article
                                        className="world-card community-world-card published-world-card"
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
                                            <div className="world-card-topline">
                                                <span>Published</span>
                                                <span>{formatDate(world.updated_at)}</span>
                                            </div>

                                            <h3>{world.name}</h3>

                                            <p>
                                                {world.description ||
                                                    "No description yet. This world is public, mysterious, and probably balanced by goblins."}
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

                                            <div className="world-card-footer">
                                                <span>Public</span>

                                                <div className="world-card-action-row">
                                                    <Link
                                                        className="world-play-link"
                                                        href={`/worlds/${world.id}`}
                                                    >
                                                        View Details
                                                    </Link>

                                                    <button
                                                        type="button"
                                                        className="world-soon-link"
                                                        disabled
                                                        title="Later this will create or join a challenge from this world."
                                                    >
                                                        Challenge Soon
                                                    </button>
                                                </div>
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
                    <p className="home-kicker">Create your own world</p>

                    <p>
                        None of these worlds called to you? Tragic. Build your own world,
                        give it rules, create unique characters and abilities, and toggle
                        various modes of play. The multiverse is what you make of it.
                    </p>
                </div>

                <Link className="home-secondary-link" href="/creator">
                    Create a World
                </Link>
            </section>
        </div>
    );
}
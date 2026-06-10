"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import {
    deleteLocalItem,
    downloadJsonFile,
    getLocalItemList,
    makeSafeFileName,
    readJsonFile,
    saveLocalItem
} from "@/lib/saveLoad";

import {
    getEnabledFeatureLabels,
    getWorldCardStats,
    getWorldData,
    getWorldDescription,
    getWorldName,
    getWorldPreviewImages,
    getWorldRulesPreview
} from "@/lib/worldData";

const COMMUNITY_WORLD_PREVIEWS = [
    {
        id: "elemental-chess",
        name: "Elemental Chess",
        tagline: "A tactical world of elemental powers, terrain, and pressure.",
        status: "Featured",
        creator: "Chess Multiverse",
        tags: ["Elemental", "Tactical", "Beginner Friendly"],
        stats: [
            { icon: "★", label: "Rating", value: "4.8" },
            { icon: "👥", label: "Players", value: "12" },
            { icon: "⚔", label: "Matches", value: "146" },
            { icon: "🧠", label: "Complexity", value: "Standard" }
        ]
    },
    {
        id: "material-chess",
        name: "Material Chess",
        tagline: "Science-fantasy chess inspired by states of matter.",
        status: "Concept",
        creator: "Chess Multiverse",
        tags: ["Science", "States of Matter", "Experimental"],
        stats: [
            { icon: "★", label: "Rating", value: "New" },
            { icon: "👥", label: "Players", value: "0" },
            { icon: "⚔", label: "Matches", value: "0" },
            { icon: "🧠", label: "Complexity", value: "Advanced" }
        ]
    },
    {
        id: "shinobi-chess",
        name: "Shinobi Chess",
        tagline: "Character ability chess with chakra, counters, and conditions.",
        status: "Playtest",
        creator: "Chess Multiverse",
        tags: ["Abilities", "High Chaos", "Characters"],
        stats: [
            { icon: "★", label: "Rating", value: "4.6" },
            { icon: "👥", label: "Players", value: "8" },
            { icon: "⚔", label: "Matches", value: "92" },
            { icon: "🧠", label: "Complexity", value: "Advanced" }
        ]
    }
];

function unwrapImportedWorld(importedData) {
    return importedData?.type === "chess-multiverse-world"
        ? importedData.data
        : importedData;
}

function getWorldNameFromData(data) {
    return data?.worldDetails?.name || data?.name || "Imported World";
}

function createDuplicateWorldName(originalName, existingWorlds) {
    const baseName = `${originalName || "Untitled World"} Copy`;
    const existingNames = existingWorlds.map((world) => world.name);

    if (!existingNames.includes(baseName)) {
        return baseName;
    }

    let copyNumber = 2;
    let nextName = `${baseName} ${copyNumber}`;

    while (existingNames.includes(nextName)) {
        copyNumber += 1;
        nextName = `${baseName} ${copyNumber}`;
    }

    return nextName;
}

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

export default function WorldLibraryClient() {
    const [localWorlds, setLocalWorlds] = useState([]);
    const [importStatus, setImportStatus] = useState("");

    const [worldSearchText, setWorldSearchText] = useState("");
    const [selectedFeatureFilter, setSelectedFeatureFilter] = useState("all");

    function refreshLocalWorlds() {
        setLocalWorlds(getLocalItemList("worlds"));
    }

    useEffect(() => {
        refreshLocalWorlds();
    }, []);

    async function handleImportWorld(file) {
        if (!file) return;

        try {
            setImportStatus("Reading world file...");

            const importedData = await readJsonFile(file);
            const worldData = unwrapImportedWorld(importedData);

            if (!worldData || typeof worldData !== "object") {
                setImportStatus("This JSON file does not contain valid world data.");
                return;
            }

            const worldName = getWorldNameFromData(worldData);

            saveLocalItem("worlds", worldName, worldData);
            refreshLocalWorlds();

            setImportStatus(`Imported "${worldName}". It is now in Local Worlds.`);
        } catch (error) {
            setImportStatus(error.message || "Could not import this world.");
        }
    }

    function handleDuplicateLocalWorld(world) {
        const duplicateName = createDuplicateWorldName(world.name, localWorlds);

        const worldData = getWorldData(world);

        const duplicatedWorld = {
            ...worldData,
            worldDetails: {
                ...(worldData.worldDetails || {}),
                name: duplicateName
            }
        };

        saveLocalItem("worlds", duplicateName, duplicatedWorld);
        refreshLocalWorlds();

        setImportStatus(`Duplicated "${world.name}" as "${duplicateName}".`);
    }

    function handleExportLocalWorld(world) {
        const worldData = getWorldData(world);
        const worldName = getWorldName(world);

        const exportData = {
            type: "chess-multiverse-world",
            exportedAt: new Date().toISOString(),
            version: 1,
            data: worldData
        };

        const fileName = `${makeSafeFileName(worldName)}-world.json`;

        downloadJsonFile(fileName, exportData);

        setImportStatus(`Exported "${worldName}" as ${fileName}.`);
    }

    function handleDeleteLocalWorld(worldId, worldName) {
        const confirmed = window.confirm(
            `Delete "${worldName}" from local worlds?`
        );

        if (!confirmed) return;

        deleteLocalItem("worlds", worldId);
        refreshLocalWorlds();

        setImportStatus(`Deleted "${worldName}" from Local Worlds.`);
    }

    const filteredLocalWorlds = localWorlds.filter((world) => {
        const matchesSearch = worldMatchesSearch(world, worldSearchText);
        const matchesFeature = worldHasFeature(world, selectedFeatureFilter);

        return matchesSearch && matchesFeature;
    });

    return (
        <div className="world-library-content">
            <section className="platform-hero">
                <p className="home-kicker">World Library</p>

                <h1>Choose, import, or create a world.</h1>

                <p>
                    Browse featured worlds, manage worlds saved in this browser, or import
                    a world JSON file shared by another creator.
                </p>
            </section>

            <section className="world-library-actions">
                <article className="world-import-card">
                    <div>
                        <p className="home-kicker">Import</p>
                        <h2>Import World JSON</h2>
                        <p>
                            Use this to load a world exported from the World Creator. Later,
                            this will become public sharing and online saves.
                        </p>
                    </div>

                    <label className="world-import-button">
                        Choose JSON File
                        <input
                            type="file"
                            accept=".json,application/json"
                            onChange={(event) => {
                                handleImportWorld(event.target.files[0]);
                                event.target.value = "";
                            }}
                        />
                    </label>

                    {importStatus && (
                        <p className="world-import-status">{importStatus}</p>
                    )}
                </article>

                <article className="world-import-card">
                    <div>
                        <p className="home-kicker">Create</p>
                        <h2>Build a New World</h2>
                        <p>
                            Open the full-screen World Creator to design characters, terrain,
                            board skins, counters, conditions, and rules.
                        </p>
                    </div>

                    <Link className="home-primary-link" href="/creator">
                        Open Creator
                    </Link>
                </article>
            </section>

            <section className="world-grid-section">
                <div className="section-heading-row">
                    <div>
                        <p className="home-kicker">Saved Here</p>
                        <h2>Local Worlds</h2>
                    </div>

                    <Link className="home-secondary-link" href="/creator">
                        Create New World
                    </Link>
                </div>

                <div className="world-library-filter-bar">
                    <input
                        value={worldSearchText}
                        placeholder="Search worlds..."
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

                {localWorlds.length === 0 ? (
                    <div className="empty-worlds-card">
                        <h3>No local worlds yet</h3>
                        <p>
                            Save a world from the Creator or import a JSON file. The first
                            world always feels like stealing fire from the gods, except with
                            localStorage.
                        </p>
                    </div>
                ) : filteredLocalWorlds.length === 0 ? (
                    <div className="empty-worlds-card">
                        <h3>No matching worlds</h3>
                        <p>
                            Try a different search or filter. The world may exist, but it is
                            currently hiding in the fog like a dramatic bishop.
                        </p>
                    </div>
                ) : (
                    <div className="world-card-grid">
                        {filteredLocalWorlds.map((world) => {
                            const description = getWorldDescription(world);
                            const rulesPreview = getWorldRulesPreview(world);
                            const enabledFeatures = getEnabledFeatureLabels(world);
                            const worldStats = getWorldCardStats(world);
                            const previewImages = getWorldPreviewImages(world);

                            return (
                                <article className="world-card local-world-card" key={world.id}>
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
                                            <span>Local World</span>
                                            <span>{formatDate(world.updatedAt)}</span>
                                        </div>

                                        <h3>{world.name}</h3>

                                        <p>{description}</p>

                                        <div className="world-rules-preview">
                                            <span>Rules Preview</span>
                                            <p>{rulesPreview}</p>
                                        </div>

                                        <div className="world-feature-row">
                                            {enabledFeatures.length === 0 ? (
                                                <span>No systems enabled</span>
                                            ) : (
                                                enabledFeatures.map((featureLabel) => (
                                                    <span key={featureLabel}>{featureLabel}</span>
                                                ))
                                            )}
                                        </div>

                                        <div className="world-card-stat-strip">
                                            {worldStats.map((stat) => (
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
                                            <span>Private</span>

                                            <div className="world-card-action-row">
                                                <Link
                                                    className="world-play-link"
                                                    href={`/worlds/${world.id}`}
                                                >
                                                    View Details
                                                </Link>

                                                <Link
                                                    className="world-play-link"
                                                    href={`/creator?world=${world.id}`}
                                                >
                                                    Open in Creator
                                                </Link>

                                                <button
                                                    type="button"
                                                    className="world-card-secondary-action"
                                                    onClick={() => handleExportLocalWorld(world)}
                                                >
                                                    Export
                                                </button>

                                                <button
                                                    type="button"
                                                    className="world-card-secondary-action"
                                                    onClick={() => handleDuplicateLocalWorld(world)}
                                                >
                                                    Duplicate
                                                </button>

                                                <button
                                                    type="button"
                                                    className="world-soon-link"
                                                    disabled
                                                    title="Later this will create or join a challenge from this world."
                                                >
                                                    Challenge Soon
                                                </button>

                                                <button
                                                    type="button"
                                                    className="world-delete-link"
                                                    onClick={() =>
                                                        handleDeleteLocalWorld(world.id, world.name)
                                                    }
                                                >
                                                    Delete
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

            <section className="world-grid-section">
                <div className="section-heading-row">
                    <div>
                        <p className="home-kicker">Future Online Library</p>
                        <h2>Community Worlds Preview</h2>
                    </div>

                    <button type="button" className="world-library-disabled-pill" disabled>
                        Supabase Soon
                    </button>
                </div>

                <div className="world-card-grid">
                    {COMMUNITY_WORLD_PREVIEWS.map((world) => (
                        <article className="world-card community-world-card" key={world.id}>
                            <div className="world-card-preview community-world-preview">
                                <span>{world.name.slice(0, 1)}</span>
                            </div>

                            <div className="world-card-content">
                                <div className="world-card-topline">
                                    <span>{world.status}</span>
                                    <span>By {world.creator}</span>
                                </div>

                                <h3>{world.name}</h3>

                                <p>{world.tagline}</p>

                                <div className="world-tag-row">
                                    {world.tags.map((tag) => (
                                        <span key={tag}>{tag}</span>
                                    ))}
                                </div>

                                <div className="world-card-stat-strip">
                                    {world.stats.map((stat) => (
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
                                    <span>Public Soon</span>

                                    <div className="world-card-action-row">
                                        <button
                                            type="button"
                                            className="world-card-secondary-action"
                                            disabled
                                        >
                                            View Details Soon
                                        </button>

                                        <button
                                            type="button"
                                            className="world-soon-link"
                                            disabled
                                        >
                                            Challenge Soon
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </article>
                    ))}
                </div>
            </section>
        </div>
    );
}
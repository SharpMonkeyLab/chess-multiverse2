"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import {
    deleteLocalItem,
    getLocalItemList,
    readJsonFile,
    saveLocalItem
} from "@/lib/saveLoad";

const FEATURED_WORLDS = [
    {
        id: "elemental-chess",
        name: "Elemental Chess",
        tagline: "A tactical world of elemental powers, terrain, and pressure.",
        status: "Featured",
        tags: ["Elemental", "Tactical", "Beginner Friendly"]
    },
    {
        id: "material-chess",
        name: "Material Chess",
        tagline: "Science-fantasy chess inspired by states of matter.",
        status: "Concept",
        tags: ["Science", "States of Matter", "Experimental"]
    },
    {
        id: "shinobi-chess",
        name: "Shinobi Chess",
        tagline: "Character ability chess with chakra, counters, and conditions.",
        status: "Playtest",
        tags: ["Abilities", "High Chaos", "Characters"]
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

function getLocalWorldDetails(world) {
    const worldData = getWorldData(world);

    return worldData.worldDetails || {};
}

function getLocalWorldDescription(world) {
    const details = getLocalWorldDetails(world);

    return (
        details.description ||
        "No description yet. A mysterious world, which is either intriguing or badly documented."
    );
}

function getLocalWorldRulesPreview(world) {
    const details = getLocalWorldDetails(world);

    return details.rulesNotes || "No rules summary yet.";
}

function getEnabledFeatureLabels(world) {
    const worldData = getWorldData(world);
    const features = worldData.worldFeatures || {};

    const featureLabels = [
        { key: "characters", label: "Characters" },
        { key: "worldTokens", label: "Tokens" },
        { key: "terrains", label: "Terrains" },
        { key: "counters", label: "Counters" },
        { key: "conditions", label: "Conditions" }
    ];

    return featureLabels
        .filter((feature) => features[feature.key])
        .map((feature) => feature.label);
}

function getCharacterCount(world) {
    const worldData = getWorldData(world);
    const characterLibrary = worldData.characterLibrary;

    if (Array.isArray(characterLibrary)) {
        return characterLibrary.length;
    }

    return Object.keys(characterLibrary || {}).length;
}

function getTerrainCount(world) {
    const worldData = getWorldData(world);
    const terrains = worldData.worldMechanics?.terrains;

    return Array.isArray(terrains) ? terrains.length : 0;
}

function getCounterCount(world) {
    const worldData = getWorldData(world);
    const counters = worldData.worldMechanics?.counters;

    return Array.isArray(counters) ? counters.length : 0;
}

function getConditionCount(world) {
    const worldData = getWorldData(world);
    const conditions = worldData.worldMechanics?.conditions;

    return Array.isArray(conditions) ? conditions.length : 0;
}

function getTokenCount(world) {
    const worldData = getWorldData(world);
    const worldTokens = worldData.worldTokens;

    return Object.keys(worldTokens || {}).length;
}

function getWorldStats(world) {
    return [
        {
            label: "Characters",
            value: getCharacterCount(world)
        },
        {
            label: "Terrains",
            value: getTerrainCount(world)
        },
        {
            label: "Counters",
            value: getCounterCount(world)
        },
        {
            label: "Conditions",
            value: getConditionCount(world)
        },
        {
            label: "Tokens",
            value: getTokenCount(world)
        }
    ];
}

function getWorldData(world) {
    // Normal local saves use world.data.
    // Some imported or older saves may be wrapped one level deeper.
    // This keeps the Library tolerant instead of dramatic.
    return world?.data?.data || world?.data || {};
}

function getWorldTheme(world) {
    const worldData = getWorldData(world);

    return (
        worldData.worldTheme ||
        worldData.theme ||
        {}
    );
}

function getWorldPreviewImages(world) {
    const theme = getWorldTheme(world);

    return {
        backgroundImage: theme.backgroundImage || "",
        boardSkinImage: theme.boardSkinImage || ""
    };
}

export default function WorldLibraryClient() {
    const [localWorlds, setLocalWorlds] = useState([]);
    const [importStatus, setImportStatus] = useState("");

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

    function handleDeleteLocalWorld(worldId, worldName) {
        const confirmed = window.confirm(
            `Delete "${worldName}" from local worlds?`
        );

        if (!confirmed) return;

        deleteLocalItem("worlds", worldId);
        refreshLocalWorlds();

        setImportStatus(`Deleted "${worldName}" from Local Worlds.`);
    }

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

                {localWorlds.length === 0 ? (
                    <div className="empty-worlds-card">
                        <h3>No local worlds yet</h3>
                        <p>
                            Save a world from the Creator or import a JSON file. The first
                            world always feels like stealing fire from the gods, except with
                            localStorage.
                        </p>
                    </div>
                ) : (
                    <div className="world-card-grid">
                        {localWorlds.map((world) => {
                            const description = getLocalWorldDescription(world);
                            const rulesPreview = getLocalWorldRulesPreview(world);
                            const enabledFeatures = getEnabledFeatureLabels(world);
                            const worldStats = getWorldStats(world);
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

                                        <div className="world-stat-list">
                                            {worldStats.map((stat) => (
                                                <div
                                                    className={
                                                        stat.value === 0
                                                            ? "world-stat-row empty"
                                                            : "world-stat-row"
                                                    }
                                                    key={stat.label}
                                                >
                                                    <span>{stat.label}</span>
                                                    <strong>{stat.value}</strong>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="world-card-footer">
                                            <span>Private</span>

                                            <div className="world-card-action-row">
                                                <Link
                                                    className="world-play-link"
                                                    href={`/creator?world=${world.id}`}
                                                >
                                                    Open in Creator
                                                </Link>

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
                        <p className="home-kicker">Featured</p>
                        <h2>Demo Worlds</h2>
                    </div>
                </div>

                <div className="world-card-grid">
                    {FEATURED_WORLDS.map((world) => (
                        <article className="world-card" key={world.id}>
                            <div className="world-card-preview">
                                <span>{world.name.slice(0, 1)}</span>
                            </div>

                            <div className="world-card-content">
                                <div className="world-card-topline">
                                    <span>{world.status}</span>
                                    <span>Preview</span>
                                </div>

                                <h3>{world.name}</h3>

                                <p>{world.tagline}</p>

                                <div className="world-tag-row">
                                    {world.tags.map((tag) => (
                                        <span key={tag}>{tag}</span>
                                    ))}
                                </div>

                                <div className="world-card-footer">
                                    <span>Sample</span>

                                    <Link className="world-play-link" href="/creator">
                                        Recreate
                                    </Link>
                                </div>
                            </div>
                        </article>
                    ))}
                </div>
            </section>
        </div>
    );
}
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import FeatureToggleEditor from "./FeatureToggleEditor";
import ThemeEditor from "./ThemeEditor";

export default function TopCommandBar({
    worldDetails,
    worldFeatures,
    worldTheme,

    savedWorlds,
    selectedSavedWorldId,
    savedTestGames,
    selectedSavedTestGameId,
    saveStatus,

    onWorldDetailsChange,
    onThemeChange,
    onToggleWorldFeature,
    onPieceSkinChange,
    onCharacterDisplayModeChange,

    onSaveWorld,
    onLoadWorld,
    onDeleteWorld,
    onExportWorld,
    onImportWorld,
    onSelectedSavedWorldChange,

    onSaveTestGame,
    onLoadTestGame,
    onDeleteTestGame,
    onSelectedSavedTestGameChange
}) {
    const router = useRouter();

    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef(null);

    useEffect(() => {
        function handleDocumentClick(event) {
            if (!menuRef.current) return;

            if (!menuRef.current.contains(event.target)) {
                setIsMenuOpen(false);
            }
        }

        document.addEventListener("mousedown", handleDocumentClick);

        return () => {
            document.removeEventListener("mousedown", handleDocumentClick);
        };
    }, []);

    function handleImportChange(event) {
        const file = event.target.files[0];

        if (file) {
            onImportWorld(file);
        }

        event.target.value = "";
    }

    function handleExit() {
        router.push("/worlds");
    }

    return (
        <header className="top-command-bar">
            <div className="world-title-block">
                <h1>Chess Multiverse</h1>
            </div>

            <div className="top-command-actions">
                <div className="top-command-button-row">
                    <button type="button" className="primary-button" onClick={onSaveWorld}>
                        Save World
                    </button>

                    <button type="button" onClick={handleExit}>
                        Exit
                    </button>

                    <div className="command-menu-wrap" ref={menuRef}>
                        <button
                            type="button"
                            className="menu-button"
                            onClick={() => setIsMenuOpen((current) => !current)}
                            aria-expanded={isMenuOpen}
                        >
                            ☰ Menu
                        </button>

                        {isMenuOpen && (
                            <div className="command-menu">
                                <details open>
                                    <summary>Storage</summary>

                                    <section className="command-menu-section">
                                        <select
                                            value={selectedSavedWorldId}
                                            onChange={(event) =>
                                                onSelectedSavedWorldChange(event.target.value)
                                            }
                                        >
                                            <option value="">Saved worlds</option>
                                            {savedWorlds.map((world) => (
                                                <option key={world.id} value={world.id}>
                                                    {world.name}
                                                </option>
                                            ))}
                                        </select>

                                        <div className="menu-button-grid">
                                            <button type="button" onClick={onLoadWorld}>
                                                Load World
                                            </button>

                                            <button type="button" onClick={onDeleteWorld}>
                                                Delete World
                                            </button>

                                            <button type="button" onClick={onExportWorld}>
                                                Export World
                                            </button>

                                            <label className="menu-file-button">
                                                Import World
                                                <input
                                                    type="file"
                                                    accept=".json,application/json"
                                                    onChange={handleImportChange}
                                                />
                                            </label>
                                        </div>
                                    </section>
                                </details>

                                <details>
                                    <summary>Test Games</summary>

                                    <section className="command-menu-section">
                                        <select
                                            value={selectedSavedTestGameId}
                                            onChange={(event) =>
                                                onSelectedSavedTestGameChange(event.target.value)
                                            }
                                        >
                                            <option value="">Saved test games</option>
                                            {savedTestGames.map((game) => (
                                                <option key={game.id} value={game.id}>
                                                    {game.name}
                                                </option>
                                            ))}
                                        </select>

                                        <div className="menu-button-grid">
                                            <button type="button" onClick={onSaveTestGame}>
                                                Save Test Game
                                            </button>

                                            <button type="button" onClick={onLoadTestGame}>
                                                Load Test Game
                                            </button>

                                            <button type="button" onClick={onDeleteTestGame}>
                                                Delete Test Game
                                            </button>
                                        </div>
                                    </section>
                                </details>

                                <details>
                                    <summary>World Setup</summary>

                                    <section className="command-menu-section">
                                        <div className="world-details-form">
                                            <label>World Name</label>
                                            <input
                                                value={worldDetails.name}
                                                placeholder="e.g. Elemental Chess"
                                                onChange={(event) =>
                                                    onWorldDetailsChange("name", event.target.value)
                                                }
                                            />

                                            <label>World Description</label>
                                            <textarea
                                                value={worldDetails.description}
                                                maxLength={180}
                                                placeholder="Briefly describe this world."
                                                onChange={(event) =>
                                                    onWorldDetailsChange("description", event.target.value)
                                                }
                                            />

                                            <div className="field-counter">
                                                {worldDetails.description.length}/180
                                            </div>

                                            <label>Rules Summary / Creator Notes</label>
                                            <textarea
                                                value={worldDetails.rulesNotes}
                                                placeholder="Write the main custom rules or reminders."
                                                onChange={(event) =>
                                                    onWorldDetailsChange("rulesNotes", event.target.value)
                                                }
                                            />
                                        </div>
                                    </section>
                                </details>

                                <details>
                                    <summary>World Features</summary>

                                    <section className="command-menu-section">
                                        <FeatureToggleEditor
                                            worldFeatures={worldFeatures}
                                            onToggleWorldFeature={onToggleWorldFeature}
                                        />
                                    </section>
                                </details>

                                <details>
                                    <summary>Theme</summary>

                                    <section className="command-menu-section">
                                        <ThemeEditor
                                            worldTheme={worldTheme}
                                            onThemeChange={onThemeChange}
                                            onPieceSkinChange={onPieceSkinChange}
                                            onCharacterDisplayModeChange={onCharacterDisplayModeChange}
                                        />
                                    </section>
                                </details>

                                {saveStatus && <p className="command-menu-status">{saveStatus}</p>}
                            </div>
                        )}
                    </div>
                </div>

                <input
                    className="world-name-input"
                    value={worldDetails.name}
                    placeholder="e.g. Elemental Chess"
                    onChange={(event) =>
                        onWorldDetailsChange("name", event.target.value)
                    }
                />
            </div>
        </header>
    );
}
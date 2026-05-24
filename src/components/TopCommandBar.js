"use client";

import { useEffect, useRef, useState } from "react";

export default function TopCommandBar({
    worldDetails,
    savedWorlds,
    selectedSavedWorldId,
    savedTestGames,
    selectedSavedTestGameId,
    saveStatus,
    onWorldDetailsChange,
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
        alert("Exit will return to the lobby later.");
    }

    return (
        <header className="top-command-bar">
            <div className="world-title-block">
                <h1>Chess Multiverse</h1>
            </div>

            <div className="top-command-actions">
                <input
                    className="world-name-input"
                    value={worldDetails.name}
                    placeholder="e.g. Elemental Chess"
                    onChange={(event) =>
                        onWorldDetailsChange("name", event.target.value)
                    }
                />

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
                                <section>
                                    <h2>World Storage</h2>

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

                                <section>
                                    <h2>Test Games</h2>

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

                                {saveStatus && <p className="command-menu-status">{saveStatus}</p>}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}
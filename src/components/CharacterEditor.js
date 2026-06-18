"use client";

import { useEffect, useState } from "react";

function readImageFile(file, onLoad) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return;

    const reader = new FileReader();

    reader.onload = function (event) {
        onLoad(event.target.result);
    };

    reader.readAsDataURL(file);
}

function createEmptyCharacter() {
    const timestamp = Date.now();

    return {
        id: `character-${timestamp}`,
        name: "New Character",
        abilityName: "New Ability",
        abilityDescription: "",
        portrait: ""
    };
}

function getCharacterTitle(character) {
    const name = character.name || "Unnamed Character";
    const ability = character.abilityName || character.ability || "No ability";

    return `${name}: ${ability}`;
}

function getCharacterList(characterLibrary) {
    return Array.isArray(characterLibrary)
        ? characterLibrary
        : Object.values(characterLibrary || {});
}

function getCharacterAbilityName(character) {
    return character?.abilityName || character?.ability || "";
}

function getCharacterDescription(character) {
    return character?.abilityDescription || character?.description || "";
}

export default function CharacterEditor({
    characterLibrary,
    characterUploadStatus,
    onCharacterLibraryChange,
    onCharacterCsvUpload
}) {
    const characterList = getCharacterList(characterLibrary);

    const [selectedCharacterIndex, setSelectedCharacterIndex] = useState(0);

    const selectedCharacter = characterList[selectedCharacterIndex] || null;

    useEffect(() => {
        if (characterList.length === 0) {
            setSelectedCharacterIndex(0);
            return;
        }

        if (selectedCharacterIndex > characterList.length - 1) {
            setSelectedCharacterIndex(characterList.length - 1);
        }
    }, [characterList.length, selectedCharacterIndex]);

    function updateCharacter(characterIndex, field, value) {
        const nextCharacters = characterList.map((character, index) => {
            if (index !== characterIndex) return character;

            return {
                ...character,
                [field]: value
            };
        });

        onCharacterLibraryChange(nextCharacters);
    }

    function addCharacter() {
        const newCharacter = createEmptyCharacter();
        const nextCharacters = [...characterList, newCharacter];

        onCharacterLibraryChange(nextCharacters);
        setSelectedCharacterIndex(nextCharacters.length - 1);
    }

    function deleteCharacter(characterIndex) {
        const nextCharacters = characterList.filter(
            (_character, index) => index !== characterIndex
        );

        onCharacterLibraryChange(nextCharacters);

        if (nextCharacters.length === 0) {
            setSelectedCharacterIndex(0);
            return;
        }

        setSelectedCharacterIndex(
            Math.min(characterIndex, nextCharacters.length - 1)
        );
    }

    function handlePortraitUpload(file) {
        if (!selectedCharacter) return;

        readImageFile(file, (imageData) => {
            updateCharacter(selectedCharacterIndex, "portrait", imageData);
        });
    }

    function handleCsvUpload(file) {
        if (!file) return;

        onCharacterCsvUpload(file);
        setSelectedCharacterIndex(0);
    }

    return (
        <div className="character-creator">
            <div className="creator-header-row">
                <div>
                    <h3>Character Creator</h3>

                    <p className="creator-header-note">
                        Create characters manually, edit their abilities, or bulk import
                        from CSV below.
                    </p>
                </div>

                <button type="button" onClick={addCharacter}>
                    + Add Character
                </button>
            </div>

            <div className="character-gallery">
                {characterList.length === 0 ? (
                    <p className="small muted">No characters yet.</p>
                ) : (
                    characterList.map((character, characterIndex) => {
                        const characterKey =
                            character.id ||
                            `${character.name || "character"}-${characterIndex}`;

                        const isSelected =
                            characterIndex === selectedCharacterIndex;

                        return (
                            <div
                                key={characterKey}
                                role="button"
                                tabIndex={0}
                                className={
                                    isSelected
                                        ? "character-gallery-card active"
                                        : "character-gallery-card"
                                }
                                title={getCharacterTitle(character)}
                                onClick={() => setSelectedCharacterIndex(characterIndex)}
                                onKeyDown={(event) => {
                                    if (event.key === "Enter" || event.key === " ") {
                                        event.preventDefault();
                                        setSelectedCharacterIndex(characterIndex);
                                    }
                                }}
                            >
                                <span className="character-gallery-portrait">
                                    {character.portrait ? (
                                        <img src={character.portrait} alt={character.name} />
                                    ) : (
                                        <span className="character-gallery-placeholder">
                                            {(character.name || "?").charAt(0).toUpperCase()}
                                        </span>
                                    )}
                                </span>

                                <button
                                    type="button"
                                    className="character-gallery-delete"
                                    title={`Delete ${character.name || "character"}`}
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        deleteCharacter(characterIndex);
                                    }}
                                >
                                    ×
                                </button>
                            </div>
                        );
                    })
                )}
            </div>

            {selectedCharacter ? (
                <div className="character-edit-form">
                    <div className="character-edit-heading-row">
                        <div>
                            <h3>Edit Character</h3>

                            <p className="character-edit-subtitle">
                                {selectedCharacter.name || "Unnamed Character"}
                            </p>
                        </div>

                        <button
                            type="button"
                            className="danger-button"
                            onClick={() => deleteCharacter(selectedCharacterIndex)}
                        >
                            Delete
                        </button>
                    </div>

                    <div className="character-edit-preview">
                        {selectedCharacter.portrait ? (
                            <img
                                src={selectedCharacter.portrait}
                                alt={selectedCharacter.name}
                            />
                        ) : (
                            <span>
                                {(selectedCharacter.name || "?").charAt(0).toUpperCase()}
                            </span>
                        )}
                    </div>

                    <label>Name</label>
                    <input
                        value={selectedCharacter.name || ""}
                        placeholder="e.g. Kakashi"
                        onChange={(event) =>
                            updateCharacter(
                                selectedCharacterIndex,
                                "name",
                                event.target.value
                            )
                        }
                    />

                    <label>Portrait</label>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={(event) => {
                            handlePortraitUpload(event.target.files[0]);
                            event.target.value = "";
                        }}
                    />

                    {selectedCharacter.portrait && (
                        <button
                            type="button"
                            onClick={() =>
                                updateCharacter(
                                    selectedCharacterIndex,
                                    "portrait",
                                    ""
                                )
                            }
                        >
                            Clear Portrait
                        </button>
                    )}

                    <label>Ability Name</label>
                    <input
                        value={getCharacterAbilityName(selectedCharacter)}
                        placeholder="e.g. Lightning Blade"
                        onChange={(event) =>
                            updateCharacter(
                                selectedCharacterIndex,
                                "abilityName",
                                event.target.value
                            )
                        }
                    />

                    <label>Ability Description</label>
                    <textarea
                        value={getCharacterDescription(selectedCharacter)}
                        placeholder="Describe what this character can do."
                        onChange={(event) =>
                            updateCharacter(
                                selectedCharacterIndex,
                                "abilityDescription",
                                event.target.value
                            )
                        }
                    />
                </div>
            ) : (
                <div className="character-edit-form character-empty-editor-card">
                    <h3>Edit Character</h3>

                    <p className="small muted">
                        Add a character to start building this world's roster.
                    </p>

                    <button type="button" onClick={addCharacter}>
                        + Add First Character
                    </button>
                </div>
            )}

            <div className="character-import-divider">
                <span>CSV Import</span>
            </div>

            <div className="character-import-box">
                <div className="character-import-title">
                    Advanced CSV Import
                </div>

                <p className="small muted">
                    Upload a CSV with character, ability, description, cost, portrait,
                    and tokens.
                </p>

                <p className="character-import-warning">
                    This replaces the current Character Library for this world.
                </p>

                <input
                    type="file"
                    accept=".csv"
                    onChange={(event) => {
                        handleCsvUpload(event.target.files[0]);
                        event.target.value = "";
                    }}
                />

                <p className="small muted">
                    {characterUploadStatus}
                </p>
            </div>
        </div>
    );
}
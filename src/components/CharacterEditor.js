"use client";

import { useState } from "react";

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
    const ability = character.abilityName || "No ability";

    return `${name}: ${ability}`;
}

function getCharacterList(characterLibrary) {
    return Array.isArray(characterLibrary)
        ? characterLibrary
        : Object.values(characterLibrary || {});
}

export default function CharacterEditor({
    characterLibrary,
    characterUploadStatus,
    onCharacterLibraryChange,
    onCharacterCsvUpload
}) {
    const characterList = getCharacterList(characterLibrary);

    const [selectedCharacterId, setSelectedCharacterId] = useState(
        characterList[0]?.id || characterList[0]?.name || ""
    );

    const selectedCharacter =
        characterList.find(
            (character) =>
                character.id === selectedCharacterId ||
                character.name === selectedCharacterId
        ) || characterList[0];

    function updateCharacter(characterId, field, value) {
        const nextCharacters = characterList.map((character) => {
            const isMatch =
                character.id === characterId || character.name === characterId;

            if (!isMatch) return character;

            return {
                ...character,
                [field]: value
            };
        });

        onCharacterLibraryChange(nextCharacters);
    }

    function addCharacter() {
        const newCharacter = createEmptyCharacter();

        onCharacterLibraryChange([...characterList, newCharacter]);
        setSelectedCharacterId(newCharacter.id);
    }

    function deleteCharacter(characterId) {
        const nextCharacters = characterList.filter(
            (character) =>
                character.id !== characterId && character.name !== characterId
        );

        onCharacterLibraryChange(nextCharacters);

        const nextSelectedCharacter = nextCharacters[0];

        setSelectedCharacterId(
            nextSelectedCharacter?.id || nextSelectedCharacter?.name || ""
        );
    }

    function handlePortraitUpload(file) {
        if (!selectedCharacter) return;

        readImageFile(file, (imageData) => {
            updateCharacter(
                selectedCharacter.id || selectedCharacter.name,
                "portrait",
                imageData
            );
        });
    }

    return (
        <div className="character-creator">
            <div className="creator-header-row">
                <div>
                    <h3>Character Creator</h3>
                    <p className="small muted">
                        Create the characters available in this world.
                    </p>
                </div>

                <button type="button" onClick={addCharacter}>
                    + Add Character
                </button>
            </div>

            <div className="character-import-box">
                <div className="character-import-title">
                    Advanced CSV Import
                </div>

                <p className="small muted">
                    Upload a CSV with character, ability, description, cost, portrait, and tokens.
                </p>

                <p className="character-import-warning">
                    This replaces the current Character Library for this world.
                </p>

                <input
                    type="file"
                    accept=".csv"
                    onChange={(event) => {
                        onCharacterCsvUpload(event.target.files[0]);
                        event.target.value = "";
                    }}
                />

                <p className="small muted">
                    {characterUploadStatus}
                </p>
            </div>

            <div className="character-gallery">
                {characterList.length === 0 ? (
                    <p className="small muted">No characters yet.</p>
                ) : (
                    characterList.map((character) => {
                        const characterId = character.id || character.name;
                        const isSelected =
                            selectedCharacter &&
                            (selectedCharacter.id === characterId ||
                                selectedCharacter.name === characterId);

                        return (
                            <div
                                key={characterId}
                                role="button"
                                tabIndex={0}
                                className={
                                    isSelected
                                        ? "character-gallery-card active"
                                        : "character-gallery-card"
                                }
                                title={getCharacterTitle(character)}
                                onClick={() => setSelectedCharacterId(characterId)}
                                onKeyDown={(event) => {
                                    if (event.key === "Enter" || event.key === " ") {
                                        event.preventDefault();
                                        setSelectedCharacterId(characterId);
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
                                        deleteCharacter(characterId);
                                    }}
                                >
                                    ×
                                </button>
                            </div>
                        );
                    })
                )}
            </div>

            {selectedCharacter && (
                <div className="character-edit-form">
                    <h3>Edit Character</h3>

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
                                selectedCharacter.id || selectedCharacter.name,
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
                                    selectedCharacter.id || selectedCharacter.name,
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
                        value={selectedCharacter.abilityName || ""}
                        placeholder="e.g. Lightning Blade"
                        onChange={(event) =>
                            updateCharacter(
                                selectedCharacter.id || selectedCharacter.name,
                                "abilityName",
                                event.target.value
                            )
                        }
                    />

                    <label>Ability Description</label>
                    <textarea
                        value={selectedCharacter.abilityDescription || ""}
                        placeholder="Describe what this character can do."
                        onChange={(event) =>
                            updateCharacter(
                                selectedCharacter.id || selectedCharacter.name,
                                "abilityDescription",
                                event.target.value
                            )
                        }
                    />

                    <button
                        type="button"
                        className="danger-button"
                        onClick={() =>
                            deleteCharacter(selectedCharacter.id || selectedCharacter.name)
                        }
                    >
                        Delete Character
                    </button>
                </div>
            )}
        </div>
    );
}
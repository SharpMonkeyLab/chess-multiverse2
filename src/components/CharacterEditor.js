"use client";

import { useEffect, useState } from "react";

import {
    createDefaultCharacterFields,
    createFieldKey,
    getCustomCharacterFields,
    getSafeCharacterFields
} from "@/lib/csv";

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
        character: "New Character",
        description: "",
        abilityDescription: "",
        cost: "",
        portrait: "",
        customFields: {}
    };
}

function getCharacterTitle(character) {
    const name = character.name || "Unnamed Character";
    const description = character.description || character.abilityDescription || "No description";

    return `${name}: ${description}`;
}

function getCharacterList(characterLibrary) {
    return Array.isArray(characterLibrary)
        ? characterLibrary
        : Object.values(characterLibrary || {});
}

function getCharacterDescription(character) {
    return character?.description || character?.abilityDescription || "";
}

function getCharacterCustomFields(character) {
    return {
        ...(character?.meta || {}),
        ...(character?.customFields || {})
    };
}

function getNextFieldName(existingFields) {
    const fieldCount = getCustomCharacterFields(existingFields).length + 1;
    return `Custom Field ${fieldCount}`;
}

export default function CharacterEditor({
    characterLibrary,
    characterFields = createDefaultCharacterFields(),
    characterUploadStatus,
    onCharacterLibraryChange,
    onCharacterFieldsChange,
    onCharacterCsvUpload,
    onCharacterCsvExport
}) {
    const characterList = getCharacterList(characterLibrary);
    const safeCharacterFields = getSafeCharacterFields(characterFields);
    const customCharacterFields = getCustomCharacterFields(safeCharacterFields);

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

            if (field === "name") {
                return {
                    ...character,
                    name: value,
                    character: value
                };
            }

            if (field === "description") {
                return {
                    ...character,
                    description: value,
                    abilityDescription: value
                };
            }

            return {
                ...character,
                [field]: value
            };
        });

        onCharacterLibraryChange(nextCharacters);
    }

    function updateCharacterCustomField(characterIndex, fieldKey, value) {
        const nextCharacters = characterList.map((character, index) => {
            if (index !== characterIndex) return character;

            return {
                ...character,
                customFields: {
                    ...getCharacterCustomFields(character),
                    [fieldKey]: value
                }
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

    function addCustomField() {
        const label = getNextFieldName(safeCharacterFields);
        const nextField = {
            key: `${createFieldKey(label)}-${Date.now()}`,
            label,
            core: false
        };

        onCharacterFieldsChange?.([...safeCharacterFields, nextField]);
    }

    function updateCustomFieldLabel(fieldKey, nextLabel) {
        onCharacterFieldsChange?.(
            safeCharacterFields.map((field) => {
                if (field.key !== fieldKey) return field;

                return {
                    ...field,
                    label: nextLabel
                };
            })
        );
    }

    function deleteCustomField(fieldKey) {
        onCharacterFieldsChange?.(
            safeCharacterFields.filter((field) => field.key !== fieldKey)
        );

        const nextCharacters = characterList.map((character) => {
            const nextCustomFields = getCharacterCustomFields(character);
            delete nextCustomFields[fieldKey];

            return {
                ...character,
                customFields: nextCustomFields
            };
        });

        onCharacterLibraryChange(nextCharacters);
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
                        Create characters/cards manually, edit their fields, or import/export a CSV roster.
                    </p>
                </div>
            </div>

            <div className="character-gallery">
                {characterList.map((character, characterIndex) => {
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
                })}

                <button
                    type="button"
                    className="creator-gallery-add-card"
                    onClick={addCharacter}
                    title="Add character"
                >
                    <span>＋</span>
                    <strong>Add</strong>
                </button>
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
                        placeholder="e.g. Zuko"
                        onChange={(event) =>
                            updateCharacter(
                                selectedCharacterIndex,
                                "name",
                                event.target.value
                            )
                        }
                    />

                    <label>Description</label>
                    <textarea
                        value={getCharacterDescription(selectedCharacter)}
                        placeholder="Describe this character/card/entity."
                        onChange={(event) =>
                            updateCharacter(
                                selectedCharacterIndex,
                                "description",
                                event.target.value
                            )
                        }
                    />

                    <label>Cost</label>
                    <input
                        value={selectedCharacter.cost || ""}
                        placeholder="e.g. 2"
                        onChange={(event) =>
                            updateCharacter(
                                selectedCharacterIndex,
                                "cost",
                                event.target.value
                            )
                        }
                    />

                    <label>Portrait</label>
                    <input
                        value={
                            selectedCharacter.portrait?.startsWith("data:image/")
                                ? "Uploaded image"
                                : selectedCharacter.portrait || ""
                        }
                        placeholder="e.g. zuko.png or image URL"
                        disabled={selectedCharacter.portrait?.startsWith("data:image/")}
                        onChange={(event) =>
                            updateCharacter(
                                selectedCharacterIndex,
                                "portrait",
                                event.target.value
                            )
                        }
                    />

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

                    {customCharacterFields.length > 0 && (
                        <div className="character-custom-field-editor">
                            <h3>Custom Fields</h3>

                            {customCharacterFields.map((field) => {
                                const customValues = getCharacterCustomFields(selectedCharacter);

                                return (
                                    <div className="character-custom-field-input" key={field.key}>
                                        <label>{field.label || "Custom Field"}</label>
                                        <input
                                            value={customValues[field.key] || ""}
                                            placeholder={`Value for ${field.label}`}
                                            onChange={(event) =>
                                                updateCharacterCustomField(
                                                    selectedCharacterIndex,
                                                    field.key,
                                                    event.target.value
                                                )
                                            }
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            ) : (
                <div className="character-edit-form character-empty-editor-card">
                    <h3>Edit Character</h3>

                    <p className="small muted">
                        Add a character, then select it here to edit its fields.
                    </p>
                </div>
            )}

            <section className="character-field-manager">
                <div className="character-field-manager-header">
                    <div>
                        <h3>Character Fields</h3>
                        <p className="small muted">
                            These fields become the CSV columns for this universe.
                        </p>
                    </div>
                </div>

                <div className="character-field-list">
                    {safeCharacterFields
                        .filter((field) => field.core)
                        .map((field) => (
                            <div className="character-field-row core" key={field.key}>
                                <span>{field.label}</span>
                                <small>Core</small>
                            </div>
                        ))}

                    {customCharacterFields.map((field) => (
                        <div className="character-field-row" key={field.key}>
                            <input
                                value={field.label}
                                placeholder="Field name"
                                onChange={(event) =>
                                    updateCustomFieldLabel(field.key, event.target.value)
                                }
                            />

                            <button
                                type="button"
                                className="danger-button"
                                onClick={() => deleteCustomField(field.key)}
                            >
                                Delete
                            </button>
                        </div>
                    ))}

                    <button
                        type="button"
                        className="character-field-add-row"
                        onClick={addCustomField}
                    >
                        <span>＋</span>
                        <strong>Add Field</strong>
                    </button>
                </div>
            </section>

            <div className="character-import-divider">
                <span>CSV</span>
            </div>

            <div className="character-import-box">
                <div className="character-import-title">Import / Export Character CSV</div>

                <p className="command-menu-help-text">
                    Default columns: Name, Description, Cost, Portrait. Extra columns become custom fields.
                </p>

                <div className="menu-button-grid">
                    <label className="menu-file-button">
                        Import CSV
                        <input
                            type="file"
                            accept=".csv,text/csv"
                            onChange={(event) => {
                                handleCsvUpload(event.target.files[0]);
                                event.target.value = "";
                            }}
                        />
                    </label>

                    <button type="button" onClick={onCharacterCsvExport}>
                        Export CSV
                    </button>
                </div>

                {characterUploadStatus && (
                    <p className="character-editor-count">{characterUploadStatus}</p>
                )}

                <p className="character-import-warning">
                    Importing a CSV replaces the current character roster and field list.
                </p>
            </div>
        </div>
    );
}

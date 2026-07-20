"use client";

import { useEffect, useState } from "react";

import {
    createDefaultCharacterFields,
    createFieldKey,
    getCustomCharacterFields,
    getSafeCharacterFields
} from "@/lib/csv";

import {
    findPortraitAssetKey,
    getPortraitAssetEntries,
    getPortraitMatchCounts,
    isPortraitDataUrl,
    mergePortraitAssetsRejectingDuplicates,
    removePortraitAssetsForName,
    resolveCharacterPortrait,
    setPortraitAssetForCharacter
} from "@/lib/portraitAssets";

function readImageFile(file, onLoad) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return;

    const reader = new FileReader();

    reader.onload = function (event) {
        onLoad(event.target.result);
    };

    reader.readAsDataURL(file);
}

function readImageFiles(files, onComplete) {
    const imageFiles = Array.from(files || []).filter((file) =>
        file?.type?.startsWith("image/")
    );

    if (imageFiles.length === 0) {
        onComplete({});
        return;
    }

    let remaining = imageFiles.length;
    const nextAssets = {};

    imageFiles.forEach((file) => {
        readImageFile(file, (imageData) => {
            nextAssets[file.name] = imageData;
            remaining -= 1;

            if (remaining === 0) {
                onComplete(nextAssets);
            }
        });
    });
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
    portraitAssets = {},
    characterUploadStatus,
    onCharacterLibraryChange,
    onCharacterFieldsChange,
    onPortraitAssetsChange,
    onCharacterCsvUpload,
    onCharacterCsvExport
}) {
    const characterList = getCharacterList(characterLibrary);
    const safeCharacterFields = getSafeCharacterFields(characterFields);
    const customCharacterFields = getCustomCharacterFields(safeCharacterFields);
    const portraitAssetEntries = getPortraitAssetEntries(portraitAssets);
    const portraitMatchInfo = getPortraitMatchCounts(characterLibrary, portraitAssets);

    const [selectedCharacterIndex, setSelectedCharacterIndex] = useState(0);
    const [portraitUploadStatus, setPortraitUploadStatus] = useState("");

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

            const nextCustomFields = {
                ...getCharacterCustomFields(character),
                [fieldKey]: value
            };

            return {
                ...character,
                customFields: nextCustomFields
            };
        });

        onCharacterLibraryChange(nextCharacters);
    }

    function addCharacter() {
        const nextCharacters = [...characterList, createEmptyCharacter()];
        onCharacterLibraryChange(nextCharacters);
        setSelectedCharacterIndex(nextCharacters.length - 1);
    }

    function deleteCharacter(characterIndex) {
        const nextCharacters = characterList.filter(
            (_, index) => index !== characterIndex
        );

        onCharacterLibraryChange(nextCharacters);

        if (nextCharacters.length === 0) {
            setSelectedCharacterIndex(0);
            return;
        }

        if (characterIndex >= nextCharacters.length) {
            setSelectedCharacterIndex(nextCharacters.length - 1);
        }
    }

    function addCustomField() {
        const nextLabel = getNextFieldName(safeCharacterFields);
        const nextKey = createFieldKey(nextLabel);

        onCharacterFieldsChange([
            ...safeCharacterFields,
            { key: nextKey, label: nextLabel, core: false }
        ]);
    }

    function updateCustomFieldLabel(fieldKey, label) {
        onCharacterFieldsChange(
            safeCharacterFields.map((field) =>
                field.key === fieldKey
                    ? { ...field, label }
                    : field
            )
        );
    }

    function deleteCustomField(fieldKey) {
        onCharacterFieldsChange(
            safeCharacterFields.filter((field) => field.key !== fieldKey)
        );

        const nextCharacters = characterList.map((character) => {
            const nextCustomFields = { ...getCharacterCustomFields(character) };
            delete nextCustomFields[fieldKey];

            return {
                ...character,
                customFields: nextCustomFields
            };
        });

        onCharacterLibraryChange(nextCharacters);
    }

    function handlePortraitUpload(file) {
        if (!selectedCharacter || typeof onPortraitAssetsChange !== "function") {
            return;
        }

        const characterName = String(selectedCharacter.name || "").trim();

        if (!characterName) {
            setPortraitUploadStatus("Set a character Name before uploading a portrait.");
            return;
        }

        if (!file || !file.type?.startsWith("image/")) return;

        readImageFile(file, (imageData) => {
            const result = setPortraitAssetForCharacter({
                characterName,
                file,
                imageData,
                portraitAssets
            });

            onPortraitAssetsChange(result.portraitAssets);

            if (isPortraitDataUrl(selectedCharacter.portrait)) {
                updateCharacter(selectedCharacterIndex, "portrait", "");
            }

            const matchInfo = getPortraitMatchCounts(
                characterLibrary,
                result.portraitAssets
            );

            setPortraitUploadStatus(
                `Matched ${matchInfo.charactersMatched}/${matchInfo.characterCount}`
            );
        });
    }

    function handlePortraitAssetsUpload(files) {
        if (typeof onPortraitAssetsChange !== "function") return;

        readImageFiles(files, (uploadedAssets) => {
            const uploadedCount = Object.keys(uploadedAssets).length;

            if (uploadedCount === 0) {
                setPortraitUploadStatus("No image files selected.");
                return;
            }

            const mergeResult = mergePortraitAssetsRejectingDuplicates(
                portraitAssets,
                uploadedAssets
            );

            onPortraitAssetsChange(mergeResult.portraitAssets);

            const matchInfo = getPortraitMatchCounts(
                characterLibrary,
                mergeResult.portraitAssets
            );

            const statusParts = [
                `Matched ${matchInfo.charactersMatched}/${matchInfo.characterCount}`
            ];

            if (mergeResult.acceptedCount > 0) {
                statusParts.unshift(`${mergeResult.acceptedCount} uploaded`);
            }

            if (mergeResult.skippedCount > 0) {
                statusParts.push(
                    `Skipped ${mergeResult.skippedCount} duplicate${
                        mergeResult.skippedCount === 1 ? "" : "s"
                    }`
                );
            }

            setPortraitUploadStatus(statusParts.join(" · "));
        });
    }

    function removePortraitAsset(filename) {
        if (typeof onPortraitAssetsChange !== "function") return;

        const nextAssets = { ...portraitAssets };
        delete nextAssets[filename];
        onPortraitAssetsChange(nextAssets);

        const matchInfo = getPortraitMatchCounts(characterLibrary, nextAssets);

        setPortraitUploadStatus(
            `Matched ${matchInfo.charactersMatched}/${matchInfo.characterCount}`
        );
    }

    function clearSelectedCharacterPortrait() {
        if (!selectedCharacter) return;

        const characterName = String(selectedCharacter.name || "").trim();

        if (characterName && typeof onPortraitAssetsChange === "function") {
            const result = removePortraitAssetsForName(characterName, portraitAssets);
            onPortraitAssetsChange(result.portraitAssets);

            const matchInfo = getPortraitMatchCounts(
                characterLibrary,
                result.portraitAssets
            );

            setPortraitUploadStatus(
                `Matched ${matchInfo.charactersMatched}/${matchInfo.characterCount}`
            );
        }

        if (isPortraitDataUrl(selectedCharacter.portrait)) {
            updateCharacter(selectedCharacterIndex, "portrait", "");
        }
    }

    function clearPortraitAssets() {
        if (typeof onPortraitAssetsChange !== "function") return;

        onPortraitAssetsChange({});
        setPortraitUploadStatus("Portrait image library cleared.");
    }

    function handleCsvUpload(file) {
        if (!file) return;

        onCharacterCsvUpload(file);
        setSelectedCharacterIndex(0);
    }

    const selectedPortraitSrc = selectedCharacter
        ? resolveCharacterPortrait(selectedCharacter, portraitAssets)
        : "";

    const selectedLibraryAssetKey = selectedCharacter?.name
        ? findPortraitAssetKey(selectedCharacter.name, portraitAssets)
        : "";

    const selectedLibraryPortraitSrc = selectedLibraryAssetKey
        ? portraitAssets[selectedLibraryAssetKey]
        : "";

    const hasLibraryPortrait = Boolean(selectedLibraryPortraitSrc);

    const portraitUrlValue = isPortraitDataUrl(selectedCharacter?.portrait)
        ? ""
        : selectedCharacter?.portrait || "";

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

                    const portraitSrc = resolveCharacterPortrait(
                        character,
                        portraitAssets
                    );

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
                                {portraitSrc ? (
                                    <img src={portraitSrc} alt={character.name} />
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
                        {selectedPortraitSrc ? (
                            <img
                                src={selectedPortraitSrc}
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
                    <div className="character-portrait-upload-row">
                        {hasLibraryPortrait ? (
                            <div
                                className="character-portrait-upload has-image"
                                title={selectedLibraryAssetKey}
                            >
                                <img
                                    src={selectedLibraryPortraitSrc}
                                    alt={selectedCharacter.name}
                                />
                            </div>
                        ) : (
                            <label
                                className="character-portrait-upload"
                                title={
                                    String(selectedCharacter.name || "").trim()
                                        ? "Upload portrait"
                                        : "Set a character Name first"
                                }
                            >
                                <span>Upload</span>
                                <input
                                    type="file"
                                    accept="image/*"
                                    disabled={!String(selectedCharacter.name || "").trim()}
                                    onChange={(event) => {
                                        handlePortraitUpload(event.target.files[0]);
                                        event.target.value = "";
                                    }}
                                />
                            </label>
                        )}

                        {hasLibraryPortrait && (
                            <button
                                type="button"
                                onClick={clearSelectedCharacterPortrait}
                            >
                                Clear
                            </button>
                        )}
                    </div>

                    <input
                        value={portraitUrlValue}
                        placeholder="Optional image URL"
                        onChange={(event) =>
                            updateCharacter(
                                selectedCharacterIndex,
                                "portrait",
                                event.target.value
                            )
                        }
                    />

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
                <span>IMAGES</span>
            </div>

            <div className="character-import-box portrait-assets-box">
                <div className="character-import-title">Portrait Images</div>

                <p className="command-menu-help-text">
                    Upload portraits for your characters. The image file name
                    must match the character Name. Ideal size: square.
                    Valid types: PNG, JPG, JPEG, WebP, GIF.
                </p>

                <div className="menu-button-grid">
                    <label className="menu-file-button">
                        Upload Images
                        <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={(event) => {
                                handlePortraitAssetsUpload(event.target.files);
                                event.target.value = "";
                            }}
                        />
                    </label>

                    {portraitAssetEntries.length > 0 && (
                        <button type="button" onClick={clearPortraitAssets}>
                            Clear All
                        </button>
                    )}
                </div>

                {(portraitUploadStatus || portraitAssetEntries.length > 0) && (
                    <p className="character-editor-count">
                        {portraitUploadStatus ||
                            `Matched ${portraitMatchInfo.charactersMatched}/${portraitMatchInfo.characterCount}`}
                    </p>
                )}

                {portraitAssetEntries.length > 0 && (
                    <div className="portrait-assets-grid">
                        {portraitAssetEntries.map(([filename, imageSrc]) => {
                            const matchCount =
                                portraitMatchInfo.matchCountByFilename[filename] || 0;
                            const isMatched = matchCount > 0;

                            return (
                                <div
                                    className={
                                        isMatched
                                            ? "portrait-asset-card matched"
                                            : "portrait-asset-card unused"
                                    }
                                    key={filename}
                                    title={
                                        isMatched
                                            ? `${filename} · matched`
                                            : `${filename} · unused`
                                    }
                                >
                                    <div className="portrait-asset-preview">
                                        <img src={imageSrc} alt={filename} />
                                    </div>

                                    <button
                                        type="button"
                                        className="portrait-asset-remove"
                                        title={`Remove ${filename}`}
                                        onClick={() => removePortraitAsset(filename)}
                                    >
                                        ×
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}

                {portraitMatchInfo.missingPortraits.length > 0 && (
                    <p className="character-import-warning">
                        Missing images for:{" "}
                        {portraitMatchInfo.missingPortraits
                            .slice(0, 6)
                            .map((item) => item.name)
                            .join(", ")}
                        {portraitMatchInfo.missingPortraits.length > 6
                            ? ` +${portraitMatchInfo.missingPortraits.length - 6} more`
                            : ""}
                    </p>
                )}
            </div>

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

"use client";

import { useState } from "react";

const emptyCharacterForm = {
    name: "",
    ability: "",
    description: "",
    cost: "",
    tokens: "",
    portrait: ""
};

export default function CharacterEditor({
    characterLibrary,
    characterUploadStatus,
    onSaveCharacter,
    onCharacterCsvUpload
}) {
    const [form, setForm] = useState(emptyCharacterForm);

    const characterCount = Object.keys(characterLibrary).length;

    function updateForm(field, value) {
        setForm((currentForm) => ({
            ...currentForm,
            [field]: value
        }));
    }

    function handlePortraitUpload(file) {
        if (!file) return;
        if (!file.type.startsWith("image/")) return;

        const reader = new FileReader();

        reader.onload = function (event) {
            updateForm("portrait", event.target.result);
        };

        reader.readAsDataURL(file);
    }

    function handleSave() {
        const trimmedName = form.name.trim();

        if (!trimmedName) return;

        const character = {
            name: trimmedName,
            ability: form.ability.trim(),
            description: form.description.trim(),
            cost: form.cost.trim(),
            portrait: form.portrait,
            tokens: form.tokens
                ? form.tokens.split("|").map((token) => token.trim()).filter(Boolean)
                : []
        };

        onSaveCharacter(character);
        setForm(emptyCharacterForm);
    }

    return (
        <div className="character-editor">
            <p className="small muted">
                Create characters manually. These characters become available in the Character Card picker.
            </p>

            <div className="character-editor-count">
                {characterCount} character{characterCount === 1 ? "" : "s"} in this world.
            </div>

            <label>Character Name</label>
            <input
                value={form.name}
                placeholder="e.g. Gravon"
                onChange={(event) => updateForm("name", event.target.value)}
            />

            <label>Portrait</label>

            <div className="character-portrait-editor">
                <div className="character-portrait-preview">
                    {form.portrait ? (
                        <img src={form.portrait} alt="Character portrait preview" />
                    ) : (
                        <span>No portrait</span>
                    )}
                </div>

                <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => handlePortraitUpload(event.target.files[0])}
                />

                {form.portrait && (
                    <button
                        type="button"
                        onClick={() => updateForm("portrait", "")}
                    >
                        Clear Portrait
                    </button>
                )}
            </div>

            <label>Ability Name</label>
            <input
                value={form.ability}
                placeholder="e.g. Compact Form"
                onChange={(event) => updateForm("ability", event.target.value)}
            />

            <label>Description</label>
            <textarea
                value={form.description}
                placeholder="Describe what this ability does."
                onChange={(event) => updateForm("description", event.target.value)}
            />

            <label>Cost</label>
            <input
                value={form.cost}
                placeholder="e.g. 1, 2, Ultimate, Passive"
                onChange={(event) => updateForm("cost", event.target.value)}
            />

            <label>Tokens</label>
            <input
                value={form.tokens}
                placeholder="e.g. Space|Pressure"
                onChange={(event) => updateForm("tokens", event.target.value)}
            />

            <button className="primary-button" type="button" onClick={handleSave}>
                Save Character
            </button>

            <div className="character-import-divider">
                <span>OR</span>
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
                    onChange={(event) => onCharacterCsvUpload(event.target.files[0])}
                />

                <p className="small muted">
                    {characterUploadStatus}
                </p>
            </div>
        </div>
    );
}
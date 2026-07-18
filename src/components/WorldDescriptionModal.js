"use client";

import { useEffect, useState } from "react";

import {
  WORLD_COMPLEXITY_OPTIONS,
  normalizeWorldComplexity
} from "@/lib/worldData";
import { UNNAMED_WORLD_LABEL } from "@/lib/stageLayoutConfig";

export default function WorldDescriptionModal({
  worldDetails,
  isOpen,
  isSaving = false,
  onCancel,
  onConfirm
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [rulesNotes, setRulesNotes] = useState("");
  const [complexity, setComplexity] = useState("Basic");

  useEffect(() => {
    if (!isOpen) return;

    setName(worldDetails?.name || "");
    setDescription(worldDetails?.description || "");
    setRulesNotes(worldDetails?.rulesNotes || "");
    setComplexity(normalizeWorldComplexity(worldDetails?.complexity));
  }, [isOpen, worldDetails]);

  if (!isOpen) {
    return null;
  }

  function handleConfirm(event) {
    event.preventDefault();

    onConfirm({
      name: String(name || "").trim(),
      description: description.slice(0, 180),
      rulesNotes,
      complexity: normalizeWorldComplexity(complexity)
    });
  }

  return (
    <div
      className="world-description-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSaving) {
          onCancel();
        }
      }}
    >
      <form
        className="world-description-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="world-description-modal-title"
        onSubmit={handleConfirm}
      >
        <div className="world-description-modal-header">
          <p className="home-kicker">Save Universe</p>
          <h2 id="world-description-modal-title">Universe Description</h2>
          <p className="small muted">
            Add the public details players see when browsing this universe.
          </p>
        </div>

        <div className="world-details-form">
          <label htmlFor="world-name-field">Universe Name</label>
          <input
            id="world-name-field"
            value={name}
            placeholder={UNNAMED_WORLD_LABEL}
            disabled={isSaving}
            onChange={(event) => setName(event.target.value)}
          />

          <label htmlFor="world-description-field">Universe Description</label>
          <textarea
            id="world-description-field"
            value={description}
            maxLength={180}
            placeholder="Briefly describe this universe."
            disabled={isSaving}
            onChange={(event) => setDescription(event.target.value)}
          />

          <div className="field-counter">{description.length}/180</div>

          <label htmlFor="world-rules-field">Rules Summary</label>
          <textarea
            id="world-rules-field"
            value={rulesNotes}
            placeholder="Write the main custom rules for this universe."
            disabled={isSaving}
            onChange={(event) => setRulesNotes(event.target.value)}
          />

          <label htmlFor="world-complexity-field">Complexity</label>
          <select
            id="world-complexity-field"
            value={complexity}
            disabled={isSaving}
            onChange={(event) =>
              setComplexity(normalizeWorldComplexity(event.target.value))
            }
          >
            {WORLD_COMPLEXITY_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div className="world-description-modal-actions">
          <button type="button" onClick={onCancel} disabled={isSaving}>
            Cancel
          </button>
          <button type="submit" className="primary-button" disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Universe"}
          </button>
        </div>
      </form>
    </div>
  );
}

"use client";

import { makeKeyFromLabel } from "@/lib/defaultWorld";

export default function ConditionEditor({ conditions, onConditionListChange }) {
  function updateCondition(index, field, value) {
    const nextConditions = conditions.map((condition, conditionIndex) =>
      conditionIndex === index
        ? {
            ...condition,
            [field]: value,
            ...(field === "label"
              ? { key: makeKeyFromLabel(value) || condition.key }
              : {})
          }
        : condition
    );

    onConditionListChange(nextConditions);
  }

  function addCondition() {
    const label = "New Condition";
    const key = `${makeKeyFromLabel(label)}-${Date.now()}`;

    onConditionListChange([
      ...conditions,
      {
        key,
        label,
        icon: "✨"
      }
    ]);
  }

  function deleteCondition(index) {
    onConditionListChange(
      conditions.filter((condition, conditionIndex) => conditionIndex !== index)
    );
  }

  return (
    <div className="mechanic-editor">
      <p className="small muted">
        Create the condition icons available in this world.
      </p>

      <button type="button" onClick={addCondition}>
        + Add Condition
      </button>

      <div className="mechanic-editor-list">
        {conditions.map((condition, index) => (
          <div className="mechanic-editor-card" key={condition.key}>
            <div className="condition-editor-preview">
              <span>{condition.icon}</span>
              <strong>{condition.label}</strong>
            </div>

            <label>Name</label>
            <input
              value={condition.label}
              onChange={(event) =>
                updateCondition(index, "label", event.target.value)
              }
            />

            <label>Icon</label>
            <input
              value={condition.icon}
              maxLength={4}
              onChange={(event) =>
                updateCondition(index, "icon", event.target.value)
              }
            />

            <button type="button" onClick={() => deleteCondition(index)}>
              Delete Condition
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
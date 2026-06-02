"use client";

import { useState } from "react";

import { makeKeyFromLabel } from "@/lib/defaultWorld";

function createNewCondition() {
  const label = "New Condition";
  const key = `${makeKeyFromLabel(label)}-${Date.now()}`;

  return {
    key,
    label,
    description: "",
    icon: "✨"
  };
}

function getConditionTitle(condition) {
  const label = condition.label || "Unnamed Condition";
  const description = condition.description || "No description";

  return `${label}: ${description}`;
}

export default function ConditionEditor({
  conditions,
  onConditionListChange
}) {
  const conditionList = Array.isArray(conditions) ? conditions : [];

  const [selectedConditionKey, setSelectedConditionKey] = useState(
    conditionList[0]?.key || ""
  );

  const selectedCondition =
    conditionList.find(
      (condition) => condition.key === selectedConditionKey
    ) || conditionList[0];

  function updateCondition(conditionKey, field, value) {
    const nextConditions = conditionList.map((condition) => {
      if (condition.key !== conditionKey) return condition;

      return {
        ...condition,
        [field]: value
      };
    });

    onConditionListChange(nextConditions);
  }

  function addCondition() {
    const newCondition = createNewCondition();

    onConditionListChange([...conditionList, newCondition]);
    setSelectedConditionKey(newCondition.key);
  }

  function deleteCondition(conditionKey) {
    const nextConditions = conditionList.filter(
      (condition) => condition.key !== conditionKey
    );

    onConditionListChange(nextConditions);

    setSelectedConditionKey(nextConditions[0]?.key || "");
  }

  return (
    <div className="condition-creator">
      <div className="creator-header-row">
        <div>
          <h3>Condition Creator</h3>
          <p className="small muted">
            Create the conditions available in this world.
          </p>
        </div>

        <button type="button" onClick={addCondition}>
          + Add Condition
        </button>
      </div>

      <div className="condition-gallery">
        {conditionList.length === 0 ? (
          <p className="small muted">No conditions yet.</p>
        ) : (
          conditionList.map((condition) => {
            const isSelected = selectedCondition?.key === condition.key;

            return (
              <div
                key={condition.key}
                role="button"
                tabIndex={0}
                className={
                  isSelected
                    ? "condition-gallery-card active"
                    : "condition-gallery-card"
                }
                title={getConditionTitle(condition)}
                onClick={() => setSelectedConditionKey(condition.key)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setSelectedConditionKey(condition.key);
                  }
                }}
              >
                <span className="condition-gallery-icon">
                  {condition.icon || "✨"}
                </span>

                <button
                  type="button"
                  className="condition-gallery-delete"
                  title={`Delete ${condition.label || "condition"}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    deleteCondition(condition.key);
                  }}
                >
                  ×
                </button>
              </div>
            );
          })
        )}
      </div>

      {selectedCondition && (
        <div className="condition-edit-form">
          <h3>Edit Condition</h3>

          <div className="condition-edit-preview">
            {selectedCondition.icon || "✨"}
          </div>

          <label>Name</label>
          <input
            value={selectedCondition.label || ""}
            placeholder="e.g. Poisoned"
            onChange={(event) =>
              updateCondition(
                selectedCondition.key,
                "label",
                event.target.value
              )
            }
          />

          <label>Description</label>
          <textarea
            value={selectedCondition.description || ""}
            placeholder="Explain what this condition means."
            onChange={(event) =>
              updateCondition(
                selectedCondition.key,
                "description",
                event.target.value
              )
            }
          />

          <label>Icon</label>
          <input
            value={selectedCondition.icon || ""}
            maxLength={4}
            placeholder="e.g. 🔥"
            onChange={(event) =>
              updateCondition(
                selectedCondition.key,
                "icon",
                event.target.value
              )
            }
          />

          <button
            type="button"
            className="danger-button"
            onClick={() => deleteCondition(selectedCondition.key)}
          >
            Delete Condition
          </button>
        </div>
      )}
    </div>
  );
}
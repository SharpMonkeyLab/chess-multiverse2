"use client";

import { useState } from "react";

import {
  createCounterKey,
  normalizeCounterDefinition
} from "@/lib/defaultWorld";

function createNewCounter() {
  const label = "New Counter";

  return {
    key: `${createCounterKey(label)}-${Date.now()}`,
    label,
    description: "",
    color: "#e7c97a",
    decreaseLabel: "-1",
    increaseLabel: "+1",

    allowBaseValue: false,
    baseLabel: "Base",
    baseValue: 0,

    allowSetValue: false,
    setLabel: "Set",
    setDescription: ""
  };
}

function getCounterList(counterSettings) {
  if (Array.isArray(counterSettings)) {
    return counterSettings.map(normalizeCounterDefinition);
  }

  if (counterSettings) {
    return [
      normalizeCounterDefinition({
        key: "main-counter",
        label: counterSettings.name || "Counter",
        description: counterSettings.description || "",
        color: "#e7c97a",
        decreaseLabel: counterSettings.decreaseLabel || "-1",
        increaseLabel: counterSettings.increaseLabel || "+1",
        allowSetCounter: Boolean(counterSettings.allowSetCounter),
        allowBaseValue: counterSettings.allowBaseValue,
        baseLabel: counterSettings.baseLabel,
        baseValue: counterSettings.baseValue,
        allowSetValue: counterSettings.allowSetValue,
        setLabel: counterSettings.setLabel || "Set",
        setDescription: counterSettings.setDescription || "",
        initialValue: Number(counterSettings.initialValue || 0)
      })
    ];
  }

  return [];
}

export default function CounterEditor({
  counter,
  counters,
  onCounterSettingsChange,
  onCounterListChange
}) {
  const counterList = getCounterList(counters || counter);

  const [selectedCounterKey, setSelectedCounterKey] = useState(
    counterList[0]?.key || ""
  );

  const selectedCounter =
    counterList.find((item) => item.key === selectedCounterKey) ||
    counterList[0];

  function updateCounter(counterKey, field, value) {
    const nextCounters = counterList.map((item) => {
      if (item.key !== counterKey) return item;

      return {
        ...item,
        [field]: value
      };
    });

    if (onCounterListChange) {
      onCounterListChange(nextCounters);
      return;
    }

    if (onCounterSettingsChange) {
      onCounterSettingsChange(nextCounters);
    }
  }

  function addCounter() {
    const newCounter = createNewCounter();
    const nextCounters = [...counterList, newCounter];

    if (onCounterListChange) {
      onCounterListChange(nextCounters);
    } else {
      onCounterSettingsChange(nextCounters);
    }

    setSelectedCounterKey(newCounter.key);
  }

  function deleteCounter(counterKey) {
    const nextCounters = counterList.filter(
      (item) => item.key !== counterKey
    );

    if (onCounterListChange) {
      onCounterListChange(nextCounters);
    } else {
      onCounterSettingsChange(nextCounters);
    }

    setSelectedCounterKey(nextCounters[0]?.key || "");
  }

  return (
    <div className="counter-creator">
      <div className="creator-header-row">
        <div>
          <h3>Counter Creator</h3>
          <p className="small muted">
            Create coloured counter types for this universe.
          </p>
        </div>
      </div>

      <div className="counter-gallery">
        {counterList.map((item) => {
          const isSelected = selectedCounter?.key === item.key;

          return (
            <div
              key={item.key}
              role="button"
              tabIndex={0}
              className={
                isSelected
                  ? "counter-gallery-card active"
                  : "counter-gallery-card"
              }
              title={
                item.description
                  ? `${item.label}: ${item.description}`
                  : item.label
              }
              onClick={() => setSelectedCounterKey(item.key)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setSelectedCounterKey(item.key);
                }
              }}
            >
              <span
                className="counter-gallery-dot"
                style={{ "--counter-preview-color": item.color || "#e7c97a" }}
              />

              <span className="counter-gallery-label">
                {item.label}
              </span>

              <button
                type="button"
                className="counter-gallery-delete"
                title={`Delete ${item.label || "counter"}`}
                onClick={(event) => {
                  event.stopPropagation();
                  deleteCounter(item.key);
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
          onClick={addCounter}
          title="Add counter"
        >
          <span>＋</span>
          <strong>Add</strong>
        </button>
      </div>

      {selectedCounter && (
        <div className="counter-edit-form">
          <h3>Edit Counter</h3>

          <div
            className="counter-edit-preview"
            style={{
              "--counter-preview-color": selectedCounter.color || "#e7c97a"
            }}
          >
            {selectedCounter.label || "Counter"}
          </div>

          <label>Name</label>
          <input
            value={selectedCounter.label || ""}
            placeholder="e.g. Chakra"
            onChange={(event) =>
              updateCounter(selectedCounter.key, "label", event.target.value)
            }
          />

          <label>Description</label>
          <textarea
            value={selectedCounter.description || ""}
            placeholder="Explain what this counter represents."
            onChange={(event) =>
              updateCounter(
                selectedCounter.key,
                "description",
                event.target.value
              )
            }
          />

          <label>Colour</label>
          <input
            type="color"
            value={selectedCounter.color || "#e7c97a"}
            onChange={(event) =>
              updateCounter(selectedCounter.key, "color", event.target.value)
            }
          />

          <label>Decrease Button Label</label>
          <input
            value={selectedCounter.decreaseLabel || "-1"}
            onChange={(event) =>
              updateCounter(
                selectedCounter.key,
                "decreaseLabel",
                event.target.value
              )
            }
          />

          <label>Increase Button Label</label>
          <input
            value={selectedCounter.increaseLabel || "+1"}
            onChange={(event) =>
              updateCounter(
                selectedCounter.key,
                "increaseLabel",
                event.target.value
              )
            }
          />

          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={Boolean(selectedCounter.allowBaseValue)}
              onChange={(event) =>
                updateCounter(
                  selectedCounter.key,
                  "allowBaseValue",
                  event.target.checked
                )
              }
            />

            <span>Allow Base Value button</span>
          </label>

          {selectedCounter.allowBaseValue && (
            <>
              <label>Base Button Label</label>
              <input
                value={selectedCounter.baseLabel || "Base"}
                onChange={(event) =>
                  updateCounter(
                    selectedCounter.key,
                    "baseLabel",
                    event.target.value
                  )
                }
              />

              <label>Base Value</label>
              <input
                type="number"
                value={selectedCounter.baseValue ?? 0}
                onChange={(event) =>
                  updateCounter(
                    selectedCounter.key,
                    "baseValue",
                    Number(event.target.value)
                  )
                }
              />
            </>
          )}

          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={Boolean(selectedCounter.allowSetValue)}
              onChange={(event) =>
                updateCounter(
                  selectedCounter.key,
                  "allowSetValue",
                  event.target.checked
                )
              }
            />

            <span>Allow Set Value box in-game</span>
          </label>

          {selectedCounter.allowSetValue && (
            <>
              <label>Set Button Label</label>
              <input
                value={selectedCounter.setLabel || "Set"}
                onChange={(event) =>
                  updateCounter(
                    selectedCounter.key,
                    "setLabel",
                    event.target.value
                  )
                }
              />
            </>
          )}

          <button
            type="button"
            className="danger-button"
            onClick={() => deleteCounter(selectedCounter.key)}
          >
            Delete Counter
          </button>
        </div>
      )}
    </div>
  );
}

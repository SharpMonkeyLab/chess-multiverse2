"use client";

export default function CounterEditor({ counter, onCounterSettingsChange }) {
  function updateCounter(field, value) {
    onCounterSettingsChange({
      ...counter,
      [field]: value
    });
  }

  return (
    <div className="mechanic-editor">
      <p className="small muted">
        Define what the main number counter means in this world.
      </p>

      <div className="counter-editor-preview">
        <button type="button">{counter.decreaseLabel}</button>
        <button type="button">{counter.increaseLabel}</button>
        <button type="button">Clear Counter</button>

        {counter.allowSetCounter && (
          <button type="button">{counter.setLabel || "Set Number"}</button>
        )}
      </div>

      <label>Counter Name</label>
      <input
        value={counter.name}
        placeholder="e.g. Level, HP, Damage"
        onChange={(event) => updateCounter("name", event.target.value)}
      />

      <label>Counter Description</label>
      <textarea
        value={counter.description || ""}
        placeholder="Explain what this counter represents."
        onChange={(event) => updateCounter("description", event.target.value)}
      />

      <label>Decrease Button Label</label>
      <input
        value={counter.decreaseLabel}
        placeholder="e.g. -1, Damage, Level Down"
        onChange={(event) =>
          updateCounter("decreaseLabel", event.target.value)
        }
      />

      <label>Increase Button Label</label>
      <input
        value={counter.increaseLabel}
        placeholder="e.g. +1, Heal, Level Up"
        onChange={(event) =>
          updateCounter("increaseLabel", event.target.value)
        }
      />

      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={Boolean(counter.allowSetCounter)}
          onChange={(event) =>
            updateCounter("allowSetCounter", event.target.checked)
          }
        />

        <span>Allow Set Counter in tools</span>
      </label>

      {counter.allowSetCounter && (
        <>
          <label>Set Button Label</label>
          <input
            value={counter.setLabel || ""}
            placeholder="e.g. Set Number, Set HP, Set Level"
            onChange={(event) => updateCounter("setLabel", event.target.value)}
          />

          <label>Set Button Description</label>
          <textarea
            value={counter.setDescription || ""}
            placeholder="Explain when this exact-value setting should be used."
            onChange={(event) =>
              updateCounter("setDescription", event.target.value)
            }
          />

          <label>Initial Set Value</label>
          <input
            type="number"
            value={counter.initialValue ?? ""}
            placeholder="0"
            onChange={(event) =>
              updateCounter("initialValue", event.target.value)
            }
          />
        </>
      )}
    </div>
  );
}
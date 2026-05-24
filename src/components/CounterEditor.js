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
                <button type="button">Set Number</button>
                <button type="button">Clear Counter</button>
            </div>

            <label>Counter Name</label>
            <input
                value={counter.name}
                placeholder="e.g. Level, HP, Damage"
                onChange={(event) => updateCounter("name", event.target.value)}
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
        </div>
    );
}
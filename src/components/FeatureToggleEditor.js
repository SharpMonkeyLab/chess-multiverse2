"use client";

import { WORLD_FEATURE_GROUPS } from "@/lib/defaultWorld";

export default function FeatureToggleEditor({
  worldFeatures,
  onToggleWorldFeature
}) {
  return (
    <div className="feature-toggle-editor">
      <p className="small muted">
        Choose which systems this universe uses. Advanced systems add Play-area tools
        when enabled.
      </p>

      {WORLD_FEATURE_GROUPS.map((group) => (
        <div className="feature-group" key={group.title}>
          <div className="feature-group-title">{group.title}</div>

          <div className="feature-list">
            {group.features.map((feature) => {
              const isEnabled = Boolean(worldFeatures[feature.key]);

              return (
                <button
                  type="button"
                  className={
                    isEnabled
                      ? "feature-toggle active"
                      : "feature-toggle"
                  }
                  key={feature.key}
                  aria-pressed={isEnabled}
                  onClick={() => onToggleWorldFeature(feature.key)}
                >
                  <span
                    className={
                      isEnabled
                        ? "feature-toggle-tick checked"
                        : "feature-toggle-tick"
                    }
                    aria-hidden="true"
                  >
                    {isEnabled ? "✓" : ""}
                  </span>

                  <span className="feature-toggle-main">
                    <strong>{feature.label}</strong>
                    <small>{feature.description}</small>
                  </span>

                  <span className="feature-toggle-status">
                    {isEnabled ? "On" : "Off"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

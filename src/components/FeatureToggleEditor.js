"use client";

import { WORLD_FEATURE_GROUPS } from "@/lib/defaultWorld";

export default function FeatureToggleEditor({
  worldFeatures,
  onToggleWorldFeature
}) {
  return (
    <div className="feature-toggle-editor">
      <p className="small muted">
        Choose which systems this world uses. Future systems can be enabled later when built.
      </p>

      {WORLD_FEATURE_GROUPS.map((group) => (
        <div className="feature-group" key={group.title}>
          <div className="feature-group-title">{group.title}</div>

          <div className="feature-list">
            {group.features.map((feature) => {
              const isEnabled = Boolean(worldFeatures[feature.key]);

              return (
                <label
                  className={
                    isEnabled
                      ? "feature-toggle active"
                      : "feature-toggle"
                  }
                  key={feature.key}
                >
                  <input
                    type="checkbox"
                    checked={isEnabled}
                    onChange={() => onToggleWorldFeature(feature.key)}
                  />

                  <span className="feature-toggle-main">
                    <strong>{feature.label}</strong>
                    <small>{feature.description}</small>
                  </span>

                  <span className="feature-toggle-status">
                    {isEnabled ? "On" : "Off"}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
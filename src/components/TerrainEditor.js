"use client";

import { useState } from "react";

import { makeKeyFromLabel } from "@/lib/defaultWorld";

function uploadImageFile(file, onLoad) {
  if (!file) return;
  if (!file.type.startsWith("image/")) return;

  const reader = new FileReader();

  reader.onload = function (event) {
    onLoad(event.target.result);
  };

  reader.readAsDataURL(file);
}

function createNewTerrain() {
  const label = "New Terrain";
  const key = `${makeKeyFromLabel(label)}-${Date.now()}`;

  return {
    key,
    label,
    description: "",
    fillType: "color",
    color: "#4b5563",
    image: ""
  };
}

function getTerrainTitle(terrain) {
  const label = terrain.label || "Unnamed Terrain";
  const description = terrain.description || "No description";

  return `${label}: ${description}`;
}

export default function TerrainEditor({ terrains, onTerrainListChange }) {
  const terrainList = Array.isArray(terrains) ? terrains : [];

  const [selectedTerrainKey, setSelectedTerrainKey] = useState(
    terrainList[0]?.key || ""
  );

  const selectedTerrain =
    terrainList.find((terrain) => terrain.key === selectedTerrainKey) ||
    terrainList[0];

  function updateTerrain(terrainKey, field, value) {
    const nextTerrains = terrainList.map((terrain) => {
      if (terrain.key !== terrainKey) return terrain;

      return {
        ...terrain,
        [field]: value,
        ...(field === "label"
          ? { key: makeKeyFromLabel(value) || terrain.key }
          : {})
      };
    });

    onTerrainListChange(nextTerrains);

    if (field === "label") {
      const nextKey = makeKeyFromLabel(value) || terrainKey;
      setSelectedTerrainKey(nextKey);
    }
  }

  function addTerrain() {
    const newTerrain = createNewTerrain();

    onTerrainListChange([...terrainList, newTerrain]);
    setSelectedTerrainKey(newTerrain.key);
  }

  function deleteTerrain(terrainKey) {
    const nextTerrains = terrainList.filter(
      (terrain) => terrain.key !== terrainKey
    );

    onTerrainListChange(nextTerrains);

    setSelectedTerrainKey(nextTerrains[0]?.key || "");
  }

  function getTerrainPreviewStyle(terrain) {
    return {
      "--terrain-preview-color": terrain.color || "#4b5563",
      "--terrain-preview-image":
        terrain.fillType === "image" && terrain.image
          ? `url("${terrain.image}")`
          : "none"
    };
  }

  return (
    <div className="terrain-creator">
      <div className="creator-header-row">
        <div>
          <h3>Terrain Creator</h3>
          <p className="small muted">
            Create the terrain types available in this universe.
          </p>
        </div>
      </div>

      <div className="terrain-gallery">
        {terrainList.map((terrain) => {
          const isSelected = selectedTerrain?.key === terrain.key;

          return (
            <div
              key={terrain.key}
              role="button"
              tabIndex={0}
              className={
                isSelected
                  ? "terrain-gallery-card active"
                  : "terrain-gallery-card"
              }
              title={getTerrainTitle(terrain)}
              style={getTerrainPreviewStyle(terrain)}
              onClick={() => setSelectedTerrainKey(terrain.key)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setSelectedTerrainKey(terrain.key);
                }
              }}
            >
              <span className="terrain-gallery-preview" />

              <button
                type="button"
                className="terrain-gallery-delete"
                title={`Delete ${terrain.label || "terrain"}`}
                onClick={(event) => {
                  event.stopPropagation();
                  deleteTerrain(terrain.key);
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
          onClick={addTerrain}
          title="Add terrain"
        >
          <span>＋</span>
          <strong>Add</strong>
        </button>
      </div>

      {selectedTerrain && (
        <div className="terrain-edit-form">
          <h3>Edit Terrain</h3>

          <div
            className="terrain-edit-preview"
            style={getTerrainPreviewStyle(selectedTerrain)}
          >
            <span />
          </div>

          <label>Name</label>
          <input
            value={selectedTerrain.label || ""}
            placeholder="e.g. Forest"
            onChange={(event) =>
              updateTerrain(selectedTerrain.key, "label", event.target.value)
            }
          />

          <label>Description</label>
          <textarea
            value={selectedTerrain.description || ""}
            placeholder="Explain what this terrain does or represents."
            onChange={(event) =>
              updateTerrain(
                selectedTerrain.key,
                "description",
                event.target.value
              )
            }
          />

          <label>Fill Type</label>
          <select
            value={selectedTerrain.fillType || "color"}
            onChange={(event) =>
              updateTerrain(
                selectedTerrain.key,
                "fillType",
                event.target.value
              )
            }
          >
            <option value="color">Colour</option>
            <option value="image">Image</option>
          </select>

          {selectedTerrain.fillType === "image" ? (
            <>
              <label>Image</label>

              <input
                key={`image-input-${selectedTerrain.key}`}
                type="file"
                accept="image/*"
                onChange={(event) => {
                  uploadImageFile(event.target.files[0], (imageData) =>
                    updateTerrain(selectedTerrain.key, "image", imageData)
                  );

                  event.target.value = "";
                }}
              />

              {selectedTerrain.image && (
                <button
                  type="button"
                  onClick={() =>
                    updateTerrain(selectedTerrain.key, "image", "")
                  }
                >
                  Clear Terrain Image
                </button>
              )}
            </>
          ) : (
            <>
              <label>Colour</label>
              <input
                key={`color-input-${selectedTerrain.key}`}
                type="color"
                value={selectedTerrain.color || "#4b5563"}
                onChange={(event) =>
                  updateTerrain(selectedTerrain.key, "color", event.target.value)
                }
              />
            </>
          )}

          <button
            type="button"
            className="danger-button"
            onClick={() => deleteTerrain(selectedTerrain.key)}
          >
            Delete Terrain
          </button>
        </div>
      )}
    </div>
  );
}
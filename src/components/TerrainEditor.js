"use client";

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

export default function TerrainEditor({ terrains, onTerrainListChange }) {
  function updateTerrain(index, field, value) {
    const nextTerrains = terrains.map((terrain, terrainIndex) =>
      terrainIndex === index
        ? {
          ...terrain,
          [field]: value,
          ...(field === "label"
            ? { key: makeKeyFromLabel(value) || terrain.key }
            : {})
        }
        : terrain
    );

    onTerrainListChange(nextTerrains);
  }

  function addTerrain() {
    const label = "New Terrain";
    const key = `${makeKeyFromLabel(label)}-${Date.now()}`;

    onTerrainListChange([
      ...terrains,
      {
        key,
        label,
        description: "",
        fillType: "color",
        color: "#4b5563",
        image: ""
      }
    ]);
  }

  function deleteTerrain(index) {
    onTerrainListChange(
      terrains.filter((terrain, terrainIndex) => terrainIndex !== index)
    );
  }

  return (
    <div className="mechanic-editor">
      <p className="small muted">
        Create the terrain types available in this world.
      </p>

      <button type="button" onClick={addTerrain}>
        + Add Terrain
      </button>

      <div className="mechanic-editor-list">
        {terrains.map((terrain, index) => (
          <div className="mechanic-editor-card" key={terrain.key}>
            <div className="terrain-preview">
              {terrain.fillType === "image" && terrain.image ? (
                <img src={terrain.image} alt={terrain.label} />
              ) : (
                <span style={{ background: terrain.color }} />
              )}
            </div>

            <label>Name</label>
            <input
              value={terrain.label || ""}
              onChange={(event) =>
                updateTerrain(index, "label", event.target.value)
              }
            />

            <label>Description</label>
            <textarea
              value={terrain.description || ""}
              placeholder="Explain what this terrain does or represents."
              onChange={(event) =>
                updateTerrain(index, "description", event.target.value)
              }
            />

            <label>Fill Type</label>
            <select
              value={terrain.fillType || "color"}
              onChange={(event) =>
                updateTerrain(index, "fillType", event.target.value)
              }
            >
              <option value="color">Colour</option>
              <option value="image">Image</option>
            </select>

            {terrain.fillType === "color" ? (
              <>
                <label>Colour</label>
                <input
                  type="color"
                  value={terrain.color || "#4b5563"}
                  onChange={(event) =>
                    updateTerrain(index, "color", event.target.value)
                  }
                />
              </>
            ) : (
              <>
                <label>Image</label>

                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) =>
                    uploadImageFile(event.target.files[0], (imageData) =>
                      updateTerrain(index, "image", imageData)
                    )
                  }
                />

                {terrain.image && (
                  <button
                    type="button"
                    onClick={() => updateTerrain(index, "image", "")}
                  >
                    Clear Terrain Image
                  </button>
                )}
              </>
            )}

            <button type="button" onClick={() => deleteTerrain(index)}>
              Delete Terrain
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
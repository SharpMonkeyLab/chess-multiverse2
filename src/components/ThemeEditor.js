"use client";

import {
  DEFAULT_BACKGROUND_IMAGE,
  DEFAULT_BOARD_SKIN_IMAGE,
  DEFAULT_PIECES,
  getPieceSymbol
} from "@/lib/defaultWorld";

function readImageFile(file, onLoad) {
  if (!file) return;
  if (!file.type.startsWith("image/")) return;

  const reader = new FileReader();

  reader.onload = function (loadEvent) {
    onLoad(loadEvent.target.result);
  };

  reader.readAsDataURL(file);
}

function ImageUploadBox({
  title,
  description,
  image,
  uploadLabel,
  clearLabel,
  onUpload,
  onClear
}) {
  function handleFileChange(event) {
    readImageFile(event.target.files[0], onUpload);
    event.target.value = "";
  }

  return (
    <div className="theme-upload-box">
      <div className="theme-upload-header">
        <strong>{title}</strong>
        <span>{description}</span>
      </div>

      <div className="theme-preview">
        {image ? (
          <img src={image} alt={`${title} preview`} />
        ) : (
          <span>No image uploaded</span>
        )}
      </div>

      <label className="theme-upload-label">
        {uploadLabel}
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
        />
      </label>

      {image && (
        <button type="button" onClick={onClear}>
          {clearLabel}
        </button>
      )}
    </div>
  );
}

function PieceSkinUploadButton({
  team,
  piece,
  image,
  onPieceSkinChange
}) {
  function handleFileChange(event) {
    readImageFile(event.target.files[0], (imageData) =>
      onPieceSkinChange(team, piece.key, imageData)
    );

    event.target.value = "";
  }

  return (
    <div className="piece-skin-editor-item">
      <div className="piece-skin-preview">
        {image ? (
          <img src={image} alt={`${team} ${piece.label}`} />
        ) : (
          <span>{getPieceSymbol(team, piece.key)}</span>
        )}
      </div>

      <strong>{piece.label}</strong>

      <label className="theme-upload-label compact-upload-label">
        Upload
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
        />
      </label>

      {image && (
        <button
          type="button"
          onClick={() => onPieceSkinChange(team, piece.key, "")}
        >
          Clear
        </button>
      )}
    </div>
  );
}

function PieceSkinTeamEditor({ team, worldTheme, onPieceSkinChange }) {
  return (
    <section className="piece-skin-team-editor">
      <h3>{team === "black" ? "Black Pieces" : "White Pieces"}</h3>

      <div className="piece-skin-grid">
        {DEFAULT_PIECES.map((piece) => (
          <PieceSkinUploadButton
            key={piece.key}
            team={team}
            piece={piece}
            image={worldTheme.pieceSkins?.[team]?.[piece.key] || ""}
            onPieceSkinChange={onPieceSkinChange}
          />
        ))}
      </div>
    </section>
  );
}

export default function ThemeEditor({
  worldTheme,
  onThemeChange,
  onPieceSkinChange,
  onCharacterDisplayModeChange
}) {
  return (
    <div className="theme-editor">
      <p className="small muted">
        Upload images for the background, board skin, and chess piece designs.
      </p>

      <ImageUploadBox
        title="Stage Background"
        description="Fills the whole editor background."
        image={worldTheme.backgroundImage}
        uploadLabel="Upload Background"
        clearLabel="Reset Background"
        onUpload={(imageData) => onThemeChange("backgroundImage", imageData)}
        onClear={() => onThemeChange("backgroundImage", DEFAULT_BACKGROUND_IMAGE)}
      />

      <ImageUploadBox
        title="Board Skin"
        description="Square image containing board border and tiles."
        image={worldTheme.boardSkinImage}
        uploadLabel="Upload Board Skin"
        clearLabel="Reset Board Skin"
        onUpload={(imageData) => onThemeChange("boardSkinImage", imageData)}
        onClear={() => onThemeChange("boardSkinImage", DEFAULT_BOARD_SKIN_IMAGE)}
      />

      <div className="theme-display-mode-box">
        <label>Character Display on Board</label>

        <select
          value={worldTheme.characterDisplayMode || "piece-with-portrait"}
          onChange={(event) =>
            onCharacterDisplayModeChange(event.target.value)
          }
        >
          <option value="piece-with-portrait">
            Piece with portrait badge
          </option>
          <option value="portrait-with-piece">
            Portrait with small piece symbol
          </option>
        </select>

        <p className="small muted">
          Choose how assigned character portraits appear on the board.
        </p>
      </div>

      <details>
        <summary>Piece Designs</summary>

        <div className="piece-skin-editor">
          <p className="small muted">
            Upload custom piece images for this world. Leave blank to use the default website pieces.
          </p>

          <PieceSkinTeamEditor
            team="black"
            worldTheme={worldTheme}
            onPieceSkinChange={onPieceSkinChange}
          />

          <PieceSkinTeamEditor
            team="white"
            worldTheme={worldTheme}
            onPieceSkinChange={onPieceSkinChange}
          />
        </div>
      </details>
    </div>
  );
}
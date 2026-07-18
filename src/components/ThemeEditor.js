"use client";

import {
  DEFAULT_BACKGROUND_IMAGE,
  DEFAULT_BOARD_SKIN_IMAGE,
  DEFAULT_PIECES,
  DEFAULT_PIECE_SKINS,
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
    <div className="theme-upload-box compact">
      <div className="theme-upload-header">
        <strong>{title}</strong>
        <span>{description}</span>
      </div>

      <div className="theme-preview compact">
        {image ? (
          <img src={image} alt={`${title} preview`} />
        ) : (
          <span>No image</span>
        )}
      </div>

      <div className="theme-upload-actions">
        <label className="theme-upload-label compact-upload-label">
          {uploadLabel}
          <input type="file" accept="image/*" onChange={handleFileChange} />
        </label>

        {image && (
          <button type="button" onClick={onClear}>
            {clearLabel}
          </button>
        )}
      </div>
    </div>
  );
}

function PieceSkinUploadButton({ team, piece, image, onPieceSkinChange }) {
  const defaultImage = DEFAULT_PIECE_SKINS[team]?.[piece.key] || "";

  function handleFileChange(event) {
    readImageFile(event.target.files[0], (imageData) =>
      onPieceSkinChange(team, piece.key, imageData)
    );

    event.target.value = "";
  }

  return (
    <div className="piece-skin-editor-item compact">
      <div className="piece-skin-preview compact">
        {image ? (
          <img src={image} alt={`${team} ${piece.label}`} />
        ) : (
          <span>{getPieceSymbol(team, piece.key)}</span>
        )}
      </div>

      <strong>{piece.label}</strong>

      <div className="piece-skin-actions">
        <label className="theme-upload-label compact-upload-label">
          Upload
          <input type="file" accept="image/*" onChange={handleFileChange} />
        </label>

        <button
          type="button"
          onClick={() => onPieceSkinChange(team, piece.key, defaultImage)}
        >
          Reset
        </button>
      </div>
    </div>
  );
}

function PieceSkinTeamEditor({ team, worldTheme, onPieceSkinChange }) {
  return (
    <section className="piece-skin-team-editor compact">
      <h3>{team === "black" ? "Black Pieces" : "White Pieces"}</h3>

      <div className="piece-skin-grid compact">
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
  onPieceSkinChange
}) {
  return (
    <div className="theme-editor compact">
      <p className="small muted">
        Background, board skin, and piece designs for this universe.
      </p>

      <div className="theme-upload-row">
        <ImageUploadBox
          title="Stage Background"
          description="Whole editor background."
          image={worldTheme.backgroundImage}
          uploadLabel="Upload"
          clearLabel="Reset"
          onUpload={(imageData) => onThemeChange("backgroundImage", imageData)}
          onClear={() =>
            onThemeChange("backgroundImage", DEFAULT_BACKGROUND_IMAGE)
          }
        />

        <ImageUploadBox
          title="Board Skin"
          description="Board border and tiles."
          image={worldTheme.boardSkinImage}
          uploadLabel="Upload"
          clearLabel="Reset"
          onUpload={(imageData) => onThemeChange("boardSkinImage", imageData)}
          onClear={() =>
            onThemeChange("boardSkinImage", DEFAULT_BOARD_SKIN_IMAGE)
          }
        />
      </div>

      <div className="theme-piece-designs">
        <div className="theme-upload-header">
          <strong>Piece Designs</strong>
          <span>
            Custom piece images. Leave blank to use default website pieces.
          </span>
        </div>

        <div className="piece-skin-editor compact">
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
      </div>
    </div>
  );
}

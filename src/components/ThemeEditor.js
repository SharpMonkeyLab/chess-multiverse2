"use client";

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
    const file = event.target.files[0];

    if (!file) return;
    if (!file.type.startsWith("image/")) return;

    const reader = new FileReader();

    reader.onload = function (loadEvent) {
      onUpload(loadEvent.target.result);
    };

    reader.readAsDataURL(file);
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

export default function ThemeEditor({ worldTheme, onThemeChange }) {
  return (
    <div className="theme-editor">
      <p className="small muted">
        Upload two images: one for the full background and one square board skin.
      </p>

      <ImageUploadBox
        title="Stage Background"
        description="Fills the whole editor background."
        image={worldTheme.backgroundImage}
        uploadLabel="Upload Background"
        clearLabel="Clear Background"
        onUpload={(imageData) => onThemeChange("backgroundImage", imageData)}
        onClear={() => onThemeChange("backgroundImage", "")}
      />

      <ImageUploadBox
        title="Board Skin"
        description="Square image containing board border and tiles."
        image={worldTheme.boardSkinImage}
        uploadLabel="Upload Board Skin"
        clearLabel="Clear Board Skin"
        onUpload={(imageData) => onThemeChange("boardSkinImage", imageData)}
        onClear={() => onThemeChange("boardSkinImage", "")}
      />
    </div>
  );
}
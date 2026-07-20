"use client";

export default function WorldExitConfirmModal({
  isOpen,
  isSaving = false,
  onStay,
  onDiscardAndExit,
  onSaveAndExit
}) {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="world-description-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSaving) {
          onStay();
        }
      }}
    >
      <div
        className="world-description-modal world-exit-confirm-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="world-exit-confirm-title"
      >
        <div className="world-description-modal-header">
          <p className="home-kicker">Unsaved Changes</p>
          <h2 id="world-exit-confirm-title">Leave this universe?</h2>
          <p className="small muted">
            You have unsaved changes. Save them before leaving, or discard and
            exit.
          </p>
        </div>

        <div className="world-description-modal-actions world-exit-confirm-actions">
          <button type="button" onClick={onStay} disabled={isSaving}>
            Stay
          </button>
          <button
            type="button"
            className="world-exit-discard-btn"
            onClick={onDiscardAndExit}
            disabled={isSaving}
          >
            Discard &amp; Exit
          </button>
          <button
            type="button"
            className="primary-button"
            onClick={onSaveAndExit}
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : "Save & Exit"}
          </button>
        </div>
      </div>
    </div>
  );
}

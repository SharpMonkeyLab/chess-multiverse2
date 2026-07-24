"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import FeatureToggleEditor from "./FeatureToggleEditor";
import ThemeEditor from "./ThemeEditor";
import WorldDescriptionModal from "./WorldDescriptionModal";
import WorldExitConfirmModal from "./WorldExitConfirmModal";
import { getDisplayWorldName } from "@/lib/stageLayoutConfig";

const MENU_SECTIONS = [
  { id: "features", label: "Universe Features" },
  { id: "theme", label: "Theme" },
  { id: "testGames", label: "Test Games" },
  { id: "backup", label: "Backup & Transfer" }
];

export default function TopCommandBar({
  worldDetails,
  worldFeatures,
  worldTheme,

  savedWorlds,
  selectedSavedWorldId,
  savedTestGames,
  selectedSavedTestGameId,
  saveStatus,

  onWorldDetailsChange,
  onThemeChange,
  onToggleWorldFeature,
  onPieceSkinChange,

  onSaveWorld,
  onLoadWorld,
  onDeleteWorld,
  onExportWorld,
  onImportWorld,
  onSelectedSavedWorldChange,

  onSaveWorldOnline,
  onQuietSaveWorldOnline,
  hasUnsavedChanges,
  onlineSaveStatus,
  isSavingOnline,
  isSavingLocal,

  onSaveTestGame,
  onLoadTestGame,
  onDeleteTestGame,
  onSelectedSavedTestGameChange,

  exitHref = "/worlds"
}) {
  const router = useRouter();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [openMenuSection, setOpenMenuSection] = useState("features");
  const [isDescriptionModalOpen, setIsDescriptionModalOpen] = useState(false);
  const [isExitConfirmOpen, setIsExitConfirmOpen] = useState(false);
  const menuPanelRef = useRef(null);

  useEffect(() => {
    if (!isMenuOpen) return;

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMenuOpen]);

  function handleImportChange(event) {
    const file = event.target.files[0];

    if (file) {
      onImportWorld(file);
    }

    event.target.value = "";
  }

  function handleExit() {
    if (isSavingOnline || isSavingLocal) return;

    const isDirty =
      typeof hasUnsavedChanges === "function"
        ? hasUnsavedChanges()
        : Boolean(hasUnsavedChanges);

    if (isDirty) {
      setIsExitConfirmOpen(true);
      return;
    }

    router.push(exitHref);
  }

  function handleDiscardAndExit() {
    if (isSavingOnline || isSavingLocal) return;
    setIsExitConfirmOpen(false);
    router.push(exitHref);
  }

  async function handleSaveAndExit() {
    if (isSavingOnline || isSavingLocal) return;

    const saved = await onQuietSaveWorldOnline?.();

    if (saved) {
      setIsExitConfirmOpen(false);
      router.push(exitHref);
    }
  }

  function handleSaveWorldClick() {
    if (isSavingOnline || isSavingLocal) return;
    setIsDescriptionModalOpen(true);
  }

  function handleDescriptionConfirm(nextDetails) {
    setIsDescriptionModalOpen(false);
    onSaveWorldOnline(nextDetails);
  }

  function closeMenu() {
    setIsMenuOpen(false);
  }

  function openMenu() {
    setOpenMenuSection("features");
    setIsMenuOpen(true);
  }

  function handleSectionToggle(sectionId) {
    setOpenMenuSection((current) =>
      current === sectionId ? null : sectionId
    );
  }

  function renderSectionContent(sectionId) {
    if (sectionId === "features") {
      return (
        <FeatureToggleEditor
          worldFeatures={worldFeatures}
          onToggleWorldFeature={onToggleWorldFeature}
        />
      );
    }

    if (sectionId === "theme") {
      return (
        <ThemeEditor
          worldTheme={worldTheme}
          onThemeChange={onThemeChange}
          onPieceSkinChange={onPieceSkinChange}
        />
      );
    }

    if (sectionId === "testGames") {
      return (
        <>
          <select
            value={selectedSavedTestGameId}
            onChange={(event) =>
              onSelectedSavedTestGameChange(event.target.value)
            }
          >
            <option value="">Saved test games</option>
            {savedTestGames.map((game) => (
              <option key={game.id} value={game.id}>
                {game.name}
              </option>
            ))}
          </select>

          <div className="menu-button-grid">
            <button type="button" onClick={onSaveTestGame}>
              Save Test Game
            </button>

            <button type="button" onClick={onLoadTestGame}>
              Load Test Game
            </button>

            <button type="button" onClick={onDeleteTestGame}>
              Delete Test Game
            </button>
          </div>
        </>
      );
    }

    return (
      <>
        <p className="command-menu-help-text">
          Export a JSON backup you can keep on your device, or import one to
          restore a universe.
        </p>

        <div className="menu-button-grid">
          <button type="button" onClick={onSaveWorld}>
            Save Local Backup
          </button>

          <button type="button" onClick={onExportWorld}>
            Export JSON
          </button>

          <label className="menu-file-button">
            Import JSON
            <input
              type="file"
              accept=".json,application/json"
              onChange={handleImportChange}
            />
          </label>
        </div>
      </>
    );
  }

  const menuOverlay =
    isMenuOpen && typeof document !== "undefined"
      ? createPortal(
          <div
            className="command-menu-backdrop"
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                closeMenu();
              }
            }}
          >
            <div
              className="command-menu-panel"
              ref={menuPanelRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="creator-menu-title"
            >
              <div className="command-menu-panel-header">
                <div>
                  <p className="home-kicker">Creator</p>
                  <h2 id="creator-menu-title">Universe Menu</h2>
                  <p className="command-menu-panel-subtitle">
                    Features, theme, test games, and backups for{" "}
                    {getDisplayWorldName(worldDetails.name)}.
                  </p>
                </div>

                <button
                  type="button"
                  className="command-menu-close"
                  onClick={closeMenu}
                  aria-label="Close menu"
                >
                  Close
                </button>
              </div>

              <div className="command-menu-panel-body">
                {MENU_SECTIONS.map((section) => {
                  const isOpen = openMenuSection === section.id;

                  return (
                    <section
                      key={section.id}
                      className={
                        isOpen
                          ? "command-menu-accordion open"
                          : "command-menu-accordion"
                      }
                    >
                      <button
                        type="button"
                        className="command-menu-accordion-trigger"
                        aria-expanded={isOpen}
                        onClick={() => handleSectionToggle(section.id)}
                      >
                        <span>{section.label}</span>
                        <span className="command-menu-accordion-icon" aria-hidden="true">
                          {isOpen ? "–" : "+"}
                        </span>
                      </button>

                      {isOpen && (
                        <div className="command-menu-accordion-content">
                          <div className="command-menu-section">
                            {renderSectionContent(section.id)}
                          </div>
                        </div>
                      )}
                    </section>
                  );
                })}
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <header className="top-command-bar">
      <div className="world-title-block">
        <img
          className="world-title-brand"
          src="/favicon.png"
          alt="Chess Multiverse"
          width={40}
          height={40}
        />
        <p className="world-name-display">
          {getDisplayWorldName(worldDetails.name)}
        </p>
      </div>

      <div className="top-command-actions">
        <div className="top-command-button-row">
          <button
            type="button"
            className="primary-button"
            onClick={handleSaveWorldClick}
            disabled={isSavingOnline || isSavingLocal}
            title="Save this universe to your account."
          >
            {isSavingOnline ? "Saving..." : "Save Universe"}
          </button>

          <button
            type="button"
            onClick={handleExit}
            disabled={isSavingOnline || isSavingLocal}
          >
            Exit
          </button>

          <button
            type="button"
            className="menu-button"
            onClick={openMenu}
            aria-expanded={isMenuOpen}
            aria-haspopup="dialog"
          >
            Menu
          </button>
        </div>

        {(saveStatus || onlineSaveStatus) && (
          <div className="top-command-status-row" aria-live="polite">
            {saveStatus && (
              <p className="command-menu-status">{saveStatus}</p>
            )}

            {onlineSaveStatus && (
              <p className="command-menu-status online-save-status">
                {onlineSaveStatus}
              </p>
            )}
          </div>
        )}
      </div>

      {menuOverlay}

      <WorldDescriptionModal
        worldDetails={worldDetails}
        isOpen={isDescriptionModalOpen}
        isSaving={isSavingOnline}
        onCancel={() => setIsDescriptionModalOpen(false)}
        onConfirm={handleDescriptionConfirm}
      />

      <WorldExitConfirmModal
        isOpen={isExitConfirmOpen}
        isSaving={isSavingOnline || isSavingLocal}
        onStay={() => setIsExitConfirmOpen(false)}
        onDiscardAndExit={handleDiscardAndExit}
        onSaveAndExit={handleSaveAndExit}
      />
    </header>
  );
}

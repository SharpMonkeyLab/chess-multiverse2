const STORAGE_PREFIX = "cm.prefs.";

export const DISPLAY_MODE_PIECE = "piece-with-portrait";
export const DISPLAY_MODE_PORTRAIT = "portrait-with-piece";

const DEFAULT_PREFERENCES = {
  preferCommunityAfterReady: false,
  displayModeByWorld: {}
};

function storageKey(userId) {
  return `${STORAGE_PREFIX}${userId || "guest"}`;
}

function normalizeDisplayMode(mode) {
  return mode === DISPLAY_MODE_PORTRAIT
    ? DISPLAY_MODE_PORTRAIT
    : DISPLAY_MODE_PIECE;
}

export function getUserPreferences(userId) {
  if (typeof window === "undefined") {
    return {
      ...DEFAULT_PREFERENCES,
      displayModeByWorld: {}
    };
  }

  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    if (!raw) {
      return {
        ...DEFAULT_PREFERENCES,
        displayModeByWorld: {}
      };
    }

    const parsed = JSON.parse(raw);
    const displayModeByWorld = {};

    if (parsed.displayModeByWorld && typeof parsed.displayModeByWorld === "object") {
      for (const [worldId, mode] of Object.entries(parsed.displayModeByWorld)) {
        displayModeByWorld[worldId] = normalizeDisplayMode(mode);
      }
    }

    return {
      ...DEFAULT_PREFERENCES,
      ...parsed,
      preferCommunityAfterReady: Boolean(parsed.preferCommunityAfterReady),
      displayModeByWorld
    };
  } catch {
    return {
      ...DEFAULT_PREFERENCES,
      displayModeByWorld: {}
    };
  }
}

export function saveUserPreferences(userId, preferences) {
  if (typeof window === "undefined") return;

  const current = getUserPreferences(userId);
  const displayModeByWorld = {
    ...current.displayModeByWorld,
    ...(preferences.displayModeByWorld || {})
  };

  for (const [worldId, mode] of Object.entries(displayModeByWorld)) {
    displayModeByWorld[worldId] = normalizeDisplayMode(mode);
  }

  const next = {
    preferCommunityAfterReady: Boolean(
      preferences.preferCommunityAfterReady ?? current.preferCommunityAfterReady
    ),
    displayModeByWorld
  };

  try {
    window.localStorage.setItem(storageKey(userId), JSON.stringify(next));
  } catch (error) {
    console.warn("Could not save user preferences:", error);
  }

  return next;
}

export function getWorldDisplayMode(userId, worldId) {
  if (!worldId) return null;

  const prefs = getUserPreferences(userId);
  return prefs.displayModeByWorld[worldId] || null;
}

export function saveWorldDisplayMode(userId, worldId, mode) {
  if (!worldId) return;

  const prefs = getUserPreferences(userId);
  saveUserPreferences(userId, {
    ...prefs,
    displayModeByWorld: {
      ...prefs.displayModeByWorld,
      [worldId]: normalizeDisplayMode(mode)
    }
  });
}

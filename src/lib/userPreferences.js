const STORAGE_PREFIX = "cm.prefs.";

export const DISPLAY_MODE_PIECE = "piece-with-portrait";
export const DISPLAY_MODE_PORTRAIT = "portrait-with-piece";

export const DEFAULT_TOOL_SHELF_ORDER = ["terrains", "conditions", "counters"];

const DEFAULT_PREFERENCES = {
  preferCommunityAfterReady: false,
  showLegalMoveHints: true,
  displayModeByWorld: {},
  toolShelfOrder: [...DEFAULT_TOOL_SHELF_ORDER]
};

function storageKey(userId) {
  return `${STORAGE_PREFIX}${userId || "guest"}`;
}

function normalizeDisplayMode(mode) {
  return mode === DISPLAY_MODE_PORTRAIT
    ? DISPLAY_MODE_PORTRAIT
    : DISPLAY_MODE_PIECE;
}

export function normalizeToolShelfOrder(order) {
  const allowed = new Set(DEFAULT_TOOL_SHELF_ORDER);
  const cleaned = [];

  if (Array.isArray(order)) {
    for (const key of order) {
      if (allowed.has(key) && !cleaned.includes(key)) {
        cleaned.push(key);
      }
    }
  }

  for (const key of DEFAULT_TOOL_SHELF_ORDER) {
    if (!cleaned.includes(key)) {
      cleaned.push(key);
    }
  }

  return cleaned;
}

function toolShelfOrderEquals(a, b) {
  const left = normalizeToolShelfOrder(a);
  const right = normalizeToolShelfOrder(b);
  return left.length === right.length && left.every((key, index) => key === right[index]);
}

export function getUserPreferences(userId) {
  if (typeof window === "undefined") {
    return {
      ...DEFAULT_PREFERENCES,
      displayModeByWorld: {},
      toolShelfOrder: [...DEFAULT_TOOL_SHELF_ORDER]
    };
  }

  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    if (!raw) {
      return {
        ...DEFAULT_PREFERENCES,
        displayModeByWorld: {},
        toolShelfOrder: [...DEFAULT_TOOL_SHELF_ORDER]
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
      showLegalMoveHints:
        parsed.showLegalMoveHints == null
          ? DEFAULT_PREFERENCES.showLegalMoveHints
          : Boolean(parsed.showLegalMoveHints),
      displayModeByWorld,
      toolShelfOrder: normalizeToolShelfOrder(parsed.toolShelfOrder)
    };
  } catch {
    return {
      ...DEFAULT_PREFERENCES,
      displayModeByWorld: {},
      toolShelfOrder: [...DEFAULT_TOOL_SHELF_ORDER]
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
    showLegalMoveHints: Boolean(
      preferences.showLegalMoveHints ?? current.showLegalMoveHints
    ),
    displayModeByWorld,
    toolShelfOrder: normalizeToolShelfOrder(
      preferences.toolShelfOrder ?? current.toolShelfOrder
    )
  };

  try {
    window.localStorage.setItem(storageKey(userId), JSON.stringify(next));
  } catch (error) {
    console.warn("Could not save user preferences:", error);
  }

  return next;
}

export function getToolShelfOrder(userId) {
  return normalizeToolShelfOrder(getUserPreferences(userId).toolShelfOrder);
}

export function saveToolShelfOrder(userId, order) {
  const prefs = getUserPreferences(userId);
  return saveUserPreferences(userId, {
    ...prefs,
    toolShelfOrder: normalizeToolShelfOrder(order)
  });
}

export function resetToolShelfOrder(userId) {
  return saveToolShelfOrder(userId, DEFAULT_TOOL_SHELF_ORDER);
}

export function isDefaultToolShelfOrder(order) {
  return toolShelfOrderEquals(order, DEFAULT_TOOL_SHELF_ORDER);
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

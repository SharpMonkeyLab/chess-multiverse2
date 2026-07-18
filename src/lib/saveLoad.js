// Local browser storage helpers.
// These are used for offline/local-first world saving.
//
// Safer storage model:
// - Each saved item gets its own localStorage key.
// - Each collection has a small index for listing saved items.
// - This avoids rewriting every saved universe whenever one world is saved/deleted.
//
// Important:
// LocalStorage is not good for very large image-heavy worlds.
// Big image worlds should eventually use Supabase Storage.

const STORAGE_PREFIX = "chess-multiverse";

// Around 3.5 million characters is already very large for localStorage.
// This protects the browser from saving giant base64 image worlds locally.
const MAX_LOCAL_ITEM_CHARACTERS = 3_500_000;

function getLegacyCollectionKey(collectionName) {
  return `${STORAGE_PREFIX}:${collectionName}`;
}

function getIndexKey(collectionName) {
  return `${STORAGE_PREFIX}:${collectionName}:index`;
}

function getItemKey(collectionName, id) {
  return `${STORAGE_PREFIX}:${collectionName}:item:${id}`;
}

function slugifyName(name) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function loadIndex(collectionName) {
  if (typeof window === "undefined") return [];

  const rawIndex = window.localStorage.getItem(getIndexKey(collectionName));

  if (!rawIndex) return [];

  try {
    const parsedIndex = JSON.parse(rawIndex);
    return Array.isArray(parsedIndex) ? parsedIndex : [];
  } catch {
    return [];
  }
}

function saveIndex(collectionName, indexData) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(
    getIndexKey(collectionName),
    JSON.stringify(indexData)
  );
}

function removeLegacyCollectionIfPresent(collectionName) {
  if (typeof window === "undefined") return;

  // Removes the old giant collection key.
  window.localStorage.removeItem(getLegacyCollectionKey(collectionName));
}

function getUniqueId(baseId, existingItems) {
  const existingIds = new Set(existingItems.map((item) => item.id));

  if (!existingIds.has(baseId)) return baseId;

  let copyNumber = 2;
  let nextId = `${baseId}-${copyNumber}`;

  while (existingIds.has(nextId)) {
    copyNumber += 1;
    nextId = `${baseId}-${copyNumber}`;
  }

  return nextId;
}

function assertLocalItemIsNotTooLarge(jsonText) {
  if (jsonText.length <= MAX_LOCAL_ITEM_CHARACTERS) return;

  throw new Error(
    "This universe is too large for safe local browser saving. Use Save Online Draft or export JSON instead."
  );
}

export function saveLocalItem(collectionName, name, data) {
  if (typeof window === "undefined") return null;

  const cleanName = name.trim() || "Untitled";
  const baseId = slugifyName(cleanName) || `untitled-${Date.now()}`;

  const currentIndex = loadIndex(collectionName);
  const existingItem = currentIndex.find((item) => item.id === baseId);

  const id = existingItem ? baseId : getUniqueId(baseId, currentIndex);
  const updatedAt = new Date().toISOString();

  const savedItem = {
    id,
    name: cleanName,
    updatedAt,
    data
  };

  const savedItemJson = JSON.stringify(savedItem);

  assertLocalItemIsNotTooLarge(savedItemJson);

  window.localStorage.setItem(getItemKey(collectionName, id), savedItemJson);

  const nextIndexWithoutItem = currentIndex.filter((item) => item.id !== id);

  const nextIndex = [
    ...nextIndexWithoutItem,
    {
      id,
      name: cleanName,
      updatedAt
    }
  ].sort((a, b) => a.name.localeCompare(b.name));

  saveIndex(collectionName, nextIndex);
  removeLegacyCollectionIfPresent(collectionName);

  return savedItem;
}

export function loadLocalItem(collectionName, id) {
  if (typeof window === "undefined" || !id) return null;

  const rawItem = window.localStorage.getItem(getItemKey(collectionName, id));

  if (!rawItem) return null;

  try {
    return JSON.parse(rawItem);
  } catch {
    return null;
  }
}

export function deleteLocalItem(collectionName, id) {
  if (typeof window === "undefined" || !id) return;

  window.localStorage.removeItem(getItemKey(collectionName, id));

  const currentIndex = loadIndex(collectionName);
  const nextIndex = currentIndex.filter((item) => item.id !== id);

  saveIndex(collectionName, nextIndex);
  removeLegacyCollectionIfPresent(collectionName);
}

export function getLocalItemList(collectionName) {
  const indexData = loadIndex(collectionName);

  return indexData.sort((a, b) => a.name.localeCompare(b.name));
}

export function downloadJsonFile(fileName, data) {
  if (typeof window === "undefined") return;

  const jsonText = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonText], { type: "application/json" });
  const url = window.URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();

  window.URL.revokeObjectURL(url);
}

export function readJsonFile(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error("No file selected."));
      return;
    }

    const reader = new FileReader();

    reader.onload = function (event) {
      try {
        const parsedData = JSON.parse(event.target.result);
        resolve(parsedData);
      } catch {
        reject(new Error("This file is not valid JSON."));
      }
    };

    reader.onerror = function () {
      reject(new Error("Could not read the file."));
    };

    reader.readAsText(file);
  });
}

export function makeSafeFileName(name) {
  const safeName = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return safeName || "untitled-world";
}
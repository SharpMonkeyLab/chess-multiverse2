// Local browser storage helpers.
// These are used for offline/local-first world saving.
//
// Later, Supabase will become the online storage layer.
// Local storage should remain useful for drafts, backups, and offline testing.
//
// See src/lib/supabasePlan.js for the future database model.

const STORAGE_PREFIX = "chess-multiverse";

function getCollectionKey(collectionName) {
  return `${STORAGE_PREFIX}:${collectionName}`;
}

function slugifyName(name) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function loadCollection(collectionName) {
  if (typeof window === "undefined") return {};

  const collectionKey = getCollectionKey(collectionName);
  const rawData = window.localStorage.getItem(collectionKey);

  if (!rawData) return {};

  try {
    return JSON.parse(rawData);
  } catch {
    return {};
  }
}

function saveCollection(collectionName, collectionData) {
  if (typeof window === "undefined") return;

  const collectionKey = getCollectionKey(collectionName);
  window.localStorage.setItem(collectionKey, JSON.stringify(collectionData));
}

export function saveLocalItem(collectionName, name, data) {
  const cleanName = name.trim() || "Untitled";
  const id = slugifyName(cleanName) || `untitled-${Date.now()}`;

  const collectionData = loadCollection(collectionName);

  collectionData[id] = {
    id,
    name: cleanName,
    updatedAt: new Date().toISOString(),
    data
  };

  saveCollection(collectionName, collectionData);

  return collectionData[id];
}

export function loadLocalItem(collectionName, id) {
  if (!id) return null;

  const collectionData = loadCollection(collectionName);

  return collectionData[id] || null;
}

export function deleteLocalItem(collectionName, id) {
  if (!id) return;

  const collectionData = loadCollection(collectionName);

  delete collectionData[id];

  saveCollection(collectionName, collectionData);
}

export function getLocalItemList(collectionName) {
  const collectionData = loadCollection(collectionName);

  return Object.values(collectionData).sort((a, b) =>
    a.name.localeCompare(b.name)
  );
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
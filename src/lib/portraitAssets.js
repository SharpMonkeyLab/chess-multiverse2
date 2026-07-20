// Portrait asset library helpers.
// Uploaded images live in portraitAssets keyed by upload filename.
// Library matching uses the character Name (basename / extension ignored).
// Direct portrait values (http(s) / absolute path) still win; file uploads go to the library.

import { getCharacterList } from "@/lib/csv";

const MIME_EXTENSION_MAP = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/webp": ".webp",
  "image/gif": ".gif"
};

export function isDirectPortraitSource(value) {
  if (typeof value !== "string" || !value) return false;

  return (
    value.startsWith("data:image/") ||
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("/")
  );
}

export function isPortraitDataUrl(value) {
  return typeof value === "string" && value.startsWith("data:image/");
}

export function getPortraitBasename(value) {
  const raw = String(value || "").trim();

  if (!raw || isDirectPortraitSource(raw)) return "";

  const filename = raw.split(/[/\\]/).pop() || raw;
  const stem = filename.replace(/\.[^.]+$/, "");

  return stem || filename;
}

export function getExtensionFromImageFile(file) {
  if (!file) return ".png";

  const name = String(file.name || "");
  const match = name.match(/(\.[a-z0-9]+)$/i);

  if (match) return match[1].toLowerCase();

  return MIME_EXTENSION_MAP[file.type] || ".png";
}

export function buildPortraitFilename(characterName, file) {
  const cleanName = String(characterName || "").trim();

  if (!cleanName) return "";

  return `${cleanName}${getExtensionFromImageFile(file)}`;
}

export function findPortraitAssetKey(name, portraitAssets = {}) {
  if (!name || typeof name !== "string") return "";

  const assets = portraitAssets || {};

  if (Object.prototype.hasOwnProperty.call(assets, name) && assets[name]) {
    return name;
  }

  const targetBasename = getPortraitBasename(name).toLowerCase();

  if (!targetBasename) return "";

  const matchedFilename = Object.keys(assets).find((filename) => {
    if (!assets[filename]) return false;

    return getPortraitBasename(filename).toLowerCase() === targetBasename;
  });

  return matchedFilename || "";
}

export function findAssetsByBasename(name, portraitAssets = {}) {
  const targetBasename = getPortraitBasename(name).toLowerCase();

  if (!targetBasename) return [];

  return Object.keys(portraitAssets || {}).filter((filename) => {
    if (!portraitAssets[filename]) return false;

    return getPortraitBasename(filename).toLowerCase() === targetBasename;
  });
}

export function removePortraitAssetsForName(name, portraitAssets = {}) {
  const nextAssets = { ...(portraitAssets || {}) };
  const keysToRemove = findAssetsByBasename(name, nextAssets);

  keysToRemove.forEach((filename) => {
    delete nextAssets[filename];
  });

  return {
    portraitAssets: nextAssets,
    removedKeys: keysToRemove
  };
}

export function setPortraitAssetForCharacter({
  characterName,
  file,
  imageData,
  portraitAssets = {}
}) {
  const filename = buildPortraitFilename(characterName, file);

  if (!filename || !imageData) {
    return {
      portraitAssets: { ...(portraitAssets || {}) },
      filename: "",
      removedKeys: []
    };
  }

  const withoutPrior = removePortraitAssetsForName(characterName, portraitAssets);

  return {
    portraitAssets: {
      ...withoutPrior.portraitAssets,
      [filename]: imageData
    },
    filename,
    removedKeys: withoutPrior.removedKeys
  };
}

export function mergePortraitAssetsRejectingDuplicates(
  existingAssets = {},
  incomingAssets = {}
) {
  const nextAssets = { ...(existingAssets || {}) };
  const accepted = {};
  const skipped = [];
  const existingBasenames = new Set(
    Object.keys(nextAssets).map((filename) =>
      getPortraitBasename(filename).toLowerCase()
    )
  );
  const batchBasenames = new Set();

  Object.entries(incomingAssets || {}).forEach(([filename, imageData]) => {
    if (!imageData) return;

    const basename = getPortraitBasename(filename).toLowerCase();

    if (!basename) {
      skipped.push(filename);
      return;
    }

    if (existingBasenames.has(basename) || batchBasenames.has(basename)) {
      skipped.push(filename);
      return;
    }

    batchBasenames.add(basename);
    accepted[filename] = imageData;
    nextAssets[filename] = imageData;
  });

  return {
    portraitAssets: nextAssets,
    accepted,
    skipped,
    acceptedCount: Object.keys(accepted).length,
    skippedCount: skipped.length
  };
}

export function resolveCharacterPortrait(character, portraitAssets = {}) {
  if (!character) return "";

  const portrait =
    typeof character === "string" ? "" : character.portrait || "";
  const name =
    typeof character === "string" ? character : character.name || "";

  // Prefer non-data direct sources (URL / path). Data URLs are legacy embeds;
  // library assets should win once a Name-matched file exists.
  if (
    isDirectPortraitSource(portrait) &&
    !isPortraitDataUrl(portrait)
  ) {
    return portrait;
  }

  const matchedKey = findPortraitAssetKey(name, portraitAssets);
  const asset = matchedKey ? portraitAssets?.[matchedKey] : "";

  if (typeof asset === "string" && asset) {
    return asset;
  }

  if (isPortraitDataUrl(portrait)) {
    return portrait;
  }

  return "";
}

export function getPortraitAssetEntries(portraitAssets = {}) {
  return Object.entries(portraitAssets || {}).filter(
    ([, value]) => typeof value === "string" && value
  );
}

export function hasLibraryPortraitForCharacter(character, portraitAssets = {}) {
  if (!character?.name) return false;

  return Boolean(findPortraitAssetKey(character.name, portraitAssets));
}

export function getPortraitMatchCounts(characterLibrary, portraitAssets = {}) {
  const characters = getCharacterList(characterLibrary);
  const filenames = Object.keys(portraitAssets || {});

  const matchCountByFilename = {};
  const missingPortraits = [];
  let charactersMatched = 0;

  filenames.forEach((filename) => {
    matchCountByFilename[filename] = 0;
  });

  characters.forEach((character) => {
    if (resolveCharacterPortrait(character, portraitAssets)) {
      charactersMatched += 1;

      const matchedKey = findPortraitAssetKey(
        character?.name || "",
        portraitAssets
      );

      if (matchedKey) {
        matchCountByFilename[matchedKey] =
          (matchCountByFilename[matchedKey] || 0) + 1;
      }

      return;
    }

    const characterName = character?.name || "";

    if (!characterName) return;

    missingPortraits.push({
      name: characterName || "Unnamed Character",
      portrait: characterName
    });
  });

  const matchedCount = filenames.filter(
    (filename) => (matchCountByFilename[filename] || 0) > 0
  ).length;

  const unusedCount = filenames.length - matchedCount;

  return {
    matchCountByFilename,
    matchedCount,
    unusedCount,
    uploadedCount: filenames.length,
    charactersMatched,
    characterCount: characters.length,
    missingPortraits
  };
}

export function getAssetNameFromPortraitFilename(filename) {
  return getPortraitBasename(filename) || "portrait";
}

// ================================
// WORLD ASSET STORAGE HELPERS
// ================================
//
// This file moves heavy base64 image strings out of world_data
// and into Supabase Storage.
//
// Database:
// - stores normal world data and image URLs
//
// Storage:
// - stores image files such as backgrounds, board skins,
//   piece skins, portraits, and terrain images

export const WORLD_ASSET_BUCKET = "world-assets";

function isDataUrl(value) {
  return typeof value === "string" && value.startsWith("data:");
}

function cloneWorldData(worldData) {
  if (typeof structuredClone === "function") {
    return structuredClone(worldData);
  }

  return JSON.parse(JSON.stringify(worldData));
}

function getMimeTypeFromDataUrl(dataUrl) {
  const match = dataUrl.match(/^data:([^;]+);base64,/);

  return match?.[1] || "image/png";
}

function getFileExtensionFromMimeType(mimeType) {
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  if (mimeType === "image/gif") return "gif";
  if (mimeType === "image/svg+xml") return "svg";

  return "png";
}

function makeStorageSafePart(value) {
  return String(value || "asset")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "asset";
}

async function dataUrlToBlob(dataUrl) {
  const response = await fetch(dataUrl);

  if (!response.ok) {
    throw new Error("Could not convert image data for upload.");
  }

  return response.blob();
}

async function uploadDataUrlAsset({
  supabase,
  userId,
  worldId,
  assetType,
  assetName,
  dataUrl
}) {
  if (!isDataUrl(dataUrl)) {
    return dataUrl;
  }

  const mimeType = getMimeTypeFromDataUrl(dataUrl);
  const extension = getFileExtensionFromMimeType(mimeType);
  const blob = await dataUrlToBlob(dataUrl);

  const safeAssetType = makeStorageSafePart(assetType);
  const safeAssetName = makeStorageSafePart(assetName);

  // Folder structure:
  // userId/worldId/assetType/fileName.ext
  //
  // The first folder is the user id because our Supabase Storage
  // policy uses that folder to check ownership.
  const storagePath = [
    userId,
    worldId,
    safeAssetType,
    `${safeAssetName}-${Date.now()}.${extension}`
  ].join("/");

  const { error } = await supabase.storage
    .from(WORLD_ASSET_BUCKET)
    .upload(storagePath, blob, {
      contentType: mimeType,
      upsert: true
    });

  if (error) {
    throw new Error(error.message || "Could not upload world asset.");
  }

  const { data } = supabase.storage
    .from(WORLD_ASSET_BUCKET)
    .getPublicUrl(storagePath);

  return data.publicUrl;
}

async function replaceImageField({
  supabase,
  userId,
  worldId,
  target,
  field,
  assetType,
  assetName,
  onProgress,
  progress
}) {
  if (!target || !isDataUrl(target[field])) {
    return progress;
  }

  const nextProgress = progress + 1;

  if (onProgress) {
    onProgress(nextProgress);
  }

  target[field] = await uploadDataUrlAsset({
    supabase,
    userId,
    worldId,
    assetType,
    assetName,
    dataUrl: target[field]
  });

  return nextProgress;
}

export function countWorldDataImageAssets(worldData) {
  let count = 0;

  function countIfDataUrl(value) {
    if (isDataUrl(value)) count += 1;
  }

  countIfDataUrl(worldData?.worldTheme?.backgroundImage);
  countIfDataUrl(worldData?.worldTheme?.boardSkinImage);

  const pieceSkins = worldData?.worldTheme?.pieceSkins || {};

  Object.entries(pieceSkins).forEach(([, teamSkins]) => {
    Object.values(teamSkins || {}).forEach(countIfDataUrl);
  });

  const characterLibrary = worldData?.characterLibrary || {};

  Object.values(characterLibrary).forEach((character) => {
    countIfDataUrl(character?.portrait);
  });

  const terrains = worldData?.worldMechanics?.terrains || [];

  terrains.forEach((terrain) => {
    countIfDataUrl(terrain?.image);
  });

  return count;
}

export async function uploadWorldAssets({
  supabase,
  userId,
  worldId,
  worldData,
  onProgress
}) {
  const nextWorldData = cloneWorldData(worldData);
  const totalAssets = countWorldDataImageAssets(nextWorldData);

  let progress = 0;

  if (totalAssets === 0) {
    return {
      worldData: nextWorldData,
      uploadedCount: 0
    };
  }

  if (onProgress) {
    onProgress(progress, totalAssets);
  }

  progress = await replaceImageField({
    supabase,
    userId,
    worldId,
    target: nextWorldData.worldTheme,
    field: "backgroundImage",
    assetType: "background",
    assetName: "world-background",
    onProgress: (current) => onProgress?.(current, totalAssets),
    progress
  });

  progress = await replaceImageField({
    supabase,
    userId,
    worldId,
    target: nextWorldData.worldTheme,
    field: "boardSkinImage",
    assetType: "board-skin",
    assetName: "board-skin",
    onProgress: (current) => onProgress?.(current, totalAssets),
    progress
  });

  const pieceSkins = nextWorldData.worldTheme?.pieceSkins || {};

  for (const [team, teamSkins] of Object.entries(pieceSkins)) {
    for (const pieceKey of Object.keys(teamSkins || {})) {
      progress = await replaceImageField({
        supabase,
        userId,
        worldId,
        target: teamSkins,
        field: pieceKey,
        assetType: "piece-skin",
        assetName: `${team}-${pieceKey}`,
        onProgress: (current) => onProgress?.(current, totalAssets),
        progress
      });
    }
  }

  const characterLibrary = nextWorldData.characterLibrary || {};

  for (const [characterKey, character] of Object.entries(characterLibrary)) {
    progress = await replaceImageField({
      supabase,
      userId,
      worldId,
      target: character,
      field: "portrait",
      assetType: "character-portrait",
      assetName: character?.name || characterKey,
      onProgress: (current) => onProgress?.(current, totalAssets),
      progress
    });
  }

  const terrains = nextWorldData.worldMechanics?.terrains || [];

  for (const terrain of terrains) {
    progress = await replaceImageField({
      supabase,
      userId,
      worldId,
      target: terrain,
      field: "image",
      assetType: "terrain-image",
      assetName: terrain?.label || terrain?.key || "terrain",
      onProgress: (current) => onProgress?.(current, totalAssets),
      progress
    });
  }

  return {
    worldData: nextWorldData,
    uploadedCount: totalAssets
  };
}
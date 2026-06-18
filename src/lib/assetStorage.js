import { WORLD_ASSETS_BUCKET, supabase } from "@/lib/supabaseClient";

const DEFAULT_IMAGE_EXTENSION = "png";

const MIME_EXTENSION_MAP = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/svg+xml": "svg"
};

export function isDataUrl(value) {
    return typeof value === "string" && value.startsWith("data:");
}

export function isImageDataUrl(value) {
    return typeof value === "string" && value.startsWith("data:image/");
}

export function getMimeTypeFromDataUrl(dataUrl) {
    if (!isDataUrl(dataUrl)) return "";

    const match = dataUrl.match(/^data:([^;,]+)[;,]/);

    return match?.[1] || "";
}

export function getExtensionFromMimeType(mimeType) {
    return MIME_EXTENSION_MAP[mimeType] || DEFAULT_IMAGE_EXTENSION;
}

export function cleanStorageSegment(value, fallback = "asset") {
    const cleanValue = String(value || "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

    return cleanValue || fallback;
}

export function dataUrlToBlob(dataUrl) {
    if (!isDataUrl(dataUrl)) {
        throw new Error("This value is not a valid data URL.");
    }

    const [metadata, base64Data] = dataUrl.split(",");

    if (!metadata || !base64Data) {
        throw new Error("This data URL is incomplete.");
    }

    const mimeType = getMimeTypeFromDataUrl(dataUrl) || "application/octet-stream";
    const binaryString = window.atob(base64Data);
    const byteNumbers = new Array(binaryString.length);

    for (let index = 0; index < binaryString.length; index += 1) {
        byteNumbers[index] = binaryString.charCodeAt(index);
    }

    const byteArray = new Uint8Array(byteNumbers);

    return new Blob([byteArray], { type: mimeType });
}

export function createWorldAssetPath({
    userId,
    worldId,
    assetType,
    assetName,
    extension
}) {
    const cleanUserId = cleanStorageSegment(userId, "unknown-user");
    const cleanWorldId = cleanStorageSegment(worldId, "unknown-world");
    const cleanAssetType = cleanStorageSegment(assetType, "general");
    const cleanAssetName = cleanStorageSegment(assetName, "asset");
    const cleanExtension = cleanStorageSegment(extension, DEFAULT_IMAGE_EXTENSION);

    return `${cleanUserId}/${cleanWorldId}/${cleanAssetType}/${cleanAssetName}.${cleanExtension}`;
}

export function getPublicAssetUrl(storagePath) {
    if (!supabase || !storagePath) return "";

    const { data } = supabase.storage
        .from(WORLD_ASSETS_BUCKET)
        .getPublicUrl(storagePath);

    return data?.publicUrl || "";
}

export async function uploadDataUrlAsset({
    userId,
    worldId,
    assetType,
    assetName,
    dataUrl
}) {
    if (!supabase) {
        throw new Error("Supabase is not configured.");
    }

    if (!isImageDataUrl(dataUrl)) {
        return {
            publicUrl: dataUrl || "",
            storagePath: "",
            uploaded: false
        };
    }

    const mimeType = getMimeTypeFromDataUrl(dataUrl);
    const extension = getExtensionFromMimeType(mimeType);
    const blob = dataUrlToBlob(dataUrl);

    const storagePath = createWorldAssetPath({
        userId,
        worldId,
        assetType,
        assetName,
        extension
    });

    const { error } = await supabase.storage
        .from(WORLD_ASSETS_BUCKET)
        .upload(storagePath, blob, {
            contentType: blob.type,
            upsert: true
        });

    if (error) {
        throw error;
    }

    return {
        publicUrl: getPublicAssetUrl(storagePath),
        storagePath,
        uploaded: true
    };
}
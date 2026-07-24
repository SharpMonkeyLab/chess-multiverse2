// Shared world data reader helpers.
// These helpers are designed to work with localStorage worlds now
// and Supabase world rows later.
// Future online worlds will come from public.worlds.world_data.
//
// See src/lib/supabasePlan.js for the future database model.

import { getCounterListFromMechanics } from "@/lib/defaultWorld";

export function getWorldData(world) {
  // Normal local saves use world.data.
  // Online rows use world.world_data.
  // Some imported/exported worlds can be wrapped one level deeper.
  return world?.data?.data || world?.data || world?.world_data || world || {};
}

export function getWorldDetails(world) {
  const worldData = getWorldData(world);

  return worldData.worldDetails || {};
}

export function getWorldName(world) {
  const details = getWorldDetails(world);

  return details.name || world?.name || "Unnamed Universe";
}

export function getWorldDescription(world) {
  const details = getWorldDetails(world);

  return (
    details.description ||
    "No description yet. This universe is choosing mystery over documentation."
  );
}

export function getWorldRulesPreview(world) {
  const details = getWorldDetails(world);

  return details.rulesNotes || "No rules summary yet.";
}

export function getWorldTheme(world) {
  const worldData = getWorldData(world);

  return worldData.worldTheme || worldData.theme || {};
}

export function normalizeWorldTheme(savedTheme = {}, defaultTheme) {
  const baseTheme = defaultTheme || {};
  const theme = savedTheme || {};

  return {
    ...baseTheme,
    ...theme,
    backgroundImage: theme.backgroundImage || baseTheme.backgroundImage || "",
    boardSkinImage: theme.boardSkinImage || baseTheme.boardSkinImage || "",
    pieceSkins: {
      ...(baseTheme.pieceSkins || {}),
      ...(theme.pieceSkins || {}),
      white: {
        ...(baseTheme.pieceSkins?.white || {}),
        ...(theme.pieceSkins?.white || {})
      },
      black: {
        ...(baseTheme.pieceSkins?.black || {}),
        ...(theme.pieceSkins?.black || {})
      }
    },
    characterDisplayMode:
      theme.characterDisplayMode || baseTheme.characterDisplayMode || "piece-with-portrait"
  };
}

export function getWorldPreviewImages(world) {
  const theme = getWorldTheme(world);

  return {
    backgroundImage: theme.backgroundImage || "",
    boardSkinImage: theme.boardSkinImage || ""
  };
}

export function getCharacterList(world) {
  const worldData = getWorldData(world);
  const characterLibrary = worldData.characterLibrary;

  if (Array.isArray(characterLibrary)) {
    return characterLibrary;
  }

  return Object.values(characterLibrary || {});
}

export function getTerrainList(world) {
  const worldData = getWorldData(world);
  const terrains = worldData.worldMechanics?.terrains;

  return Array.isArray(terrains) ? terrains : [];
}

export function getCounterList(world) {
  const worldData = getWorldData(world);
  return getCounterListFromMechanics(worldData.worldMechanics);
}

export function getConditionList(world) {
  const worldData = getWorldData(world);
  const conditions = worldData.worldMechanics?.conditions;

  return Array.isArray(conditions) ? conditions : [];
}

export function getTokenList(world) {
  const worldData = getWorldData(world);

  return Object.values(worldData.worldTokens || {});
}

export function getEnabledFeatureLabels(world) {
  const worldData = getWorldData(world);
  const features = worldData.worldFeatures || {};

  const featureLabels = [
    { key: "characters", label: "Characters" },
    { key: "terrains", label: "Terrains" },
    { key: "counters", label: "Counters" },
    { key: "conditions", label: "Conditions" },
    { key: "cardDecks", label: "Cards" },
    { key: "diceSystem", label: "Dice" },
    { key: "timers", label: "Timers" },
    { key: "objectives", label: "Objectives" },
    { key: "fogOfWar", label: "Fog" }
  ];

  return featureLabels
    .filter((feature) => features[feature.key])
    .map((feature) => feature.label);
}

export function getWorldCreatorStats(world) {
  return [
    {
      label: "Characters",
      value: getCharacterList(world).length
    },
    {
      label: "Terrains",
      value: getTerrainList(world).length
    },
    {
      label: "Counters",
      value: getCounterList(world).length
    },
    {
      label: "Conditions",
      value: getConditionList(world).length
    }
  ];
}

export const WORLD_COMPLEXITY_OPTIONS = ["Basic", "Moderate", "Advanced"];

const LEGACY_COMPLEXITY_MAP = {
  Simple: "Basic",
  Standard: "Moderate"
};

export function normalizeWorldComplexity(value) {
  const raw = String(value || "").trim();

  if (WORLD_COMPLEXITY_OPTIONS.includes(raw)) {
    return raw;
  }

  if (LEGACY_COMPLEXITY_MAP[raw]) {
    return LEGACY_COMPLEXITY_MAP[raw];
  }

  return "Basic";
}

export function getWorldComplexity(world) {
  const worldData = getWorldData(world);
  const details = worldData.worldDetails || {};
  const creatorComplexity = String(details.complexity || "").trim();

  if (creatorComplexity) {
    return normalizeWorldComplexity(creatorComplexity);
  }

  // Fallback for older worlds that only stored complexity on the row.
  const rowComplexity = String(world?.complexity_label || "").trim();

  if (rowComplexity) {
    return normalizeWorldComplexity(rowComplexity);
  }

  return "Basic";
}

export function getWorldCardStats(world) {
  return [
    {
      icon: "★",
      label: "Rating",
      value: "New"
    },
    {
      icon: "👥",
      label: "Players",
      value: "0"
    },
    {
      icon: "⚔",
      label: "Matches",
      value: "0"
    },
    {
      icon: "🧠",
      label: "Complexity",
      value: getWorldComplexity(world)
    }
  ];
}
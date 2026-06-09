// Shared world data helpers.
// These helpers let localStorage worlds and future Supabase worlds
// be read in the same way across the platform.

export function getWorldData(world) {
  // Normal local saves use world.data.
  // Some imported/exported worlds can be wrapped one level deeper.
  return world?.data?.data || world?.data || world || {};
}

export function getWorldDetails(world) {
  const worldData = getWorldData(world);

  return worldData.worldDetails || {};
}

export function getWorldName(world) {
  const details = getWorldDetails(world);

  return details.name || world?.name || "Untitled World";
}

export function getWorldDescription(world) {
  const details = getWorldDetails(world);

  return (
    details.description ||
    "No description yet. This world is choosing mystery over documentation."
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
  const counters = worldData.worldMechanics?.counters;

  return Array.isArray(counters) ? counters : [];
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
    { key: "worldTokens", label: "Tokens" },
    { key: "terrains", label: "Terrains" },
    { key: "counters", label: "Counters" },
    { key: "conditions", label: "Conditions" }
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
    },
    {
      label: "Tokens",
      value: getTokenList(world).length
    }
  ];
}

export function getWorldComplexity(world) {
  const systemScore =
    getCharacterList(world).length +
    getTerrainList(world).length +
    getCounterList(world).length +
    getConditionList(world).length +
    getTokenList(world).length;

  if (systemScore >= 45) return "Advanced";
  if (systemScore >= 18) return "Standard";

  return "Simple";
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
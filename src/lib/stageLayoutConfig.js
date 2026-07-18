// Shared stage layout knobs for Creator and Play.
// CSS :root variables remain the visual source of truth;
// these fallbacks must stay in sync with globals.css.

export const STAGE_DESIGN_WIDTH = 1680;
export const STAGE_DESIGN_HEIGHT = 840;

export const UNNAMED_WORLD_LABEL = "Unnamed Universe";

export function getDisplayWorldName(name) {
  const trimmed = String(name || "").trim();
  return trimmed || UNNAMED_WORLD_LABEL;
}

export const BOARD_SIZE = 8;

export const DEFAULT_BACKGROUND_IMAGE =
  "/theme/default/default-background.png";

export const DEFAULT_BOARD_SKIN_IMAGE =
  "/theme/default/default-board-skin.png";

export const DEFAULT_TERRAIN_IMAGES = {
  forest: "/terrains/default/forest.png",
  water: "/terrains/default/water.png",
  sand: "/terrains/default/sand.png",
  fire: "/terrains/default/fire.png"
};

export const DEFAULT_WORLD_FEATURES = {
  characters: true,
  counters: true,
  conditions: true,
  terrains: true,

  // Advanced systems
  cardDecks: false,
  diceSystem: false,
  timers: false,
  objectives: false,
  fogOfWar: false
};

export const WORLD_FEATURE_GROUPS = [
  {
    title: "Core Systems",
    features: [
      {
        key: "characters",
        label: "Characters",
        description: "Allow pieces to be assigned characters and abilities."
      }
    ]
  },
  {
    title: "Board Tools",
    features: [
      {
        key: "terrains",
        label: "Terrains",
        description: "Allow tiles to have terrain types."
      },
      {
        key: "counters",
        label: "Counters",
        description: "Allow numerical markers on pieces or tokens."
      },
      {
        key: "conditions",
        label: "Conditions",
        description: "Allow status icons on pieces or tokens."
      }
    ]
  },
  {
    title: "Advanced Systems",
    features: [
      {
        key: "cardDecks",
        label: "Deck of Cards",
        description:
          "Players build decks from this universe's card set, then draw and play cards that change the board."
      },
      {
        key: "diceSystem",
        label: "Dice System",
        description:
          "Add dice to play. Creator sets dice type/count as fixed or player-editable at setup."
      },
      {
        key: "timers",
        label: "Timers",
        description:
          "Turn or side clocks. Creator sets defaults and whether players may edit times at setup."
      },
      {
        key: "objectives",
        label: "Objectives",
        description:
          "Creator missions chosen or randomized by players when starting a game."
      },
      {
        key: "fogOfWar",
        label: "Fog of War",
        description:
          "Hide pieces inside fog zones from the opponent. Creator sets rules and edit rights."
      }
    ]
  }
];

export const DEFAULT_WORLD_MECHANICS = {
  terrains: [
    {
      key: "forest",
      label: "Forest",
      description: "Terrain covered with Forests.",
      fillType: "image",
      color: "#2f6b45",
      image: DEFAULT_TERRAIN_IMAGES.forest
    },
    {
      key: "water",
      label: "Water",
      description: "Water-filled terrain.",
      fillType: "image",
      color: "#2f5f9e",
      image: DEFAULT_TERRAIN_IMAGES.water
    },
    {
      key: "sand",
      label: "Sand",
      description: "Dry loose terrain.",
      fillType: "image",
      color: "#b68b45",
      image: DEFAULT_TERRAIN_IMAGES.sand
    },
    {
      key: "fire",
      label: "Fire",
      description: "Dangerous burning terrain.",
      fillType: "image",
      color: "#a33a2a",
      image: DEFAULT_TERRAIN_IMAGES.fire
    }
  ],

  counters: [
    {
      key: "main-counter",
      label: "Counter",
      description: "A general number marker placed on pieces or tokens.",
      color: "#e7c97a",
      decreaseLabel: "-1",
      increaseLabel: "+1",

      allowBaseValue: false,
      baseLabel: "Base",
      baseValue: 0,

      allowSetValue: false,
      setLabel: "Set Number",
      setDescription: "Set the counter to an exact value."
    }
  ],

  counter: {
    name: "Counter",
    description: "A general number marker placed on pieces or tokens.",
    decreaseLabel: "-1",
    increaseLabel: "+1",

    allowBaseValue: false,
    baseLabel: "Base",
    baseValue: 0,

    allowSetValue: false,
    setLabel: "Set Number",
    setDescription: "Set the counter to an exact value."
  },

  conditions: [
    {
      key: "blocked",
      label: "Blocked",
      description: "This piece is restricted or disabled.",
      icon: "🚫"
    },
    {
      key: "shielded",
      label: "Shielded",
      description: "This piece has protection.",
      icon: "🛡️"
    },
    {
      key: "poisoned",
      label: "Poisoned",
      description: "This piece is affected by poison.",
      icon: "☠️"
    },
    {
      key: "burning",
      label: "Burning",
      description: "This piece is affected by fire.",
      icon: "🔥"
    }
  ],

  cardDecks: {
    cards: [],
    deckSize: 30,
    startingHandSize: 5,
    allowPlayerDeckBuilding: true
  },

  diceSystem: {
    dice: [{ key: "d6", label: "D6", sides: 6, count: 1 }],
    mode: "fixed",
    allowReroll: false
  },

  timers: {
    mode: "per_turn",
    seconds: 90,
    allowPlayerEdit: false
  },

  objectives: {
    selectionMode: "player_choice",
    items: []
  },

  fogOfWar: {
    revealOwnPieces: true,
    allowPlayerEdit: false,
    defaultFogCells: []
  }
};

export const DEFAULT_CONDITIONS = [
  {
    key: "blocked",
    label: "Blocked",
    icon: "🚫"
  },
  {
    key: "shielded",
    label: "Shielded",
    icon: "🛡️"
  },
  {
    key: "poisoned",
    label: "Poisoned",
    icon: "☠️"
  },
  {
    key: "burning",
    label: "Burning",
    icon: "🔥"
  }
];

export function getConditionDefinition(conditionKey) {
  return DEFAULT_CONDITIONS.find((condition) => condition.key === conditionKey);
}

export const DEFAULT_TERRAINS = [
  {
    key: "neutral",
    label: "Neutral",
    color: ""
  },
  {
    key: "forest",
    label: "Forest",
    color: "#2f6b45"
  },
  {
    key: "water",
    label: "Water",
    color: "#2f5f9e"
  },
  {
    key: "sand",
    label: "Sand",
    color: "#b68b45"
  },
  {
    key: "fire",
    label: "Fire",
    color: "#a33a2a"
  }
];

export function getTerrainDefinition(terrainKey) {
  return DEFAULT_TERRAINS.find((terrain) => terrain.key === terrainKey);
}

export function makeKeyFromLabel(label) {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function createCounterKey(label) {
  return makeKeyFromLabel(label) || `counter-${Date.now()}`;
}

export function normalizeCounterDefinition(counter = {}) {
  const legacyAllowSet = Boolean(counter.allowSetCounter);
  const hasBaseFlag = Object.prototype.hasOwnProperty.call(
    counter,
    "allowBaseValue"
  );
  const hasSetFlag = Object.prototype.hasOwnProperty.call(
    counter,
    "allowSetValue"
  );

  const resolvedBaseLabel = Object.prototype.hasOwnProperty.call(
    counter,
    "baseLabel"
  )
    ? counter.baseLabel
    : hasBaseFlag
      ? "Base"
      : counter.setLabel || "Base";

  return {
    ...counter,
    allowBaseValue: hasBaseFlag
      ? Boolean(counter.allowBaseValue)
      : legacyAllowSet,
    baseLabel: resolvedBaseLabel || "Base",
    baseValue: Number(counter.baseValue ?? counter.initialValue ?? 0),
    allowSetValue: hasSetFlag ? Boolean(counter.allowSetValue) : false,
    setLabel: counter.setLabel || "Set",
    setDescription: counter.setDescription || ""
  };
}

export function getCounterListFromMechanics(worldMechanics) {
  if (Array.isArray(worldMechanics?.counters)) {
    return worldMechanics.counters.map(normalizeCounterDefinition);
  }

  if (worldMechanics?.counter) {
    return [
      normalizeCounterDefinition({
        key: "main-counter",
        label: worldMechanics.counter.name || "Counter",
        description: worldMechanics.counter.description || "",
        color: "#e7c97a",
        decreaseLabel: worldMechanics.counter.decreaseLabel || "-1",
        increaseLabel: worldMechanics.counter.increaseLabel || "+1",
        allowSetCounter: Boolean(worldMechanics.counter.allowSetCounter),
        allowBaseValue: worldMechanics.counter.allowBaseValue,
        baseLabel: worldMechanics.counter.baseLabel,
        baseValue: worldMechanics.counter.baseValue,
        allowSetValue: worldMechanics.counter.allowSetValue,
        setLabel: worldMechanics.counter.setLabel || "Set Number",
        setDescription: worldMechanics.counter.setDescription || "",
        initialValue: Number(worldMechanics.counter.initialValue || 0)
      })
    ];
  }

  return [];
}

export function getCounterDefinitionFromMechanics(worldMechanics, counterKey) {
  return getCounterListFromMechanics(worldMechanics).find(
    (counter) => counter.key === counterKey
  );
}

export function getTerrainDefinitionFromMechanics(worldMechanics, terrainKey) {
  if (terrainKey === "neutral") {
    return {
      key: "neutral",
      label: "Neutral",
      fillType: "color",
      color: "",
      image: ""
    };
  }

  return worldMechanics.terrains.find((terrain) => terrain.key === terrainKey);
}

export function getConditionDefinitionFromMechanics(worldMechanics, conditionKey) {
  return worldMechanics.conditions.find(
    (condition) => condition.key === conditionKey
  );
}

export const DEFAULT_PIECES = [
  {
    key: "king",
    label: "King",
    whiteSymbol: "♔",
    blackSymbol: "♚",
    isRoyal: true
  },
  {
    key: "queen",
    label: "Queen",
    whiteSymbol: "♕",
    blackSymbol: "♛",
    isRoyal: false
  },
  {
    key: "bishop",
    label: "Bishop",
    whiteSymbol: "♗",
    blackSymbol: "♝",
    isRoyal: false
  },
  {
    key: "knight",
    label: "Knight",
    whiteSymbol: "♘",
    blackSymbol: "♞",
    isRoyal: false
  },
  {
    key: "rook",
    label: "Rook",
    whiteSymbol: "♖",
    blackSymbol: "♜",
    isRoyal: false
  },
  {
    key: "pawn",
    label: "Pawn",
    whiteSymbol: "♙",
    blackSymbol: "♟",
    isRoyal: false
  }
];

export const PIECE_TYPES = DEFAULT_PIECES.map((piece) => piece.key);

export function getPieceDefinition(pieceKey) {
  return DEFAULT_PIECES.find((piece) => piece.key === pieceKey);
}

export function createPieceSkinRecord(defaultValue = "") {
  const record = {
    white: {},
    black: {}
  };

  DEFAULT_PIECES.forEach((piece) => {
    record.white[piece.key] = defaultValue;
    record.black[piece.key] = defaultValue;
  });

  return record;
}

export const DEFAULT_PIECE_SKINS = {
  white: {
    king: "/pieces/default/white-king.png",
    queen: "/pieces/default/white-queen.png",
    rook: "/pieces/default/white-rook.png",
    bishop: "/pieces/default/white-bishop.png",
    knight: "/pieces/default/white-knight.png",
    pawn: "/pieces/default/white-pawn.png"
  },
  black: {
    king: "/pieces/default/black-king.png",
    queen: "/pieces/default/black-queen.png",
    rook: "/pieces/default/black-rook.png",
    bishop: "/pieces/default/black-bishop.png",
    knight: "/pieces/default/black-knight.png",
    pawn: "/pieces/default/black-pawn.png"
  }
};

export function createDefaultWorldTheme() {
  return {
    backgroundImage: DEFAULT_BACKGROUND_IMAGE,
    boardSkinImage: DEFAULT_BOARD_SKIN_IMAGE,
    pieceSkins: DEFAULT_PIECE_SKINS,

    characterDisplayMode: "piece-with-portrait"
  };
}

export function getPieceSkin(worldTheme, team, pieceKey) {
  return worldTheme?.pieceSkins?.[team]?.[pieceKey] || "";
}

export function createPieceRecord(defaultValue) {
  const record = {
    white: {},
    black: {}
  };

  DEFAULT_PIECES.forEach((piece) => {
    record.white[piece.key] = defaultValue;
    record.black[piece.key] = defaultValue;
  });

  return record;
}

export function getPieceSymbol(team, pieceKey) {
  const piece = getPieceDefinition(pieceKey);

  if (!piece) return "?";

  return team === "black" ? piece.blackSymbol : piece.whiteSymbol;
}

export const GENERIC_TOKEN_SYMBOL = "✦";

export function humanizeTokenName(tokenName) {
  if (!tokenName) return "Token";

  return tokenName
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function createEmptyCell() {
  return {
    tile: "neutral",
    pieceType: null,
    team: null,
    counter: "",
    counterColor: "neutral",
    conditions: [],
    tokens: []
  };
}

export function createBoardCells() {
  return Array.from(
    { length: BOARD_SIZE * BOARD_SIZE },
    () => createEmptyCell()
  );
}

export function createStandardSetupCells() {
  const cells = createBoardCells();

  const backRank = [
    "rook",
    "knight",
    "bishop",
    "queen",
    "king",
    "bishop",
    "knight",
    "rook"
  ];

  backRank.forEach((pieceType, col) => {
    // Black pieces at the top.
    cells[col].pieceType = pieceType;
    cells[col].team = "black";

    cells[BOARD_SIZE + col].pieceType = "pawn";
    cells[BOARD_SIZE + col].team = "black";

    // White pieces at the bottom.
    cells[BOARD_SIZE * 6 + col].pieceType = "pawn";
    cells[BOARD_SIZE * 6 + col].team = "white";

    cells[BOARD_SIZE * 7 + col].pieceType = pieceType;
    cells[BOARD_SIZE * 7 + col].team = "white";
  });

  return cells;
}
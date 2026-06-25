// **************************************************************
// CHARACTER CSV + CUSTOM FIELD HELPERS
// **************************************************************
//
// Core idea:
// - Every world has core character fields: Name, Description, Cost, Portrait.
// - Creators can add custom fields like Nation, Role, Clan, Colour, CardType.
// - CSV import replaces both the character roster and the custom field list.
// - CSV export lets creators back up/share the current roster as a spreadsheet.

export const CORE_CHARACTER_FIELDS = [
  { key: "name", label: "Name", core: true },
  { key: "description", label: "Description", core: true },
  { key: "cost", label: "Cost", core: true },
  { key: "portrait", label: "Portrait", core: true }
];

const CORE_FIELD_ALIASES = {
  name: ["name", "character", "card", "unit", "piece", "entity"],
  description: ["description", "text", "effect", "rules", "ruletext", "abilitydescription", "ability description", "jutsutext", "jutsu text"],
  cost: ["cost", "mana", "energy", "chakra", "price"],
  portrait: ["portrait", "image", "img", "portraiturl", "portrait url", "imageurl", "image url"],

  // Legacy support. These are not part of the new default template,
  // but older CSV files/worlds may still contain them.
  abilityName: ["ability", "abilityname", "ability name", "technique", "jutsu", "jutsutitle", "jutsu title", "move"],
  tokens: ["tokens", "token", "summons", "entities"]
};

export function normalizeName(value) {
  return String(value || "").trim().toLowerCase();
}

export function createFieldKey(label) {
  const cleanLabel = String(label || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return cleanLabel || `field-${Date.now()}`;
}

export function createDefaultCharacterFields() {
  return CORE_CHARACTER_FIELDS.map((field) => ({ ...field }));
}

export function getCharacterList(characterLibrary) {
  return Array.isArray(characterLibrary)
    ? characterLibrary
    : Object.values(characterLibrary || {});
}

export function getCustomCharacterFields(characterFields = []) {
  const safeFields = Array.isArray(characterFields)
    ? characterFields
    : createDefaultCharacterFields();

  return safeFields.filter((field) => !field.core);
}

export function getSafeCharacterFields(characterFields = []) {
  const incomingFields = Array.isArray(characterFields) ? characterFields : [];
  const customFields = incomingFields.filter((field) => field && !field.core);

  const customFieldKeys = new Set();

  const cleanCustomFields = customFields
    .map((field) => {
      const label = String(field.label || field.key || "Custom Field").trim();
      const key = String(field.key || createFieldKey(label)).trim();

      return {
        key,
        label,
        core: false
      };
    })
    .filter((field) => {
      if (customFieldKeys.has(field.key)) return false;
      customFieldKeys.add(field.key);
      return true;
    });

  return [...createDefaultCharacterFields(), ...cleanCustomFields];
}

function normalizeHeader(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function getCoreFieldFromHeader(header) {
  const normalizedHeader = normalizeHeader(header);

  for (const [coreField, aliases] of Object.entries(CORE_FIELD_ALIASES)) {
    if (aliases.some((alias) => normalizeHeader(alias) === normalizedHeader)) {
      return coreField;
    }
  }

  return null;
}

function parseTokens(value) {
  if (!value) return [];

  return String(value)
    .split(/[|;,]/)
    .map((token) => token.trim())
    .filter(Boolean);
}

function parseCsvRows(csvText) {
  const rows = [];
  let currentRow = [];
  let currentValue = "";
  let isInsideQuotes = false;

  const text = String(csvText || "");

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const nextChar = text[index + 1];

    if (char === '"' && nextChar === '"') {
      currentValue += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      isInsideQuotes = !isInsideQuotes;
      continue;
    }

    if (char === "," && !isInsideQuotes) {
      currentRow.push(currentValue.trim());
      currentValue = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !isInsideQuotes) {
      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }

      currentRow.push(currentValue.trim());

      if (currentRow.some((cell) => String(cell || "").trim())) {
        rows.push(currentRow);
      }

      currentRow = [];
      currentValue = "";
      continue;
    }

    currentValue += char;
  }

  currentRow.push(currentValue.trim());

  if (currentRow.some((cell) => String(cell || "").trim())) {
    rows.push(currentRow);
  }

  return rows;
}

function quoteCsvValue(value) {
  const text = String(value ?? "");

  if (!/[",\n\r]/.test(text)) {
    return text;
  }

  return `"${text.replace(/"/g, '""')}"`;
}

function makeCharacterId(name, index) {
  const cleanName = String(name || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `character-${cleanName || index}`;
}

function getCharacterCustomFields(character) {
  return {
    ...(character?.meta || {}),
    ...(character?.customFields || {})
  };
}

export function buildCharacterImportFromCSV(csvText) {
  const rows = parseCsvRows(csvText);

  if (rows.length < 2) {
    return {
      characterLibrary: [],
      characterFields: createDefaultCharacterFields()
    };
  }

  const headers = rows[0].map((header) => String(header || "").trim());

  const headerMap = headers.map((header) => {
    const coreField = getCoreFieldFromHeader(header);
    const isCustomField = Boolean(header && !coreField);

    return {
      header,
      coreField,
      isCustomField,
      customFieldKey: isCustomField ? createFieldKey(header) : ""
    };
  });

  const customFields = [];
  const usedCustomFieldKeys = new Set();

  headerMap.forEach((headerInfo) => {
    if (!headerInfo.isCustomField) return;
    if (usedCustomFieldKeys.has(headerInfo.customFieldKey)) return;

    usedCustomFieldKeys.add(headerInfo.customFieldKey);

    customFields.push({
      key: headerInfo.customFieldKey,
      label: headerInfo.header,
      core: false
    });
  });

  const characterLibrary = rows
    .slice(1)
    .map((row, rowIndex) => {
      const coreValues = {};
      const customFields = {};

      headerMap.forEach((headerInfo, columnIndex) => {
        const value = String(row[columnIndex] || "").trim();

        if (!headerInfo.header) return;

        if (headerInfo.coreField) {
          coreValues[headerInfo.coreField] = value;
          return;
        }

        if (headerInfo.isCustomField && value) {
          customFields[headerInfo.customFieldKey] = value;
        }
      });

      const name = coreValues.name || `Character ${rowIndex + 1}`;
      const description = coreValues.description || "";
      const abilityName = coreValues.abilityName || "";

      return {
        id: makeCharacterId(name, rowIndex + 1),
        name,
        character: name,

        // New core fields.
        description,
        cost: coreValues.cost || "",
        portrait: coreValues.portrait || "",
        customFields,

        // Legacy fields kept so older Character Card code/worlds still behave.
        ability: abilityName,
        abilityName,
        abilityDescription: description,
        tokens: parseTokens(coreValues.tokens)
      };
    })
    .filter((character) => String(character.name || "").trim());

  return {
    characterLibrary,
    characterFields: [...createDefaultCharacterFields(), ...customFields]
  };
}

export function buildCharacterLibraryFromCSV(csvText) {
  return buildCharacterImportFromCSV(csvText).characterLibrary;
}

export function buildCharacterCsvFromLibrary(characterLibrary, characterFields = []) {
  const safeFields = getSafeCharacterFields(characterFields);
  const customFields = getCustomCharacterFields(safeFields);
  const characters = getCharacterList(characterLibrary);

  const headers = [
    ...CORE_CHARACTER_FIELDS.map((field) => field.label),
    ...customFields.map((field) => field.label)
  ];

  const rows = characters.map((character) => {
    const customFieldValues = getCharacterCustomFields(character);

    return [
      character.name || character.character || "",
      character.description || character.abilityDescription || "",
      character.cost || "",
      character.portrait || "",
      ...customFields.map((field) => customFieldValues[field.key] || "")
    ];
  });

  return [headers, ...rows]
    .map((row) => row.map(quoteCsvValue).join(","))
    .join("\n");
}

export function getCharacterByName(characterLibrary, characterName) {
  if (!characterName) return null;

  const characterList = getCharacterList(characterLibrary);
  const normalizedName = normalizeName(characterName);

  return (
    characterList.find(
      (character) => normalizeName(character.name || character.character) === normalizedName
    ) || null
  );
}

export function getVisibleCharacterCustomFields(character, characterFields = []) {
  const safeFields = getSafeCharacterFields(characterFields);
  const customFieldValues = getCharacterCustomFields(character);

  return getCustomCharacterFields(safeFields)
    .map((field) => ({
      ...field,
      value: customFieldValues[field.key] || ""
    }))
    .filter((field) => String(field.value || "").trim());
}

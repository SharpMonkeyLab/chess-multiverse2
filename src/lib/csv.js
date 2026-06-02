export function normalizeName(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function splitCsvLine(line) {
  const values = [];
  let currentValue = "";
  let insideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const nextCharacter = line[index + 1];

    if (character === '"' && nextCharacter === '"') {
      currentValue += '"';
      index += 1;
      continue;
    }

    if (character === '"') {
      insideQuotes = !insideQuotes;
      continue;
    }

    if (character === "," && !insideQuotes) {
      values.push(currentValue.trim());
      currentValue = "";
      continue;
    }

    currentValue += character;
  }

  values.push(currentValue.trim());

  return values;
}

function parseCsv(text) {
  const lines = String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) return [];

  const headers = splitCsvLine(lines[0]).map((header) =>
    normalizeName(header)
  );

  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line);
    const row = {};

    headers.forEach((header, index) => {
      row[header] = values[index] || "";
    });

    return row;
  });
}

function parseTokens(value) {
  if (!value) return [];

  return String(value)
    .split(/[|;,]/)
    .map((token) => token.trim())
    .filter(Boolean);
}

export function buildCharacterLibraryFromCSV(csvText) {
  const rows = parseCsv(csvText);

  return rows
    .map((row, index) => {
      const name = row.character || row.name || `Character ${index + 1}`;
      const abilityName = row.ability || row.abilityname || "";
      const abilityDescription =
        row.description ||
        row.abilitydescription ||
        row["ability description"] ||
        "";

      return {
        id: `character-${normalizeName(name) || index}`,
        name,
        character: name,

        ability: abilityName,
        abilityName,

        description: abilityDescription,
        abilityDescription,

        cost: row.cost || "",
        portrait: row.portrait || "",
        tokens: parseTokens(row.tokens)
      };
    })
    .filter((character) => character.name);
}

export function getCharacterByName(characterLibrary, characterName) {
  if (!characterName) return null;

  const characterList = Array.isArray(characterLibrary)
    ? characterLibrary
    : Object.values(characterLibrary || {});

  const normalizedName = normalizeName(characterName);

  return (
    characterList.find(
      (character) => normalizeName(character.name) === normalizedName
    ) || null
  );
}
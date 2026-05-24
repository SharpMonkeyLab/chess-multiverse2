export function normalizeName(name) {
    return name.trim().toLowerCase();
}

export function parseCSV(text) {
    const rows = [];
    let currentRow = [];
    let currentValue = "";
    let insideQuotes = false;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const nextChar = text[i + 1];

        if (char === '"' && insideQuotes && nextChar === '"') {
            currentValue += '"';
            i++;
        } else if (char === '"') {
            insideQuotes = !insideQuotes;
        } else if (char === "," && !insideQuotes) {
            currentRow.push(currentValue.trim());
            currentValue = "";
        } else if ((char === "\n" || char === "\r") && !insideQuotes) {
            if (currentValue || currentRow.length > 0) {
                currentRow.push(currentValue.trim());
                rows.push(currentRow);
                currentRow = [];
                currentValue = "";
            }

            if (char === "\r" && nextChar === "\n") {
                i++;
            }
        } else {
            currentValue += char;
        }
    }

    if (currentValue || currentRow.length > 0) {
        currentRow.push(currentValue.trim());
        rows.push(currentRow);
    }

    return rows;
}

export function buildCharacterLibraryFromCSV(csvText) {
    const rows = parseCSV(csvText);

    if (rows.length < 2) {
        return {};
    }

    const headers = rows[0].map((header) => normalizeName(header));

    const characterIndex = headers.indexOf("character");
    const abilityIndex = headers.indexOf("ability");
    const descriptionIndex = headers.indexOf("description");
    const costIndex = headers.indexOf("cost");
    const portraitIndex = headers.indexOf("portrait");
    const tokensIndex = headers.indexOf("tokens");

    if (characterIndex === -1 || abilityIndex === -1 || descriptionIndex === -1) {
        return {};
    }

    const characterLibrary = {};

    rows.slice(1).forEach((row) => {
        const characterName = row[characterIndex]?.trim();

        if (!characterName) return;

        const tokenText = tokensIndex !== -1 ? row[tokensIndex]?.trim() || "" : "";

        characterLibrary[normalizeName(characterName)] = {
            name: characterName,
            ability: row[abilityIndex]?.trim() || "",
            description: row[descriptionIndex]?.trim() || "",
            cost: costIndex !== -1 ? row[costIndex]?.trim() || "" : "",
            portrait: portraitIndex !== -1 ? row[portraitIndex]?.trim() || "" : "",
            tokens: tokenText
                ? tokenText.split("|").map((token) => token.trim()).filter(Boolean)
                : []
        };
    });

    return characterLibrary;
}

export function getCharacterByName(characterLibrary, characterName) {
    if (!characterName) return null;

    return characterLibrary[normalizeName(characterName)] || null;
}
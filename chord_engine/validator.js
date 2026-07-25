// chord_engine/validator.js

// Matches valid chords including extensions: C, C#m, Dmaj7, Esus4, F#dim, G7/B
const CHORD_REGEX = /^(DO|RE|MI|FA|SOL|LA|SI|[CDEFGAB])(#|b)?(m|min|maj|M|aug|dim)?(7|9|11|13|sus2|sus4|add9)?(\/[CDEFGAB](#|b)?)?$/i;

export function isValidChord(token) {
    return CHORD_REGEX.test(token.trim());
}

export function normalizeChord(token) {
    const match = token.trim().match(/^([A-G][#b]?)(m)?/i);
    if (match) {
        let root = match[1];
        root = root.charAt(0).toUpperCase() + (root.length > 1 ? root.substring(1).toLowerCase() : '');
        const isMinor = match[2] ? 'm' : '';
        return root + isMinor; // Basic normalization for key detection
    }
    return token;
}

export function hasFormattingIssues(text) {
    const warnings = [];
    if (text.includes('\t')) {
        warnings.push("La canción contiene tabulaciones, lo cual puede afectar el renderizado. Se recomienda usar espacios.");
    }
    if (/\r\n/.test(text) && /[^\r]\n/.test(text)) {
        warnings.push("Se detectaron múltiples formatos de salto de línea (mezcla de Windows/Linux).");
    }
    return warnings;
}

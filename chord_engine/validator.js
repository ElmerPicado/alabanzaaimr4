// chord_engine/validator.js

// Matches valid chords including extensions: C, C#m, Dmaj7, Esus4, F#dim, G7/B, DO, RE, SOLm
const CHORD_REGEX = /^(DO|RE|MI|FA|SOL|LA|SI|[CDEFGAB])(#|b)?(m|min|maj|M|aug|dim)?(7|9|11|13|sus2|sus4|add9)?(\/(DO|RE|MI|FA|SOL|LA|SI|[CDEFGAB])(#|b)?)?$/i;

const SPANISH_TO_ENGLISH = {
    'DO': 'C', 'RE': 'D', 'MI': 'E', 'FA': 'F', 'SOL': 'G', 'LA': 'A', 'SI': 'B'
};

export function isValidChord(token) {
    return CHORD_REGEX.test(token.trim());
}

export function normalizeChord(token) {
    let cleaned = token.trim();
    
    // Check Spanish roots first
    const spanishMatch = cleaned.match(/^(DO|RE|MI|FA|SOL|LA|SI)(#|b)?(m)?/i);
    if (spanishMatch) {
        let root = SPANISH_TO_ENGLISH[spanishMatch[1].toUpperCase()];
        let acc = spanishMatch[2] || '';
        let isMinor = spanishMatch[3] ? 'm' : '';
        return root + acc + isMinor;
    }

    const match = cleaned.match(/^([A-G][#b]?)(m)?/i);
    if (match) {
        let root = match[1];
        root = root.charAt(0).toUpperCase() + (root.length > 1 ? root.substring(1).toLowerCase() : '');
        const isMinor = match[2] ? 'm' : '';
        return root + isMinor;
    }
    return token;
}

export function convertSpanishChordsToEnglish(text) {
    if (!text) return "";
    const lines = text.split(/\r?\n/);
    return lines.map(line => {
        const tokens = line.trim().split(/\s+/).filter(t => t.length > 0);
        if (tokens.length === 0) return line;
        
        let validCount = 0;
        tokens.forEach(t => {
            if (isValidChord(t)) validCount++;
        });
        
        // Convert only lines that are primarily chord lines
        if (validCount / tokens.length > 0.5) {
            return line.replace(/\b(DO|RE|MI|FA|SOL|LA|SI)(#|b)?(m|min|maj|M|aug|dim)?(7|9|11|13|sus2|sus4|add9)?\b/gi, (match, root, acc, qual, ext) => {
                const normRoot = SPANISH_TO_ENGLISH[root.toUpperCase()] || root;
                return normRoot + (acc || '') + (qual || '') + (ext || '');
            });
        }
        return line;
    }).join('\n');
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

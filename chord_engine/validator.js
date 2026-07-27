// chord_engine/validator.js

// Matches valid chords including extensions and power chords:
// Simple:     C, Cm, C#, Db
// Quality:    Cmaj7, Cmin, Cdim, Caug, CM
// Extensions: C2, C4, C5, C6, C7, C9, C11, C13
// Compounds:  Cmaj7, Cmaj9, Cadd9, Cadd11, Csus2, Csus4, C6/9
// Minor ext:  Cm7, Bm7, Bm9, Bm11
// Slash:      C/E, D/F#, G/B, Bm/D
const CHORD_REGEX = /^(DO|RE|MI|FA|SOL|LA|SI|[CDEFGAB])(#|b)?(m(?:aj|in)?|M|aug|dim)?(maj(?:7|9|11|13)|add(?:9|11|13)|sus[24]|6\/9|[2-9]|1[013])?(\/(DO|RE|MI|FA|SOL|LA|SI|[CDEFGAB])(#|b)?)?$/;

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

    // Case-sensitive: only lowercase 'm' indicates minor; 'M' is explicit Major (not minor)
    const match = cleaned.match(/^([A-G][#b]?)(m(?:aj|in)?|dim|aug)?/);
    if (match) {
        let root = match[1];
        root = root.charAt(0).toUpperCase() + (root.length > 1 ? root.substring(1).toLowerCase() : '');
        // Only flag as minor if quality starts with lowercase 'm' but isn't 'maj' or 'min' (those are major-family)
        const quality = match[2] || '';
        const isMinor = (quality === 'm' || quality === 'min' || quality === 'dim') ? 'm' : '';
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

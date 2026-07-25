// chord_engine/progression_analyzer.js
import { normalizeChord } from './validator.js';

// Absolute scales to determine intervals
const SCALES = {
    'C': ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'],
    // We'll use sharp notes internally for interval distances
};

const SHARPS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLATS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

function getNoteIndex(note) {
    let root = note.replace(/m$/, '');
    let index = SHARPS.indexOf(root);
    if (index === -1) index = FLATS.indexOf(root);
    return index;
}

export function toRomanNumerals(chord, key) {
    if (!chord || !key) return "";
    
    const rootNote = normalizeChord(chord).replace(/m$/, '');
    const isMinorChord = chord.includes('m') && !chord.includes('maj');
    
    const keyRoot = key.replace(/m$/, '');
    const isMinorKey = key.endsWith('m');

    const keyIndex = getNoteIndex(keyRoot);
    const chordIndex = getNoteIndex(rootNote);

    if (keyIndex === -1 || chordIndex === -1) return chord; // fallback

    let interval = (chordIndex - keyIndex + 12) % 12;

    // Major Key Mapping
    const majorMap = {
        0: 'I', 2: 'II', 4: 'III', 5: 'IV', 7: 'V', 9: 'VI', 11: 'VII',
        1: 'bII', 3: 'bIII', 6: 'bV', 8: 'bVI', 10: 'bVII'
    };

    // Minor Key Mapping (Aeolian)
    const minorMap = {
        0: 'i', 2: 'ii', 3: 'III', 5: 'iv', 7: 'v', 8: 'VI', 10: 'VII',
        1: 'bII', 4: 'III#', 6: 'bV', 9: 'vi', 11: 'vii' // Variations
    };

    let numeral = isMinorKey ? minorMap[interval] : majorMap[interval];
    
    if (!numeral) numeral = "?";

    // Adjust case based on chord quality
    if (isMinorChord) {
        numeral = numeral.toLowerCase();
    } else {
        numeral = numeral.toUpperCase();
    }

    return numeral;
}

export function extractProgression(chords, key) {
    return chords.map(c => toRomanNumerals(c, key)).join(' - ');
}

export function parseChordToken(token) {
    // Regex to capture: Root, Quality, Extension, Bass
    // e.g. C#m7/G#
    const regex = /^([CDEFGAB][#b]?)(m|min|maj|M|aug|dim)?(7|9|11|13|sus2|sus4|add9)?(\/[CDEFGAB][#b]?)?$/i;
    const match = token.trim().match(regex);
    
    if (!match) {
        return { original: token, root: token, quality: 'major', extension: null, bass: null };
    }

    let root = match[1];
    root = root.charAt(0).toUpperCase() + (root.length > 1 ? root.substring(1).toLowerCase() : '');
    
    let rawQuality = (match[2] || '').toLowerCase();
    let quality = 'major';
    if (rawQuality === 'm' || rawQuality === 'min') quality = 'minor';
    else if (rawQuality === 'dim') quality = 'diminished';
    else if (rawQuality === 'aug') quality = 'augmented';

    let extension = match[3] || null;
    let bass = match[4] ? match[4].substring(1) : null;
    if (bass) {
        bass = bass.charAt(0).toUpperCase() + (bass.length > 1 ? bass.substring(1).toLowerCase() : '');
    }

    return {
        original: token,
        root: root,
        quality: quality,
        extension: extension,
        bass: bass
    };
}

export function getDetailedChords(sections, key) {
    const detailed = [];
    sections.forEach(sec => {
        sec.lines.forEach(item => {
            if (item.chords) {
                item.chords.forEach(c => {
                    const parsed = parseChordToken(c.chord);
                    // Add roman
                    parsed.roman = toRomanNumerals(c.chord, key);
                    // Add position
                    parsed.section = sec.header;
                    parsed.lineIndex = c.lineIndex;
                    parsed.charIndex = c.charIndex;
                    
                    detailed.push(parsed);
                });
            }
        });
    });
    return detailed;
}

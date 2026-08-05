// chord_engine/progression_analyzer.js
import { normalizeChord } from './validator.js';

const SHARPS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLATS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

export function getNoteIndex(note) {
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

    if (keyIndex === -1 || chordIndex === -1) return chord; 

    let interval = (chordIndex - keyIndex + 12) % 12;

    const majorMap = {
        0: 'I', 2: 'ii', 4: 'iii', 5: 'IV', 7: 'V', 9: 'vi', 11: 'vii°',
        1: 'bII', 3: 'bIII', 6: 'bV', 8: 'bVI', 10: 'bVII'
    };

    const minorMap = {
        0: 'i', 2: 'ii°', 3: 'III', 5: 'iv', 7: 'v', 8: 'VI', 10: 'VII',
        1: 'bII', 4: 'III#', 6: 'bV', 9: 'vi', 11: 'vii°' 
    };

    // More precise mappings for borrowed chords and secondary dominants
    let numeral = "";
    let isOverride = false;
    if (!isMinorKey) {
        if (interval === 2 && !isMinorChord) { numeral = 'II'; isOverride = true; } // V/V
        else if (interval === 4 && !isMinorChord) { numeral = 'III'; isOverride = true; } // V/vi
        else if (interval === 9 && !isMinorChord) { numeral = 'VI'; isOverride = true; } // V/ii
        else if (interval === 5 && isMinorChord) { numeral = 'iv'; isOverride = true; } // borrowed
        else numeral = majorMap[interval];
    } else {
        if (interval === 7 && !isMinorChord) { numeral = 'V'; isOverride = true; } // harmonic minor
        else if (interval === 5 && !isMinorChord) { numeral = 'IV'; isOverride = true; } // dorian
        else numeral = minorMap[interval];
    }
    
    if (!numeral) numeral = majorMap[interval] || "?";

    // Enforce case if the map didn't strictly match the quality
    if (!isOverride) {
        if (isMinorChord) {
            numeral = numeral.toLowerCase();
        } else {
            numeral = numeral.toUpperCase();
        }
    }

    return numeral;
}

export function extractProgression(chords, key) {
    return chords.map(c => toRomanNumerals(c, key)).join(' - ');
}

export function detectCadences(romanSeq) {
    let score = 0;
    const seqStr = romanSeq.join(' ');
    
    let scores = [0];
    
    // Perfect authentic cadence (PAC/IAC)
    if (seqStr.match(/\bV I\b/) || seqStr.match(/\bv i\b/) || seqStr.match(/\bV i\b/)) scores.push(3.0);
    
    // Plagal cadence
    if (seqStr.match(/\bIV I\b/) || seqStr.match(/\biv i\b/) || seqStr.match(/\biv I\b/)) scores.push(2.0);

    // Deceptive cadence
    if (seqStr.match(/\bV vi\b/) || seqStr.match(/\bV VI\b/)) scores.push(1.0);

    // Half cadence
    if (seqStr.endsWith(' V') || seqStr.endsWith(' v')) scores.push(1.5);

    return Math.max(...scores);
}

export function matchCommonProgressions(romanSeqStr) {
    let scores = [0];
    
    // Four chord pop
    if (romanSeqStr.includes('I V vi IV')) scores.push(5.0);
    if (romanSeqStr.includes('vi IV I V')) scores.push(5.0);
    if (romanSeqStr.includes('I vi IV V')) scores.push(5.0);
    if (romanSeqStr.includes('IV I V vi')) scores.push(5.0);
    
    // Minor progressions
    if (romanSeqStr.includes('i VI III VII')) scores.push(5.0);
    if (romanSeqStr.includes('i VII III VI')) scores.push(4.0); // Eq to vi V I IV
    if (romanSeqStr.includes('III VI i VII')) scores.push(4.0); // Eq to I IV vi V
    if (romanSeqStr.includes('VI VII i')) scores.push(3.0);
    
    // Worship specific
    if (romanSeqStr.includes('IV V vi')) scores.push(3.0);
    if (romanSeqStr.includes('I IV vi V')) scores.push(4.0);
    if (romanSeqStr.includes('ii V I')) scores.push(3.0);
    
    return Math.max(...scores);
}

export function parseChordToken(token) {
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

    return { original: token, root, quality, extension, bass };
}

export function getDetailedChords(sections, key) {
    const detailed = [];
    sections.forEach(sec => {
        sec.lines.forEach(item => {
            if (item.chords) {
                item.chords.forEach(c => {
                    const parsed = parseChordToken(c.chord);
                    parsed.roman = toRomanNumerals(c.chord, key);
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

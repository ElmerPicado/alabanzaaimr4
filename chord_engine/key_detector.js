// chord_engine/key_detector.js
import { normalizeChord } from './validator.js';

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const ENHARMONIC_MAP = {
    'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#',
    'Dbm': 'C#m', 'Ebm': 'D#m', 'Gbm': 'F#m', 'Abm': 'G#m', 'Bbm': 'A#m',
    'Cb': 'B', 'Fb': 'E'
};

function enharmonic(chord) {
    let root = chord.replace(/maj7|m7|7|sus4|sus2|dim|aug/gi, '');
    return ENHARMONIC_MAP[root] || root;
}

export function detectKey(chords) {
    if (!chords || chords.length === 0) {
        return [{ key: 'C', confidence: 0, mode: 'Mayor', explanation: 'No chords found' }];
    }

    const normalizedSequence = chords.map(normalizeChord).map(enharmonic);
    const chordsData = chords.map(c => {
        const norm = enharmonic(normalizeChord(c));
        const isMinor = c.includes('m') && !c.includes('maj');
        return { root: norm, isMinor };
    });

    const candidates = [];

    for (let i = 0; i < 12; i++) {
        const majorKey = NOTES[i];
        const minorKey = NOTES[i] + 'm';

        candidates.push(evaluateKey(majorKey, false, chordsData));
        candidates.push(evaluateKey(minorKey, true, chordsData));
    }

    // Sort by score descending
    candidates.sort((a, b) => b.score - a.score);

    // Calculate confidence for top candidate keys
    // Base max score is relative to sequence length + potential bonuses
    const maxScore = chordsData.length * 1.8 + 12.0;

    return candidates.slice(0, 5).map(c => {
        let conf = Math.round((c.score / maxScore) * 100);
        conf = Math.min(100, Math.max(0, conf));
        
        // If a classic progression is matched, give a guaranteed high confidence
        if (c.progressionMatch && conf > 50) {
            conf = Math.max(conf, 96);
        }

        return {
            key: c.key,
            mode: c.mode,
            confidence: conf
        };
    });
}

function evaluateKey(keyName, isMinorKey, chordsData) {
    const keyRoot = keyName.replace(/m$/, '');
    const keyRootIdx = NOTES.indexOf(keyRoot);

    let score = 0;
    let diatonicCount = 0;

    // Track presence of scale degrees for tonic/dominant relationships
    let hasTonic = false;
    let hasDominant = false; 
    let hasSubdominant = false;

    chordsData.forEach(c => {
        const chordIdx = NOTES.indexOf(c.root.replace(/m$/, ''));
        if (chordIdx === -1) return;

        const interval = (chordIdx - keyRootIdx + 12) % 12;
        let chordScore = 0;
        let isDiatonic = false;

        if (!isMinorKey) {
            // Major Key Intervals
            switch (interval) {
                case 0: // I (Tonic)
                    if (!c.isMinor) { chordScore = 2.0; isDiatonic = true; hasTonic = true; }
                    break;
                case 2: // ii (diatonic) or II (Secondary Dominant V/V)
                    if (c.isMinor) { chordScore = 1.0; isDiatonic = true; }
                    else { chordScore = 0.8; } 
                    break;
                case 4: // iii (diatonic) or III (Secondary Dominant V/vi)
                    if (c.isMinor) { chordScore = 1.0; isDiatonic = true; }
                    else { chordScore = 0.6; } 
                    break;
                case 5: // IV (diatonic) or iv (modal interchange minor subdominant)
                    if (!c.isMinor) { chordScore = 1.2; isDiatonic = true; hasSubdominant = true; }
                    else { chordScore = 0.9; hasSubdominant = true; } 
                    break;
                case 7: // V (diatonic) or vm (Mixolydian modal interchange minor v - e.g. F#m in B Major)
                    if (!c.isMinor) { chordScore = 1.5; isDiatonic = true; hasDominant = true; }
                    else { chordScore = 1.1; hasDominant = true; } 
                    break;
                case 9: // vi (diatonic) or VI (Secondary Dominant V/ii)
                    if (c.isMinor) { chordScore = 1.0; isDiatonic = true; }
                    else { chordScore = 0.8; } 
                    break;
                case 11: // vii°
                    chordScore = 0.5;
                    isDiatonic = true; 
                    break;
                case 10: // bVII (Mixolydian modal interchange)
                    if (!c.isMinor) { chordScore = 0.9; } 
                    break;
                case 3: // bIII
                    if (!c.isMinor) { chordScore = 0.8; }
                    break;
                case 8: // bVI
                    if (!c.isMinor) { chordScore = 0.8; }
                    break;
            }
        } else {
            // Minor Key Intervals
            switch (interval) {
                case 0: // i (Tonic)
                    if (c.isMinor) { chordScore = 2.0; isDiatonic = true; hasTonic = true; }
                    else { chordScore = 0.6; } 
                    break;
                case 2: // ii° or ii
                    chordScore = 0.6;
                    isDiatonic = true;
                    break;
                case 3: // III (Relative Major)
                    if (!c.isMinor) { chordScore = 1.2; isDiatonic = true; }
                    break;
                case 5: // iv (diatonic) or IV (Dorian major subdominant)
                    if (c.isMinor) { chordScore = 1.2; isDiatonic = true; hasSubdominant = true; }
                    else { chordScore = 0.8; hasSubdominant = true; } 
                    break;
                case 7: // v (diatonic minor) or V (harmonic minor dominant)
                    if (c.isMinor) { chordScore = 1.2; isDiatonic = true; hasDominant = true; }
                    else { chordScore = 1.5; isDiatonic = true; hasDominant = true; } 
                    break;
                case 8: // VI
                    if (!c.isMinor) { chordScore = 1.0; isDiatonic = true; }
                    break;
                case 10: // VII
                    if (!c.isMinor) { chordScore = 1.0; isDiatonic = true; }
                    break;
            }
        }

        score += chordScore;
        if (isDiatonic) diatonicCount++;
    });

    // 1. Tonic-Dominant Relationship Bonus (I <-> V or vm)
    if (hasTonic && hasDominant) {
        score += 3.0;
    }

    // 2. Tonic-Subdominant Relationship Bonus (I <-> IV or iv)
    if (hasTonic && hasSubdominant) {
        score += 1.5;
    }

    // 3. Cadence weight
    const firstChord = chordsData[0];
    const lastChord = chordsData[chordsData.length - 1];
    if (firstChord && firstChord.root === keyRoot && firstChord.isMinor === isMinorKey) score += 1.0;
    if (lastChord && lastChord.root === keyRoot && lastChord.isMinor === isMinorKey) score += 1.5;

    // 4. Progression Pattern Matching
    // Convert current sequence to simplified roman representation
    const romanSeq = chordsData.map(c => {
        const chordIdx = NOTES.indexOf(c.root.replace(/m$/, ''));
        const interval = (chordIdx - keyRootIdx + 12) % 12;
        if (!isMinorKey) {
            if (interval === 0 && !c.isMinor) return 'I';
            if (interval === 7) return 'V'; // Accept major V or minor v
            if (interval === 9 && c.isMinor) return 'vi';
            if (interval === 5) return 'IV'; // Accept major IV or minor iv
        }
        return '';
    });

    const romanStr = romanSeq.filter(Boolean).join('-');
    let progressionMatch = false;
    if (romanStr.includes('I-V-vi-IV') || 
        romanStr.includes('I-vi-V-IV') || 
        romanStr.includes('vi-IV-I-V')) {
        score += 5.0;
        progressionMatch = true;
    }

    return {
        key: keyName,
        mode: isMinorKey ? 'Menor' : 'Mayor',
        score: score,
        diatonicMatches: diatonicCount,
        progressionMatch: progressionMatch
    };
}

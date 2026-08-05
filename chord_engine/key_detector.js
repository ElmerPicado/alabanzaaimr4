// chord_engine/key_detector.js
import { normalizeChord } from './validator.js';
import { toRomanNumerals, detectCadences, matchCommonProgressions, getNoteIndex } from './progression_analyzer.js';

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

export function detectKey(sections, options = { debug: false }) {
    let allChordsData = [];
    
    // Extract chords from sections
    sections.forEach(sec => {
        let secChords = [];
        sec.lines.forEach(item => {
            if (item.chords) {
                item.chords.forEach(c => {
                    const norm = enharmonic(normalizeChord(c.chord));
                    const isMinor = c.chord.includes('m') && !c.chord.includes('maj');
                    secChords.push({ original: c.chord, root: norm, isMinor });
                });
            }
        });
        sec.extractedChords = secChords;
        allChordsData = allChordsData.concat(secChords);
    });

    if (allChordsData.length === 0) {
        return [{ key: 'C', confidence: 0, mode: 'Mayor', explanation: 'No chords found' }];
    }

    const candidates = [];

    // Evaluate all 24 keys
    for (let i = 0; i < 12; i++) {
        const majorKey = NOTES[i];
        const minorKey = NOTES[i] + 'm';

        candidates.push(evaluateTonalCenter(majorKey, false, sections, allChordsData));
        candidates.push(evaluateTonalCenter(minorKey, true, sections, allChordsData));
    }

    // Sort by Total Score descending
    candidates.sort((a, b) => b.totalScore - a.totalScore);

    const topCandidateScore = candidates[0].totalScore;
    
    return candidates.slice(0, 5).map(c => {
        // Dynamic confidence calculation based on top score relation and absolute strength
        let conf = 0;
        if (topCandidateScore > 0) {
             conf = (c.totalScore / topCandidateScore) * 100;
             // Scale it down a bit based on absolute max expectation if we want, but relative is good for now.
             // We can use a baseline: a good song usually scores > 20 points.
             const maxExpected = Math.max(topCandidateScore, allChordsData.length * 2.5);
             conf = (c.totalScore / maxExpected) * 100;
        }
        
        conf = Math.round(Math.min(100, Math.max(0, conf)));
        
        if (c.progressionScore >= 5.0 && conf > 50) {
            conf = Math.max(conf, 96); // Force high confidence on exact match
        }

        const result = {
            key: c.key,
            mode: c.mode,
            confidence: conf
        };
        
        if (options.debug) {
            result.debugInfo = c.debug;
        }
        
        return result;
    });
}

function evaluateTonalCenter(keyName, isMinorKey, sections, allChordsData) {
    let diatonicScore = 0;
    let tonalCenterScore = 0;
    let progressionScore = 0;
    let cadenceScore = 0;

    const keyRoot = keyName.replace(/m$/, '');
    
    // 1. Calculate Roman Numerals for all chords
    const romanSeq = allChordsData.map(c => toRomanNumerals(c.original, keyName));
    
    // 2. Base Diatonic & Function Score
    romanSeq.forEach(r => {
        if (['I', 'i'].includes(r)) diatonicScore += 2.0;
        else if (['IV', 'iv', 'V', 'v'].includes(r)) diatonicScore += 1.5;
        else if (['ii', 'vi', 'III', 'VI'].includes(r)) diatonicScore += 1.0;
        else if (['II', 'III', 'VI'].includes(r)) diatonicScore += 0.8; // Secondary dominants
        else if (r !== '?') diatonicScore += 0.5; // Other recognized borrowed chords
    });

    // 3. Cadence Detection
    cadenceScore = detectCadences(romanSeq);

    // 4. Progression Match
    progressionScore = matchCommonProgressions(romanSeq.join(' '));

    // 5. Structure & Tonal Center gravity
    sections.forEach(sec => {
        if (sec.extractedChords.length === 0) return;
        
        const firstChord = sec.extractedChords[0];
        const lastChord = sec.extractedChords[sec.extractedChords.length - 1];
        
        const header = (sec.header || '').toLowerCase();
        let weight = 1.0;
        if (header.includes('coro')) weight = 2.0;
        else if (header.includes('outro') || header.includes('final')) weight = 1.5;
        else if (header.includes('verso')) weight = 1.2;
        
        if (firstChord.root === keyRoot && firstChord.isMinor === isMinorKey) {
            tonalCenterScore += (1.0 * weight);
        }
        if (lastChord.root === keyRoot && lastChord.isMinor === isMinorKey) {
            tonalCenterScore += (2.0 * weight); // Endings resolve strongly
        }
    });

    const totalScore = diatonicScore + tonalCenterScore + progressionScore + cadenceScore;

    return {
        key: keyName,
        mode: isMinorKey ? 'Menor' : 'Mayor',
        totalScore,
        progressionScore,
        debug: {
            diatonicScore,
            tonalCenterScore,
            cadenceScore,
            progressionScore
        }
    };
}

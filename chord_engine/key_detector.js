// chord_engine/key_detector.js
import { normalizeChord } from './validator.js';

const ENHARMONIC_MAP = {
    'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#',
    'Dbm': 'C#m', 'Ebm': 'D#m', 'Gbm': 'F#m', 'Abm': 'G#m', 'Bbm': 'A#m',
    'Cb': 'B', 'Fb': 'E'
};

const KEYS = {
    'C': ['C','Dm','Em','F','G','Am','Bdim'], 'G': ['G','Am','Bm','C','D','Em','F#dim'], 'D': ['D','Em','F#m','G','A','Bm','C#dim'],
    'A': ['A','Bm','C#m','D','E','F#m','G#dim'], 'E': ['E','F#m','G#m','A','B','C#m','D#dim'], 'B': ['B','C#m','D#m','E','F#','G#m','A#dim'],
    'F#': ['F#','G#m','A#m','B','C#','D#m','E#dim'], 'F': ['F','Gm','Am','A#','C','Dm','Edim'], 'A#': ['A#','Cm','Dm','D#','F','Gm','Adim'],
    'D#': ['D#','Fm','Gm','G#','A#','Cm','Ddim'], 'G#': ['G#','A#m','Cm','C#','D#','Fm','Gdim'], 'C#': ['C#','D#m','Fm','F#','G#','A#m','Cdim'],
    'Am': ['Am','Bdim','C','Dm','Em','F','G'], 'Em': ['Em','F#dim','G','Am','Bm','C','D'], 'Bm': ['Bm','C#dim','D','Em','F#m','G','A'],
    'F#m': ['F#m','G#dim','A','Bm','C#m','D','E'], 'C#m': ['C#m','D#dim','E','F#m','G#m','A','B'], 'G#m': ['G#m','A#dim','B','C#m','D#m','E','F#'],
    'D#m': ['D#m','E#dim','F#','G#m','A#m','B','C#'], 'Dm': ['Dm','Edim','F','Gm','Am','A#','C'], 'Gm': ['Gm','Adim','A#','Cm','Dm','D#','F'],
    'Cm': ['Cm','Ddim','D#','Fm','Gm','G#','A#'], 'Fm': ['Fm','Gdim','G#','A#m','Cm','C#','D#'], 'A#m': ['A#m','Cdim','C#','D#m','Fm','F#','G#']
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
    const freq = {};
    normalizedSequence.forEach(c => freq[c] = (freq[c] || 0) + 1);

    const firstChord = normalizedSequence[0];
    const lastChord = normalizedSequence[normalizedSequence.length - 1];
    
    let candidates = [];

    for (const [keyName, diatonic] of Object.entries(KEYS)) {
        let score = 0;
        const isMinor = keyName.endsWith('m');
        
        const I = diatonic[0]; 
        const ii = diatonic[1];
        const IV = diatonic[3]; 
        const V = diatonic[4];
        const vi = diatonic[5];

        // Borrowed chords definitions for Major keys
        const borrowed = isMinor ? [] : [
            ENHARMONIC_MAP[diatonic[6].replace('dim','')] || diatonic[6].replace('dim',''), // bVII roughly (actually bVII is one whole step down from I)
            diatonic[3] + 'm', // IVm
            I + '7', // V/IV
            diatonic[5].replace('m','') // V/ii or VI major
        ];
        
        // Let's refine bVII correctly: it's the root of 'vi' but major? No, for C it's Bb. Which is the 7th of minor.
        if (!isMinor) {
            borrowed.push(diatonic[6].replace('dim', '')); // For C, Bdim -> B. Wait, bVII for C is Bb. So this is not bVII.
            // A more robust way to define bVII is to just look for the relative major of the parallel minor. We will just award 0.5 points for non-diatonic chords that aren't total nonsense.
        }

        let diatonicMatches = 0;
        normalizedSequence.forEach(c => { 
            if (diatonic.includes(c)) {
                score += 1;
                diatonicMatches++;
            } else if (!isMinor && (c === IV + 'm' || c === I + '7' || c === vi.replace('m', ''))) {
                // Common borrowed chords: minor subdominant, secondary dominants
                score += 0.5; // Slight penalty but recognized
            }
        });

        // Harmonic Function Weighting
        if (freq[I]) score += freq[I] * 1.5; // Harmonic Center
        if (freq[IV]) score += freq[IV] * 0.8;
        if (freq[V]) score += freq[V] * 1.0;

        // V-I Resolutions (Strongest indicator)
        for (let i = 0; i < normalizedSequence.length - 1; i++) {
            if (normalizedSequence[i] === V && normalizedSequence[i+1] === I) {
                score += 3; // Huge bonus for perfect cadences
            }
        }

        // First/Last Chord (Reduced weight from 5 to 2)
        if (firstChord === I) score += 2;
        if (lastChord === I) score += 3;

        candidates.push({
            key: keyName,
            mode: isMinor ? 'Menor' : 'Mayor',
            score: score,
            diatonicMatches: diatonicMatches
        });
    }

    candidates.sort((a, b) => b.score - a.score);

    // Calculate confidence based on the top candidate's theoretical max
    const maxScore = normalizedSequence.length + (normalizedSequence.length * 1.5) + 6 + 5;
    
    return candidates.slice(0, 5).map(c => {
        let conf = Math.round((c.score / maxScore) * 100);
        return {
            key: c.key,
            mode: c.mode,
            confidence: Math.min(100, Math.max(0, conf))
        };
    });
}

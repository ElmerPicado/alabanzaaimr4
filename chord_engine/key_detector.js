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

export function getRelativeKey(keyName) {
    if (!keyName) return keyName;
    const isMinor = keyName.endsWith('m');
    const keyRoot = keyName.replace(/m$/, '');
    let rootIdx = getNoteIndex(keyRoot);
    if (rootIdx === -1) rootIdx = NOTES.indexOf(keyRoot);
    if (rootIdx === -1) return keyName;

    const flatRoots = ['Db', 'Eb', 'Gb', 'Ab', 'Bb'];
    const isFlat = flatRoots.includes(keyRoot) || ['Dbm', 'Ebm', 'Gbm', 'Abm', 'Bbm'].includes(keyName);

    if (!isMinor) {
        // Major -> relative minor = scale degree VI (+9 semitones)
        const relIdx = (rootIdx + 9) % 12;
        let relRoot = NOTES[relIdx];
        if (isFlat) {
            const flatMap = { 'C#': 'Db', 'D#': 'Eb', 'F#': 'Gb', 'G#': 'Ab', 'A#': 'Bb' };
            if (flatMap[relRoot]) relRoot = flatMap[relRoot];
        }
        return relRoot + 'm';
    } else {
        // Minor -> relative major = scale degree III (+3 semitones)
        const relIdx = (rootIdx + 3) % 12;
        let relRoot = NOTES[relIdx];
        if (isFlat) {
            const flatMap = { 'C#': 'Db', 'D#': 'Eb', 'F#': 'Gb', 'G#': 'Ab', 'A#': 'Bb' };
            if (flatMap[relRoot]) relRoot = flatMap[relRoot];
        }
        return relRoot;
    }
}

function evaluateRelativeEvidence(candidate, sections, allChordsData) {
    if (!candidate || !allChordsData || allChordsData.length === 0) {
        return {
            key: candidate ? candidate.key : '',
            evidenceScore: candidate ? candidate.totalScore : 0,
            evidence: {
                startChord: null,
                endChord: null,
                tonicFrequency: 0,
                cadenceEvidence: 0,
                harmonicFunction: candidate ? candidate.totalScore : 0
            }
        };
    }

    const keyName = candidate.key;
    const isMinorKey = candidate.mode === 'Menor';
    const keyRoot = keyName.replace(/m$/, '');
    const keyPitch = getNoteIndex(keyRoot);

    let startScore = 0;
    let endScore = 0;
    let tonicFrequency = 0;
    let cadenceEvidence = 0;

    // A. Chord Frequency
    allChordsData.forEach(c => {
        const cPitch = getNoteIndex(c.root.replace(/m$/, ''));
        if (cPitch === keyPitch && c.isMinor === isMinorKey) {
            tonicFrequency++;
        }
    });

    const totalChords = allChordsData.length;
    const freqRatio = tonicFrequency / totalChords;
    const freqScore = freqRatio * 10.0;

    // B & C. Starting & Ending Chords (Global & Sections)
    const globalFirst = allChordsData[0];
    const globalLast = allChordsData[allChordsData.length - 1];

    if (getNoteIndex(globalFirst.root.replace(/m$/, '')) === keyPitch && globalFirst.isMinor === isMinorKey) {
        startScore += 3.0;
    }
    if (getNoteIndex(globalLast.root.replace(/m$/, '')) === keyPitch && globalLast.isMinor === isMinorKey) {
        endScore += 5.0;
    }

    sections.forEach(sec => {
        if (!sec.extractedChords || sec.extractedChords.length === 0) return;
        const secFirst = sec.extractedChords[0];
        const secLast = sec.extractedChords[sec.extractedChords.length - 1];

        const header = (sec.header || '').toLowerCase();
        let weight = 1.0;
        if (header.includes('coro') || header.includes('chorus')) weight = 2.0;
        else if (header.includes('outro') || header.includes('final')) weight = 1.5;
        else if (header.includes('verso') || header.includes('verse')) weight = 1.2;

        if (getNoteIndex(secFirst.root.replace(/m$/, '')) === keyPitch && secFirst.isMinor === isMinorKey) {
            startScore += (1.5 * weight);
        }
        if (getNoteIndex(secLast.root.replace(/m$/, '')) === keyPitch && secLast.isMinor === isMinorKey) {
            endScore += (3.0 * weight);
        }
    });

    // D. Resolution / Cadence Movement into Tonic
    for (let i = 0; i < allChordsData.length - 1; i++) {
        const c1 = allChordsData[i];
        const c2 = allChordsData[i + 1];
        const c2Pitch = getNoteIndex(c2.root.replace(/m$/, ''));

        if (c2Pitch === keyPitch && c2.isMinor === isMinorKey) {
            const c1Pitch = getNoteIndex(c1.root.replace(/m$/, ''));
            const interval = (c1Pitch - keyPitch + 12) % 12;

            if (isMinorKey) {
                // Dominant / subdominant / leading tone resolutions into minor tonic
                if ([7, 10, 8, 5, 2].includes(interval)) cadenceEvidence += 2.0;
                else cadenceEvidence += 1.0;
            } else {
                // Dominant / subdominant / relative resolutions into major tonic
                if ([7, 5, 9, 2].includes(interval)) cadenceEvidence += 2.0;
                else cadenceEvidence += 1.0;
            }
        }
    }

    // E. Combine scores
    const harmonicFunction = candidate.totalScore;
    const evidenceScore = harmonicFunction + startScore + endScore + freqScore + cadenceEvidence;

    return {
        key: keyName,
        evidenceScore,
        evidence: {
            startChord: globalFirst ? globalFirst.original : null,
            endChord: globalLast ? globalLast.original : null,
            tonicFrequency,
            cadenceEvidence,
            harmonicFunction
        }
    };
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

    // Sort initial candidates by Total Score descending (Initial Detector Result)
    candidates.sort((a, b) => b.totalScore - a.totalScore);

    // --- ADDITIONAL ANALYSIS LAYER: Relative Major/Minor Tonal Center Comparison ---
    if (candidates.length > 0) {
        const initialTopCandidate = candidates[0];
        const relativeKeyName = getRelativeKey(initialTopCandidate.key);
        const relPitch = getNoteIndex(relativeKeyName.replace(/m$/, ''));
        const relIsMinor = relativeKeyName.endsWith('m');

        const relCandidateIndex = candidates.findIndex(c => {
            const cPitch = getNoteIndex(c.key.replace(/m$/, ''));
            const cIsMinor = c.mode === 'Menor';
            return cPitch === relPitch && cIsMinor === relIsMinor;
        });

        if (relCandidateIndex !== -1) {
            const relCandidate = candidates[relCandidateIndex];
            const primaryEv = evaluateRelativeEvidence(initialTopCandidate, sections, allChordsData);
            const relEv = evaluateRelativeEvidence(relCandidate, sections, allChordsData);

            const scoreDiff = Math.abs(primaryEv.evidenceScore - relEv.evidenceScore);
            const isAmbiguous = scoreDiff < 3.5;

            // If relative key has stronger evidence score, promote relative key to top position
            if (relEv.evidenceScore > primaryEv.evidenceScore) {
                // Move relative candidate to front
                candidates.splice(relCandidateIndex, 1);
                candidates.unshift(relCandidate);

                relCandidate.relativeAnalysis = {
                    detectedKey: initialTopCandidate.key,
                    relativeKey: relativeKeyName,
                    detectedScore: Math.round(primaryEv.evidenceScore * 100) / 100,
                    relativeScore: Math.round(relEv.evidenceScore * 100) / 100,
                    ambiguity: isAmbiguous,
                    evidence: relEv.evidence
                };
            } else {
                initialTopCandidate.relativeAnalysis = {
                    detectedKey: initialTopCandidate.key,
                    relativeKey: relativeKeyName,
                    detectedScore: Math.round(primaryEv.evidenceScore * 100) / 100,
                    relativeScore: Math.round(relEv.evidenceScore * 100) / 100,
                    ambiguity: isAmbiguous,
                    evidence: primaryEv.evidence
                };
            }
        }
    }

    const topCandidateScore = candidates[0].totalScore;
    
    return candidates.slice(0, 5).map(c => {
        // Dynamic confidence calculation based on top score relation and absolute strength
        let conf = 0;
        if (topCandidateScore > 0) {
             conf = (c.totalScore / topCandidateScore) * 100;
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

        if (c.relativeAnalysis) {
            result.relativeAnalysis = c.relativeAnalysis;
        }
        
        if (options.debug) {
            result.debugInfo = {
                ...c.debug,
                relativeAnalysis: c.relativeAnalysis || null
            };
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
        else if (['IV', 'iv', 'V', 'v', 'vi', 'III'].includes(r)) diatonicScore += 1.5;
        else if (['ii', 'ii°', 'iii', 'vii°', 'VI', 'VII'].includes(r)) diatonicScore += 1.0;
        else if (['II', 'III#'].includes(r)) diatonicScore += 0.8; // Secondary dominants / variations
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
        
        const firstRoot = firstChord.root.replace(/m$/, '');
        const lastRoot = lastChord.root.replace(/m$/, '');

        if (firstRoot === keyRoot && firstChord.isMinor === isMinorKey) {
            tonalCenterScore += (1.0 * weight);
        }
        if (lastRoot === keyRoot && lastChord.isMinor === isMinorKey) {
            tonalCenterScore += (2.0 * weight); // Endings resolve strongly
        }
    });

    // 6. Global First & Last Chord Resolution Gravity
    if (allChordsData.length > 0) {
        const globalFirst = allChordsData[0];
        const globalLast = allChordsData[allChordsData.length - 1];
        
        const firstRoot = globalFirst.root.replace(/m$/, '');
        const lastRoot = globalLast.root.replace(/m$/, '');

        if (firstRoot === keyRoot && globalFirst.isMinor === isMinorKey) {
            tonalCenterScore += 2.0;
        }
        if (lastRoot === keyRoot && globalLast.isMinor === isMinorKey) {
            tonalCenterScore += 4.0;
        }
    }

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


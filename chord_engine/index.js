// chord_engine/index.js
import { parseSong, LINE_TYPES } from './parser.js';
import { detectSections } from './section_detector.js';
import { detectKey } from './key_detector.js';
import { extractProgression, getDetailedChords } from './progression_analyzer.js';
import { hasFormattingIssues } from './validator.js';
import { buildJson } from './json_builder.js';

export class ChordReviewEngine {
    static analyze(text) {
        if (!text || text.trim() === '') {
            throw new Error("Cannot analyze empty lyrics.");
        }

        // 1. Parsing
        const parsedLines = parseSong(text);
        
        // 2. Section Detection & Deduplication
        const sections = detectSections(parsedLines);
        
        // 3. Extract all chords for analysis
        const allChords = [];
        parsedLines.forEach(item => {
            if (item.type === LINE_TYPES.CHORD_LINE || item.type === 'CHORD_LYRIC_PAIR') {
                if (item.chords) {
                    item.chords.forEach(c => allChords.push(c.chord));
                }
            }
        });

        // 4. Validation & Formatting warnings
        const warnings = hasFormattingIssues(text);

        // 5. Key Detection (Returns an array of candidates)
        const possibleKeys = detectKey(allChords);
        const topKey = possibleKeys[0].key;

        // 6. Harmonic Progression Analysis
        const progression = extractProgression(allChords, topKey);
        const detailedChords = getDetailedChords(sections, topKey);

        // 7. Build JSON Structure
        const chordData = buildJson(sections, possibleKeys, allChords, progression, detailedChords, warnings);

        return {
            chordData: chordData,
            rawText: text // We never modify the original text
        };
    }
}

// Expose globally for index.html
window.ChordReviewEngine = ChordReviewEngine;

// chord_engine/parser.js
import { isValidChord } from './validator.js';

export const LINE_TYPES = {
    EMPTY_LINE: 'EMPTY_LINE',
    CHORD_LINE: 'CHORD_LINE',
    LYRIC_LINE: 'LYRIC_LINE',
    SECTION_HEADER: 'SECTION_HEADER'
};

export function parseSong(text) {
    const lines = text.split(/\r?\n/);
    const parsedLines = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        if (trimmed.length === 0) {
            parsedLines.push({ type: LINE_TYPES.EMPTY_LINE, content: line });
            continue;
        }

        // Check if it's a section header
        if (isSectionHeader(trimmed)) {
            parsedLines.push({ type: LINE_TYPES.SECTION_HEADER, content: trimmed });
            continue;
        }

        // Check if it's a chord line
        if (isChordLine(line)) {
            parsedLines.push({ 
                type: LINE_TYPES.CHORD_LINE, 
                content: line, 
                chords: extractChords(line, i) 
            });
            continue;
        }

        parsedLines.push({ type: LINE_TYPES.LYRIC_LINE, content: line, lineIndex: i });
    }

    return associateChordsWithLyrics(parsedLines);
}

function isSectionHeader(trimmedLine) {
    // Matches common headers like "Verso 1:", "[Coro]", "Bridge:"
    const lower = trimmedLine.toLowerCase();
    if (lower.startsWith('[') && lower.endsWith(']')) return true;
    if (trimmedLine.endsWith(':')) return true;
    const commonHeaders = ['verso', 'coro', 'puente', 'intro', 'outro', 'pre-coro', 'interludio'];
    return commonHeaders.some(h => lower.startsWith(h) && trimmedLine.length < 30);
}

function isChordLine(line) {
    const trimmed = line.trim();
    // Ignore guitar tab diagram lines (e.g. "E 0 2 2 1 0", "A | 0 2 2 0", "X 3 2 0 1 0")
    if (/\b[0-9xX]\s+[0-9xX]\s+[0-9xX]\b/.test(trimmed)) return false;
    if (/^(?:[eadbge]|acordes|tab)\s*[:|\/]/i.test(trimmed)) return false;

    const tokens = trimmed.split(/\s+/).filter(t => t.length > 0);
    if (tokens.length === 0) return false;
    
    let validCount = 0;
    for (const token of tokens) {
        if (isValidChord(token)) validCount++;
    }
    
    // If more than 60% of the words are chords, it's a chord line
    return (validCount / tokens.length) > 0.6;
}

function extractChords(line, lineIndex) {
    const chords = [];
    const regex = /\S+/g;
    let match;
    while ((match = regex.exec(line)) !== null) {
        if (isValidChord(match[0])) {
            chords.push({ 
                chord: match[0], 
                charIndex: match.index,
                lineIndex: lineIndex
            });
        }
    }
    return chords;
}

function associateChordsWithLyrics(parsedLines) {
    const result = [];
    for (let i = 0; i < parsedLines.length; i++) {
        const current = parsedLines[i];
        
        if (current.type === LINE_TYPES.CHORD_LINE) {
            // Peek next line
            const next = (i + 1 < parsedLines.length) ? parsedLines[i + 1] : null;
            if (next && next.type === LINE_TYPES.LYRIC_LINE) {
                // Combine them
                result.push({
                    type: 'CHORD_LYRIC_PAIR',
                    chordLine: current.content,
                    lyricLine: next.content,
                    chords: current.chords
                });
                i++; // Skip the lyric line
            } else {
                result.push(current);
            }
        } else {
            result.push(current);
        }
    }
    return result;
}

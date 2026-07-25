// chord_engine/section_detector.js
import { LINE_TYPES } from './parser.js';

export function detectSections(parsedLines) {
    const sections = [];
    let currentSection = { header: null, lines: [] };
    let defaultHeaderCounter = 1;

    for (const item of parsedLines) {
        if (item.type === LINE_TYPES.SECTION_HEADER) {
            // Close current section if it has content
            if (currentSection.lines.length > 0) {
                if (!currentSection.header) {
                    currentSection.header = `Sección ${defaultHeaderCounter++}`;
                }
                sections.push(currentSection);
            }
            currentSection = { header: item.content, lines: [] };
        } else if (item.type === LINE_TYPES.EMPTY_LINE) {
            // Empty line can also act as a section delimiter if the current section has content
            if (currentSection.lines.length > 0) {
                if (!currentSection.header) {
                    currentSection.header = `Sección ${defaultHeaderCounter++}`;
                }
                sections.push(currentSection);
                currentSection = { header: null, lines: [] };
            }
        } else {
            currentSection.lines.push(item);
        }
    }

    // Push the last section
    if (currentSection.lines.length > 0) {
        if (!currentSection.header) {
            currentSection.header = `Sección ${defaultHeaderCounter++}`;
        }
        sections.push(currentSection);
    }

    return markRepetitions(sections);
}

function calculateSimilarity(str1, str2) {
    // Simple similarity based on words
    const words1 = str1.toLowerCase().replace(/[^\w\sñáéíóú]/gi, '').split(/\s+/).filter(Boolean);
    const words2 = str2.toLowerCase().replace(/[^\w\sñáéíóú]/gi, '').split(/\s+/).filter(Boolean);
    
    if (words1.length === 0 || words2.length === 0) return 0;
    
    let matches = 0;
    const set2 = new Set(words2);
    for (const w of words1) {
        if (set2.has(w)) matches++;
    }
    
    return matches / Math.max(words1.length, words2.length);
}

function extractLyricsFromSection(section) {
    let lyrics = '';
    for (const line of section.lines) {
        if (line.type === 'CHORD_LYRIC_PAIR') {
            lyrics += line.lyricLine + ' ';
        } else if (line.type === LINE_TYPES.LYRIC_LINE) {
            lyrics += line.content + ' ';
        }
    }
    return lyrics;
}

function markRepetitions(sections) {
    const processed = [];
    
    for (let i = 0; i < sections.length; i++) {
        const sec = sections[i];
        const secLyrics = extractLyricsFromSection(sec);
        
        let foundMatch = false;
        
        if (secLyrics.trim().length > 10) {
            for (let j = 0; j < i; j++) {
                const prevSec = sections[j];
                const prevLyrics = extractLyricsFromSection(prevSec);
                
                if (prevLyrics.trim().length > 10) {
                    const similarity = calculateSimilarity(secLyrics, prevLyrics);
                    if (similarity >= 0.85) {
                        sec.isRepetition = true;
                        sec.repeatedFrom = prevSec.header;
                        foundMatch = true;
                        break;
                    }
                }
            }
        }
        
        if (!foundMatch) {
            sec.isRepetition = false;
        }
        
        processed.push(sec);
    }
    
    return processed;
}

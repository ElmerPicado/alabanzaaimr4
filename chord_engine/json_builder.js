// chord_engine/json_builder.js

export function buildJson(parsedSections, possibleKeys, allChords, progression, detailedChords, warnings) {
    return {
        engineVersion: '1.1.0',
        metadata: {
            analyzedAt: new Date().toISOString()
        },
        possibleKeys: possibleKeys,
        harmonicAnalysis: {
            chordsUsed: Array.from(new Set(allChords)), // Unique chords
            progression: progression,
            detailedChords: detailedChords
        },
        structure: {
            sections: parsedSections.map(s => ({
                header: s.header,
                isRepetition: s.isRepetition,
                repeatedFrom: s.repeatedFrom || null,
                lineCount: s.lines.length
            }))
        },
        warnings: warnings
    };
}

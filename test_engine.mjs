import { ChordReviewEngine } from './chord_engine/index.js';

const song = `
B
Sabes que te amo
G#m
Sabes que yo quiero
F#m
Conocerte más
E
Mucho más que antes
`;

try {
    const result = ChordReviewEngine.analyze(song);
    console.log("Top detected key:", result.chordData.possibleKeys[0]);
    console.log("All possible keys:", result.chordData.possibleKeys);
} catch (e) {
    console.error(e);
}

import { ChordReviewEngine } from './chord_engine/index.js';

const song = `
Intro:
G D Em C

Verso 1:
G               D
Dios es grande, Dios es fuerte
Em              C
Más que todo lo que existe

Coro:
G               D
Toda la gloria y la honra
Em              C
Sean para siempre al Rey
`;

try {
    const result = ChordReviewEngine.analyze(song);
    console.log(JSON.stringify(result.chordData, null, 2));
} catch (e) {
    console.error(e);
}

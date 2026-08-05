import { ChordReviewEngine } from '../chord_engine/index.js';
import fs from 'fs';

const song = `
G  Bm7             C              D
 A Cristo, solo a Cristo yo exaltaré.

G  Bm7             C             D
 A Cristo, solo a Cristo yo adoraré.

Am7                           D
  Porque El me ha dado vida eterna.

Am7                          D
  Porque El me ha dado el poder.

Am7                          D
  Porque El me ha dado la victoria.

          G F#m Em7 Am7       Bm7   C D   G  G/B
El es mi Rey.     A Cristo he proclamado Rey.
`;

try {
    const result = ChordReviewEngine.analyze(song);
    const output = `TOP DETECTED KEY:\n${JSON.stringify(result.chordData.possibleKeys[0], null, 2)}\n\nALL DETECTED KEYS:\n${JSON.stringify(result.chordData.possibleKeys, null, 2)}`;
    fs.writeFileSync('scratch/check_output.txt', output);
    console.log("Analysis complete. Written to scratch/check_output.txt");
} catch (e) {
    fs.writeFileSync('scratch/check_output.txt', `ERROR: ${e.stack || e}`);
}

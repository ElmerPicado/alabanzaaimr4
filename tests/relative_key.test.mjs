import assert from 'assert';
import { ChordReviewEngine } from '../chord_engine/index.js';
import { getRelativeKey, detectKey } from '../chord_engine/key_detector.js';
import { parseSong } from '../chord_engine/parser.js';
import { detectSections } from '../chord_engine/section_detector.js';

console.log('--- RUNNING RELATIVE KEY ANALYSIS TESTS ---');

// 1. Test getRelativeKey helper for all 12 key pairs
const pairs = [
    { major: 'F', minor: 'Dm' },
    { major: 'C', minor: 'Am' },
    { major: 'G', minor: 'Em' },
    { major: 'D', minor: 'Bm' },
    { major: 'A', minor: 'F#m' },
    { major: 'E', minor: 'C#m' },
    { major: 'B', minor: 'G#m' },
    { major: 'Bb', minor: 'Gm' },
    { major: 'Eb', minor: 'Cm' },
    { major: 'Ab', minor: 'Fm' },
    { major: 'Db', minor: 'Bbm' },
    { major: 'Gb', minor: 'Ebm' }
];

pairs.forEach(({ major, minor }) => {
    const relOfMajor = getRelativeKey(major);
    const relOfMinor = getRelativeKey(minor);
    console.log(`Checking Relative Pair: ${major} ↔ ${minor} (got Major->${relOfMajor}, Minor->${relOfMinor})`);
    assert.strictEqual(relOfMajor, minor, `Relative minor of ${major} should be ${minor}`);
    assert.strictEqual(relOfMinor, major, `Relative major of ${minor} should be ${major}`);
});

// 2. Test Dm - Bb - F - C progression -> should resolve to Dm
const textDm = `
[Verso]
Dm Bb F C
Dm Bb F C
[Coro]
Dm Bb F C
`;

const resultDm = ChordReviewEngine.analyze(textDm);
const topKeyDm = resultDm.chordData.possibleKeys[0];
console.log('\n--- Dm - Bb - F - C Analysis ---');
console.log('Detected Top Key:', topKeyDm.key, topKeyDm.mode, `(${topKeyDm.confidence}%)`);
console.log('Relative Analysis:', JSON.stringify(topKeyDm.relativeAnalysis, null, 2));

assert.strictEqual(topKeyDm.key, 'Dm', 'Key for Dm-Bb-F-C should be Dm');
assert.strictEqual(topKeyDm.mode, 'Menor', 'Mode should be Menor');
assert.ok(topKeyDm.relativeAnalysis, 'relativeAnalysis object should be present');
assert.strictEqual(topKeyDm.relativeAnalysis.relativeKey, 'F', 'Relative key should be F');

// 3. Test F - C - Dm - Bb progression -> should resolve to F Major
const textF = `
[Verso]
F C Dm Bb
F C Dm Bb
[Coro]
F C Dm Bb
`;

const resultF = ChordReviewEngine.analyze(textF);
const topKeyF = resultF.chordData.possibleKeys[0];
console.log('\n--- F - C - Dm - Bb Analysis ---');
console.log('Detected Top Key:', topKeyF.key, topKeyF.mode, `(${topKeyF.confidence}%)`);
console.log('Relative Analysis:', JSON.stringify(topKeyF.relativeAnalysis, null, 2));

assert.strictEqual(topKeyF.key, 'F', 'Key for F-C-Dm-Bb should be F');
assert.strictEqual(topKeyF.mode, 'Mayor', 'Mode should be Mayor');
assert.ok(topKeyF.relativeAnalysis, 'relativeAnalysis object should be present');
assert.strictEqual(topKeyF.relativeAnalysis.relativeKey, 'Dm', 'Relative key should be Dm');

// 4. Test Am - F - C - G progression -> should resolve to Am
const textAm = `
[Verso]
Am F C G
Am F C G
`;
const resultAm = ChordReviewEngine.analyze(textAm);
const topKeyAm = resultAm.chordData.possibleKeys[0];
console.log('\n--- Am - F - C - G Analysis ---');
console.log('Detected Top Key:', topKeyAm.key, topKeyAm.mode);
assert.strictEqual(topKeyAm.key, 'Am', 'Key for Am-F-C-G should be Am');

console.log('\n✅ ALL RELATIVE KEY ANALYSIS TESTS PASSED!');

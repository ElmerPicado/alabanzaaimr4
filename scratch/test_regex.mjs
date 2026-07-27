// scratch/test_regex.mjs  —  run with: node scratch/test_regex.mjs
const CHORD_REGEX = /^(DO|RE|MI|FA|SOL|LA|SI|[CDEFGAB])(#|b)?(m(?:aj|in)?|M|aug|dim)?(maj(?:7|9|11|13)|add(?:9|11|13)|sus[24]|6\/9|[2-9]|1[013])?(\/(DO|RE|MI|FA|SOL|LA|SI|[CDEFGAB])(#|b)?)?$/;

const tests = [
  // — from the song —
  ['D',       true],
  ['D2',      true],
  ['D5',      true],
  ['G',       true],
  ['A',       true],
  ['Bm',      true],
  ['Bm7',     true],
  // — full required list —
  ['D4',      true],
  ['D6',      true],
  ['D7',      true],
  ['D9',      true],
  ['D11',     true],
  ['D13',     true],
  ['Dadd9',   true],
  ['Dmaj7',   true],
  ['Dmaj9',   true],
  ['Dsus2',   true],
  ['Dsus4',   true],
  ['D6/9',    true],
  ['D/F#',    true],
  ['Bm9',     true],
  ['Bm11',    true],
  ['G5',      true],
  ['A5',      true],
  ['E5',      true],
  ['C5',      true],
  // — sanity: common chords —
  ['C',       true],
  ['Cm',      true],
  ['C#m',     true],
  ['F#',      true],
  ['Gb',      true],
  ['Am7',     true],
  ['Gsus4',   true],
  ['Cadd9',   true],
  ['Fmaj7',   true],
  ['Em',      true],
  // — should NOT match (lyrics words / garbage) —
  ['Hello',   false],
  ['the',     false],
  ['123',     false],
  ['D12',     false],   // 12 is not a valid extension in our set
];

console.log('=== Chord Parser Regex Validation ===\n');
let passed = 0, failed = 0;
for (const [chord, expected] of tests) {
  const result = CHORD_REGEX.test(chord);
  const ok = result === expected;
  if (ok) passed++; else failed++;
  const icon = ok ? '✅' : '❌';
  const validity = result ? 'VALID  ' : 'invalid';
  const note = ok ? '' : `  ← expected ${expected ? 'VALID' : 'invalid'}`;
  console.log(`${icon}  ${chord.padEnd(10)} →  ${validity}${note}`);
}

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed === 0) console.log('All tests passed! 🎉');

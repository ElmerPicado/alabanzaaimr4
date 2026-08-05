import { toRomanNumerals } from './chord_engine/progression_analyzer.js';

const chords = ['Am', 'F', 'E', 'Am', 'Am', 'Dm', 'E', 'Am'];

console.log("--- EVALUATING A MINOR (Am) ---");
chords.forEach(c => {
    console.log(`${c} in Am -> ${toRomanNumerals(c, 'Am')}`);
});

console.log("\n--- EVALUATING D MINOR (Dm) ---");
chords.forEach(c => {
    console.log(`${c} in Dm -> ${toRomanNumerals(c, 'Dm')}`);
});

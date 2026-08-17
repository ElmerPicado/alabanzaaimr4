import fs from 'fs';

const html = fs.readFileSync('index.html', 'utf-8');
const lines = html.split('\n');

console.log("🔍 Buscando tryFirebaseLogin o signInWithEmailAndPassword en index.html actual...");
let found = 0;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('signInWithEmailAndPassword') && lines[i].includes('auth')) {
    console.log(`Línea ${i + 1}:`);
    for (let j = Math.max(0, i - 10); j < Math.min(lines.length, i + 15); j++) {
      console.log(`  ${j + 1}: ${lines[j]}`);
    }
    found++;
    if (found > 3) break;
  }
}
process.exit(0);

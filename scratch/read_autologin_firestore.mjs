import fs from 'fs';

const html = fs.readFileSync('index.html', 'utf-8');
const lines = html.split('\n');

console.log("🔍 Líneas 11435 a 11470 de index.html...");
for (let i = 11435; i < Math.min(lines.length, 11470); i++) {
  console.log(`${i + 1}: ${lines[i]}`);
}
process.exit(0);

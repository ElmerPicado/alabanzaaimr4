import fs from 'fs';

const html = fs.readFileSync('index.html', 'utf-8');
const lines = html.split('\n');

console.log("🔍 Líneas 6125 a 6160 de index.html...");
for (let i = 6125; i < Math.min(lines.length, 6160); i++) {
  console.log(`${i + 1}: ${lines[i]}`);
}
process.exit(0);

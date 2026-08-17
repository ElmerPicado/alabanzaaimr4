import fs from 'fs';

const html = fs.readFileSync('index.html', 'utf-8');
const lines = html.split('\n');

console.log("🔍 Líneas 9540 a 9560 de index.html...");
for (let i = 9539; i < Math.min(lines.length, 9560); i++) {
  console.log(`${i + 1}: ${lines[i]}`);
}
process.exit(0);

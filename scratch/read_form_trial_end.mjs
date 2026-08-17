import fs from 'fs';

const html = fs.readFileSync('index.html', 'utf-8');
const lines = html.split('\n');

console.log("🔍 Líneas 12430 a 12500 de index.html...");
for (let i = 12430; i < Math.min(lines.length, 12500); i++) {
  console.log(`${i + 1}: ${lines[i]}`);
}
process.exit(0);

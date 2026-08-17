import fs from 'fs';

const html = fs.readFileSync('index.html', 'utf-8');
const lines = html.split('\n');

console.log("🔍 Líneas 12350 a 12430 de index.html...");
for (let i = 12350; i < Math.min(lines.length, 12430); i++) {
  console.log(`${i + 1}: ${lines[i]}`);
}
process.exit(0);

import fs from 'fs';

const html = fs.readFileSync('index.html', 'utf-8');
const lines = html.split('\n');

console.log("🔍 Líneas 5970 a 6010 de index.html...");
for (let i = 5970; i < Math.min(lines.length, 6010); i++) {
  console.log(`${i + 1}: ${lines[i]}`);
}
process.exit(0);

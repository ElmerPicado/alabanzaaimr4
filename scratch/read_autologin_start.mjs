import fs from 'fs';

const html = fs.readFileSync('index.html', 'utf-8');
const lines = html.split('\n');

console.log("🔍 Líneas 11400 a 11440 de index.html...");
for (let i = 11400; i < Math.min(lines.length, 11440); i++) {
  console.log(`${i + 1}: ${lines[i]}`);
}
process.exit(0);

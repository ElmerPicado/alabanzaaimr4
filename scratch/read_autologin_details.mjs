import fs from 'fs';

const html = fs.readFileSync('index.html', 'utf-8');
const lines = html.split('\n');

console.log("🔍 Líneas 11220 a 11270 de index.html...");
for (let i = 11220; i < Math.min(lines.length, 11270); i++) {
  console.log(`${i + 1}: ${lines[i]}`);
}
process.exit(0);

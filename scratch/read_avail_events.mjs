import fs from 'fs';

const html = fs.readFileSync('index.html', 'utf-8');
const lines = html.split('\n');

console.log("🔍 Líneas 7620 a 7650 de index.html...");
for (let i = 7619; i < Math.min(lines.length, 7650); i++) {
  console.log(`${i + 1}: ${lines[i]}`);
}
process.exit(0);

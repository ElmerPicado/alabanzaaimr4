import fs from 'fs';

const html = fs.readFileSync('index.html', 'utf-8');
const lines = html.split('\n');

console.log("🔍 Líneas 2640 a 2655 de index.html (CSS nav-tabs)...");
for (let i = 2640; i < Math.min(lines.length, 2655); i++) {
  console.log(`${i + 1}: ${lines[i]}`);
}
process.exit(0);

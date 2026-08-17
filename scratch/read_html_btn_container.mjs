import fs from 'fs';

const html = fs.readFileSync('index.html', 'utf-8');
const lines = html.split('\n');

console.log("🔍 HTML alrededor de btn-musico-panel (líneas 4550 a 4600)...");
for (let i = 4550; i < Math.min(lines.length, 4600); i++) {
  console.log(`${i + 1}: ${lines[i]}`);
}
process.exit(0);

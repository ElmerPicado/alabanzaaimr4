import fs from 'fs';

const html = fs.readFileSync('index.html', 'utf-8');
const lines = html.split('\n');

console.log("🔍 Declaraciones globales (líneas 5790 a 5825)...");
for (let i = 5790; i < Math.min(lines.length, 5825); i++) {
  console.log(`${i + 1}: ${lines[i]}`);
}
process.exit(0);

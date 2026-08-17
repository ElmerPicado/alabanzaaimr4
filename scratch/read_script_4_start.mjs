import fs from 'fs';

const html = fs.readFileSync('index.html', 'utf-8');
const lines = html.split('\n');

console.log("🔍 Primeras líneas de script #4 (líneas 11870 a 11900)...");
for (let i = 11870; i < Math.min(lines.length, 11900); i++) {
  console.log(`${i + 1}: ${lines[i]}`);
}
process.exit(0);

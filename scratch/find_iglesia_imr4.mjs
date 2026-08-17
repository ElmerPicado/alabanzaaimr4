import fs from 'fs';

const html = fs.readFileSync('index.html', 'utf-8');
const lines = html.split('\n');

console.log("🔍 Buscando 'iglesia-imr4' en index.html...");

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('iglesia-imr4')) {
    console.log(`Línea ${i + 1}: ${lines[i].trim()}`);
  }
}
process.exit(0);

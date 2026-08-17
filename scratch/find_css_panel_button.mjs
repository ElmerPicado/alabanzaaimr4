import fs from 'fs';

const html = fs.readFileSync('index.html', 'utf-8');
const lines = html.split('\n');

console.log("🔍 Buscando #btn-musico-panel en el CSS...");

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('#btn-musico-panel') && !lines[i].includes('document.getElementById')) {
    console.log(`Línea ${i + 1}: ${lines[i].trim()}`);
  }
}
process.exit(0);

import fs from 'fs';

const html = fs.readFileSync('index.html', 'utf-8');
const lines = html.split('\n');

console.log("🔍 Buscando btn-avail-confirm en index.html...");
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('btn-avail-confirm')) {
    console.log(`Línea ${i + 1}: ${lines[i].trim()}`);
  }
}

console.log("\n🔍 Buscando btn-avail-decline...");
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('btn-avail-decline')) {
    console.log(`Línea ${i + 1}: ${lines[i].trim()}`);
  }
}
process.exit(0);

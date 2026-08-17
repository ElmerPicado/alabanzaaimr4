import fs from 'fs';

const html = fs.readFileSync('index.html', 'utf-8');
const lines = html.split('\n');

console.log("🔍 Buscando sección de Landing Page en index.html...");
let found = false;
let printed = 0;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('class="landing-page"') || lines[i].includes('id="screen-landing"') || lines[i].includes('Explora el Repertorio Global')) {
    found = true;
    console.log(`Línea ${i + 1}:`);
    for (let j = Math.max(0, i - 10); j < Math.min(lines.length, i + 80); j++) {
      console.log(`  ${j + 1}: ${lines[j]}`);
    }
    break;
  }
}
process.exit(0);

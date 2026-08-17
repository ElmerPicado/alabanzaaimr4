import fs from 'fs';

const html = fs.readFileSync('index.html', 'utf-8');
const lines = html.split('\n');

console.log("🔍 Buscando todos los tags <script> en index.html...");
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('<script')) {
    console.log(`Línea ${i + 1}: ${lines[i].trim()}`);
  }
}
process.exit(0);

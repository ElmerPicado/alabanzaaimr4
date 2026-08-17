import fs from 'fs';

const html = fs.readFileSync('index.html', 'utf-8');
const lines = html.split('\n');

console.log("🔍 Buscando iniciarVistaMusico...");
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('function iniciarVistaMusico')) {
    console.log(`Línea ${i + 1}: ${lines[i].trim()}`);
    // Imprimir las siguientes 60 líneas
    for (let j = i; j < Math.min(lines.length, i + 60); j++) {
      console.log(`  ${j + 1}: ${lines[j]}`);
    }
    break;
  }
}
process.exit(0);

import fs from 'fs';

const html = fs.readFileSync('index.html', 'utf-8');
const lines = html.split('\n');

console.log("🔍 Buscando barra de navegación fija/inferior en index.html...");
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('nav-tabs') || line.includes('Repertorio') && line.includes('Asistencia') && line.includes('Ensayos')) {
    console.log(`Línea ${i + 1}: ${line.trim()}`);
    // Imprimir las siguientes 20 líneas
    for (let j = i; j < Math.min(lines.length, i + 25); j++) {
      console.log(`  ${j + 1}: ${lines[j]}`);
    }
  }
}
process.exit(0);

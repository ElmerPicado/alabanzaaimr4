import fs from 'fs';

const html = fs.readFileSync('index.html', 'utf-8');
const lines = html.split('\n');

console.log("=== 1. BUSCANDO 'unsubscribeMusicoService' ===");
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('unsubscribeMusicoService')) {
    console.log(`Línea ${i + 1}: ${lines[i].trim()}`);
  }
}

console.log("\n=== 2. LÍNEA 7620 Y ALREDEDOR ===");
const start2 = Math.max(0, 7610);
const end2 = Math.min(lines.length, 7630);
for (let i = start2; i < end2; i++) {
  console.log(`${i + 1}: ${lines[i]}`);
}

console.log("\n=== 3. FINAL DEL ARCHIVO (Línea 12550 en adelante) ===");
const start3 = Math.max(0, lines.length - 100);
for (let i = start3; i < lines.length; i++) {
  console.log(`${i + 1}: ${lines[i]}`);
}

process.exit(0);

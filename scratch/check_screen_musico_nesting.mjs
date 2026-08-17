import fs from 'fs';

const html = fs.readFileSync('index.html', 'utf-8');
const lines = html.split('\n');

console.log("🔍 Estructura alrededor de la línea 4620 a 4640...");
for (let i = 4610; i < Math.min(lines.length, 4645); i++) {
  console.log(`${i + 1}: ${lines[i]}`);
}
process.exit(0);

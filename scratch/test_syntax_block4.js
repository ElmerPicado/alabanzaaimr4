import fs from 'fs';
import vm from 'vm';

const html = fs.readFileSync('index.html', 'utf-8');
const scriptRegex = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
let match;
let count = 0;

console.log("🛠️ Validando sintaxis de JavaScript en el Bloque 4...");
while ((match = scriptRegex.exec(html)) !== null) {
  count++;
  if (count === 4) {
    const code = match[2];
    try {
      new vm.Script(code);
      console.log("✅ Bloque script #4 parseado exitosamente sin errores de sintaxis.");
      process.exit(0);
    } catch (err) {
      console.error(`❌ Bloque script #4 falló con error de sintaxis:`, err.message);
      process.exit(1);
    }
  }
}
console.error("❌ No se encontró el bloque script #4.");
process.exit(1);

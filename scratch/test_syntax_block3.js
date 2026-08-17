/**
 * SCRIPT: test_syntax_block3.js
 * ==============================
 * Extrae y valida únicamente el bloque de script #3 de index.html
 * para certificar la sanidad del código de la Fase B y Fase C.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const html = fs.readFileSync('index.html', 'utf-8');
const scriptRegex = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
let match;
let count = 0;
const tempFile = path.resolve('scratch/temp_syntax_check_block3.js');

console.log("🛠️ Validando sintaxis de JavaScript en el Bloque 3...");

while ((match = scriptRegex.exec(html)) !== null) {
  const attrs = match[1];
  const code = match[2];
  count++;
  
  if (count === 3) {
    fs.writeFileSync(tempFile, code, 'utf-8');
    try {
      execSync(`node --check "${tempFile}"`, { stdio: 'pipe' });
      console.log(`✅ Bloque script #3 parseado exitosamente sin errores de sintaxis.`);
      try { fs.unlinkSync(tempFile); } catch(_) {}
      process.exit(0);
    } catch (err) {
      console.error(`❌ Bloque script #3 falló con error de sintaxis:`);
      console.error(err.stderr ? err.stderr.toString() : err.message);
      try { fs.unlinkSync(tempFile); } catch(_) {}
      process.exit(1);
    }
  }
}

console.error("❌ No se encontró el bloque script #3.");
process.exit(1);

/**
 * SCRIPT: test_syntax.js
 * =======================
 * Diagnostica los bloques de script de index.html
 */

import fs from 'fs';
import path from 'path';

const html = fs.readFileSync('index.html', 'utf-8');
const scriptRegex = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
let match;
let count = 0;

console.log("🛠️ Diagnóstico de bloques de script en index.html...");

while ((match = scriptRegex.exec(html)) !== null) {
  const attrs = match[1];
  const code = match[2];
  count++;
  
  console.log(`\n📦 Bloque script #${count}:`);
  console.log(`   Atributos: "${attrs.trim()}"`);
  console.log(`   Longitud:  ${code.length} caracteres`);
  console.log(`   Inicio:    ${code.trim().substring(0, 100).replace(/\r?\n/g, ' ')}...`);
  console.log(`   Fin:       ...${code.trim().substring(code.trim().length - 100).replace(/\r?\n/g, ' ')}`);
}

process.exit(0);

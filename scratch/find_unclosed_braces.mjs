/**
 * DIAGNÓSTICO: Buscar llaves desbalanceadas en script #4
 * ========================================================
 * Cuenta llaves { y } en el bloque de script #4 para identificar cuál falta.
 */

import fs from 'fs';

const html = fs.readFileSync('index.html', 'utf-8');
const scriptRegex = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
let match;
let count = 0;

while ((match = scriptRegex.exec(html)) !== null) {
  count++;
  if (count === 4) {
    const code = match[2];
    const lines = code.split('\n');
    let braceCount = 0;
    const stack = [];

    console.log(`Analyzing Script #4 (starts at line 11876)...`);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Ignorar comentarios de una sola línea
      const cleanLine = line.replace(/\/\/.*$/g, '');
      
      for (let charIndex = 0; charIndex < cleanLine.length; charIndex++) {
        const char = cleanLine[charIndex];
        if (char === '{') {
          braceCount++;
          stack.push({ line: i + 1, content: line.trim() });
        } else if (char === '}') {
          braceCount--;
          if (stack.length > 0) {
            stack.pop();
          } else {
            console.warn(`⚠️ Llave de cierre extra '}' en la línea del script ${i + 1}: "${line.trim()}"`);
          }
        }
      }
    }

    console.log(`\nBalance de llaves al final: ${braceCount}`);
    if (braceCount > 0) {
      console.log(`❌ Faltan ${braceCount} llaves de cierre '}'.`);
      console.log(`Las últimas llaves abiertas y no cerradas se encuentran en:`);
      stack.slice(-5).forEach(s => {
        console.log(`  Línea del script ${s.line} (Línea HTML ${11876 + s.line}): "${s.content}"`);
      });
    } else if (braceCount < 0) {
      console.log(`❌ Sobran llaves de cierre '}'.`);
    } else {
      console.log(`✅ Las llaves están perfectamente balanceadas.`);
    }
  }
}
process.exit(0);

/**
 * SCRIPT: apply_new_fixes_only.mjs
 * ==================================
 * Aplica la regla CSS para ocultar la barra nav inferior en la landing page
 * y cualquier corrección adicional sobre index.html.
 */

import fs from 'fs';
import path from 'path';

const indexPath = path.resolve('index.html');

console.log("📖 Leyendo index.html...");
let content = fs.readFileSync(indexPath, 'utf-8');

// Normalizar retornos de carro de Windows a formato Unix (\n)
content = content.replace(/\r\n/g, '\n');

const originalLength = content.length;
let matchCount = 0;

// Helper para reemplazo e informe
function applyReplace(name, target, replacement) {
  if (content.includes(target)) {
    content = content.replace(target, replacement);
    console.log(`✅ [${name}] Reemplazado exitosamente.`);
    matchCount++;
  } else {
    console.error(`❌ [${name}] NO SE ENCONTRÓ el fragmento literal.`);
  }
}

// -------------------------------------------------------------
// CAMBIO: Ocultar barra nav en CSS si la pantalla no está activa
// -------------------------------------------------------------
applyReplace(
  "Ocultar barra nav en CSS para landing",
  `    /* Ocultar barra nav cuando no hay sesión activa (en login/superadmin) */
    body:not(.app-session-active) .nav-tabs {
      display: none !important;
    }`,
  `    /* Ocultar barra nav cuando no hay sesión activa o la pantalla no está activa (evitar fuga en landing) */
    body:not(.app-session-active) .nav-tabs,
    #screen-dashboard:not(.active) .nav-tabs,
    #screen-musico:not(.active) .nav-tabs {
      display: none !important;
    }`
);

// ==========================================
// GUARDAR Y VERIFICAR
// ==========================================
if (content.length !== originalLength) {
  console.log(`📝 Escribiendo cambios en index.html... (${originalLength} -> ${content.length} bytes)`);
  fs.writeFileSync(indexPath, content, 'utf-8');
  console.log("🎉 NUEVOS CAMBIOS APLICADOS CON ÉXITO.");
} else {
  console.log("⚠️ No se realizó ningún cambio.");
}

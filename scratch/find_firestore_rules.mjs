import fs from 'fs';
import path from 'path';

console.log("🔍 Buscando archivos de reglas o configuración de Firebase en el workspace...");

function searchDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== 'scratch') {
        searchDir(fullPath);
      }
    } else {
      if (file.endsWith('.rules') || file.includes('firebase')) {
        console.log(`  📄 Archivo encontrado: ${fullPath}`);
      }
    }
  }
}

searchDir('.');
process.exit(0);

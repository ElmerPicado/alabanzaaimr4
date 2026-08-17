import fs from 'fs';

const html = fs.readFileSync('index.html', 'utf-8');
const lines = html.split('\n');

console.log("🔍 Buscando apertura de script antes de la línea 12610...");
let scriptLines = [];
let startLine = 0;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('<script')) {
    startLine = i + 1;
  }
}

console.log(`El último bloque de script empieza en la línea ${startLine}`);
for (let j = Math.max(0, startLine - 5); j < lines.length; j++) {
  console.log(`${j + 1}: ${lines[j]}`);
}
process.exit(0);

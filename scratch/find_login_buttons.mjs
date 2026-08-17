import fs from 'fs';

const html = fs.readFileSync('index.html', 'utf-8');
const lines = html.split('\n');

console.log("🔍 Buscando botones de login rápido en index.html...");

let inLoginSection = false;
let printedLines = 0;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('id="screen-login"') || lines[i].includes('class="login-container"')) {
    inLoginSection = true;
  }
  if (inLoginSection) {
    console.log(`${i + 1}: ${lines[i]}`);
    printedLines++;
    if (printedLines > 100) break;
  }
}
process.exit(0);

import fs from 'fs';

const html = fs.readFileSync('index.html', 'utf-8');
const lines = html.split('\n');

console.log("🔍 Buscando definición de deleteUserProtected...");

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('deleteUserProtected') && lines[i].includes('=')) {
    console.log(`Línea ${i + 1}: ${lines[i].trim()}`);
    for (let j = Math.max(0, i - 2); j < Math.min(lines.length, i + 25); j++) {
      console.log(`  ${j + 1}: ${lines[j]}`);
    }
  }
}
process.exit(0);

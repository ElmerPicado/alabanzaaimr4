import fs from 'fs';

const html = fs.readFileSync('index.html', 'utf-8');
const lines = html.split('\n');

console.log("🔍 Detalles de deleteUserProtected...");
for (let i = 11960; i < Math.min(lines.length, 12020); i++) {
  console.log(`${i + 1}: ${lines[i]}`);
}
process.exit(0);

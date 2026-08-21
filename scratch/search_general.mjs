import fs from 'fs';

const term = process.argv[2];
const content = fs.readFileSync('c:\\Elmer_Personal\\PROYECTOS\\Alabanza Imr4\\index.html', 'utf8');
const lines = content.split('\n');
const regex = new RegExp(term, 'i');

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.match(regex)) {
        console.log(`Line ${i + 1}: ${line.trim().substring(0, 150)}`);
    }
}

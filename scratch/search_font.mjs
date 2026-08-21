import fs from 'fs';

const content = fs.readFileSync('c:\\Elmer_Personal\\PROYECTOS\\Alabanza Imr4\\index.html', 'utf8');
const lines = content.split('\n');

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.match(/fontSize/i) || line.match(/zoom/i) || line.match(/font-size/i) || line.match(/aumentar/i) || line.match(/disminuir/i)) {
        console.log(`Line ${i + 1}: ${line.trim().substring(0, 150)}`);
    }
}

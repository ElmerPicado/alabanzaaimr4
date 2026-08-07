import fs from 'fs';

const content = fs.readFileSync('index.html', 'utf8');
const lines = content.split('\n');

const results = [];
lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    const l = line.toLowerCase();
    if (
        l.includes('dangerously') ||
        l.includes('recalculate') ||
        l.includes('fixcorrupted') ||
        l.includes('reparar') ||
        l.includes('corregir') ||
        l.includes('btn-')
    ) {
        results.push(`L${lineNum}: ${line.trim().substring(0, 150)}`);
    }
});

fs.writeFileSync('search_out.txt', results.join('\n'));
console.log(`Found ${results.length} matches written to search_out.txt`);

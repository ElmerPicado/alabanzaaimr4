import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ChordReviewEngine } from '../chord_engine/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repertorioDir = path.join(__dirname, '..', 'repertorio');

const ENHARMONIC_MAP = {
    'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#',
    'Dbm': 'C#m', 'Ebm': 'D#m', 'Gbm': 'F#m', 'Abm': 'G#m', 'Bbm': 'A#m',
    'DO': 'C', 'RE': 'D', 'MI': 'E', 'FA': 'F', 'SOL': 'G', 'LA': 'A', 'SI': 'B'
};

function normalizeKeyForComparison(key) {
    if (!key) return '';
    let k = key.trim().toUpperCase();
    
    // Normalize Spanish note names to English
    k = k.replace(/^DO/i, 'C')
         .replace(/^RE/i, 'D')
         .replace(/^MI/i, 'E')
         .replace(/^FA/i, 'F')
         .replace(/^SOL/i, 'G')
         .replace(/^LA/i, 'A')
         .replace(/^SI/i, 'B');

    // Handle minor mode markers
    let isMinor = false;
    if (k.endsWith('M') && !k.endsWith('MAJ') && k.length > 1) {
        // e.g. "Am", "Dm"
        isMinor = true;
    } else if (k.toLowerCase().includes('menor') || k.endsWith('m')) {
        isMinor = true;
    }

    let root = k.replace(/m(?:enor)?|maj|mayor/gi, '').trim();

    // Map enharmonics to canonical sharp representation
    if (ENHARMONIC_MAP[root]) {
        root = ENHARMONIC_MAP[root];
    }

    return root + (isMinor ? 'm' : '');
}

async function runHardStressTest() {
    console.log("=========================================");
    console.log("🔥 STRESS TESTING CHORD REVIEW ENGINE 🔥");
    console.log("=========================================");

    const files = fs.readdirSync(repertorioDir).filter(f => f.endsWith('.json'));
    
    let totalSongsAnalyzed = 0;
    let exactMatches = 0;
    let top2Matches = 0;
    let failures = [];

    let reportLines = [];
    reportLines.push("=== STRESS TEST REPORT FOR CHORD ENGINE ===");
    reportLines.push(`Timestamp: ${new Date().toISOString()}`);
    reportLines.push(`Repertorio files checked: ${files.length}\n`);

    for (const file of files) {
        const filePath = path.join(repertorioDir, file);
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const songs = JSON.parse(content);

            for (const song of songs) {
                if (!song.letra || song.letra.trim().length === 0 || !song.tonoBase) {
                    continue;
                }

                // Limit per file or test up to 500 total songs for speed
                if (totalSongsAnalyzed >= 500) break;

                totalSongsAnalyzed++;

                const expectedNormalized = normalizeKeyForComparison(song.tonoBase);

                try {
                    const result = ChordReviewEngine.analyze(song.letra);
                    const possibleKeys = result.chordData.possibleKeys || [];

                    if (possibleKeys.length === 0) {
                        failures.push({
                            song: song.nombre,
                            artist: song.artista,
                            expected: song.tonoBase,
                            got: 'None',
                            reason: 'No keys detected'
                        });
                        continue;
                    }

                    const topKey = possibleKeys[0];
                    const topNormalized = normalizeKeyForComparison(topKey.key + (topKey.mode === 'Menor' ? 'm' : ''));
                    const secondNormalized = possibleKeys[1] 
                        ? normalizeKeyForComparison(possibleKeys[1].key + (possibleKeys[1].mode === 'Menor' ? 'm' : ''))
                        : '';

                    if (topNormalized === expectedNormalized) {
                        exactMatches++;
                    } else if (secondNormalized === expectedNormalized) {
                        top2Matches++;
                        failures.push({
                            song: song.nombre,
                            artist: song.artista,
                            expected: `${song.tonoBase} (${expectedNormalized})`,
                            gotTop: `${topKey.key} ${topKey.mode} (${topNormalized})`,
                            gotRank2: possibleKeys[1] ? `${possibleKeys[1].key} ${possibleKeys[1].mode}` : 'N/A',
                            reason: 'Expected key was 2nd choice (relativa o dominante)'
                        });
                    } else {
                        failures.push({
                            song: song.nombre,
                            artist: song.artista,
                            expected: `${song.tonoBase} (${expectedNormalized})`,
                            gotTop: `${topKey.key} ${topKey.mode} (${topNormalized})`,
                            gotRank2: possibleKeys[1] ? `${possibleKeys[1].key} ${possibleKeys[1].mode}` : 'N/A',
                            reason: 'Mismatch'
                        });
                    }

                } catch (err) {
                    failures.push({
                        song: song.nombre,
                        artist: song.artista,
                        expected: song.tonoBase,
                        got: 'ERROR',
                        reason: err.message
                    });
                }
            }
        } catch (e) {
            console.error(`Error reading ${file}:`, e.message);
        }

        if (totalSongsAnalyzed >= 200) break;
    }

    const matchRate = ((exactMatches / totalSongsAnalyzed) * 100).toFixed(2);
    const top2Rate = (((exactMatches + top2Matches) / totalSongsAnalyzed) * 100).toFixed(2);

    reportLines.push(`Total Songs Tested: ${totalSongsAnalyzed}`);
    reportLines.push(`Exact #1 Match: ${exactMatches} (${matchRate}%)`);
    reportLines.push(`Top 2 Match (Includes relative keys): ${exactMatches + top2Matches} (${top2Rate}%)`);
    reportLines.push(`Mismatches / Edge Cases: ${failures.length}\n`);

    reportLines.push("--- DETAILED MISMATCH / EDGE CASE LOG ---");
    failures.forEach((f, idx) => {
        reportLines.push(`${idx + 1}. [${f.artist} - ${f.song}]`);
        reportLines.push(`   Expected: ${f.expected}`);
        reportLines.push(`   Got Top:  ${f.gotTop || f.got}`);
        if (f.gotRank2) reportLines.push(`   Got #2:   ${f.gotRank2}`);
        reportLines.push(`   Reason:   ${f.reason}\n`);
    });

    const reportText = reportLines.join('\n');
    fs.writeFileSync(path.join(__dirname, '..', 'scratch', 'stress_test_report.txt'), reportText);

    console.log(`Stress test completed! Analyzed ${totalSongsAnalyzed} songs.`);
    console.log(`Exact Match Rate: ${matchRate}%`);
    console.log(`Top 2 Match Rate: ${top2Rate}%`);
    console.log("Full details written to scratch/stress_test_report.txt");
}

runHardStressTest();

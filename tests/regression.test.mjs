import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseSong } from '../chord_engine/parser.js';
import { detectSections } from '../chord_engine/section_detector.js';
import { detectKey } from '../chord_engine/key_detector.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEST_FILE = path.join(__dirname, 'test_songs.json');

async function runTests() {
    console.log('--- RUNNING KEY DETECTION REGRESSION TESTS ---');
    let passed = 0;
    let failed = 0;

    const songs = JSON.parse(fs.readFileSync(TEST_FILE, 'utf8'));

    for (const song of songs) {
        // Parse and detect sections
        const parsedLines = parseSong(song.chordsText);
        const sections = detectSections(parsedLines);

        // Detect key using the new API that accepts sections
        const results = detectKey(sections, { debug: true });
        
        // Results should be an array sorted by confidence. We pick the top one.
        const topResult = results[0];

        if (!topResult) {
            console.error(`❌ [FAILED] ${song.name}: No key detected.`);
            failed++;
            continue;
        }

        const match = topResult.key === song.expectedKey && topResult.mode === song.expectedMode;

        if (match) {
            console.log(`✅ [PASSED] ${song.name} -> Expected: ${song.expectedKey} ${song.expectedMode}, Got: ${topResult.key} ${topResult.mode} (Conf: ${topResult.confidence}%)`);
            passed++;
        } else {
            console.error(`❌ [FAILED] ${song.name}`);
            console.error(`   Expected: ${song.expectedKey} ${song.expectedMode}`);
            console.error(`   Got:      ${topResult.key} ${topResult.mode} (Conf: ${topResult.confidence}%)`);
            if (topResult.debugInfo) {
                console.error(`   Debug:    `, JSON.stringify(topResult.debugInfo, null, 2));
            }
            failed++;
        }
    }

    console.log('\n--- TEST SUMMARY ---');
    console.log(`Total: ${songs.length} | Passed: ${passed} | Failed: ${failed}`);
    
    if (failed > 0) {
        process.exit(1);
    }
}

runTests().catch(err => {
    console.error('Test execution failed:', err);
    process.exit(1);
});

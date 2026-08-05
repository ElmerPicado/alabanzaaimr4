import { parseSong } from './chord_engine/parser.js';
import { detectSections } from './chord_engine/section_detector.js';
import { detectKey } from './chord_engine/key_detector.js';
import fs from 'fs';

const songText = `[Verso]
Am F E Am
[Coro]
Am Dm E Am`;

const parsedLines = parseSong(songText);
const sections = detectSections(parsedLines);
const results = detectKey(sections, { debug: true });

console.log("Results:");
console.log(JSON.stringify(results, null, 2));

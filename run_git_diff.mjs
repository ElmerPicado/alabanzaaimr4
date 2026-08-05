import { exec } from 'child_process';
import fs from 'fs';

exec('git diff chord_engine/key_detector.js', (error, stdout, stderr) => {
    fs.writeFileSync('git_diff_file.txt', `STDOUT:\n${stdout}\nSTDERR:\n${stderr}\nERROR:\n${error}`);
});

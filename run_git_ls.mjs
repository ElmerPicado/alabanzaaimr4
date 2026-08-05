import { exec } from 'child_process';
import fs from 'fs';

exec('git ls-files chord_engine/key_detector.js', (error, stdout, stderr) => {
    fs.writeFileSync('git_ls_files.txt', `STDOUT:\n${stdout}\nSTDERR:\n${stderr}\nERROR:\n${error}`);
});

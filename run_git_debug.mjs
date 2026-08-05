import { exec } from 'child_process';
import fs from 'fs';

exec('git status & git diff', (error, stdout, stderr) => {
    fs.writeFileSync('git_debug.txt', `STDOUT:\n${stdout}\nSTDERR:\n${stderr}\nERROR:\n${error}`);
});

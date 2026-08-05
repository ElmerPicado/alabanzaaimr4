import { exec } from 'child_process';
import fs from 'fs';

exec('node debug_song.mjs', (error, stdout, stderr) => {
    fs.writeFileSync('debug_output.txt', `STDOUT:\n${stdout}\nSTDERR:\n${stderr}\nERROR:\n${error}`);
});

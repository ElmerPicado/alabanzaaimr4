import { exec } from 'child_process';
import fs from 'fs';

exec('git remote -v', (error, stdout, stderr) => {
    fs.writeFileSync('git_remotes.txt', `STDOUT:\n${stdout}\nSTDERR:\n${stderr}\nERROR:\n${error}`);
});

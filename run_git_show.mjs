import { exec } from 'child_process';
import fs from 'fs';

exec('git show HEAD', (error, stdout, stderr) => {
    fs.writeFileSync('git_show_head.txt', `STDOUT:\n${stdout.slice(0, 5000)}\nSTDERR:\n${stderr}\nERROR:\n${error}`);
});

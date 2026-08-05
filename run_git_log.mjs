import { exec } from 'child_process';
import fs from 'fs';

exec('git log -n 5 --oneline', (error, stdout, stderr) => {
    fs.writeFileSync('git_log.txt', `STDOUT:\n${stdout}\nSTDERR:\n${stderr}\nERROR:\n${error}`);
});

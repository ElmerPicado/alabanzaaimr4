import { exec } from 'child_process';
import fs from 'fs';

exec('git check-ignore -v chord_engine/key_detector.js', (error, stdout, stderr) => {
    fs.writeFileSync('git_ignore_check.txt', `STDOUT:\n${stdout}\nSTDERR:\n${stderr}\nERROR:\n${error}`);
});
exec('git status --porcelain', (error, stdout, stderr) => {
    fs.appendFileSync('git_ignore_check.txt', `\n\nSTATUS PORCELAIN:\nSTDOUT:\n${stdout}\nSTDERR:\n${stderr}\nERROR:\n${error}`);
});

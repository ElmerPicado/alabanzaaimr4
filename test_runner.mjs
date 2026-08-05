import { exec } from 'child_process';
import fs from 'fs';

exec('node tests/regression.test.mjs', (error, stdout, stderr) => {
    fs.writeFileSync('test_output.txt', `STDOUT:\n${stdout}\nSTDERR:\n${stderr}\nERROR:\n${error}`);
});

const https = require('https');
https.get('https://www.cifraclub.com/ingrid-rosario/que-se-llene-tu-casa/', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const fs = require('fs');
    fs.writeFileSync('cifra_test.html', data);
    console.log('Done');
  });
});

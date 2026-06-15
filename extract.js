const fs=require('fs'); const txt=fs.readFileSync('alabanza-app_2.html','utf8'); const m=txt.match(/<script type="module">([\s\S]*?)<\/script>/); if(m) fs.writeFileSync('temp.js', m[1]);

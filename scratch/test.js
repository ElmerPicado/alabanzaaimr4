const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const scriptMatch = html.match(/<script type=\"module\">([\s\S]*?)<\/script>/);
if (scriptMatch) {
  fs.writeFileSync('test_syntax.js', scriptMatch[1]);
  console.log('Saved to test_syntax.js');
} else {
  console.log('No script tag found');
}

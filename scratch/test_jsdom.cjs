const jsdom = require('jsdom');
const { JSDOM } = jsdom;
const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf8');

const virtualConsole = new jsdom.VirtualConsole();
virtualConsole.on("error", (err) => { console.error("JSDOM Error:", err); });
virtualConsole.on("jsdomError", (err) => { console.error("JSDOM Int Error:", err); });

const dom = new JSDOM(html, { 
  runScripts: "dangerously", 
  virtualConsole,
  url: "http://127.0.0.1:5501/"
});

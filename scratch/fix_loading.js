const fs = require('fs');
let c = fs.readFileSync('index.html', 'utf8');

// Fix the undefined dataServicio error
c = c.replace(
  /if \(dataServicio\.cancionesSeleccionadasTipos && dataServicio\.cancionesSeleccionadasTipos\[id\]\) \{\s*songCopy\.tipo = dataServicio\.cancionesSeleccionadasTipos\[id\];\s*\}/g,
  `const refData = typeof data !== 'undefined' ? data : (typeof dataServicio !== 'undefined' ? dataServicio : {});
            if (refData.cancionesSeleccionadasTipos && refData.cancionesSeleccionadasTipos[id]) {
              songCopy.tipo = refData.cancionesSeleccionadasTipos[id];
            }`
);

// Add loading spinner CSS
if (!c.includes('@keyframes spin')) {
  c = c.replace('</style>', '  @keyframes spin { 100% { transform: rotate(360deg); } }\n  </style>');
}

// Replace loading text
c = c.replace(
  /<p style='color:var\(--text3\);font-size:13px;text-align:center;padding:20px;'>Cargando servicio\.\.\.<\/p>/g,
  `<div style='display:flex; flex-direction:column; align-items:center; justify-content:center; padding:40px 20px; gap:12px;'><div style='width:30px; height:30px; border:3px solid rgba(229,180,60,0.2); border-top-color:var(--gold); border-radius:50%; animation:spin 1s linear infinite;'></div><p style='color:var(--text3); font-size:13px; margin:0;'>Cargando datos del servicio...</p></div>`
);

fs.writeFileSync('index.html', c);

// Update service worker
let sw = fs.readFileSync('sw.js', 'utf8');
sw = sw.replace(/alabanza-imr4-v\d+/g, 'alabanza-imr4-v48');
fs.writeFileSync('sw.js', sw);

console.log('Fixed undefined dataServicio error and added spinner. Bumped SW to v48');

const fs = require('fs');
let content = fs.readFileSync('scratch/index_modified.html', 'utf8');

// Un-hide search components
content = content.replace(
  '<div style="display:none; gap:6px; margin-bottom:10px; padding:4px; background:var(--bg3); border-radius:8px;">',
  '<div style="display:flex; gap:6px; margin-bottom:10px; padding:4px; background:var(--bg3); border-radius:8px;">'
);
content = content.replace(
  '<div class="search-wrapper" style="display:none;">',
  '<div class="search-wrapper" style="display:block;">'
);
content = content.replace(
  '<div id="musico-add-song-results" class="song-list-scroll"\n        style="display: none; max-height: 200px; margin-bottom: 16px;">',
  '<div id="musico-add-song-results" class="song-list-scroll"\n        style="display: block; max-height: 200px; margin-bottom: 16px;">'
);
content = content.replace(
  '<div style="display: none; gap: 10px; margin-bottom: 16px;">',
  '<div style="display: flex; gap: 10px; margin-bottom: 16px;">'
);
content = content.replace(
  '<div id="musico-custom-song-container" style="display: block; padding-top: 0;">',
  '<div id="musico-custom-song-container" style="display: none; padding-top: 0;">'
);

// Modify renderAddSongResults for lazy loading in 'todas'
const renderFuncRegex = /function renderAddSongResults\(type, filterText\) \{[\s\S]*?const filtered = cacheSongs\.filter/;
content = content.replace(renderFuncRegex, (match) => {
  return `function renderAddSongResults(type, filterText) {
      const resultsCont = document.getElementById('musico-add-song-results');
      if (!resultsCont) return;

      resultsCont.innerHTML = "";

      // Lógica perezosa para evitar congelamientos
      if (currentPickerFilter === 'todas' && filterText.trim().length < 2) {
        resultsCont.innerHTML = \`<p style="color:var(--text3); font-size:12px; text-align:center; padding:15px;">Escribe al menos 2 letras para buscar en la lista global.</p>\`;
        return;
      }

      const dataServicio = window._currentServiceData || {};
      const cancionesSeleccionadas = dataServicio.cancionesSeleccionadas || {};
      const selectedIds = Object.keys(cancionesSeleccionadas).filter(k => cancionesSeleccionadas[k] !== false);

      const filtered = cacheSongs.filter`;
});

// Remove sorting from allSelected alphabetically: The user said "Quitar ordenamiento alfabético .sort() en selecciones".
// Let's search if there's any allSelected.sort((a, b) => (a.nombre || '').localeCompare(...))
const alphabeticSortRegex = /allSelected\.sort\(\(a, b\) => \(a\.nombre \|\| ''\)\.localeCompare\(\(b\.nombre \|\| ''\)\)\);/g;
content = content.replace(alphabeticSortRegex, '// allSelected.sort removed to preserve insertion order');

fs.writeFileSync('scratch/index_modified.html', content);
console.log('Task 2 applied');

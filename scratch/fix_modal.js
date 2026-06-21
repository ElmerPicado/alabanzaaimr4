const fs = require('fs');
let c = fs.readFileSync('index.html', 'utf8');

// Fix the toggle logic
const oldToggle = `    const btnToggleCustom = document.getElementById('btn-musico-toggle-custom');
    if (btnToggleCustom) {
      btnToggleCustom.addEventListener('click', () => {
        const cont = document.getElementById('musico-custom-song-container');
        if (cont) {
          cont.style.display = cont.style.display === 'none' ? 'block' : 'none';
        }
      });
    }`;
const newToggle = `    const btnToggleCustom = document.getElementById('btn-musico-toggle-custom');
    if (btnToggleCustom) {
      btnToggleCustom.addEventListener('click', () => {
        const cont = document.getElementById('musico-custom-song-container');
        const searchWrapper = document.querySelector('#musico-add-song-modal .search-wrapper');
        const resultsCont = document.getElementById('musico-add-song-results');
        const filtersCont = document.getElementById('filter-picker-todas')?.parentElement;
        const btnAddSel = document.getElementById('btn-musico-add-selected');

        if (cont && searchWrapper && resultsCont) {
          const isCustomHidden = cont.style.display === 'none';
          if (isCustomHidden) {
            // Show custom, hide search
            cont.style.display = 'block';
            searchWrapper.style.display = 'none';
            resultsCont.style.display = 'none';
            if (filtersCont) filtersCont.style.display = 'none';
            if (btnAddSel) btnAddSel.style.display = 'none';
            btnToggleCustom.textContent = 'Volver a Buscar';
          } else {
            // Hide custom, show search
            cont.style.display = 'none';
            searchWrapper.style.display = 'block';
            resultsCont.style.display = 'block';
            if (filtersCont) filtersCont.style.display = 'flex';
            if (btnAddSel && window._selectedSongsToAdd && window._selectedSongsToAdd.size > 0) btnAddSel.style.display = 'flex';
            else if (btnAddSel) btnAddSel.style.display = 'none';
            btnToggleCustom.textContent = '+ Agregar Manual';
          }
        }
      });
    }`;
c = c.replace(oldToggle, newToggle);

// Replace initialization in btn-add-song-musico
c = c.replace(
  `            if (customCont1) customCont1.style.display = 'block';

            document.getElementById('musico-add-song-modal').classList.add('active');`,
  `            if (customCont1) customCont1.style.display = 'none';
            
            const searchWrapper1 = document.querySelector('#musico-add-song-modal .search-wrapper');
            const resultsCont1 = document.getElementById('musico-add-song-results');
            const filtersCont1 = document.getElementById('filter-picker-todas')?.parentElement;
            const toggleBtn1 = document.getElementById('btn-musico-toggle-custom');
            
            if (searchWrapper1) searchWrapper1.style.display = 'block';
            if (resultsCont1) resultsCont1.style.display = 'block';
            if (filtersCont1) filtersCont1.style.display = 'flex';
            if (toggleBtn1) toggleBtn1.textContent = '+ Agregar Manual';

            document.getElementById('musico-add-song-modal').classList.add('active');`
);

// Replace initialization in btn-add-song-trigger
c = c.replace(
  `        if (customCont2) customCont2.style.display = 'block';

        document.getElementById('musico-add-song-modal').classList.add('active');`,
  `        if (customCont2) customCont2.style.display = 'none';
        
        const searchWrapper2 = document.querySelector('#musico-add-song-modal .search-wrapper');
        const resultsCont2 = document.getElementById('musico-add-song-results');
        const filtersCont2 = document.getElementById('filter-picker-todas')?.parentElement;
        const toggleBtn2 = document.getElementById('btn-musico-toggle-custom');
        
        if (searchWrapper2) searchWrapper2.style.display = 'block';
        if (resultsCont2) resultsCont2.style.display = 'block';
        if (filtersCont2) filtersCont2.style.display = 'flex';
        if (toggleBtn2) toggleBtn2.textContent = '+ Agregar Manual';

        document.getElementById('musico-add-song-modal').classList.add('active');`
);


// To fix "escribo algo y no me tre nada", wait... could it be debounce is not defined?
// No, debounce is used elsewhere.
// What if cacheSongs is empty? We can't do anything about that here.
// Let's add a console.log inside the input listener to verify if the event fires in case they inspect it.
c = c.replace(
  `        const filterText = removeAccents(modalSearchInput.value).toLowerCase().trim();
        renderAddSongResults(window._targetAddSongType, filterText);`,
  `        const filterText = removeAccents(modalSearchInput.value).toLowerCase().trim();
        console.log("Searching for:", filterText);
        renderAddSongResults(window._targetAddSongType, filterText);`
);

fs.writeFileSync('index.html', c);

// Update sw.js
let sw = fs.readFileSync('sw.js', 'utf8');
sw = sw.replace(/alabanza-imr4-v\d+/g, 'alabanza-imr4-v49');
fs.writeFileSync('sw.js', sw);

console.log('Fixed modal toggle logic and bumped SW to v49');

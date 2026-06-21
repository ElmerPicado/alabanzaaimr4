const fs = require('fs');
let content = fs.readFileSync('scratch/index_modified.html', 'utf8');

// Task 8: CSS `.musico-subtabs`
content = content.replace(
  /\.musico-subtabs\s*\{\s*display:\s*flex;\s*flex-direction:\s*column;/g,
  '.musico-subtabs {\n      display: flex;\n      flex-direction: row;\n      flex-wrap: wrap;'
);

// Task 6: Dropdown for avatar
const htmlToInject = `
            <div id="musico-avatar-dropdown" style="display: none; position: absolute; top: 40px; right: 0; background: var(--bg3); border: 1px solid var(--border); border-radius: 8px; padding: 8px; width: 220px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); z-index: 1000;">
              <button id="btn-musico-change-pic" style="width: 100%; text-align: left; padding: 10px; background: transparent; border: none; color: var(--text); font-size: 13px; cursor: pointer; border-radius: 4px; margin-bottom: 4px;">📸 Cambiar foto de perfil</button>
              <button id="btn-musico-update" style="width: 100%; text-align: left; padding: 10px; background: transparent; border: none; color: var(--text); font-size: 13px; cursor: pointer; border-radius: 4px;">🔄 Buscar actualizaciones</button>
            </div>
          </div>
`;

content = content.replace(
  /<\/div>\s*<\/div>\s*<span id="musico-name-badge"/,
  '</div>' + htmlToInject + '          <span id="musico-name-badge"'
);

// Replace JS for dropdown logic
const oldJs = `if (musicoAvBtn) musicoAvBtn.onclick = triggerUpload;`;
const newJs = `
      if (musicoAvBtn) {
        musicoAvBtn.onclick = (e) => {
          e.stopPropagation();
          const dropdown = document.getElementById('musico-avatar-dropdown');
          if(dropdown) {
            dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
          }
        };
        document.addEventListener('click', () => {
          const dropdown = document.getElementById('musico-avatar-dropdown');
          if(dropdown) dropdown.style.display = 'none';
        });
      }
      const btnChangePic = document.getElementById('btn-musico-change-pic');
      if (btnChangePic) btnChangePic.onclick = triggerUpload;
      const btnUpdate = document.getElementById('btn-musico-update');
      if (btnUpdate) btnUpdate.onclick = () => {
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.getRegistrations().then(function(registrations) {
            for(let registration of registrations) {
              registration.update();
            }
          });
        }
        setTimeout(() => window.location.reload(true), 1000);
      };
`;

content = content.replace(oldJs, newJs);

fs.writeFileSync('scratch/index_modified.html', content);
console.log('Tasks 6 and 8 applied');

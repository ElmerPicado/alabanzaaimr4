const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

function robustReplace(patternStr, replacementStr) {
  // Escapes the pattern string for regex except for whitespace
  const escapeRegExp = (string) => string.replace(/[.*+?^$\{\}()|[\\]\\\\]/g, '\\$&');
  const tokens = patternStr.split(/\\s+/);
  const regexPattern = tokens.map(escapeRegExp).join('\\s+');
  const regex = new RegExp(regexPattern, 'g');
  
  if (!regex.test(html)) {
    console.error("FAILED to match: " + patternStr.substring(0, 50));
  } else {
    html = html.replace(regex, replacementStr);
  }
}

// 1. Fix Modal default visibility
const modalFix1 = `const btnAddSel1 = document.getElementById('btn-musico-add-selected');
            if (btnAddSel1) btnAddSel1.style.display = 'none';
            const customCont1 = document.getElementById('musico-custom-song-container');
            if (customCont1) customCont1.style.display = 'block';

            document.getElementById('musico-add-song-modal').classList.add('active');`;

const modalFix1_new = `const btnAddSel1 = document.getElementById('btn-musico-add-selected');
            if (btnAddSel1) btnAddSel1.style.display = 'none';
            const customCont1 = document.getElementById('musico-custom-song-container');
            if (customCont1) customCont1.style.display = 'none';
            
            const searchWrapper1 = document.querySelector('#musico-add-song-modal .search-wrapper');
            const resultsCont1 = document.getElementById('musico-add-song-results');
            const filtersCont1 = document.getElementById('filter-picker-todas')?.parentElement;
            const toggleBtn1 = document.getElementById('btn-musico-toggle-custom');
            
            if (searchWrapper1) searchWrapper1.style.display = 'block';
            if (resultsCont1) resultsCont1.style.display = 'block';
            if (filtersCont1) filtersCont1.style.display = 'flex';
            if (toggleBtn1) toggleBtn1.textContent = '+ Agregar Manual';

            document.getElementById('musico-add-song-modal').classList.add('active');`;

robustReplace(modalFix1, modalFix1_new);


const modalFix2 = `const btnAddSel2 = document.getElementById('btn-musico-add-selected');
        if (btnAddSel2) btnAddSel2.style.display = 'none';
        const customCont2 = document.getElementById('musico-custom-song-container');
        if (customCont2) customCont2.style.display = 'block';

        document.getElementById('musico-add-song-modal').classList.add('active');`;

const modalFix2_new = `const btnAddSel2 = document.getElementById('btn-musico-add-selected');
        if (btnAddSel2) btnAddSel2.style.display = 'none';
        const customCont2 = document.getElementById('musico-custom-song-container');
        if (customCont2) customCont2.style.display = 'none';
        
        const searchWrapper2 = document.querySelector('#musico-add-song-modal .search-wrapper');
        const resultsCont2 = document.getElementById('musico-add-song-results');
        const filtersCont2 = document.getElementById('filter-picker-todas')?.parentElement;
        const toggleBtn2 = document.getElementById('btn-musico-toggle-custom');
        
        if (searchWrapper2) searchWrapper2.style.display = 'block';
        if (resultsCont2) resultsCont2.style.display = 'block';
        if (filtersCont2) filtersCont2.style.display = 'flex';
        if (toggleBtn2) toggleBtn2.textContent = '+ Agregar Manual';

        document.getElementById('musico-add-song-modal').classList.add('active');`;

robustReplace(modalFix2, modalFix2_new);

// 2. Fix Admin Header
const adminHeaderOld = `<header class="app-header">
      <div class="logo">
        Alaban<svg viewBox="0 0 55 100" fill="currentColor"
          style="width: 0.55em; height: 1.1em; display: inline-block; vertical-align: middle; transform: translateY(-0.06em); margin: 0 -2px;">
          <path
            d="M32.108,45.02C31.428,42.709,30.78,40.425,30.195,38.209C34.229,34.433,37.429,29.413,37.5,21.283C37.536,17.06,37.032,12.006,33.025,6.535C31.843,4.922,29.604,4.519,27.934,5.621C23.985,8.227,20,14.457,20,22.5C20,26.253,20.699,30.663,21.782,35.411C20.949,36.021,20.077,36.63,19.177,37.259C12.86,41.667,5,47.153,5,60C5,74.084,16.44,82.5,27.5,82.5C29.658,82.5,31.729,82.271,33.677,81.841C33.684,82.066,33.688,82.285,33.688,82.5C33.688,85.257,31.445,87.5,28.688,87.5C27.352,87.5,26.096,86.98,25.153,86.036L19.848,91.339C22.209,93.7,25.348,95,28.688,95C35.581,95,41.188,89.393,41.188,82.5C41.188,81.387,41.118,80.206,40.986,78.964C46.528,75.615,50,70.154,50,63.75C50,53.699,42.05,45.47,32.108,45.02ZM29.244,15.311C29.86,17.224,30.017,19.139,30,21.218C29.973,24.421,29.287,26.889,28.125,28.943C27.729,26.582,27.5,24.41,27.5,22.5C27.5,19.607,28.264,17.158,29.244,15.311ZM27.5,75C20.229,75,12.5,69.743,12.5,60C12.5,51.065,17.341,47.686,23.469,43.409C23.573,43.337,23.677,43.264,23.781,43.192C24.103,44.346,24.438,45.509,24.78,46.677C19.873,49.271,16.188,54.53,16.188,60C16.188,63.338,17.488,66.477,19.848,68.838L25.153,63.535C24.209,62.59,23.688,61.335,23.688,59.999C23.688,57.909,25.121,55.645,27.027,54.157C27.096,54.384,27.166,54.611,27.234,54.838C29.303,61.627,31.419,68.566,32.64,74.372C31.05,74.78,29.322,75,27.5,75ZM39.503,70.664C38.239,65.243,36.406,59.209,34.508,52.981C39.128,54.381,42.5,58.679,42.5,63.75C42.5,67.58,41.442,70.932,39.503,70.664Z">
          </path>
        </svg>app <span>IMR4</span>
        <div style="display: flex; gap: 8px; align-items: center;">
          <!-- Selector de Tema Claro/Oscuro -->
          <button id="btn-leader-theme" class="theme-btn" title="Cambiar Tema">☀️</button>
          <div class="user-avatar-container" style="position: relative; cursor: pointer;" id="leader-avatar-container"
            title="Subir foto de perfil">
            <div id="leader-avatar" class="avatar"
              style="width: 32px; height: 32px; font-size: 13px; background-size: cover; background-position: center; border: 1.5px solid var(--border2); transition: transform 0.2s;">
            </div>
          </div>
          <span class="role-badge" id="display-role">Cargando...</span>
          <button class="btn-logout" id="btn-logout">Salir</button>
        </div>
    </header>`;

const adminHeaderNew = `<header class="app-header" style="justify-content: flex-start; gap: 16px; flex-wrap: wrap;">
      <div class="logo">
        Alaban<svg viewBox="0 0 55 100" fill="currentColor" style="width: 0.55em; height: 1.1em; display: inline-block; vertical-align: middle; transform: translateY(-0.06em); margin: 0 -2px;"><path d="M32.108,45.02C31.428,42.709,30.78,40.425,30.195,38.209C34.229,34.433,37.429,29.413,37.5,21.283C37.536,17.06,37.032,12.006,33.025,6.535C31.843,4.922,29.604,4.519,27.934,5.621C23.985,8.227,20,14.457,20,22.5C20,26.253,20.699,30.663,21.782,35.411C20.949,36.021,20.077,36.63,19.177,37.259C12.86,41.667,5,47.153,5,60C5,74.084,16.44,82.5,27.5,82.5C29.658,82.5,31.729,82.271,33.677,81.841C33.684,82.066,33.688,82.285,33.688,82.5C33.688,85.257,31.445,87.5,28.688,87.5C27.352,87.5,26.096,86.98,25.153,86.036L19.848,91.339C22.209,93.7,25.348,95,28.688,95C35.581,95,41.188,89.393,41.188,82.5C41.188,81.387,41.118,80.206,40.986,78.964C46.528,75.615,50,70.154,50,63.75C50,53.699,42.05,45.47,32.108,45.02ZM29.244,15.311C29.86,17.224,30.017,19.139,30,21.218C29.973,24.421,29.287,26.889,28.125,28.943C27.729,26.582,27.5,24.41,27.5,22.5C27.5,19.607,28.264,17.158,29.244,15.311ZM27.5,75C20.229,75,12.5,69.743,12.5,60C12.5,51.065,17.341,47.686,23.469,43.409C23.573,43.337,23.677,43.264,23.781,43.192C24.103,44.346,24.438,45.509,24.78,46.677C19.873,49.271,16.188,54.53,16.188,60C16.188,63.338,17.488,66.477,19.848,68.838L25.153,63.535C24.209,62.59,23.688,61.335,23.688,59.999C23.688,57.909,25.121,55.645,27.027,54.157C27.096,54.384,27.166,54.611,27.234,54.838C29.303,61.627,31.419,68.566,32.64,74.372C31.05,74.78,29.322,75,27.5,75ZM39.503,70.664C38.239,65.243,36.406,59.209,34.508,52.981C39.128,54.381,42.5,58.679,42.5,63.75C42.5,67.58,41.442,70.932,39.503,70.664Z"></path></svg>app <span>IMR4</span>
      </div>
      <div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
        <span class="role-badge" id="display-role">Cargando...</span>
        
        <div class="user-avatar-container" style="position: relative; cursor: pointer; display: flex; align-items: center; gap: 4px;" id="leader-avatar-container" title="Opciones">
          <div id="leader-avatar" class="avatar" style="width: 32px; height: 32px; font-size: 13px; background-size: cover; background-position: center; border: 1.5px solid var(--border2); transition: transform 0.2s;"></div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--text2);"><polyline points="6 9 12 15 18 9"></polyline></svg>
          
          <div id="leader-avatar-dropdown" style="display: none; position: absolute; top: 40px; right: 0; background: var(--bg3); border: 1px solid var(--border); border-radius: 8px; padding: 8px; width: 220px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); z-index: 1000;">
            <button id="btn-leader-logout-dropdown" style="width: 100%; text-align: left; background: none; border: none; padding: 10px; color: #ff5252; cursor: pointer; display: flex; align-items: center; gap: 8px; font-weight: 600; border-radius: 4px;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
              Cerrar Sesión
            </button>
          </div>
        </div>
        
        <button id="btn-leader-theme" class="theme-btn" title="Cambiar Tema">☀️</button>
        <button class="btn-logout" id="btn-logout" style="display: none;">Salir</button>
      </div>
    </header>`;

robustReplace(adminHeaderOld, adminHeaderNew);

// 3. Fix Musico Header
const musicoHeaderOld = `<header class="app-header">
      <div class="logo">
        Alaban<svg viewBox="0 0 55 100" fill="currentColor"
          style="width: 0.55em; height: 1.1em; display: inline-block; vertical-align: middle; transform: translateY(-0.06em); margin: 0 -2px;">
          <path
            d="M32.108,45.02C31.428,42.709,30.78,40.425,30.195,38.209C34.229,34.433,37.429,29.413,37.5,21.283C37.536,17.06,37.032,12.006,33.025,6.535C31.843,4.922,29.604,4.519,27.934,5.621C23.985,8.227,20,14.457,20,22.5C20,26.253,20.699,30.663,21.782,35.411C20.949,36.021,20.077,36.63,19.177,37.259C12.86,41.667,5,47.153,5,60C5,74.084,16.44,82.5,27.5,82.5C29.658,82.5,31.729,82.271,33.677,81.841C33.684,82.066,33.688,82.285,33.688,82.5C33.688,85.257,31.445,87.5,28.688,87.5C27.352,87.5,26.096,86.98,25.153,86.036L19.848,91.339C22.209,93.7,25.348,95,28.688,95C35.581,95,41.188,89.393,41.188,82.5C41.188,81.387,41.118,80.206,40.986,78.964C46.528,75.615,50,70.154,50,63.75C50,53.699,42.05,45.47,32.108,45.02ZM29.244,15.311C29.86,17.224,30.017,19.139,30,21.218C29.973,24.421,29.287,26.889,28.125,28.943C27.729,26.582,27.5,24.41,27.5,22.5C27.5,19.607,28.264,17.158,29.244,15.311ZM27.5,75C20.229,75,12.5,69.743,12.5,60C12.5,51.065,17.341,47.686,23.469,43.409C23.573,43.337,23.677,43.264,23.781,43.192C24.103,44.346,24.438,45.509,24.78,46.677C19.873,49.271,16.188,54.53,16.188,60C16.188,63.338,17.488,66.477,19.848,68.838L25.153,63.535C24.209,62.59,23.688,61.335,23.688,59.999C23.688,57.909,25.121,55.645,27.027,54.157C27.096,54.384,27.166,54.611,27.234,54.838C29.303,61.627,31.419,68.566,32.64,74.372C31.05,74.78,29.322,75,27.5,75ZM39.503,70.664C38.239,65.243,36.406,59.209,34.508,52.981C39.128,54.381,42.5,58.679,42.5,63.75C42.5,67.58,41.442,70.932,39.503,70.664Z">
          </path>
        </svg>app <span>IMR4</span>
        <div style="display: flex; gap: 8px; align-items: center;">
          <!-- Botón S.O.S estático en cabecera -->
          <button id="btn-musico-sos" class="sos-btn" title="Pedir Asistencia (S.O.S)">S.O.S</button>
          <!-- Selector de Tema Claro/Oscuro -->
          <button id="btn-musico-theme" class="theme-btn" title="Cambiar Tema">☀️</button>
          <div class="user-avatar-container" style="position: relative; cursor: pointer;" id="musico-avatar-container"
            title="Subir foto de perfil">
            <div id="musico-avatar" class="avatar"
              style="width: 32px; height: 32px; font-size: 13px; background-size: cover; background-position: center; border: 1.5px solid var(--border2); transition: transform 0.2s;">
            </div>
            <div id="musico-avatar-dropdown" style="display: none; position: absolute; top: 40px; right: 0; background: var(--bg3); border: 1px solid var(--border); border-radius: 8px; padding: 8px; width: 220px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); z-index: 1000;">
              <button id="btn-musico-change-pic" style="width: 100%; text-align: center; padding: 10px; background: transparent; border: none; color: var(--text); font-size: 13px; cursor: pointer; border-radius: 4px; margin-bottom: 4px;">📸 Cambiar foto de perfil</button>
              <button id="btn-musico-update" style="width: 100%; text-align: center; padding: 10px; background: transparent; border: none; color: var(--text); font-size: 13px; cursor: pointer; border-radius: 4px;">🔄 Buscar actualizaciones</button>
            </div>
          </div>
          <span id="musico-name-badge" class="role-badge"></span>
          <button class="btn-logout" id="btn-musico-logout">Salir</button>
        </div>
    </header>`;

const musicoHeaderNew = `<header class="app-header" style="justify-content: flex-start; gap: 16px; flex-wrap: wrap;">
      <div class="logo">
        Alaban<svg viewBox="0 0 55 100" fill="currentColor" style="width: 0.55em; height: 1.1em; display: inline-block; vertical-align: middle; transform: translateY(-0.06em); margin: 0 -2px;"><path d="M32.108,45.02C31.428,42.709,30.78,40.425,30.195,38.209C34.229,34.433,37.429,29.413,37.5,21.283C37.536,17.06,37.032,12.006,33.025,6.535C31.843,4.922,29.604,4.519,27.934,5.621C23.985,8.227,20,14.457,20,22.5C20,26.253,20.699,30.663,21.782,35.411C20.949,36.021,20.077,36.63,19.177,37.259C12.86,41.667,5,47.153,5,60C5,74.084,16.44,82.5,27.5,82.5C29.658,82.5,31.729,82.271,33.677,81.841C33.684,82.066,33.688,82.285,33.688,82.5C33.688,85.257,31.445,87.5,28.688,87.5C27.352,87.5,26.096,86.98,25.153,86.036L19.848,91.339C22.209,93.7,25.348,95,28.688,95C35.581,95,41.188,89.393,41.188,82.5C41.188,81.387,41.118,80.206,40.986,78.964C46.528,75.615,50,70.154,50,63.75C50,53.699,42.05,45.47,32.108,45.02ZM29.244,15.311C29.86,17.224,30.017,19.139,30,21.218C29.973,24.421,29.287,26.889,28.125,28.943C27.729,26.582,27.5,24.41,27.5,22.5C27.5,19.607,28.264,17.158,29.244,15.311ZM27.5,75C20.229,75,12.5,69.743,12.5,60C12.5,51.065,17.341,47.686,23.469,43.409C23.573,43.337,23.677,43.264,23.781,43.192C24.103,44.346,24.438,45.509,24.78,46.677C19.873,49.271,16.188,54.53,16.188,60C16.188,63.338,17.488,66.477,19.848,68.838L25.153,63.535C24.209,62.59,23.688,61.335,23.688,59.999C23.688,57.909,25.121,55.645,27.027,54.157C27.096,54.384,27.166,54.611,27.234,54.838C29.303,61.627,31.419,68.566,32.64,74.372C31.05,74.78,29.322,75,27.5,75ZM39.503,70.664C38.239,65.243,36.406,59.209,34.508,52.981C39.128,54.381,42.5,58.679,42.5,63.75C42.5,67.58,41.442,70.932,39.503,70.664Z"></path></svg>app <span>IMR4</span>
      </div>
      <div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
        <button id="btn-musico-sos" class="sos-btn" title="Pedir Asistencia (S.O.S)" style="padding: 8px 14px; font-size: 13px;">S.O.S</button>
        <span id="musico-name-badge" class="role-badge"></span>
        
        <div class="user-avatar-container" style="position: relative; cursor: pointer; display: flex; align-items: center; gap: 4px;" id="musico-avatar-container" title="Opciones">
          <div id="musico-avatar" class="avatar" style="width: 32px; height: 32px; font-size: 13px; background-size: cover; background-position: center; border: 1.5px solid var(--border2); transition: transform 0.2s;"></div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--text2);"><polyline points="6 9 12 15 18 9"></polyline></svg>
          
          <div id="musico-avatar-dropdown" style="display: none; position: absolute; top: 40px; right: 0; background: var(--bg3); border: 1px solid var(--border); border-radius: 8px; padding: 8px; width: 220px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); z-index: 1000;">
            <button id="btn-musico-change-pic" style="width: 100%; text-align: left; padding: 10px; background: transparent; border: none; color: var(--text); font-size: 13px; cursor: pointer; border-radius: 4px; border-bottom: 1px solid var(--border2); display: flex; align-items: center; gap: 8px;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg> Cambiar foto</button>
            <button id="btn-musico-update" style="width: 100%; text-align: left; padding: 10px; background: transparent; border: none; color: var(--gold); font-size: 13px; cursor: pointer; border-radius: 4px; border-bottom: 1px solid var(--border2); display: flex; align-items: center; gap: 8px; font-weight: 600;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.59-13.51l5.39 5.39"/></svg> Buscar actualización</button>
            <button id="btn-musico-logout-dropdown" style="width: 100%; text-align: left; background: none; border: none; padding: 10px; color: #ff5252; cursor: pointer; display: flex; align-items: center; gap: 8px; font-weight: 600; border-radius: 4px;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg> Cerrar Sesión
            </button>
          </div>
        </div>
        
        <button id="btn-musico-theme" class="theme-btn" title="Cambiar Tema">☀️</button>
        <button class="btn-logout" id="btn-musico-logout" style="display: none;">Salir</button>
      </div>
    </header>`;

robustReplace(musicoHeaderOld, musicoHeaderNew);

// 4. Inject logic for admin dropdown
const adminLogic = `      // Nodos DOM globales
      // Lógica de Opciones (Admin Dropdown)
      const leaderAvBtn = document.getElementById('leader-avatar-container');
      if (leaderAvBtn) {
        leaderAvBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const dropdown = document.getElementById('leader-avatar-dropdown');
          if (dropdown) {
            dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
          }
        });
      }
      const btnLeaderLogoutDrop = document.getElementById('btn-leader-logout-dropdown');
      if (btnLeaderLogoutDrop) {
        btnLeaderLogoutDrop.addEventListener('click', () => {
          document.getElementById('btn-logout')?.click();
        });
      }

      document.addEventListener('click', (e) => {
        const leaderDrop = document.getElementById('leader-avatar-dropdown');
        if (leaderDrop && leaderDrop.style.display === 'block' && !e.target.closest('#leader-avatar-container')) {
          leaderDrop.style.display = 'none';
        }
      });
`;
robustReplace("      // Nodos DOM globales", adminLogic);

// 5. Inject logic for musico logout dropdown
const musicoLogoutLogic = `      const btnMusicoLogoutDrop = document.getElementById('btn-musico-logout-dropdown');
      if (btnMusicoLogoutDrop) {
        btnMusicoLogoutDrop.addEventListener('click', () => {
          document.getElementById('btn-musico-logout')?.click();
        });
      }
      const btnUpdatePwa = document.getElementById('btn-musico-update');`;
robustReplace("      const btnUpdatePwa = document.getElementById('btn-musico-update');", musicoLogoutLogic);

fs.writeFileSync('index.html', html);

// bump sw
let sw = fs.readFileSync('sw.js', 'utf8');
sw = sw.replace(/alabanza-imr4-v\d+/g, 'alabanza-imr4-v51');
fs.writeFileSync('sw.js', sw);

console.log("Done");


      // Utility function to format dates as YYYY-MM-DD in local time
      window.formatLocalDate = function (d) {
        if (!d) d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      // Placeholder to hook global Firebase references
      let db = null;
      let collection = null;
      let addDoc = null;
      let doc = null;
      let getDoc = null;
      let updateDoc = null;
      let deleteDoc = null;
      let onSnapshot = null;
      let showToast = null;
      let activeSessionUser = null;
      let editingEnsayoId = null;

      // Define function to setup rehearsal listeners and logic once Firebase is ready
      window.initRehearsalsLogic = function (firebaseRefs) {
        db = firebaseRefs.db;
        collection = firebaseRefs.collection;
        addDoc = firebaseRefs.addDoc;
        doc = firebaseRefs.doc;
        getDoc = firebaseRefs.getDoc;
        updateDoc = firebaseRefs.updateDoc;
        deleteDoc = firebaseRefs.deleteDoc;
        onSnapshot = firebaseRefs.onSnapshot;
        showToast = firebaseRefs.showToast;

        // Bind btn-add-ensayo now that Firebase is ready and DOM is fully loaded
        const btnAddEnsayo = document.getElementById('btn-add-ensayo');
        const modalEnsayo = document.getElementById('admin-ensayo-modal');
        const btnCancelEnsayo = document.getElementById('btn-cancel-ensayo');
        const btnSaveEnsayo = document.getElementById('btn-save-ensayo');

        if (btnAddEnsayo && !btnAddEnsayo.dataset.hasListener) {
          btnAddEnsayo.dataset.hasListener = "true";
          btnAddEnsayo.addEventListener('click', () => {
            editingEnsayoId = null; // Reset editing mode
            window._tempSelectedSongs = [];
            window._tempSelectedTones = {};

            try {
              if (window.renderEnsayoMembers) {
                window.renderEnsayoMembers([]);
              }
            } catch (e) {
              console.error("Error al renderizar miembros para el ensayo:", e);
            }

            // Clear search input
            const searchInput = document.getElementById('search-ensayo-songs');
            if (searchInput) searchInput.value = '';

            try {
              if (typeof renderEnsayoCancionesModal === 'function') {
                renderEnsayoCancionesModal(window._tempSelectedSongs, window._tempSelectedTones);
              }
            } catch (e) {
              console.error("Error al renderizar canciones para el ensayo:", e);
            }

            // Reset fields safely
            const nameEl = document.getElementById('ensayo-nombre');
            const dateEl = document.getElementById('ensayo-fecha');
            const hhEl = document.getElementById('ensayo-hora-hh');
            const mmEl = document.getElementById('ensayo-hora-mm');
            const ampmEl = document.getElementById('ensayo-hora-ampm');
            if (nameEl) nameEl.value = '';
            if (dateEl) dateEl.value = '';
            if (hhEl) hhEl.value = '';
            if (mmEl) mmEl.value = '';
            if (ampmEl) ampmEl.value = 'PM';

            // Reset notify radio
            const defaultNotify = document.querySelector('input[name="ensayo-notify-mode"][value="app"]');
            if (defaultNotify) defaultNotify.checked = true;

            if (modalEnsayo) {
              modalEnsayo.classList.add('active');
            } else {
              console.error("No se encontró el elemento admin-ensayo-modal en el DOM.");
            }
          });
        }

        if (btnCancelEnsayo && !btnCancelEnsayo.dataset.hasListener) {
          btnCancelEnsayo.dataset.hasListener = "true";
          btnCancelEnsayo.addEventListener('click', () => {
            if (modalEnsayo) modalEnsayo.classList.remove('active');
          });
        }

        // Search input keyup/input handler
        const searchInput = document.getElementById('search-ensayo-songs');
        if (searchInput && !searchInput.dataset.hasListener) {
          searchInput.dataset.hasListener = "true";
          searchInput.addEventListener('input', window.debounce(() => {
            renderEnsayoCancionesModal(window._tempSelectedSongs || [], window._tempSelectedTones || {});
          }, 300));
        }

        if (btnSaveEnsayo && !btnSaveEnsayo.dataset.hasListener) {
          btnSaveEnsayo.dataset.hasListener = "true";
          btnSaveEnsayo.addEventListener('click', async () => {
            // Prevent double submission
            if (btnSaveEnsayo.disabled) return;
            btnSaveEnsayo.disabled = true;
            const originalText = btnSaveEnsayo.textContent;
            btnSaveEnsayo.textContent = 'Guardando...';

            const ensayoMiembrosList = document.getElementById('ensayo-miembros-list');
            const nombreInput = document.getElementById('ensayo-nombre');
            const fechaInput = document.getElementById('ensayo-fecha');
            const hhInput = document.getElementById('ensayo-hora-hh');
            const mmInput = document.getElementById('ensayo-hora-mm');
            const ampmInput = document.getElementById('ensayo-hora-ampm');

            const nombre = nombreInput ? nombreInput.value.trim() : '';
            const fecha = fechaInput ? fechaInput.value : '';
            const hh = hhInput ? hhInput.value : '';
            const mm = mmInput ? mmInput.value : '';
            const ampm = ampmInput ? ampmInput.value : 'PM';

            let hora = '';
            if (hh && mm) {
              hora = `${hh}:${mm} ${ampm}`;
            }

            if (!fecha) {
              alert('Selecciona una fecha para el ensayo.');
              btnSaveEnsayo.disabled = false;
              btnSaveEnsayo.textContent = originalText;
              return;
            }
            const defaultLabel = `Ensayo ${fecha}${hora ? ' ' + hora : ''}`;
            const etiqueta = nombre || defaultLabel;

            // Members
            const selectedIds = [];
            if (ensayoMiembrosList) {
              ensayoMiembrosList.querySelectorAll('.assign-check.on').forEach(el => {
                const id = el.getAttribute('data-id');
                if (id) selectedIds.push(id);
              });
            }
            if (selectedIds.length === 0) {
              alert('Selecciona al menos un integrante.');
              btnSaveEnsayo.disabled = false;
              btnSaveEnsayo.textContent = originalText;
              return;
            }

            // Songs
            const selectedSongIds = window._tempSelectedSongs || [];
            const tonos = window._tempSelectedTones || {};

            // Read notify mode
            const notifyVal = document.querySelector('input[name="ensayo-notify-mode"]:checked')?.value || 'app';

            try {
              if (editingEnsayoId) {
                // UPDATE
                await updateDoc(doc(db, 'ensayos', editingEnsayoId), {
                  nombre: etiqueta,
                  fecha: fecha,
                  hora: hora,
                  miembros: selectedIds,
                  canciones: selectedSongIds,
                  tonos: tonos
                });
                showToast(`Ensayo "${etiqueta}" actualizado`);
              } else {
                // CREATE
                await addDoc(collection(db, 'ensayos'), {
                  nombre: etiqueta,
                  fecha: fecha,
                  hora: hora,
                  miembros: selectedIds,
                  canciones: selectedSongIds,
                  tonos: tonos,
                  confirmaciones: {}
                });
                showToast(`Ensayo "${etiqueta}" creado`);
              }

              if (modalEnsayo) modalEnsayo.classList.remove('active');
              if (nombreInput) nombreInput.value = '';
              if (fechaInput) fechaInput.value = '';
              if (hhInput) hhInput.value = '';
              if (mmInput) mmInput.value = '';
              if (ampmInput) ampmInput.value = 'PM';

              if (window.renderEnsayosAdmin) window.renderEnsayosAdmin();

              // Handle WhatsApp notification if selected
              if (notifyVal === 'both') {
                let msg = `*CONVOCATORIA A ENSAYO*\n\n`;
                msg += `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px;"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg> *Ensayo:* ${etiqueta}\n`;
                msg += `📅 *Fecha:* ${fecha}\n`;
                msg += `⏰ *Hora:* ${hora ? hora : 'No especificada'}\n\n`;

                const mList = window.cacheMembers || [];
                const musiciansNames = selectedIds
                  .map(uid => mList.find(x => x.usuario === uid))
                  .filter(x => x && x.type !== 'corista')
                  .map(x => x.nombre)
                  .join(', ');
                const singersNames = selectedIds
                  .map(uid => mList.find(x => x.usuario === uid))
                  .filter(x => x && x.type === 'corista')
                  .map(x => x.nombre)
                  .join(', ');

                if (musiciansNames) {
                  msg += `*Músicos Convocados:* ${musiciansNames}\n`;
                }
                if (singersNames) {
                  msg += `*Voces Convocadas:* ${singersNames}\n`;
                }
                msg += `\n`;

                if (selectedSongIds.length > 0) {
                  msg += ` *Canciones a ensayar:* \n`;
                  selectedSongIds.forEach((sid, idx) => {
                    const s = (window.cacheSongs || []).find(x => x.id === sid);
                    if (s) {
                      const toneStr = tonos[sid] ? ` (Tono: ${tonos[sid]})` : ` (Tono: ${s.tonoBase})`;
                      msg += `  ${idx + 1}. *${s.nombre}* (${s.artista})${toneStr}`;
                      if (s.youtube && s.youtube.trim()) {
                        msg += `\n     Link: ${s.youtube}`;
                      }
                      msg += `\n`;
                    }
                  });
                }

                // WhatsApp redirection
                const encodedMsg = encodeURIComponent(msg);
                const groupLink = (window._whatsappGroupLink || "").trim();
                let waUrl;
                if (groupLink && groupLink.startsWith('https://wa.me/')) {
                  waUrl = groupLink.split('?')[0] + '?text=' + encodedMsg;
                } else if (groupLink) {
                  waUrl = groupLink + (groupLink.includes('?') ? '&' : '?') + 'text=' + encodedMsg;
                } else {
                  waUrl = 'https://api.whatsapp.com/send?text=' + encodedMsg;
                }

                // Open synchronously
                const a = document.createElement('a');
                a.href = waUrl;
                a.target = '_blank';
                a.rel = 'noopener noreferrer';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
              }
            } catch (err) {
              console.error('Error procesando ensayo', err);
              alert('Error al procesar el ensayo: ' + err.message);
            } finally {
              btnSaveEnsayo.disabled = false;
              btnSaveEnsayo.textContent = originalText;
            }
          });
        }

        // Initialize view rendering
        if (window.renderEnsayosAdmin) window.renderEnsayosAdmin();
      };

      window.updateRehearsalsActiveUser = function (user) {
        activeSessionUser = user;
        renderEnsayosMusico();
      };

      // ==============================
      // ENSAYO HELPERS
      // ==============================

      // Populate song checkboxes inside the modal (with search and key selection)
      function renderEnsayoCancionesModal(selectedSongIds = [], selectedTones = {}) {
        const cont = document.getElementById('ensayo-canciones-list');
        if (!cont) return;
        cont.innerHTML = '';
        if (!window.cacheSongs || !Array.isArray(window.cacheSongs) || window.cacheSongs.length === 0) {
          cont.innerHTML = `<p style='color:var(--text3);font-size:12px;text-align:center;'>No hay canciones en la biblioteca aún.</p>`;
          return;
        }
        const filterVal = removeAccents(document.getElementById('search-ensayo-songs')?.value || "").toLowerCase().trim();

        window.cacheSongs.forEach(s => {
          if (!s) return;
          const nameVal = s.nombre || 'Canción sin título';
          const artistVal = s.artista || 'Artista Desconocido';
          const typeVal = s.tipo || 'alabanza';

          if (filterVal && !removeAccents(nameVal).toLowerCase().includes(filterVal) && !removeAccents(artistVal).toLowerCase().includes(filterVal)) {
            return;
          }

          const div = document.createElement('div');
          div.className = 'member-row';
          div.style.padding = '6px 0';
          const isSelected = selectedSongIds.includes(s.id);
          const displayTone = selectedTones[s.id] || s.tonoBase || 'C';
          const keysOptions = ['C', 'Cm', 'C#', 'C#m', 'D', 'Dm', 'D#', 'D#m', 'E', 'Em', 'F', 'Fm', 'F#', 'F#m', 'G', 'Gm', 'G#', 'G#m', 'A', 'Am', 'A#', 'A#m', 'B', 'Bm'];

          div.innerHTML = `
            <div class="assign-check ${isSelected ? 'on' : ''}" data-song-id="${s.id}"></div>
            <div class="member-info" style="flex:1; min-width:0; display:flex; justify-content:space-between; align-items:center; gap:8px;">
              <div>
                <div class="member-name" style="font-size:13px; font-weight:500;">${nameVal}</div>
                <div class="member-role">${artistVal} | <span class="chip-type chip-${typeVal}">${typeVal}</span></div>
              </div>
              <div class="ensayo-tone-selector-container" style="display: ${isSelected ? 'inline-flex' : 'none'}; align-items: center; gap: 4px;">
                <span style="font-size: 11px; color: var(--gold);">Tono:</span>
                <select class="select-ensayo-tone" style="background:var(--bg3); border:1px solid rgba(244,197,66,0.5); color:var(--gold); border-radius:4px; padding:1px 4px; font-size:11px; font-family:var(--font-body); outline:none; cursor:pointer;">
                  ${keysOptions.map(t => `<option value="${t}" ${t === displayTone ? 'selected' : ''}>${t}</option>`).join('')}
                </select>
              </div>
            </div>
          `;

          div.querySelector('.assign-check').addEventListener('click', e => {
            e.stopPropagation();
            const checkbox = e.currentTarget;
            checkbox.classList.toggle('on');
            const isChecked = checkbox.classList.contains('on');
            const toneContainer = div.querySelector('.ensayo-tone-selector-container');

            if (isChecked) {
              if (!selectedSongIds.includes(s.id)) selectedSongIds.push(s.id);
              if (!selectedTones[s.id]) selectedTones[s.id] = s.tonoBase || 'C';
              if (toneContainer) toneContainer.style.display = 'inline-flex';
            } else {
              const idx = selectedSongIds.indexOf(s.id);
              if (idx > -1) selectedSongIds.splice(idx, 1);
              delete selectedTones[s.id];
              if (toneContainer) toneContainer.style.display = 'none';
            }
          });

          const selectTone = div.querySelector('.select-ensayo-tone');
          if (selectTone) {
            selectTone.addEventListener('change', e => {
              selectedTones[s.id] = e.target.value;
            });
          }

          cont.appendChild(div);
        });

        if (cont.children.length === 0) {
          cont.innerHTML = `<p style='color:var(--text3);font-size:12px;text-align:center;padding:10px;'>No se encontraron canciones.</p>`;
        }
      }

      // Render member checkboxes for ensayo selection (categorized as Musicians & Voices)
      window.renderEnsayoMembers = function (selectedIds = []) {
        const ensayoMiembrosList = document.getElementById('ensayo-miembros-list');
        if (!ensayoMiembrosList) return;
        ensayoMiembrosList.innerHTML = '';
        if (!window.cacheMembers || !Array.isArray(window.cacheMembers)) return;

        // Group members by type
        const musicos = window.cacheMembers.filter(m => m && m.usuario !== 'admin' && m.type !== 'corista');
        const voces = window.cacheMembers.filter(m => m && m.usuario !== 'admin' && m.type === 'corista');

        const renderSection = (title, list) => {
          if (list.length === 0) return;
          const header = document.createElement('div');
          header.style.cssText = 'font-weight:600;font-size:11px;text-transform:uppercase;color:var(--teal);margin:8px 0 4px;letter-spacing:0.8px;';
          header.textContent = title;
          ensayoMiembrosList.appendChild(header);

          list.forEach(member => {
            const idVal = member.usuario || member.id || '';
            const nombreVal = member.nombre || 'Sin Nombre';
            const instVal = member.instrumento || (member.type === 'corista' ? 'Voz' : '');
            const div = document.createElement('div');
            div.className = 'member-row';
            const isSelected = selectedIds.includes(idVal);
            div.innerHTML = `
              <div class="assign-check ${isSelected ? 'on' : ''}" data-id="${idVal}"></div>
              <div class="member-info">
                <div class="member-name">${nombreVal}</div>
                <div class="member-role">${instVal}</div>
              </div>
            `;
            // toggle check on click
            div.querySelector('.assign-check').addEventListener('click', (e) => {
              e.stopPropagation();
              e.currentTarget.classList.toggle('on');
            });
            ensayoMiembrosList.appendChild(div);
          });
        };

        renderSection('Músicos', musicos);
        renderSection('Voces', voces);
      }
    
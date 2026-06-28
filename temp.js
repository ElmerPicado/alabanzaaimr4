
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

        // Setup filter buttons
        const btnFilterEnsTodas = document.getElementById('filter-ensayo-todas');
        const btnFilterEnsOficial = document.getElementById('filter-ensayo-oficial');
        window.currentEnsayoPickerFilter = 'todas';

        if (btnFilterEnsTodas && !btnFilterEnsTodas.dataset.hasListener) {
          btnFilterEnsTodas.dataset.hasListener = "true";
          btnFilterEnsTodas.addEventListener('click', () => {
            window.currentEnsayoPickerFilter = 'todas';
            btnFilterEnsTodas.style.background = 'var(--bg2)';
            btnFilterEnsTodas.style.color = 'var(--gold)';
            btnFilterEnsTodas.style.boxShadow = '0 1px 4px rgba(0,0,0,0.2)';
            btnFilterEnsOficial.style.background = 'transparent';
            btnFilterEnsOficial.style.color = 'var(--text2)';
            btnFilterEnsOficial.style.boxShadow = 'none';
            renderEnsayoCancionesModal(window._tempSelectedSongs || [], window._tempSelectedTones || {});
          });
        }
        if (btnFilterEnsOficial && !btnFilterEnsOficial.dataset.hasListener) {
          btnFilterEnsOficial.dataset.hasListener = "true";
          btnFilterEnsOficial.addEventListener('click', () => {
            window.currentEnsayoPickerFilter = 'oficial';
            btnFilterEnsOficial.style.background = 'var(--bg2)';
            btnFilterEnsOficial.style.color = 'var(--gold)';
            btnFilterEnsOficial.style.boxShadow = '0 1px 4px rgba(0,0,0,0.2)';
            btnFilterEnsTodas.style.background = 'transparent';
            btnFilterEnsTodas.style.color = 'var(--text2)';
            btnFilterEnsTodas.style.boxShadow = 'none';
            renderEnsayoCancionesModal(window._tempSelectedSongs || [], window._tempSelectedTones || {});
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
              customAlert('Selecciona una fecha para el ensayo.');
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
              customAlert('Selecciona al menos un integrante.');
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
              customAlert('Error al procesar el ensayo: ' + err.message);
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

        // Lógica perezosa para evitar congelamientos
        if (window.currentEnsayoPickerFilter === 'todas' && filterVal.length < 2) {
          cont.innerHTML = `<p style="color:var(--text3); font-size:12px; text-align:center; padding:15px;">Escribe al menos 2 letras para buscar en la lista global.</p>`;
          return;
        }

        let addedCount = 0;

        window.cacheSongs.forEach(s => {
          if (!s) return;
          const nameVal = s.nombre || 'Canción sin título';
          const artistVal = s.artista || 'Artista Desconocido';
          const typeVal = s.tipo || 'alabanza';

          if (filterVal && !removeAccents(nameVal).toLowerCase().includes(filterVal) && !removeAccents(artistVal).toLowerCase().includes(filterVal)) {
            return;
          }

          if (window.currentEnsayoPickerFilter === 'oficial' && s.oficial !== true) {
            return;
          }

          addedCount++;

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
                <div class="member-name" style="font-size:13px; font-weight:500;">${nameVal} ${s.oficial ? '<span class="badge-oficial" style="display:inline-block; vertical-align:middle; margin-left:6px;">OFICIAL</span>' : ''}</div>
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

          div.style.cursor = 'pointer';
          div.addEventListener('click', e => {
            if (e.target.tagName === 'SELECT' || e.target.tagName === 'OPTION') return;
            const checkbox = div.querySelector('.assign-check');
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

        if (addedCount === 0) {
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
            div.style.cursor = 'pointer';
            // toggle check on click
            div.addEventListener('click', () => {
              div.querySelector('.assign-check').classList.toggle('on');
            });
            ensayoMiembrosList.appendChild(div);
          });
        };

        renderSection('Músicos', musicos);
        renderSection('Voces', voces);
      }
    

      // ============================================================
      // RENDER ENSAYOS – VISTA ADMIN (tarjetas ricas con confirmaciones)
      // ============================================================
      window.renderEnsayosAdmin = function () {
        const cont = document.getElementById('ensayo-list');
        if (!cont) return;
        cont.innerHTML = '';
        if (!db || !collection || !onSnapshot) return;
        onSnapshot(collection(db, 'ensayos'), (snap) => {
          const ensayos = [];
          snap.forEach(docSnap => {
            const data = docSnap.data();
            data.id = docSnap.id;
            ensayos.push(data);
          });
          if (ensayos.length === 0) {
            cont.innerHTML = `<p style='color:var(--text3);font-size:13px;text-align:center;padding:20px;'>No hay ensayos programados aún. Crea uno con el botón de arriba.</p>`;
            return;
          }
          ensayos.sort((a, b) => {
            const dateA = a.fecha || '';
            const dateB = b.fecha || '';
            return dateA.localeCompare(dateB);
          });
          cont.innerHTML = '';
          ensayos.forEach(e => {
            const totalMiembros = e.miembros ? e.miembros.length : 0;
            const confirmados = Object.values(e.confirmaciones || {}).filter(v => v === true || v === 'confirmado').length;
            const songNames = (e.canciones || []).map(sid => {
              const s = (window.cacheSongs || []).find(x => x.id === sid);
              const toneStr = (e.tonos && e.tonos[sid]) ? ` (${e.tonos[sid]})` : (s ? ` (${s.tonoBase})` : '');
              return s ? `${s.nombre}${toneStr}` : sid;
            }).join(', ') || 'Sin canciones';

            const card = document.createElement('div');
            card.className = 'card';
            card.style.cssText = 'margin-bottom:12px; border-color: var(--teal);';
            card.innerHTML = `
            <div class="ensayo-card-wrapper">
              <div class="ensayo-card-info">
                <div class="ensayo-card-title"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px;"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg> ${e.nombre}</div>
                <div class="ensayo-card-date">📅 ${(e.fecha || '').split('-').reverse().join('/')}${e.hora ? ' &nbsp;⏰ ' + e.hora : ''}</div>
                <div class="ensayo-card-confirmations">👥 ${confirmados}/${totalMiembros} confirmados</div>
                <div class="ensayo-card-songs"> ${songNames}</div>
              </div>
              <div class="ensayo-card-actions">
                <button class="btn-ver-conf chip chip-teal">👁 Confirmaciones</button>
                <button class="btn-edit-ensayo chip chip-gold">✏️ Editar</button>
                <button class="btn-del-ensayo chip chip-coral" data-id="${e.id}">🗑 Eliminar</button>
              </div>
            </div>
          `;
            card.querySelector('.btn-ver-conf').addEventListener('click', () => openEnsayoAdmin(e.id));
            card.querySelector('.btn-edit-ensayo').addEventListener('click', () => {
              editingEnsayoId = e.id;
              window._tempSelectedSongs = [...(e.canciones || [])];
              window._tempSelectedTones = { ...(e.tonos || {}) };

              const nameEl = document.getElementById('ensayo-nombre');
              const dateEl = document.getElementById('ensayo-fecha');
              if (nameEl) nameEl.value = e.nombre || '';
              if (dateEl) dateEl.value = e.fecha || '';

              // Parse and populate custom 12-hour selectors
              let hh = '';
              let mm = '';
              let ampm = 'PM';
              if (e.hora) {
                const parts = e.hora.split(' ');
                if (parts.length === 2) {
                  const timeParts = parts[0].split(':');
                  hh = timeParts[0];
                  mm = timeParts[1];
                  ampm = parts[1];
                } else if (e.hora.includes(':')) {
                  const timeParts = e.hora.split(':');
                  let hour24 = parseInt(timeParts[0], 10);
                  let min = timeParts[1];
                  if (!isNaN(hour24)) {
                    if (hour24 >= 12) {
                      ampm = 'PM';
                      let h12 = hour24 % 12;
                      hh = (h12 === 0 ? 12 : h12).toString().padStart(2, '0');
                    } else {
                      ampm = 'AM';
                      let h12 = hour24;
                      hh = (h12 === 0 ? 12 : h12).toString().padStart(2, '0');
                    }
                    mm = min;
                  }
                }
              }
              const hhEl = document.getElementById('ensayo-hora-hh');
              const mmEl = document.getElementById('ensayo-hora-mm');
              const ampmEl = document.getElementById('ensayo-hora-ampm');
              if (hhEl) hhEl.value = hh;
              if (mmEl) mmEl.value = mm;
              if (ampmEl) ampmEl.value = ampm;

              // Render members with current pre-selected ones
              if (window.renderEnsayoMembers) {
                window.renderEnsayoMembers(e.miembros || []);
              }

              // Reset search input
              const searchInput = document.getElementById('search-ensayo-songs');
              if (searchInput) searchInput.value = '';

              // Render songs with current pre-selected ones
              if (typeof renderEnsayoCancionesModal === 'function') {
                renderEnsayoCancionesModal(window._tempSelectedSongs, window._tempSelectedTones);
              }

              // Reset filter picker
              const btnFilterEnsTodas = document.getElementById('filter-ensayo-todas');
              const btnFilterEnsOficial = document.getElementById('filter-ensayo-oficial');
              if (btnFilterEnsTodas && btnFilterEnsOficial) {
                window.currentEnsayoPickerFilter = 'todas';
                btnFilterEnsTodas.style.background = 'var(--bg2)';
                btnFilterEnsTodas.style.color = 'var(--gold)';
                btnFilterEnsTodas.style.boxShadow = '0 1px 4px rgba(0,0,0,0.2)';
                btnFilterEnsOficial.style.background = 'transparent';
                btnFilterEnsOficial.style.color = 'var(--text2)';
                btnFilterEnsOficial.style.boxShadow = 'none';
              }

              // Reset notify radio to default
              const defaultNotify = document.querySelector('input[name="ensayo-notify-mode"][value="app"]');
              if (defaultNotify) defaultNotify.checked = true;

              const modalEnsayo = document.getElementById('admin-ensayo-modal');
              if (modalEnsayo) modalEnsayo.classList.add('active');
            });
            card.querySelector('.btn-del-ensayo').addEventListener('click', async () => {
              if (await customConfirm(`¿Eliminar el ensayo "${e.nombre}"?`)) {
                await deleteDoc(doc(db, 'ensayos', e.id));
                showToast('🗑 Ensayo eliminado');
              }
            });
            cont.appendChild(card);
          });
        });
      }

      // Admin: ver tabla de confirmaciones
      window.openEnsayoAdmin = function (id) {
        if (!doc || !db || !getDoc) return;
        const docRef = doc(db, 'ensayos', id);
        getDoc(docRef).then(snap => {
          if (!snap.exists()) return;
          const data = snap.data();
          const confs = data.confirmaciones || {};
          const miembros = data.miembros || [];
          let lista = '';
          miembros.forEach(uid => {
            const m = (window.cacheMembers || []).find(x => x.usuario === uid);
            const nombre = m ? m.nombre : uid;
            const statusVal = confs[uid];
            let estado = 'Sin confirmar';
            if (statusVal === true || statusVal === 'confirmado') {
              estado = 'Confirmado';
            } else if (statusVal === 'indeciso') {
              estado = 'No sé aún';
            } else if (statusVal === false || statusVal === 'ausente') {
              estado = 'No puede';
            }
            lista += `\n  • ${nombre}: ${estado}`;
          });
          const confirmed = Object.values(confs).filter(v => v === true || v === 'confirmado').length;
          customAlert(`Ensayo: ${data.nombre}\nFecha: ${(data.fecha || '').split('-').reverse().join('/')}${data.hora ? ' ⏰ ' + data.hora : ''}\nConfirmados: ${confirmed}/${miembros.length}\n${lista}`);
        });
      }

      // ============================================================
      // RENDER ENSAYOS – VISTA MÚSICO (tarjetas con canciones + YouTube)
      // ============================================================
      window.renderEnsayosMusico = function () {
        const musicoId = activeSessionUser?.usuario;
        if (!musicoId) return;
        if (activeSessionUser?.role === 'lider') return; // Admins do not need musician rehearsal logic/popups
        const cont = document.getElementById('ensayo-list-musico');
        if (!cont) return;
        cont.innerHTML = '';
        if (!db || !collection || !onSnapshot) return;

        onSnapshot(collection(db, 'ensayos'), (snap) => {
          const ensayos = [];
          snap.forEach(docSnap => {
            const data = docSnap.data();
            data.id = docSnap.id;
            ensayos.push(data);
          });
          const filtered = ensayos.filter(e => e.miembros && e.miembros.includes(musicoId));
          cont.innerHTML = '';
          if (filtered.length === 0) {
            cont.innerHTML = `<p style='color:var(--text3);font-size:13px;text-align:center;padding:20px;'>No tienes ensayos programados todavía.</p>`;
            return;
          }
          filtered.sort((a, b) => {
            const dateA = a.fecha || '';
            const dateB = b.fecha || '';
            return dateA.localeCompare(dateB);
          });

          filtered.forEach(e => {
            const statusVal = e.confirmaciones && e.confirmaciones[musicoId];
            let status = 'pendiente';
            if (statusVal === true || statusVal === 'confirmado') {
              status = 'confirmado';
            } else if (statusVal === 'indeciso') {
              status = 'indeciso';
            } else if (statusVal === false || statusVal === 'ausente') {
              status = 'ausente';
            }

            let statusText = 'Mi asistencia: <span style="color:var(--text3);">Sin confirmar</span>';
            if (status === 'confirmado') {
              statusText = 'Mi asistencia: <span style="color:var(--teal); font-weight:bold;">Confirmado</span>';
            } else if (status === 'indeciso') {
              statusText = 'Mi asistencia: <span style="color:var(--gold); font-weight:bold;">No sé aún</span>';
            } else if (status === 'ausente') {
              statusText = 'Mi asistencia: <span style="color:var(--coral); font-weight:bold;">No puedo asistir</span>';
            }

            let borderColor = 'var(--border2)';
            if (status === 'confirmado') borderColor = 'var(--teal)';
            else if (status === 'indeciso') borderColor = 'var(--gold)';
            else if (status === 'ausente') borderColor = 'var(--coral)';

            // Build compact songs summary
            const songIds = e.canciones || [];
            let songsSummaryHtml = '';
            if (songIds.length > 0) {
              const summaryItems = [];
              songIds.forEach(sid => {
                const s = (window.cacheSongs || []).find(x => x.id === sid);
                if (!s) return;
                const displayTone = (e.tonos && e.tonos[sid]) ? e.tonos[sid] : s.tonoBase;
                summaryItems.push(`<span style="white-space:nowrap; color: var(--text2);">${s.nombre} <b style="color:var(--gold); font-size:11px;">(${displayTone})</b></span>`);
              });
              songsSummaryHtml = `
                <div style="margin-top:10px; font-size:12px; color:var(--text3); border-top:1px solid var(--border); padding-top:8px; display:flex; flex-wrap:wrap; gap:6px 12px; align-items:center;">
                  <span style="font-weight:600; color:var(--gold); text-transform:uppercase; font-size:10px; letter-spacing:0.5px;">Setlist:</span>
                  ${summaryItems.join(' • ')}
                </div>
              `;
            }

            const card = document.createElement('div');
            card.className = 'card';
            card.style.cssText = `margin-bottom:14px; border-color:${borderColor};`;
            card.innerHTML = `
              <div class="musico-card-header">
                <div class="ensayo-card-info">
                  <div class="ensayo-card-title"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px;"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg> ${e.nombre}</div>
                  <div class="ensayo-card-date">📅 ${(e.fecha || '').split('-').reverse().join('/')}${e.hora ? ' &nbsp;⏰ <b>' + e.hora + '</b>' : ''}</div>
                </div>
              </div>
              
              ${songsSummaryHtml}

              <button class="btn-practice-ensayo btn-primary musico-ensayo-practice-btn">
                🎸 Entrar a Ensayo / Practicar Letras
              </button>

              <div class="musico-card-attendance-section">
                <div id="status-text-${e.id}" class="musico-attendance-status-text">
                  ${statusText}
                </div>
                <div class="musico-attendance-buttons">
                  <button class="btn-ensayo-status btn-primary attendance-btn attendance-btn-yes" data-status="confirmado" data-id="${e.id}" style="opacity: ${status === 'confirmado' ? '1' : '0.35'}; box-shadow: ${status === 'confirmado' ? '0 0 10px rgba(78,205,196,0.3)' : 'none'};">Voy a ir</button>
                  <button class="btn-ensayo-status btn-primary attendance-btn attendance-btn-maybe" data-status="indeciso" data-id="${e.id}" style="opacity: ${status === 'indeciso' ? '1' : '0.35'}; box-shadow: ${status === 'indeciso' ? '0 0 10px rgba(244,197,66,0.3)' : 'none'};">No sé aún</button>
                  <button class="btn-ensayo-status btn-primary attendance-btn attendance-btn-no" data-status="ausente" data-id="${e.id}" style="opacity: ${status === 'ausente' ? '1' : '0.35'}; box-shadow: ${status === 'ausente' ? '0 0 10px rgba(255,107,107,0.3)' : 'none'};">No puedo</button>
                </div>
              </div>
            `;

            card.querySelectorAll('.btn-ensayo-status').forEach(btn => {
              btn.addEventListener('click', (ev) => {
                const targetStatus = ev.currentTarget.dataset.status;
                cambiarEstadoEnsayo(e.id, targetStatus);
              });
            });

            card.querySelector('.btn-practice-ensayo').addEventListener('click', () => {
              window.abrirModoEnsayoMusico(e);
            });

            cont.appendChild(card);
          });

          // 🔴 Update tab badge for pending rehearsals (only if status is undefined/null)
          const hasUnconfirmed = filtered.some(e => {
            const v = e.confirmaciones && e.confirmaciones[musicoId];
            return v === undefined || v === null;
          });
          const tabBtn = document.getElementById('nav-tab-ensayos-musico');
          if (tabBtn) {
            let dot = tabBtn.querySelector('.red-badge-dot');
            if (hasUnconfirmed) {
              if (!dot) {
                dot = document.createElement('span');
                dot.className = 'red-badge-dot';
                dot.style.cssText = 'position: absolute; top: 4px; right: 4px; width: 8px; height: 8px; background-color: var(--coral); border-radius: 50%; box-shadow: 0 0 6px var(--coral);';
                tabBtn.appendChild(dot);
              }
            } else {
              if (dot) dot.remove();
            }
          }

          // 🔔 Show modal popup reminder once-per-day
          const todayStr = window.formatLocalDate(new Date());
          const futureEnsayos = filtered.filter(e => e.fecha >= todayStr);
          if (futureEnsayos.length > 0) {
            const ensayoToShow = futureEnsayos.find(e => {
              const lastSeenKey = `rehearsal_reminder_${e.id}_${todayStr}`;
              const v = e.confirmaciones && e.confirmaciones[musicoId];
              const hasResponded = v !== undefined && v !== null;
              return !hasResponded && localStorage.getItem(lastSeenKey) !== 'true';
            });

            if (ensayoToShow) {
              const statusVal = ensayoToShow.confirmaciones && ensayoToShow.confirmaciones[musicoId];
              const isConfirmed = statusVal === true || statusVal === 'confirmado';

              // Calculate remaining days
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const rDate = new Date(ensayoToShow.fecha + 'T00:00:00');
              const diffTime = rDate - today;
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

              let daysText = '';
              if (diffDays === 0) {
                daysText = '¡Hoy es el ensayo!';
              } else if (diffDays === 1) {
                daysText = '¡Mañana es el ensayo!';
              } else {
                daysText = `Quedan ${diffDays} días para el ensayo.`;
              }

              const reminderModal = document.getElementById('ensayo-reminder-modal');
              const titleEl = document.getElementById('ensayo-reminder-title');
              const textEl = document.getElementById('ensayo-reminder-text');
              const confirmBtn = document.getElementById('btn-ensayo-reminder-confirm');
              const closeBtn = document.getElementById('btn-ensayo-reminder-close');

              if (reminderModal && titleEl && textEl) {
                titleEl.textContent = isConfirmed ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px;"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg> Ensayo Confirmado' : 'Ensayo Programado';
                titleEl.style.color = isConfirmed ? 'var(--gold)' : 'var(--teal)';
                reminderModal.querySelector('.modal-box').style.borderColor = isConfirmed ? 'var(--gold)' : 'var(--teal)';

                let msgHtml = `Hola <b>${activeSessionUser.nombre}</b>,<br><br>`;
                if (isConfirmed) {
                  msgHtml += `Recuerda tu ensayo confirmado:<br><br>`;
                  msgHtml += `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px;"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg> <b>${ensayoToShow.nombre}</b><br>`;
                  msgHtml += `📅 <b>Fecha:</b> ${(ensayoToShow.fecha || '').split('-').reverse().join('/')}<br>`;
                  msgHtml += `⏰ <b>Hora:</b> ${ensayoToShow.hora || 'No especificada'}<br><br>`;
                  msgHtml += `<i>¡Nos vemos pronto!</i>`;
                  if (confirmBtn) confirmBtn.style.display = 'none';
                } else {
                  msgHtml += `Tienes un ensayo programado pendiente de confirmar:<br><br>`;
                  msgHtml += `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px;"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg> <b>${ensayoToShow.nombre}</b><br>`;
                  msgHtml += `📅 <b>Fecha:</b> ${(ensayoToShow.fecha || '').split('-').reverse().join('/')}<br>`;
                  msgHtml += `⏰ <b>Hora:</b> ${ensayoToShow.hora || 'No especificada'}<br><br>`;
                  msgHtml += `<span style="color:var(--coral); font-weight:bold; font-size:14px;">${daysText}</span><br><br>`;
                  msgHtml += `Por favor, confirma tu asistencia para que podamos coordinar.`;
                  if (confirmBtn) {
                    confirmBtn.style.display = 'block';
                    confirmBtn.onclick = () => {
                      const docRef = doc(db, 'ensayos', ensayoToShow.id);
                      updateDoc(docRef, { [`confirmaciones.${musicoId}`]: 'confirmado' }).then(() => {
                        showToast('Asistencia confirmada');
                        reminderModal.classList.remove('active');
                      });
                    };
                  }
                }

                textEl.innerHTML = msgHtml;
                reminderModal.classList.add('active');

                // Mark seen for today
                localStorage.setItem(`rehearsal_reminder_${ensayoToShow.id}_${todayStr}`, 'true');

                if (closeBtn) {
                  closeBtn.onclick = () => {
                    reminderModal.classList.remove('active');
                  };
                }
              }
            }
          }
        });
      }

      function cambiarEstadoEnsayo(ensayoId, statusVal) {
        const musicoId = activeSessionUser?.usuario;
        if (!musicoId) return;
        const docRef = doc(db, 'ensayos', ensayoId);
        updateDoc(docRef, { [`confirmaciones.${musicoId}`]: statusVal }).then(() => {
          showToast(`Asistencia actualizada: ${statusVal === 'confirmado' ? 'Confirmado' : statusVal === 'indeciso' ? 'No sé aún' : 'No puedo'}`);
        }).catch(err => {
          console.error("Error al actualizar asistencia:", err);
          showToast("Error al guardar asistencia");
        });
      }

      window.abrirModoEnsayoMusico = function (e) {
        const titleEl = document.getElementById('practice-modal-title');
        const subtitleEl = document.getElementById('practice-modal-subtitle');
        if (titleEl) titleEl.textContent = e.nombre || 'Lista de Ensayo';
        if (subtitleEl) subtitleEl.textContent = `Fecha: ${(e.fecha || '').split('-').reverse().join('/')} ${e.hora ? ' | Hora: ' + e.hora : ''}`;

        const rehearsalSongs = [];
        (e.canciones || []).forEach(sid => {
          const s = (window.cacheSongs || []).find(x => x.id === sid);
          if (s) {
            const tone = (e.tonos && e.tonos[sid]) ? e.tonos[sid] : s.tonoBase;

            // Setup in lyrics cache
            window._lyricsCache = window._lyricsCache || {};
            window._lyricsCache[sid] = {
              id: s.id,
              nombre: s.nombre,
              tonoBase: s.tonoBase,
              tonoServicio: tone,
              letra: s.letra || "",
              youtube: s.youtube || ""
            };

            rehearsalSongs.push({
              id: s.id,
              nombre: s.nombre,
              artista: s.artista || "",
              tonoBase: s.tonoBase,
              tonoServicio: tone,
              letra: s.letra || "",
              youtube: s.youtube || ""
            });
          }
        });

        // Overwrite current songs for transposer pagination
        window._currentServiceSongs = rehearsalSongs;

        const songsCont = document.getElementById('practice-modal-songs');
        if (!songsCont) return;
        songsCont.innerHTML = '';

        if (rehearsalSongs.length === 0) {
          songsCont.innerHTML = `<p style="color:var(--text3); font-size:13px; text-align:center; padding:20px;">Este ensayo no tiene canciones asignadas.</p>`;
        } else {
          rehearsalSongs.forEach((s, idx) => {
            const num = idx + 1;
            const hasLetra = s.letra && s.letra.trim() !== "";
            const hasYoutube = s.youtube && s.youtube.trim() !== "";

            const isAlabanza = (s.tipo || 'alabanza').trim().toLowerCase() === 'alabanza';
            const cardBorder = isAlabanza
              ? 'border-bottom: 1px solid rgba(78, 205, 196, 0.25) !important;'
              : 'border-bottom: 1px solid rgba(155, 143, 255, 0.25) !important;';
            const numColor = isAlabanza ? 'color: rgba(78, 205, 196, 0.4);' : 'color: rgba(155, 143, 255, 0.4);';
            const badgeStyle = isAlabanza
              ? `background: rgba(78, 205, 196, 0.12); color: var(--teal); border: 1.5px solid rgba(78, 205, 196, 0.3);`
              : `background: rgba(155, 143, 255, 0.12); color: var(--purple); border: 1.5px solid rgba(155, 143, 255, 0.3);`;

            const songCard = document.createElement('div');
            songCard.className = 'musico-song-card';
            songCard.style.cssText = `background: transparent !important; border: none !important; border-radius: 0 !important; margin-bottom: 0 !important; padding: 14px 4px !important; box-shadow: none !important; ${cardBorder} cursor: pointer;`;
            songCard.innerHTML = `
              <!-- Extremo Izquierdo: Número -->
              <div style="display:flex; align-items:center; gap:8px;">
                <div class="song-num" style="min-width: 24px; ${numColor}">${num}</div>
              </div>
              
              <!-- Centro: Info -->
              <div class="song-card-info" style="margin-left: 4px;">
                <div class="song-card-name" style="font-weight: 600;">${s.nombre}</div>
                <div class="song-card-artist" style="font-size:11px; color: var(--text2);">${s.artista}</div>
              </div>
              
              <!-- Extremo Derecho: Tono y Acciones -->
              <div style="display:flex; align-items:center; gap: 8px; margin-left:auto; flex-shrink:0; padding-right: 6px;">
                <div class="tone-indicator" style="font-size:12px; padding: 4px 10px; cursor:default; margin: 0; ${badgeStyle}">${s.tonoServicio}</div>
                ${hasYoutube ? `
                  <a href="${s.youtube}" target="_blank" rel="noopener" class="repertorio-action-btn repertorio-btn-youtube" style="font-size: 11px; min-height: unset; padding: 6px 10px; margin: 0;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px;"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg> YouTube</a>
                ` : ''}
              </div>
            `;

            songCard.onclick = (e) => {
              if (e.target.closest('.repertorio-btn-youtube')) return;
              window.abrirModalLetraGlobal(s.id, rehearsalSongs);
            };

            songsCont.appendChild(songCard);
          });
        }

        const overlay = document.getElementById('ensayo-practice-overlay');
        if (overlay) window.abrirModalConHistorial('ensayo-practice-overlay');
      };

      function toggleEnsayoConfirm(ensayoId, userId, btnElem) {
        // Obsolete toggle function kept for signature safety
        cambiarEstadoEnsayo(ensayoId, 'confirmado');
      }
    

    import { initializeApp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js";

    import {
      initializeFirestore,
      persistentLocalCache,
      persistentSingleTabManager,
      memoryLocalCache,
      doc,
      setDoc,
      getDoc,
      collection,
      onSnapshot,
      updateDoc,
      deleteDoc,
      deleteField,
      addDoc,
      arrayUnion,
      arrayRemove,
      writeBatch
    } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";
    const firebaseConfig = {
      apiKey: "AIzaSyDjA2d8zn02Iu9Nm-Jy2mVw6GgbjeKUEJ4",
      authDomain: "alabanza-d2185.firebaseapp.com",
      projectId: "alabanza-d2185",
      storageBucket: "alabanza-d2185.firebasestorage.app",
      messagingSenderId: "696632316366",
      appId: "1:696632316366:web:8727b4bb633f35995f1b9f",
      measurementId: "G-YLK9DBWT10"
    };

    const app = initializeApp(firebaseConfig);
    let db;
    try {
      db = initializeFirestore(app, {
        localCache: persistentLocalCache({
          tabManager: persistentSingleTabManager({ forceOwnership: true })
        })
      });
    } catch (e) {
      console.warn("Firestore persistentCache no disponible, usando memoria:", e.message);
      db = initializeFirestore(app, {
        localCache: memoryLocalCache()
      });
    }
    window.db = db;

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
        if (typeof window._cerrarSesion === 'function') window._cerrarSesion();
      });
    }

    // Músico avatar dropdown
    const musicoAvBtn = document.getElementById('musico-avatar-container');
    if (musicoAvBtn) {
      musicoAvBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const dropdown = document.getElementById('musico-avatar-dropdown');
        if (dropdown) {
          dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
        }
      });
    }

    // Cerrar dropdowns al hacer click fuera
    document.addEventListener('click', (e) => {
      const leaderDrop = document.getElementById('leader-avatar-dropdown');
      if (leaderDrop && leaderDrop.style.display === 'block' && !e.target.closest('#leader-avatar-container')) {
        leaderDrop.style.display = 'none';
      }
      const musicoDrop = document.getElementById('musico-avatar-dropdown');
      if (musicoDrop && musicoDrop.style.display === 'block' && !e.target.closest('#musico-avatar-container')) {
        musicoDrop.style.display = 'none';
      }
    });

    // Nodos DOM globales
    const screenLogin = document.getElementById('screen-login');
    const screenDashboard = document.getElementById('screen-dashboard');

    // Navegación Swipe Back (History API)
    window.addEventListener('popstate', (e) => {
      const modalesActivos = document.querySelectorAll('.modal-overlay.active, .lyrics-modal-overlay.active, .tone-picker-overlay.active');
      if (!e.state || !e.state.modal) {
        modalesActivos.forEach(m => m.classList.remove('active'));
      } else {
        modalesActivos.forEach(m => {
          if (m.id !== e.state.modal) {
            m.classList.remove('active');
          }
        });
      }
    });

    window.abrirModalConHistorial = function (modalId) {
      const modal = document.getElementById(modalId);
      if (modal) {
        modal.classList.add('active');
        try {
          history.pushState({ modal: modalId }, '');
        } catch (e) {
          console.warn('History API no disponible', e);
        }
      }
    };

    window.cerrarModalConHistorial = function (modalId) {
      const modal = document.getElementById(modalId);
      if (modal && modal.classList.contains('active')) {
        try {
          if (history.state && history.state.modal === modalId) {
            history.back(); // Esto dispara el popstate y cierra el modal
          } else {
            modal.classList.remove('active');
          }
        } catch (e) {
          modal.classList.remove('active');
        }
      }
    };
    console.log('MARK 3'); const loginForm = document.getElementById('login-form');
    const btnLogout = document.getElementById('btn-logout');
    const displayRole = document.getElementById('display-role');
    const serviceDateSelect = document.getElementById('service-date-select');

    let currentUserRole = 'musico';
    let activeSessionUser = null;
    let unsubscribeService = null;
    let editingUserKey = null;
    let editingSongId = null;
    let currentAutoMsg = "";
    window._whatsappGroupLink = "";
    window._prevCambiosTono = {};
    window._unsubMusicoServicePlan = null;

    // Variables locales de caché de datos globales para render dinámico
    let cacheSongs = [];
    let cacheMembers = [];
    let cacheHistorial = [];

    function removeAccents(str) {
      if (!str) return "";
      return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    }
    window.removeAccents = removeAccents;

    function debounce(func, delay = 300) {
      let timeoutId;
      return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          func.apply(this, args);
        }, delay);
      };
    }
    window.debounce = debounce;

    // Poner el próximo domingo por defecto
    const baseDay = new Date();
    baseDay.setDate(baseDay.getDate() + (7 - baseDay.getDay()) % 7);
    serviceDateSelect.value = window.formatLocalDate(baseDay);

    // Función auxiliar para desplazar y centrar la pestaña activa horizontalmente sin mover la pantalla
    function scrollActiveTabToCenter(tab) {
      if (!tab) return;
      setTimeout(() => {
        const parent = tab.parentElement;
        if (!parent) return;
        const parentRect = parent.getBoundingClientRect();
        const tabRect = tab.getBoundingClientRect();
        if (parentRect.width === 0 || tabRect.width === 0) return;

        const relativeLeft = tabRect.left - parentRect.left + parent.scrollLeft;
        const targetScrollLeft = relativeLeft - (parentRect.width / 2) + (tabRect.width / 2);

        parent.scrollTo({
          left: targetScrollLeft,
          behavior: 'smooth'
        });
      }, 100);
    }

    // Controladores de Pestañas
    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(tab.dataset.tab).classList.add('active');
        localStorage.setItem('activeLeaderTab', tab.dataset.tab);

        // Autodesplazar pestaña activa para que sea completamente visible en móvil
        scrollActiveTabToCenter(tab);

        // Refresh views on tab change to prevent empty states
        if (tab.dataset.tab === 'tab-repertorio' && typeof renderizarMantenimientoCanciones === 'function') {
          renderizarMantenimientoCanciones();
        } else if (tab.dataset.tab === 'tab-miembros' && typeof renderizarMantenimientoMiembros === 'function') {
          renderizarMantenimientoMiembros();
        } else if (tab.dataset.tab === 'tab-historial' && typeof renderizarHistorialServicios === 'function') {
          renderizarHistorialServicios();
        } else if (tab.dataset.tab === 'tab-ensayos' && typeof renderEnsayosAdmin === 'function') {
          renderEnsayosAdmin();
        }
      });
    });
    console.log('MARK 4'); loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const userVal = document.getElementById('login-email').value.trim().toLowerCase();
      const passVal = document.getElementById('login-password').value.trim();

      // 1. VALIDACIÓN CUENTA MAESTRA PRINCIPAL (SUPER ADMIN & GENERIC ADMIN)
      if (userVal === "alimr4" && passVal === "030819") {
        console.log("Acceso concedido al Super Administrador.");
        iniciarSesionDashboard({ nombre: "Super Admin", role: "lider", usuario: "alimr4", password: "030819" });
        return;
      }
      if (userVal === "imr4" && passVal === "222222") {
        console.log("Acceso concedido al Administrador General.");
        iniciarSesionDashboard({ nombre: "Admin IMR4", role: "lider", usuario: "imr4", password: "222222" });
        return;
      }
      if (userVal === "admin" && passVal === "1234") {
        console.log("Acceso concedido al Administrador General legacy.");
        iniciarSesionDashboard({ nombre: "Administrador", role: "lider", usuario: "admin", password: "1234" });
        return;
      }
      if (userVal === "musico" && passVal === "1234") {
        console.log("Acceso concedido al Músico de Prueba.");
        iniciarSesionDashboard({ nombre: "Músico de Prueba", role: "musico", usuario: "musico", password: "1234" });
        return;
      }


      // 2. LOGICA DE CONSULTA PARA MÚSICOS REGISTRADOS
      const _showLoginMsg = (msg, isError) => {
        let el = document.getElementById('login-msg-banner');
        if (!el) {
          el = document.createElement('p');
          el.id = 'login-msg-banner';
          el.style.cssText = 'margin: 10px 0 0; font-size: 13px; text-align: center; padding: 8px 12px; border-radius: 8px;';
          const form = document.getElementById('login-form');
          if (form) form.appendChild(el);
        }
        el.textContent = msg;
        el.style.background = isError ? 'rgba(255,100,100,0.12)' : 'rgba(78,205,196,0.12)';
        el.style.color = isError ? 'var(--coral, #ff6b6b)' : 'var(--teal, #4ecdc4)';
        el.style.display = 'block';
        setTimeout(() => { if (el) el.style.display = 'none'; }, 4000);
      };
      const _tryFirebaseLogin = async (retryCount = 0) => {
        try {
          const uSnap = await getDoc(doc(db, "usuarios", userVal));
          if (uSnap.exists() && uSnap.data().password === passVal) {
            iniciarSesionDashboard(uSnap.data());
          } else {
            _showLoginMsg("Usuario o contraseña incorrectos.", true);
          }
        } catch (err) {
          console.error("Firebase login error:", err);
          if (retryCount < 1) {
            // Reintento automático silencioso después de 1.5s
            setTimeout(() => _tryFirebaseLogin(retryCount + 1), 1500);
          } else {
            _showLoginMsg("Sin conexión a internet. Verifica tu red.", true);
          }
        }
      };
      await _tryFirebaseLogin();
    });

    const screenMusico = document.getElementById('screen-musico');

    function iniciarSesionDashboard(userData) {
      activeSessionUser = userData;
      currentUserRole = userData.role;
      displayRole.textContent = currentUserRole === 'lider' ? 'Líder' : 'Músico';

      // Cargar y aplicar tema individual del usuario
      if (userData.usuario && typeof window.aplicarTemaPorUsuario === 'function') {
        const savedTheme = localStorage.getItem('theme-' + userData.usuario) || 'dark';
        window.aplicarTemaPorUsuario(savedTheme);
      }

      screenLogin.classList.remove('active');
      if (window.intentarMostrarPwaBanner) window.intentarMostrarPwaBanner();

      if (currentUserRole === 'lider') {
        // Vista de Líder
        document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'block');
        screenDashboard.classList.add('active');
        cargarConfiguracion();

        // Restore tab
        const lastTab = localStorage.getItem('activeLeaderTab');
        if (lastTab && document.getElementById(lastTab)) {
          const tabBtn = Array.from(document.querySelectorAll('.nav-tab')).find(t => t.dataset.tab === lastTab);
          if (tabBtn) tabBtn.click();
        }
      } else {
        // Vista de Músico
        document.getElementById('musico-name-badge').textContent = userData.nombre;
        screenMusico.classList.add('active');
        iniciarVistaMusico();

        // Restore tab
        const lastTab = localStorage.getItem('activeMusicoTab');
        if (lastTab && document.getElementById(lastTab)) {
          const tabBtn = Array.from(document.querySelectorAll('.nav-tab-musico')).find(t => t.dataset.mtab === lastTab);
          if (tabBtn) tabBtn.click();
        }
      }

      // Initial header avatar update with initials
      if (typeof actualizarAvatares === 'function') {
        actualizarAvatares();
      }

      // Fetch profile pic and favoritos from Firestore asynchronously
      window.misFavoritos = [];
      if (db && doc && getDoc && userData.usuario) {
        getDoc(doc(db, "usuarios", userData.usuario)).then(snap => {
          if (snap.exists()) {
            const data = snap.data();
            if (data.profilePic) {
              activeSessionUser.profilePic = data.profilePic;
              if (typeof actualizarAvatares === 'function') {
                actualizarAvatares();
              }
            }
            if (data.favoritos && Array.isArray(data.favoritos)) {
              window.misFavoritos = data.favoritos;
              if (typeof renderRepertorioMusico === 'function') {
                renderRepertorioMusico();
              }
            }
          }
        }).catch(err => console.log("User data load error:", err));
      }

      // Guardar credenciales en local storage
      if (userData.usuario && userData.password) {
        localStorage.setItem('sessionUserKey', userData.usuario);
        localStorage.setItem('sessionPassword', userData.password);
      }

      // Set user session in rehearsals logic
      if (window.updateRehearsalsActiveUser) {
        window.updateRehearsalsActiveUser(userData);
      }

      // Cargar datos base en caché sin importar el rol
      escucharBaseDatosGlobal();
    }

    function cerrarSesion() {
      // Limpiar sesión local
      localStorage.removeItem('sessionUserKey');
      localStorage.removeItem('sessionPassword');
      localStorage.removeItem('activeLeaderTab');
      localStorage.removeItem('activeMusicoTab');

      // Limpiar inputs del formulario
      document.getElementById('login-email').value = '';
      document.getElementById('login-password').value = '';

      screenLogin.classList.add('active');
      screenDashboard.classList.remove('active');
      screenMusico.classList.remove('active');
      if (window.intentarMostrarPwaBanner) window.intentarMostrarPwaBanner();
      if (unsubscribeService) unsubscribeService();
      if (unsubscribeMusicoService) unsubscribeMusicoService();
      if (window._unsubMusicoServicePlan) { window._unsubMusicoServicePlan(); window._unsubMusicoServicePlan = null; }
      window._prevCambiosTono = {};

      // Restablecer el tema por defecto (oscuro) para la pantalla de login
      if (typeof window.aplicarTemaPorUsuario === 'function') {
        window.aplicarTemaPorUsuario('dark');
      }
      activeSessionUser = null;
    }

    // Logout: registrar globalmente para acceso desde cualquier listener
    window._cerrarSesion = cerrarSesion;
    // Conectar botones de logout si existen como elementos directos
    if (btnLogout) btnLogout.addEventListener('click', cerrarSesion);
    const _btnMusicoLogout = document.getElementById('btn-musico-logout');
    if (_btnMusicoLogout) _btnMusicoLogout.addEventListener('click', cerrarSesion);

    const btnAddSongGlobal = document.getElementById('btn-add-song-global');
    if (btnAddSongGlobal) {
      btnAddSongGlobal.addEventListener('click', () => {
        editingSongId = null;
        document.getElementById('form-add-song').reset();
        const btnSubmit = document.querySelector('#form-add-song button[type="submit"]');
        if (btnSubmit) {
          btnSubmit.textContent = "Guardar en Repertorio";
          btnSubmit.style.background = "var(--teal)";
        }
        const title = document.getElementById('song-modal-title');
        if (title) title.textContent = "Agregar Nueva Canción";

        const modal = document.getElementById('admin-song-modal');
        if (modal) modal.classList.add('active');
      });
    }

    const btnImportSongs = document.getElementById('btn-import-songs');
    const importSongsFile = document.getElementById('import-songs-file');
    if (btnImportSongs && importSongsFile) {
      btnImportSongs.addEventListener('click', () => {
        importSongsFile.click();
      });

      importSongsFile.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
          try {
            const data = JSON.parse(event.target.result);
            const songsArray = Array.isArray(data) ? data : (data.canciones || data.songs || []);
            if (!Array.isArray(songsArray) || songsArray.length === 0) {
              customAlert("El archivo JSON debe contener un arreglo de canciones.");
              return;
            }

            if (!await customConfirm(`¿Estás seguro de que quieres importar ${songsArray.length} canciones al repertorio?`)) {
              importSongsFile.value = "";
              return;
            }

            btnImportSongs.textContent = "Importando...";
            btnImportSongs.disabled = true;

            // Construir set de canciones existentes (nombre+artista en minúsculas) para evitar duplicados
            const existingKeys = new Set(
              (cacheSongs || []).map(s =>
                `${(s.nombre || '').toLowerCase().trim()}||${(s.artista || '').toLowerCase().trim()}`
              )
            );

            let importedCount = 0;
            let skippedCount = 0;

            const itemsToImport = [];
            for (const item of songsArray) {
              const nombre = (item.nombre || item.title || item.titulo || "").trim();
              const artista = (item.artista || item.artist || "").trim() || "Desconocido";
              if (!nombre) continue;

              // Verificar duplicado
              const key = `${nombre.toLowerCase()}||${artista.toLowerCase()}`;
              if (existingKeys.has(key)) {
                skippedCount++;
                continue;
              }
              existingKeys.add(key); // Agregar al set para evitar duplicados dentro del mismo JSON
              itemsToImport.push(item);
            }

            const chunkSize = 200;
            for (let i = 0; i < itemsToImport.length; i += chunkSize) {
              const chunk = itemsToImport.slice(i, i + chunkSize);
              const batch = writeBatch(db);

              for (const item of chunk) {
                const idUnico = "song_" + Math.random().toString(36).substr(2, 9) + "_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
                const nombre = fixCorruptedText((item.nombre || item.title || item.titulo || "").trim());
                const artista = fixCorruptedText((item.artista || item.artist || "").trim() || "Desconocido");
                const letra = fixCorruptedText(item.letra || item.lyrics || item.content || "");

                const payload = {
                  nombre,
                  artista,
                  tonoBase: (item.tonoBase || item.key || item.tono || "C").trim(),
                  tipo: ((item.tipo || item.type || "alabanza").toLowerCase().includes("adora") ? "adoracion" : "alabanza"),
                  youtube: (item.youtube || item.url || "").trim()
                };

                const songRef = doc(db, "biblioteca_canciones", idUnico);
                batch.set(songRef, payload);

                if (letra) {
                  const letraRef = doc(db, "letras_canciones", idUnico);
                  batch.set(letraRef, { letra });
                }

                importedCount++;
              }

              await batch.commit();
            }
            customAlert(`¡Éxito!\n\nImportadas: ${importedCount} canciones.\nOmitidas (duplicadas): ${skippedCount}.`);
          } catch (err) {
            customAlert("Error al procesar el archivo JSON: " + err.message);
          } finally {
            importSongsFile.value = "";
            btnImportSongs.textContent = "📥 Importar JSON";
            btnImportSongs.disabled = false;
          }
        };
        reader.readAsText(file);
      });
    }

    const btnCancelSongModal = document.getElementById('btn-cancel-song-modal');
    if (btnCancelSongModal) {
      btnCancelSongModal.addEventListener('click', () => {
        resetSongForm();
      });
    }

    // === CONTROLADOR DE TEMAS (CLARO / OSCURO) INDIVIDUAL POR USUARIO ===
    const btnMusicoTheme = document.getElementById('btn-musico-theme');
    const btnLeaderTheme = document.getElementById('btn-leader-theme');

    window.aplicarTemaPorUsuario = function (tema) {
      const isLight = (tema === 'light');
      if (isLight) {
        document.body.classList.add('theme-light');
      } else {
        document.body.classList.remove('theme-light');
      }
      if (btnMusicoTheme) btnMusicoTheme.textContent = isLight ? '🌙' : '☀️';
      if (btnLeaderTheme) btnLeaderTheme.textContent = isLight ? '🌙' : '☀️';
    };

    // Inicialización del tema en base al último usuario con sesión activa o por defecto oscuro
    const savedUserKey = localStorage.getItem('sessionUserKey');
    const themeInit = savedUserKey ? (localStorage.getItem('theme-' + savedUserKey) || 'dark') : 'dark';
    window.aplicarTemaPorUsuario(themeInit);

    function toggleTema() {
      const isCurrentlyLight = document.body.classList.contains('theme-light');
      const nextTheme = isCurrentlyLight ? 'dark' : 'light';
      if (activeSessionUser && activeSessionUser.usuario) {
        localStorage.setItem('theme-' + activeSessionUser.usuario, nextTheme);
      }
      window.aplicarTemaPorUsuario(nextTheme);
    }

    if (btnMusicoTheme) {
      btnMusicoTheme.addEventListener('click', toggleTema);
    }
    if (btnLeaderTheme) {
      btnLeaderTheme.addEventListener('click', toggleTema);
    }
    let _migrationInProgress = false;
    async function migrarBaseDatosLetras() {
      if (_migrationInProgress) return;
      if (currentUserRole !== 'lider') return;

      const conLetra = (cacheSongs || []).filter(s => s.letra !== undefined && s.letra !== null && s.letra.trim() !== '');
      const cancionesSucias = (cacheSongs || []).filter(s => {
        const nombre = s.nombre || '';
        const limpio = nombre.replace(/\s*[\(,\-]?\s*(acordes|letra|letras|tab|tabs)\s*\)?$/gi, '').trim();
        return limpio !== nombre;
      });

      if (conLetra.length === 0 && cancionesSucias.length === 0) return;

      _migrationInProgress = true;

      // 1. Migrar letras si hay pendientes
      if (conLetra.length > 0) {
        console.log(`[MIGRACIÓN] Se encontraron ${conLetra.length} canciones con letra en biblioteca_canciones. Migrando...`);
        if (typeof showToast === 'function') {
          showToast(`📦 Optimizando base de datos: Migrando ${conLetra.length} letras...`);
        }

        const chunkSize = 200;
        for (let i = 0; i < conLetra.length; i += chunkSize) {
          const chunk = conLetra.slice(i, i + chunkSize);
          const batch = writeBatch(db);

          for (const s of chunk) {
            const letraRef = doc(db, "letras_canciones", s.id);
            const songRef = doc(db, "biblioteca_canciones", s.id);

            const letraCorregida = fixCorruptedText(s.letra);
            const nombreCorregido = fixCorruptedText(s.nombre);

            batch.set(letraRef, { letra: letraCorregida });
            batch.update(songRef, {
              letra: deleteField(),
              nombre: nombreCorregido
            });
          }

          try {
            await batch.commit();
            console.log(`[MIGRACIÓN] Lote de ${chunk.length} letras completado.`);
          } catch (err) {
            console.error("Error al comprometer lote de migración de letras:", err);
          }
        }
        console.log(`[MIGRACIÓN] Proceso de letras terminado.`);
      }

      // 2. Limpiar nombres sucios si los hay
      if (cancionesSucias.length > 0) {
        console.log(`[LIMPIEZA NOMBRES] Se encontraron ${cancionesSucias.length} canciones con nombre sucio. Corrigiendo...`);
        if (typeof showToast === 'function') {
          showToast(`🧹 Limpiando nombres de ${cancionesSucias.length} canciones...`);
        }

        const chunkSize = 200;
        for (let i = 0; i < cancionesSucias.length; i += chunkSize) {
          const chunk = cancionesSucias.slice(i, i + chunkSize);
          const batch = writeBatch(db);

          for (const s of chunk) {
            const songRef = doc(db, "biblioteca_canciones", s.id);
            const nombreLimpio = fixCorruptedText(s.nombre.replace(/\s*[\(,\-]?\s*(acordes|letra|letras|tab|tabs)\s*\)?$/gi, '').trim());
            batch.update(songRef, { nombre: nombreLimpio });
          }

          try {
            await batch.commit();
            console.log(`[LIMPIEZA NOMBRES] Lote de ${chunk.length} nombres completado.`);
          } catch (err) {
            console.error("Error al comprometer lote de limpieza de nombres:", err);
          }
        }
        console.log(`[LIMPIEZA NOMBRES] Proceso terminado.`);
      }

      _migrationInProgress = false;
    }

    window.dangerouslyDeleteAllSongs = async function () {
      if (!await customConfirm("⚠️ ATENCIÓN: Esto borrará permanentemente TODAS las canciones de la biblioteca y sus letras. ¿Estás seguro?")) return;
      if (!await customConfirm("¿Seguro al 100%? Esta acción NO se puede deshacer.")) return;

      const songs = [...(window.cacheSongs || [])];
      console.log(`Iniciando borrado de ${songs.length} canciones...`);
      let count = 0;
      for (const s of songs) {
        try {
          await deleteDoc(doc(db, "biblioteca_canciones", s.id));
          await deleteDoc(doc(db, "letras_canciones", s.id));
          count++;
        } catch (err) {
          console.error(`Error borrando ${s.nombre}:`, err);
        }
      }
      customAlert(`¡Completado! Se borraron ${count} canciones.`);
    };

    window.dangerouslyRecalculateAllTones = async function () {
      if (!await customConfirm("⚠️ ATENCIÓN: Esto descargará y analizará las letras de TODAS las canciones para corregir su tono base usando el nuevo algoritmo. Puede tomar un par de minutos. ¿Estás seguro?")) return;
      
      console.log("Iniciando recálculo de tonos...");
      if (typeof showToast === 'function') showToast("🎵 Analizando tonos de todas las canciones. Revisa la consola...");

      const songs = [...(window.cacheSongs || [])];
      let corregidos = 0;
      let analizados = 0;

      for (const s of songs) {
        try {
          const letraDoc = await getDoc(doc(db, "letras_canciones", s.id));
          if (letraDoc.exists()) {
             const data = letraDoc.data();
             const letra = data.letra || '';
             if (letra.trim().length > 0) {
               const analisis = analizarTonalidadAvanzado(letra);
               const nuevoTono = normalizarTono(analisis.tonalidad);
               
               if (nuevoTono !== s.tonoBase) {
                 await updateDoc(doc(db, "biblioteca_canciones", s.id), { tonoBase: nuevoTono });
                 console.log(`Corregido: ${s.nombre} | Antes: ${s.tonoBase} -> Ahora: ${nuevoTono}`);
                 corregidos++;
               }
             }
          }
          analizados++;
          if (analizados % 10 === 0) console.log(`Progreso: ${analizados} / ${songs.length}...`);
        } catch (err) {
          console.error(`Error analizando ${s.nombre}:`, err);
        }
      }
      customAlert(`¡Completado! Se escanearon ${analizados} letras y se corrigió el tono de ${corregidos} canciones.`);
    };

    window.dangerouslyFixAllCorruptedTexts = async function () {
      if (!await customConfirm("⚠️ ATENCIÓN: Esto buscará y corregirá caracteres corruptos (Mojibake) en TODAS las canciones y letras de la base de datos. ¿Estás seguro?")) return;

      console.log("Iniciando escaneo y reparación de textos corruptos...");
      if (typeof showToast === 'function') {
        showToast("🧹 Escaneando y reparando textos corruptos...");
      }

      // 1. Reparar biblioteca_canciones
      const cancionesParaReparar = (cacheSongs || []).filter(s =>
        (s.nombre && s.nombre.includes('Ã')) || (s.artista && s.artista.includes('Ã'))
      );

      console.log(`Encontradas ${cancionesParaReparar.length} canciones con nombre/artista corrupto.`);

      const chunkSize = 200;
      let totalCorregidos = 0;

      for (let i = 0; i < cancionesParaReparar.length; i += chunkSize) {
        const chunk = cancionesParaReparar.slice(i, i + chunkSize);
        const batch = writeBatch(db);

        for (const s of chunk) {
          const songRef = doc(db, "biblioteca_canciones", s.id);
          batch.update(songRef, {
            nombre: fixCorruptedText(s.nombre),
            artista: fixCorruptedText(s.artista)
          });
          totalCorregidos++;
        }
        try {
          await batch.commit();
        } catch (e) {
          console.error("Error al actualizar lote de canciones:", e);
        }
      }

      // 2. Reparar letras_canciones
      let letrasCorregidas = 0;
      for (let i = 0; i < cacheSongs.length; i += chunkSize) {
        const chunk = cacheSongs.slice(i, i + chunkSize);
        const batch = writeBatch(db);
        let batchNeedsCommit = false;

        for (const s of chunk) {
          try {
            const snap = await getDoc(doc(db, "letras_canciones", s.id));
            if (snap.exists()) {
              const letra = snap.data().letra || '';
              if (letra.includes('Ã')) {
                const letraRef = doc(db, "letras_canciones", s.id);
                batch.update(letraRef, { letra: fixCorruptedText(letra) });
                letrasCorregidas++;
                batchNeedsCommit = true;
              }
            }
          } catch (e) {
            console.error(`Error escaneando letra de ${s.nombre}:`, e);
          }
        }

        if (batchNeedsCommit) {
          try {
            await batch.commit();
          } catch (e) {
            console.error("Error al actualizar lote de letras:", e);
          }
        }
      }

      customAlert(`¡Completado!\n\nCanciones corregidas en biblioteca: ${totalCorregidos}\nLetras corregidas en letras_canciones: ${letrasCorregidas}`);
      if (typeof showToast === 'function') {
        showToast("✨ Reparación de textos completada.");
      }
    };

    function fixCorruptedText(str) {
      if (typeof str !== 'string') return str;
      if (!str.includes('Ã')) return str;

      const cp1252Map = {
        0x20AC: 0x80, 0x201A: 0x82, 0x0192: 0x83, 0x201E: 0x84, 0x2026: 0x85, 0x2020: 0x86, 0x2021: 0x87,
        0x02C6: 0x88, 0x2030: 0x89, 0x0160: 0x8A, 0x2039: 0x8B, 0x0152: 0x8C, 0x017D: 0x8E, 0x2018: 0x91,
        0x2019: 0x92, 0x201C: 0x93, 0x201D: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97, 0x02DC: 0x98,
        0x2122: 0x99, 0x0161: 0x9A, 0x203A: 0x9B, 0x0153: 0x9C, 0x017E: 0x9E, 0x0178: 0x9F
      };

      try {
        const bytes = new Uint8Array(str.length);
        for (let i = 0; i < str.length; i++) {
          const code = str.charCodeAt(i);
          if (cp1252Map[code] !== undefined) {
            bytes[i] = cp1252Map[code];
          } else if (code < 256) {
            bytes[i] = code;
          } else {
            bytes[i] = code & 0xFF;
          }
        }
        return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
      } catch (e) {
        return str;
      }
    }

    function convertirTextoEspañolAIngles(texto) {
      if (typeof texto !== 'string') return texto;

      const mapAcordes = {
        'DO': 'C', 'RE': 'D', 'MI': 'E', 'FA': 'F', 'SOL': 'G', 'LA': 'A', 'SI': 'B'
      };

      const lineas = texto.split('\n');
      const nuevasLineas = lineas.map(linea => {
        const tokens = linea.trim().split(/\s+/);
        if (tokens.length === 0 || tokens[0] === "") return linea;

        let esLineaDeAcordes = true;
        for (const token of tokens) {
          const tClean = token.replace(/[|()\-+*.]/g, '').trim();
          if (!tClean) continue;

          const esEsp = /^(DO|RE|MI|FA|SOL|LA|SI)([#b]?(?:m|min|maj|dim|aug|sus|add|M)?\d*(?:\/(?:DO|RE|MI|FA|SOL|LA|SI|[A-G])[#b]?)?)$/i.test(tClean);
          const esIng = /^([A-G])([#b]?(?:m|min|maj|dim|aug|sus|add|M)?\d*(?:\/(?:DO|RE|MI|FA|SOL|LA|SI|[A-G])[#b]?)?)$/i.test(tClean);

          if (!esEsp && !esIng) {
            esLineaDeAcordes = false;
            break;
          }
        }

        if (esLineaDeAcordes) {
          return linea.replace(/\b(DO|RE|MI|FA|SOL|LA|SI)([#b]?(?:m|min|maj|dim|aug|sus|add|M)?\d*(?:\/(?:DO|RE|MI|FA|SOL|LA|SI|[A-G])[#b]?)?)/gi, (match, nota, resto) => {
            const notaIng = mapAcordes[nota.toUpperCase()] || nota;
            const restoCorregido = resto.replace(/\b(DO|RE|MI|FA|SOL|LA|SI)\b/gi, m => mapAcordes[m.toUpperCase()] || m);
            return notaIng + restoCorregido;
          });
        }

        return linea.replace(/\[(DO|RE|MI|FA|SOL|LA|SI)([#b]?(?:m|min|maj|dim|aug|sus|add|M)?\d*(?:\/(?:DO|RE|MI|FA|SOL|LA|SI|[A-G])[#b]?)?)\]/gi, (match, nota, resto) => {
          const notaIng = mapAcordes[nota.toUpperCase()] || nota;
          const restoCorregido = resto.replace(/\b(DO|RE|MI|FA|SOL|LA|SI)\b/gi, m => mapAcordes[m.toUpperCase()] || m);
          return `[${notaIng}${restoCorregido}]`;
        });
      });

      return nuevasLineas.join('\n');
    }

    function normalizarTono(tono) {
      if (!tono) return "C";
      let t = tono.trim();
      const mapAcordes = { 'DO': 'C', 'RE': 'D', 'MI': 'E', 'FA': 'F', 'SOL': 'G', 'LA': 'A', 'SI': 'B' };

      const tUpper = t.toUpperCase();
      Object.keys(mapAcordes).forEach(k => {
        if (tUpper.startsWith(k)) {
          t = t.replace(new RegExp(k, 'i'), mapAcordes[k]);
        }
      });

      const match = t.match(/^([A-G][#b]?)(m)?/i);
      if (match) {
        let nota = match[1];
        nota = nota.charAt(0).toUpperCase() + (nota.length > 1 ? nota.substring(1).toLowerCase() : '');
        const esMenor = match[2] ? 'm' : '';
        return nota + esMenor;
      }
      return t;
    }

    function analizarTonalidadAvanzado(texto, notasMelodia = []) {
      if (!texto) return { tonalidad: 'C', modo: 'Mayor', confianza: 0, explicacion: 'Sin texto para analizar.' };
      
      const acordesEncontrados = [];
      const chordRegex = /\b(DO|RE|MI|FA|SOL|LA|SI|[CDEFGAB])[#b]?(?:m|maj7|m7|7|sus4|sus2|dim|aug)?\b/gi;
      
      let match;
      while ((match = chordRegex.exec(texto)) !== null) {
        acordesEncontrados.push(normalizarTono(match[0]));
      }

      if (acordesEncontrados.length === 0) {
        return { tonalidad: 'C', modo: 'Mayor', confianza: 0, explicacion: 'No se encontraron acordes en el texto.' };
      }

      const basicChords = acordesEncontrados.map(c => c.replace(/maj7|m7|7|sus4|sus2|dim|aug/i, ''));
      const freq = {};
      basicChords.forEach(c => freq[c] = (freq[c] || 0) + 1);

      const firstChord = basicChords[0];
      const lastChord = basicChords[basicChords.length - 1];
      const mostFrequent = Object.keys(freq).reduce((a, b) => freq[a] > freq[b] ? a : b);

      const keys = {
        'C': ['C','Dm','Em','F','G','Am','Bdim'], 'G': ['G','Am','Bm','C','D','Em','F#dim'], 'D': ['D','Em','F#m','G','A','Bm','C#dim'],
        'A': ['A','Bm','C#m','D','E','F#m','G#dim'], 'E': ['E','F#m','G#m','A','B','C#m','D#dim'], 'B': ['B','C#m','D#m','E','F#','G#m','A#dim'],
        'F#': ['F#','G#m','A#m','B','C#','D#m','E#dim'], 'F': ['F','Gm','Am','Bb','C','Dm','Edim'], 'Bb': ['Bb','Cm','Dm','Eb','F','Gm','Adim'],
        'Eb': ['Eb','Fm','Gm','Ab','Bb','Cm','Ddim'], 'Ab': ['Ab','Bbm','Cm','Db','Eb','Fm','Gdim'], 'Db': ['Db','Ebm','Fm','Gb','Ab','Bbm','Cdim'],
        'Am': ['Am','Bdim','C','Dm','Em','F','G'], 'Em': ['Em','F#dim','G','Am','Bm','C','D'], 'Bm': ['Bm','C#dim','D','Em','F#m','G','A'],
        'F#m': ['F#m','G#dim','A','Bm','C#m','D','E'], 'C#m': ['C#m','D#dim','E','F#m','G#m','A','B'], 'G#m': ['G#m','A#dim','B','C#m','D#m','E','F#'],
        'D#m': ['D#m','E#dim','F#','G#m','A#m','B','C#'], 'Dm': ['Dm','Edim','F','Gm','Am','Bb','C'], 'Gm': ['Gm','Adim','Bb','Cm','Dm','Eb','F'],
        'Cm': ['Cm','Ddim','Eb','Fm','Gm','Ab','Bb'], 'Fm': ['Fm','Gdim','Ab','Bbm','Cm','Db','Eb'], 'Bbm': ['Bbm','Cdim','Db','Ebm','Fm','Gb','Ab']
      };

      let bestScore = -1;
      let bestKey = 'C';
      let bestMode = 'Mayor';

      for (const [keyName, diatonic] of Object.entries(keys)) {
        let score = 0;
        const isMinor = keyName.endsWith('m');
        
        basicChords.forEach(c => { if (diatonic.includes(c)) score += 1; });

        const I = diatonic[0]; const IV = diatonic[3]; const V = diatonic[4];
        if (freq[I]) score += freq[I] * 1.5;
        if (freq[IV]) score += freq[IV] * 1.2;
        if (freq[V]) score += freq[V] * 1.2;

        if (firstChord === I) score += 5;
        if (lastChord === I) score += 5;

        if (notasMelodia && notasMelodia.length > 0) {
           const rootNote = keyName.replace('m', '');
           if (notasMelodia[notasMelodia.length - 1] === rootNote) score += 5;
           const freqNotes = {};
           notasMelodia.forEach(n => freqNotes[n] = (freqNotes[n] || 0) + 1);
           if (freqNotes[rootNote]) score += (freqNotes[rootNote] * 0.5);
        }

        if (score > bestScore) {
          bestScore = score;
          bestKey = keyName;
          bestMode = isMinor ? 'Menor' : 'Mayor';
        } else if (score === bestScore) {
           if (lastChord === keyName || mostFrequent === keyName) {
             bestKey = keyName;
             bestMode = isMinor ? 'Menor' : 'Mayor';
           }
        }
      }

      const totalPossible = basicChords.length * 2.5 + 10;
      let confidence = Math.min(100, Math.round((bestScore / totalPossible) * 100));
      if (confidence < 0) confidence = 0;
      
      const razones = [];
      razones.push(`Los acordes pertenecen principalmente a ${bestKey} ${bestMode}.`);
      if (lastChord === bestKey) razones.push(`La canción finaliza en el centro tonal ${bestKey}.`);
      if (mostFrequent === bestKey) razones.push(`El acorde más repetido es ${bestKey}.`);
      if (notasMelodia && notasMelodia.length > 0) razones.push(`El análisis de melodía refuerza la tonalidad.`);

      console.log(`[Análisis Tonal] Detectado: ${bestKey} (${confidence}%) -> ${razones.join(' ')}`);

      return {
        tonalidad: bestKey,
        modo: bestMode,
        confianza: confidence,
        explicacion: razones.join(' ')
      };
    }

    // ====================================================
    // ESCUCHA DE DATOS BASE Y ENLACE DE EVENTOS
    // ====================================================
    function escucharBaseDatosGlobal() {
      onSnapshot(collection(db, "biblioteca_canciones"), (snap) => {
        cacheSongs = [];
        snap.forEach(doc => cacheSongs.push({ id: doc.id, ...doc.data() }));
        window.cacheSongs = cacheSongs;
        if (currentUserRole === 'lider') {
          renderizarMantenimientoCanciones();
          sincronizarPanelArmado();
          migrarBaseDatosLetras();
        } else if (currentUserRole === 'musico') {
          const msDate = document.getElementById('musico-service-date').value;
          if (msDate) cargarServicioMusico(msDate);
          if (typeof renderRepertorioMusico === 'function') renderRepertorioMusico();
        }
      }, (err) => {
        console.error("Error cargando biblioteca_canciones:", err);
        if (typeof showToast === 'function') showToast("⚠️ Error al cargar el repertorio. Revisa tu conexión.", { duration: 5000 });
      });

      onSnapshot(collection(db, "usuarios"), (snap) => {
        cacheMembers = [];
        snap.forEach(doc => cacheMembers.push({ id: doc.id, ...doc.data() }));
        window.cacheMembers = cacheMembers;
        if (currentUserRole === 'lider') {
          renderizarMantenimientoMiembros();
          sincronizarPanelArmado();
        } else if (currentUserRole === 'musico') {
          const msDate = document.getElementById('musico-service-date').value;
          const maDate = document.getElementById('musico-avail-date').value;
          if (msDate) cargarServicioMusico(msDate);
          if (maDate) cargarAsistenciaMusico(maDate);
        }

        // Setup rehearsal members when members change
        if (window.renderEnsayoMembers) {
          window.renderEnsayoMembers();
        }
      }, (err) => {
        console.error("Error cargando usuarios:", err);
      });

      onSnapshot(collection(db, "planes_servicio"), (snap) => {
        cacheHistorial = [];
        snap.forEach(doc => cacheHistorial.push({ id: doc.id, ...doc.data() }));
        cacheHistorial.sort((a, b) => b.fecha.localeCompare(a.fecha));
        window.cacheHistorial = cacheHistorial;
        if (currentUserRole === 'lider') renderizarHistorialServicios();
      }, (err) => {
        console.error("Error cargando planes_servicio:", err);
      });

      // Initialize rehearsals logic helper
      if (window.initRehearsalsLogic) {
        window.initRehearsalsLogic({
          db: db,
          collection: collection,
          addDoc: addDoc,
          doc: doc,
          getDoc: getDoc,
          updateDoc: updateDoc,
          deleteDoc: deleteDoc,
          onSnapshot: onSnapshot,
          showToast: showToast
        });
      }
    }

    function renderizarHistorialServicios() {
      const cont = document.getElementById('historial-list-container');
      if (!cont) return;
      cont.innerHTML = "";

      const filtroFecha = document.getElementById('historial-date-filter');
      const fechaSeleccionada = filtroFecha ? filtroFecha.value : "";

      const lista = fechaSeleccionada
        ? cacheHistorial.filter(s => s.fecha === fechaSeleccionada)
        : cacheHistorial;

      if (lista.length === 0) {
        cont.innerHTML = fechaSeleccionada
          ? `<p style='color:var(--text3);font-size:13px;text-align:center;padding:20px;'>No hay ningún servicio registrado para el <b>${fechaSeleccionada}</b>.</p>`
          : `<p style='color:var(--text3);font-size:13px;text-align:center;padding:20px;'>No hay servicios creados aún.</p>`;
        return;
      }

      lista.forEach(s => {
        const isSent = s.estadoEnvio === 'enviado';
        const badge = isSent
          ? `<span class="chip chip-teal" style="font-size:10px;">🟢 Enviado</span>`
          : `<span class="chip chip-gold" style="font-size:10px;">🟡 Pendiente — edita y envía cuando quieras</span>`;

        const totalCanciones = s.cancionesSeleccionadas ? Object.values(s.cancionesSeleccionadas).filter(v => v !== false).length : 0;
        const totalMusicos = s.musicosAsignados ? Object.values(s.musicosAsignados).filter(v => v === true).length : 0;

        const div = document.createElement('div');
        div.className = "member-row";
        div.style.justifyContent = "space-between";
        div.style.alignItems = "flex-start";
        div.innerHTML = `
        <div style="display:flex; align-items:center; gap:12px;">
          <div style="font-size:24px;">🗓️</div>
          <div class="member-info">
            <div class="member-name" style="font-size:15px; margin-bottom:5px;">Servicio: ${s.fecha}</div>
            <div class="member-role" style="margin-bottom:4px;">${badge}</div>
            <div style="font-size:11px; color:var(--text3);"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px;"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg> ${totalCanciones} canción(es) &nbsp;|&nbsp; 👥 ${totalMusicos} integrante(s)</div>
          </div>
        </div>
        <div style="display:flex; flex-direction:column; gap:6px; align-items:flex-end;">
          <button class="chip chip-purple btn-load-historial" style="cursor:pointer; border:none; padding:7px 14px; font-weight:600; white-space:nowrap;" data-date="${s.fecha}">
            ${isSent ? '✏️ Ver / Editar' : '📤 Abrir y Enviar'}
          </button>
        </div>
      `;
        div.querySelector('.btn-load-historial').addEventListener('click', () => {
          document.getElementById('service-date-select').value = s.fecha;
          sincronizarPanelArmado();
          document.querySelector('.nav-tab[data-tab="tab-servicios"]').click();
        });
        cont.appendChild(div);
      });
    }

    // Escuchar el selector de fecha principal
    serviceDateSelect.addEventListener('change', () => {
      sincronizarPanelArmado();
    });

    // Listeners del filtro del historial
    document.getElementById('historial-date-filter').addEventListener('change', () => renderizarHistorialServicios());
    document.getElementById('btn-clear-historial-filter').addEventListener('click', () => {
      document.getElementById('historial-date-filter').value = '';
      renderizarHistorialServicios();
    });

    // Buscador de canciones en vivo
    document.getElementById('search-service-songs').addEventListener('input', debounce(() => {
      if (window._currentServiceData) {
        renderizarComponentesServicio(window._currentServiceData);
      }
    }, 300));

    // ====================================================
    // LOGICA CENTRAL: ARMADO DE SERVICIOS POR FECHA
    // ====================================================
    function actualizarLetraSiAbierta() {
      if (window._currentLyricsSongId && window.abrirModalLetraGlobal) {
        const cache = window._lyricsCache || {};
        const song = cache[window._currentLyricsSongId];
        if (song) {
          const newTone = song.tonoServicio || song.tonoBase;
          if (window._currentLyricsToneDisplayed !== newTone) {
            const mtabRep = document.getElementById('mtab-repertorio-musico');
            const isRepActive = mtabRep && mtabRep.classList.contains('active');
            const isSplitView = window.innerWidth >= 768 && isRepActive;
            const modalActive = document.getElementById('lyrics-modal')?.classList.contains('active');

            if (modalActive || isSplitView) {
              window.abrirModalLetraGlobal(window._currentLyricsSongId, window._currentLyricsPlaylistContext, false, true);
            }
          }
        }
      }
    }
    function sincronizarPanelArmado() {
      const targetDate = serviceDateSelect.value;
      if (!targetDate) return;

      if (unsubscribeService) unsubscribeService();

      const spinnerHtml = "<div style='display:flex; flex-direction:column; align-items:center; justify-content:center; padding:40px 20px; gap:12px;'><div style='width:30px; height:30px; border:3px solid rgba(229,180,60,0.2); border-top-color:var(--gold); border-radius:50%; animation:spin 1s linear infinite;'></div><p style='color:var(--text3); font-size:13px; margin:0;'>Cargando datos del servicio...</p></div>";
      document.getElementById('service-team-container').innerHTML = spinnerHtml;
      const _adminSongsCont = document.getElementById('admin-selected-songs-container');
      if (_adminSongsCont) _adminSongsCont.innerHTML = spinnerHtml;

      const serviceDocRef = doc(db, "planes_servicio", targetDate);

      unsubscribeService = onSnapshot(serviceDocRef, async (snap) => {
        if (!snap.exists()) {
          // Inicializar estructura limpia de la fecha en Firestore para todos
          await setDoc(serviceDocRef, {
            fecha: targetDate,
            cancionesSeleccionadas: {}, // id_cancion: tono_elegido
            cancionesSeleccionadasTipos: {}, // id_cancion: tipo
            ordenCanciones: [],
            musicosAsignados: {},       // id_usuario: true/false
            disponibilidad: {}          // id_usuario: 'confirmado' | 'ausente'
          });
          return;
        }

        const dataServicio = snap.data();
        window._currentServiceData = dataServicio;
        renderizarComponentesServicio(dataServicio);
      });
    }

    function renderizarServicioVacio() {
      const teamCont = document.getElementById('service-team-container');
      if (teamCont) teamCont.innerHTML = `<p style='color:var(--text3);font-size:13px;text-align:center;padding:10px;'>No hay datos configurados para esta fecha.</p>`;
    }

    function generarMensajeTexto(dataServicio) {
      const targetDate = serviceDateSelect.value;
      if (!targetDate) return "";

      const partesFecha = targetDate.split('-');
      const objetoFecha = new Date(partesFecha[0], partesFecha[1] - 1, partesFecha[2]);
      const fechaLegible = objetoFecha.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });

      let msg = `*PROGRAMACIÓN DE ALABANZA - IMR4*\n🗓️ *${fechaLegible.toUpperCase()}*\n\n`;

      if (dataServicio.nota_adicional && dataServicio.nota_adicional.trim() !== "") {
        msg += `✏️ *NOTA DEL LÍDER:*\n_${dataServicio.nota_adicional}_\n\n`;
      }

      // Combinar canciones de la biblioteca y personalizadas
      const cancionesSeleccionadas = dataServicio.cancionesSeleccionadas || {};
      const selectedIds = Object.keys(cancionesSeleccionadas).filter(k => cancionesSeleccionadas[k] !== false);
      const ordenCanciones = dataServicio.ordenCanciones || [];
      const customSongsMetadata = dataServicio.customSongsMetadata || {};

      let allSelected = [];
      selectedIds.forEach(id => {
        if (id.startsWith('custom_')) {
          const meta = customSongsMetadata[id];
          if (meta) {
            allSelected.push({
              id: id,
              nombre: meta.nombre,
              artista: meta.artista || "Personalizada",
              tonoBase: meta.tonoBase,
              tipo: meta.tipo,
              isCustom: true
            });
          }
        } else {
          const song = cacheSongs.find(s => s.id === id);
          if (song) {

            let songCopy = { ...song };
            const refData = typeof data !== 'undefined' ? data : (typeof dataServicio !== 'undefined' ? dataServicio : {});
            if (refData.cancionesSeleccionadasTipos && refData.cancionesSeleccionadasTipos[id]) {
              songCopy.tipo = refData.cancionesSeleccionadasTipos[id];
            }
            allSelected.push(songCopy);
          }
        }
      });

      // Ordenar por ordenCanciones
      allSelected.sort((a, b) => {
        const ia = ordenCanciones.indexOf(a.id);
        const ib = ordenCanciones.indexOf(b.id);
        if (ia === -1 && ib === -1) return 0;
        if (ia === -1) return 1;
        if (ib === -1) return -1;
        return ia - ib;
      });

      const adoraciones = allSelected.filter(s => s.tipo === 'adoracion');
      const alabanzas = allSelected.filter(s => s.tipo === 'alabanza');

      msg += `🎵 *REPERTORIO SELECCIONADO:*\n`;

      // Adoración primero
      msg += `\n🌟 *ADORACIÓN (Lentas):*\n`;
      if (adoraciones.length > 0) {
        adoraciones.forEach((s, idx) => {
          const tone = cancionesSeleccionadas[s.id];
          msg += `  ${idx + 1}. ${s.nombre} (_Tono: ${tone}_)\n`;
        });
      } else {
        msg += "  _Ninguna seleccionada_\n";
      }

      // Alabanza después
      msg += `\n🔥 *ALABANZA (Rápidas):*\n`;
      if (alabanzas.length > 0) {
        alabanzas.forEach((s, idx) => {
          const tone = cancionesSeleccionadas[s.id];
          msg += `  ${idx + 1}. ${s.nombre} (_Tono: ${tone}_)\n`;
        });
      } else {
        msg += "  _Ninguna seleccionada_\n";
      }

      msg += `\n👥 *EQUIPO ASIGNADO:*\n`;
      let countMusicos = 0;
      let countCoristas = 0;
      let cuerpoMusicos = " *Músicos:*\n";
      let cuerpoCoristas = " *Voces/Coros:*\n";

      cacheMembers.forEach(m => {
        if (dataServicio.musicosAsignados && dataServicio.musicosAsignados[m.usuario]) {
          if (m.type === 'musico') {
            countMusicos++;
            cuerpoMusicos += `  • ${m.nombre} [${m.instrumento}]\n`;
          } else {
            countCoristas++;
            cuerpoCoristas += `  • ${m.nombre} [${m.instrumento}]\n`;
          }
        }
      });

      if (countMusicos > 0) msg += cuerpoMusicos;
      if (countCoristas > 0) msg += cuerpoCoristas;
      if (countMusicos === 0 && countCoristas === 0) {
        msg += "  _No se han asignado integrantes._\n";
      }

      msg += `\n_“Alabadle con salterio y arpa. Alabadle con pandero y danza...” Ps. 150_`;
      return msg;
    }

    function renderizarComponentesServicio(dataServicio) {
      const filterText = removeAccents(document.getElementById('search-service-songs').value).toLowerCase().trim();

      const teamCont = document.getElementById('service-team-container');

      // --- 0. MOSTRAR U OCULTAR CARD DE DISPONIBILIDAD PERSONAL ---
      const availCard = document.getElementById('my-availability-card');
      if (activeSessionUser && currentUserRole !== 'lider' && activeSessionUser.usuario !== 'admin') {
        availCard.style.display = 'block';
        const userAvail = dataServicio.disponibilidad ? dataServicio.disponibilidad[activeSessionUser.usuario] : null;
        const statusText = document.getElementById('my-avail-status');
        if (userAvail === 'confirmado') {
          statusText.innerHTML = 'Tu estado: <span style="color:var(--teal);">Voy a Asistir</span>';
        } else if (userAvail === 'ausente') {
          statusText.innerHTML = 'Tu estado: <span style="color:var(--coral);">No Disponible</span>';
        } else {
          statusText.innerHTML = 'Tu estado: <span style="color:var(--text3);">Sin Confirmar</span>';
        }
      } else {
        availCard.style.display = 'none';
      }

      // --- 0. NOTA ADICIONAL DEL LÍDER ---
      if (currentUserRole === 'lider') {
        const notaInput = document.getElementById('service-nota-input');
        notaInput.value = dataServicio.nota_adicional || "";

        // Sobrescribir evento para que no se dupliquen listeners
        const btnSaveNota = document.getElementById('btn-save-nota');
        const newBtnSaveNota = btnSaveNota.cloneNode(true);
        btnSaveNota.parentNode.replaceChild(newBtnSaveNota, btnSaveNota);

        newBtnSaveNota.addEventListener('click', async () => {
          const val = notaInput.value.trim();
          // Al guardar nota, borramos el borrador para que el preview se regenere con la nota incluida
          await updateDoc(doc(db, "planes_servicio", serviceDateSelect.value), {
            nota_adicional: val,
            mensajeEditado: deleteField()
          });
          showToast('Nota guardada — el mensaje de WhatsApp se actualizó');
        });
      }

      // --- 1. RENDER DE MÚSICOS (Filtrados por disponibilidad real) ---
      teamCont.innerHTML = "";
      const miembrosFiltrados = cacheMembers.filter(m => m.usuario !== 'admin');

      if (miembrosFiltrados.length === 0) {
        teamCont.innerHTML = `<p style="color: var(--text3); font-size:12px; text-align:center;">No hay personal registrado en el sistema.</p>`;
      } else {
        // 1a. Contar instrumentos asignados para advertir duplicados
        const assignedCounts = {};
        miembrosFiltrados.forEach(m => {
          const isAssigned = dataServicio.musicosAsignados && dataServicio.musicosAsignados[m.usuario];
          if (isAssigned) {
            const userInsts = m.instrumento.split(',').map(s => s.trim());
            userInsts.forEach(inst => {
              assignedCounts[inst] = (assignedCounts[inst] || 0) + 1;
            });
          }
        });

        const duplicateInstruments = [];
        for (const [inst, count] of Object.entries(assignedCounts)) {
          const isVoice = ["Voz Principal", "Corista"].includes(inst);
          if (!isVoice && count > 1) {
            duplicateInstruments.push(inst);
          }
        }

        if (duplicateInstruments.length > 0) {
          const warningBanner = document.createElement('div');
          warningBanner.style.background = 'rgba(255, 107, 107, 0.12)';
          warningBanner.style.border = '1px solid var(--coral)';
          warningBanner.style.borderRadius = '8px';
          warningBanner.style.padding = '10px 14px';
          warningBanner.style.marginBottom = '14px';
          warningBanner.style.fontSize = '12px';
          warningBanner.style.color = 'var(--coral)';
          warningBanner.style.fontWeight = '500';
          warningBanner.innerHTML = `Atención líder: Hay más de un integrante asignado para: <b>${duplicateInstruments.join(', ')}</b>.`;
          teamCont.appendChild(warningBanner);
        }

        // 1b. Helper para renderizar filas de miembros
        const crearFilaMiembro = (m, isAvailableGroup) => {
          const isChecked = dataServicio.musicosAsignados && dataServicio.musicosAsignados[m.usuario];
          const userAvail = dataServicio.disponibilidad ? dataServicio.disponibilidad[m.usuario] : null;

          let statusBadge = "";
          if (!isAvailableGroup) {
            if (userAvail === 'ausente') {
              statusBadge = `<span style="color:var(--coral); font-size:11px; margin-left: auto; margin-right: 10px; font-weight: 500;">Ausente</span>`;
            } else {
              statusBadge = `<span style="color:var(--text3); font-size:11px; margin-left: auto; margin-right: 10px;">Sin Responder</span>`;
            }
          }

          const containsVoice = m.instrumento.includes("Voz") || m.instrumento.includes("Corista");
          const containsRhythm = m.instrumento.includes("Batería") || m.instrumento.includes("Bajo") || m.instrumento.includes("Percusión");
          const containsInst = m.instrumento.includes("Batería") || m.instrumento.includes("Bajo") || m.instrumento.includes("Teclado") || m.instrumento.includes("Guitarra") || m.instrumento.includes("Percusión");

          let avatarClass = "av-gold";
          if (containsRhythm) {
            avatarClass = "av-purple";
          } else if (containsVoice) {
            avatarClass = "av-teal";
          }

          const row = document.createElement('div');
          row.className = "member-row";
          if (!isAvailableGroup) {
            row.style.opacity = "0.5";
          }

          const avatarPicStyle = m.profilePic
            ? `background-image: url(${m.profilePic}); background-size: cover; background-position: center; color: transparent;`
            : '';
          const avatarInitials = m.profilePic ? '' : m.nombre.substring(0, 2).toUpperCase();

          row.innerHTML = `
          <div class="avatar ${avatarClass}" style="${avatarPicStyle}">${avatarInitials}</div>
          <div class="member-info">
            <div class="member-name">${m.nombre}</div>
            <div class="member-role">${m.instrumento}</div>
          </div>
          ${statusBadge}
          <div class="assign-check ${isChecked ? 'on' : ''} ${(!isAvailableGroup || currentUserRole !== 'lider') ? 'song-locked' : ''}"></div>


        `;

          if (currentUserRole === 'lider' && isAvailableGroup) {
            row.querySelector('.assign-check').addEventListener('click', async () => {
              const path = `musicosAsignados.${m.usuario}`;
              await updateDoc(doc(db, "planes_servicio", serviceDateSelect.value), {
                [path]: !isChecked
              });
            });
          }
          return row;
        };

        // 1c. Clasificar miembros
        const disponibles = [];
        const noDisponibles = [];

        miembrosFiltrados.forEach(m => {
          const userAvail = dataServicio.disponibilidad ? dataServicio.disponibilidad[m.usuario] : null;
          if (userAvail === 'confirmado') {
            disponibles.push(m);
          } else {
            noDisponibles.push(m);
          }
        });

        // Renderizar Confirmados
        const headerDisp = document.createElement('div');
        headerDisp.className = "block-title";
        headerDisp.style.marginTop = "0";
        headerDisp.style.color = "var(--teal)";
        headerDisp.style.borderBottomColor = "rgba(78,205,196,0.15)";
        headerDisp.textContent = "Confirmados (Disponibles para el Servicio)";
        teamCont.appendChild(headerDisp);

        if (disponibles.length === 0) {
          const p = document.createElement('p');
          p.style.color = "var(--text3)";
          p.style.fontSize = "12px";
          p.style.padding = "12px 6px";
          p.style.textAlign = "center";
          p.textContent = "Ningún integrante ha confirmado disponibilidad para esta fecha.";
          teamCont.appendChild(p);
        } else {
          disponibles.forEach(m => {
            teamCont.appendChild(crearFilaMiembro(m, true));
          });
        }

        // Eliminada sección de No Disponibles por petición del usuario
      }

      // --- 2. RENDER DE REPERTORIO CON TONO DINÁMICO ---
      // (Global song lists have been hidden in favor of the 'Add Song' Modal for Admin, see renderSelectedSongsAdmin)

      // --- 3. ACTUALIZAR PREVISUALIZACIÓN EN TIEMPO REAL ---
      currentAutoMsg = generarMensajeTexto(dataServicio);
      const previewEl = document.getElementById('whatsapp-preview');
      if (dataServicio.mensajeEditado) {
        previewEl.value = dataServicio.mensajeEditado;
      } else {
        previewEl.value = currentAutoMsg || "Selecciona integrantes y canciones para armar el plan...";
      }

      // Render ordered repertory in admin view
      renderSelectedSongsAdmin(dataServicio);
      actualizarLetraSiAbierta();
    }

    // Eventos de Disponibilidad del Músico
    document.getElementById('btn-avail-confirm').addEventListener('click', async () => {
      const targetDate = serviceDateSelect.value;
      if (!targetDate || !activeSessionUser) return;
      const path = `disponibilidad.${activeSessionUser.usuario}`;
      await updateDoc(doc(db, "planes_servicio", targetDate), {
        [path]: 'confirmado'
      });
    });

    document.getElementById('btn-avail-decline').addEventListener('click', async () => {
      const targetDate = serviceDateSelect.value;
      if (!targetDate || !activeSessionUser) return;
      const path = `disponibilidad.${activeSessionUser.usuario}`;
      const pathAsignado = `musicosAsignados.${activeSessionUser.usuario}`;
      await updateDoc(doc(db, "planes_servicio", targetDate), {
        [path]: 'ausente',
        [pathAsignado]: false
      });
    });


    // ====================================================
    // GENERADOR INTERACTIVO DEL MENSAJE DE WHATSAPP
    // ====================================================
    document.getElementById('btn-regen-whatsapp').addEventListener('click', () => {
      const previewEl = document.getElementById('whatsapp-preview');
      previewEl.value = currentAutoMsg || "Selecciona integrantes y canciones para armar el plan...";
    });

    // Guardar como BORRADOR (sin marcar enviado)
    document.getElementById('btn-save-draft').addEventListener('click', async () => {
      const targetDate = serviceDateSelect.value;
      if (!targetDate) { customAlert('Primero selecciona una fecha.'); return; }
      const newMsg = document.getElementById('whatsapp-preview').value;
      await updateDoc(doc(db, "planes_servicio", targetDate), {
        mensajeEditado: newMsg,
        estadoEnvio: 'pendiente'
      });
      customAlert("Borrador guardado. El historial lo muestra como 🟡 Pendiente.");
    });

    // Enviar por WhatsApp (iOS-safe: sin await antes de abrir enlace)
    document.getElementById('btn-copy-whatsapp').addEventListener('click', () => {
      const previewEl = document.getElementById('whatsapp-preview');
      const msg = previewEl.value;
      if (!msg || msg.startsWith("Selecciona") || msg.trim() === "") {
        customAlert("No hay datos cargados para generar un mensaje aún.");
        return;
      }

      // Construir URL de forma SÍNCRONA (requerido por iOS para que no bloquee la apertura)
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

      // Abrir enlace SINCRÓNICAMENTE usando elemento <a> (funciona en iOS Safari)
      const a = document.createElement('a');
      a.href = waUrl;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      // Clipboard (best effort, no bloquea en iOS)
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(msg).catch(() => { });
      }

      // Firebase update (no-blocking)
      const targetDate = serviceDateSelect.value;
      if (targetDate) {
        updateDoc(doc(db, "planes_servicio", targetDate), {
          mensajeEditado: msg,
          estadoEnvio: 'enviado'
        }).catch(e => console.error(e));
      }
    });


    function resetSongForm() {
      editingSongId = null;
      document.getElementById('form-add-song').reset();
      const btnSubmit = document.querySelector('#form-add-song button[type="submit"]');
      if (btnSubmit) {
        btnSubmit.textContent = "Guardar Canción";
        btnSubmit.style.background = "var(--teal)";
      }
      const modal = document.getElementById('admin-song-modal');
      if (modal) modal.classList.remove('active');
    }

    // ====================================================
    // RESPALDO: CRUD MANTENIMIENTOS (REPERTORIO Y MIEMBROS)
    // ====================================================
    document.getElementById('form-add-song').addEventListener('submit', async (e) => {
      e.preventDefault();
      let nombre = document.getElementById('song-name-input').value.trim();

      // Limpiar automáticamente sufijos molestos en el nombre de la canción
      nombre = nombre
        .replace(/\s*[\(,\-]?\s*(acordes|letra|letras|tab|tabs|chords|lyric|lyrics|acordes\s+y\s+letra|letra\s+y\s+acordes)\s*\)?/gi, '')
        .replace(/\s+/g, ' ')
        .trim();

      const artista = document.getElementById('song-artist-input').value.trim();

      // Verificar duplicado solo al AGREGAR (no al editar)
      if (!editingSongId) {
        const key = `${nombre.toLowerCase()}||${artista.toLowerCase()}`;
        const existe = (cacheSongs || []).some(s =>
          `${(s.nombre || '').toLowerCase()}||${(s.artista || '').toLowerCase()}` === key
        );
        if (existe) {
          customAlert(`Ya existe "${nombre}" de ${artista} en el catálogo.\n\nNo se puede agregar duplicado.`);
          return;
        }
      }

      const idUnico = editingSongId || ("song_" + Date.now());
      const letra = document.getElementById('song-lyrics-input').value;

      const payloadMetadata = {
        nombre: fixCorruptedText(nombre),
        artista: fixCorruptedText(artista),
        tonoBase: document.getElementById('song-key-input').value.trim(),
        tipo: document.getElementById('song-type-input').value,
        youtube: document.getElementById('song-youtube-input').value.trim()
      };

      // Si estamos editando, conservar el campo 'oficial' anterior
      if (editingSongId) {
        const prevSong = (cacheSongs || []).find(x => x.id === editingSongId);
        if (prevSong && prevSong.oficial !== undefined) {
          payloadMetadata.oficial = prevSong.oficial;
        }
      } else {
        payloadMetadata.oficial = false;
      }

      // 1. Guardar metadata en biblioteca_canciones
      await setDoc(doc(db, "biblioteca_canciones", idUnico), payloadMetadata);

      // 2. Guardar letra en letras_canciones
      await setDoc(doc(db, "letras_canciones", idUnico), { letra: fixCorruptedText(letra) });

      // 3. Guardar en cache local de letras
      if (!window._lyricsCache) window._lyricsCache = {};
      window._lyricsCache[idUnico] = {
        nombre,
        tonoBase: payloadMetadata.tonoBase,
        tonoServicio: payloadMetadata.tonoBase,
        youtube: payloadMetadata.youtube,
        letra
      };

      const wasEditing = !!editingSongId;
      resetSongForm();
      showToast(wasEditing ? "Canción actualizada." : "Canción añadida al catálogo.");
    });

    // ====================================================
    // IMPORTAR DESDE LACUERDA — fetch por URL
    // ====================================================
    document.getElementById('btn-fetch-lacuerda').addEventListener('click', async () => {
      const urlInput = document.getElementById('lacuerda-url-input');
      const statusEl = document.getElementById('lacuerda-fetch-status');
      const url = (urlInput.value || '').trim();

      if (!url) {
        statusEl.textContent = 'Pega el link de la canción primero.';
        statusEl.style.color = 'var(--gold)';
        return;
      }
      if (!url.includes('lacuerda.net')) {
        statusEl.textContent = 'El link debe ser de lacuerda.net';
        statusEl.style.color = 'var(--gold)';
        return;
      }

      statusEl.textContent = 'Buscando canción...';
      statusEl.style.color = 'var(--text3)';
      document.getElementById('btn-fetch-lacuerda').disabled = true;

      try {
        // Usar proxy CORS para poder hacer el fetch desde el navegador
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
        const resp = await fetch(proxyUrl);
        if (!resp.ok) throw new Error('No se pudo cargar la página.');
        const buffer = await resp.arrayBuffer();
        const decoder = new TextDecoder('windows-1252');
        const html = decoder.decode(buffer);
        const doc2 = new DOMParser().parseFromString(html, 'text/html');

        // --- Extraer nombre de la canción ---
        let nombre = '';
        const h1 = doc2.querySelector('h1');
        if (h1) {
          nombre = h1.textContent
            .replace(/acordes de/i, '')
            .replace(/tabs de/i, '')
            .replace(/letra de/i, '')
            .trim();
        }
        if (!nombre) {
          nombre = doc2.title
            .split('-')[0]
            .replace(/acordes/i, '')
            .replace(/tabs/i, '')
            .trim();
        }
        if (nombre) {
          nombre = nombre
            .replace(/\s*[\(,\-]?\s*(acordes|letra|letras|tab|tabs|chords|lyric|lyrics|acordes\s+y\s+letra|letra\s+y\s+acordes)\s*\)?/gi, '')
            .replace(/\s+/g, ' ')
            .trim();
        }

        // --- Extraer artista desde la URL ---
        let artista = '';
        try {
          const urlObj = new URL(url);
          const parts = urlObj.pathname.split('/').filter(Boolean);
          if (parts.length >= 1) {
            artista = parts[0]
              .replace(/_/g, ' ')
              .replace(/-/g, ' ')
              .replace(/\b\w/g, c => c.toUpperCase());
          }
        } catch (_) { }

        // --- Extraer letra/acordes ---
        let letra = '';
        const preElements = Array.from(doc2.querySelectorAll('pre, PRE'));
        const pre = preElements.find(p => p.textContent.trim().length > 10) || preElements[0];
        if (pre) {
          letra = pre.textContent.trim();
        } else {
          const tBody = doc2.getElementById('t_body');
          if (tBody) letra = tBody.innerText.trim();
        }

        // --- Extraer tono usando análisis avanzado ---
        let textoParaAnalisis = letra || '';
        const odesMatch = html.match(/odes\s*=\s*['"]([^'"]+)['"]/);
        if (odesMatch) {
          const cleanOdes = odesMatch[1].replace(/@/g, '#');
          textoParaAnalisis += " " + cleanOdes;
        } else {
           const bodyText = doc2.body?.innerText || html;
           const tonoMatch = bodyText.match(/[Tt]ono[:\s]+([A-Ga-gDdoReeMiiFaaSollLasiSI#bm]+)/i);
           if (tonoMatch) {
             textoParaAnalisis += " " + tonoMatch[1];
           }
        }

        // Ejecutar algoritmo de análisis de tonalidad (sin melodía explícita desde scraping por ahora, pero la función la soporta)
        const analisis = analizarTonalidadAvanzado(textoParaAnalisis, []);
        let tonoBase = normalizarTono(analisis.tonalidad);

        // --- Rellenar el formulario ---
        if (nombre) document.getElementById('song-name-input').value = fixCorruptedText(nombre);
        if (artista) document.getElementById('song-artist-input').value = fixCorruptedText(artista);

        const keySelect = document.getElementById('song-key-input');
        if (keySelect) {
          const opt = Array.from(keySelect.options).find(o => o.value === tonoBase);
          if (opt) keySelect.value = tonoBase;
        }

        if (letra) document.getElementById('song-lyrics-input').value = fixCorruptedText(convertirTextoEspañolAIngles(letra));

        if (nombre && artista) {
          statusEl.textContent = `Importado: "${nombre}" de ${artista}`;
          statusEl.style.color = 'var(--teal)';
          urlInput.value = '';
        } else {
          statusEl.textContent = 'Se importó pero algunos campos pueden estar vacíos. Verifica.';
          statusEl.style.color = 'var(--gold)';
        }
      } catch (err) {
        statusEl.textContent = `Error: ${err.message}`;
        statusEl.style.color = 'var(--coral)';
      } finally {
        document.getElementById('btn-fetch-lacuerda').disabled = false;
      }
    });


    function calcularTiempoTranscurrido(fechaStr) {
      if (!fechaStr) return "Nunca tocada";
      const partes = fechaStr.split('-');
      if (partes.length !== 3) return fechaStr;

      const fechaServicio = new Date(partes[0], partes[1] - 1, partes[2]);
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      fechaServicio.setHours(0, 0, 0, 0);

      const diffTime = hoy.getTime() - fechaServicio.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 0) {
        return `Próximo: ${partes[2]}/${partes[1]}`;
      }
      if (diffDays === 0) return "Hoy";
      if (diffDays === 1) return "Ayer";
      if (diffDays < 7) return `Hace ${diffDays} días`;
      if (diffDays < 30) {
        const sem = Math.floor(diffDays / 7);
        return `Hace ${sem} ${sem === 1 ? 'semana' : 'semanas'}`;
      }
      const meses = Math.floor(diffDays / 30);
      return `Hace ${meses} ${meses === 1 ? 'mes' : 'meses'}`;
    }

    function obtenerUltimaVezCantada(songId) {
      if (!window.cacheHistorial || window.cacheHistorial.length === 0) return "Nunca tocada";
      const plan = window.cacheHistorial.find(p => p.cancionesSeleccionadas && p.cancionesSeleccionadas[songId] !== undefined && p.cancionesSeleccionadas[songId] !== false);
      if (!plan) return "Nunca tocada";
      return calcularTiempoTranscurrido(plan.fecha);
    }

    window._adminSelectedArtist = null;

    function crearCartaCancionAdmin(s, playlistContext) {
      const cardBorder = s.oficial
        ? 'border-bottom: 1.5px solid rgba(244,197,66, 0.4) !important;'
        : (s.tipo === 'adoracion'
          ? 'border-bottom: 1px solid rgba(155, 143, 255, 0.25) !important;'
          : 'border-bottom: 1px solid rgba(78, 205, 196, 0.25) !important;');

      const keysOptions = ['C', 'Cm', 'C#', 'C#m', 'D', 'Dm', 'D#', 'D#m', 'E', 'Em', 'F', 'Fm', 'F#', 'F#m', 'G', 'Gm', 'G#', 'G#m', 'A', 'Am', 'A#', 'A#m', 'B', 'Bm'];
      const ultimaVezText = obtenerUltimaVezCantada(s.id);
      let tagColor = "var(--text3)";
      if (ultimaVezText.includes("semana") || ultimaVezText.includes("día") || ultimaVezText === "Hoy" || ultimaVezText === "Ayer") {
        tagColor = "var(--teal)";
      } else if (ultimaVezText.includes("mes")) {
        tagColor = "var(--purple)";
      }

      const div = document.createElement('div');
      div.className = "musico-song-card";
      div.style.cssText = `background: transparent !important; border: none !important; border-radius: 0 !important; margin-bottom: 0 !important; padding: 14px 4px !important; box-shadow: none !important; flex-wrap: wrap; flex-direction: column; align-items: stretch; gap: 10px; ${cardBorder}`;

      div.innerHTML = `
        <div class="song-card-info" style="margin-left: 4px; flex:1; min-width:0; width: 100%;">
          <div class="song-card-name" style="font-weight: 600; white-space: normal; overflow: visible; word-break: break-word;">${s.nombre}</div>
          <div class="song-card-artist" style="font-size:11px; color: var(--text2); display:flex; align-items:center; gap:6px; flex-wrap:wrap; margin-top:4px;">
            <span>${s.artista}</span>
            <span>•</span>
            <span style="background:rgba(255,255,255,0.05); padding:1px 6px; border-radius:4px; font-size:10px; color:${tagColor}; border:1px solid rgba(255,255,255,0.08); font-weight:500;">
              ${ultimaVezText}
            </span>
          </div>
        </div>

        <div style="display:flex; align-items:center; gap: 6px; flex-wrap: wrap; margin-left: 4px; padding-right: 4px;">
          <select class="select-admin-tone" title="Cambiar tono base" style="background:var(--bg3); border:1px solid rgba(244,197,66,0.4); color:var(--gold); border-radius:6px; padding:4px 6px; font-size:11px; font-family:var(--font-body); outline:none; cursor:pointer; font-weight:600;">
            ${keysOptions.map(t => `<option value="${t}" ${t === s.tonoBase ? 'selected' : ''}>${t}</option>`).join('')}
          </select>
          ${currentUserRole === 'lider' ? `
            <button class="chip btn-toggle-oficial" style="cursor:pointer; border:1px solid ${s.oficial ? 'rgba(78,205,196,0.5)' : 'rgba(255,255,255,0.1)'}; background:${s.oficial ? 'rgba(78,205,196,0.15)' : 'transparent'}; color:${s.oficial ? 'var(--teal)' : 'var(--text3)'}; padding: 5px 10px; border-radius: 6px; font-weight:600; font-size:11px; margin:0;" title="Marcar como oficial">
              ${s.oficial ? 'Oficial' : 'Hacer Oficial'}
            </button>
            <button class="chip chip-teal click-edit-song" style="cursor:pointer; border:none; padding: 5px 10px; border-radius: 6px; font-weight:600; font-size:11px; margin:0;" title="Editar">Editar</button>
            <button class="chip chip-coral click-del-song" style="cursor:pointer; border:none; padding: 5px 10px; border-radius: 6px; font-weight:600; font-size:11px; margin:0;" title="Eliminar">Eliminar</button>
          ` : ''}
        </div>
      `;

      div.onclick = (e) => {
        if (
          e.target.classList.contains('click-edit-song') ||
          e.target.classList.contains('click-del-song') ||
          e.target.classList.contains('btn-toggle-oficial') ||
          e.target.closest('.select-admin-tone')
        ) {
          return;
        }
        if (window.abrirModalLetraGlobal) window.abrirModalLetraGlobal(s.id, playlistContext);
      };

      // Selector de tono
      const toneSelect = div.querySelector('.select-admin-tone');
      if (toneSelect) {
        toneSelect.addEventListener('change', async (ev) => {
          const nuevoTono = ev.target.value;
          await updateDoc(doc(db, "biblioteca_canciones", s.id), { tonoBase: nuevoTono });
          showToast(`Tono de "${s.nombre}" → ${nuevoTono}`);
        });
      }

      if (currentUserRole === 'lider') {
        const editBtn = div.querySelector('.click-edit-song');
        const delBtn = div.querySelector('.click-del-song');
        const oficialBtn = div.querySelector('.btn-toggle-oficial');

        if (oficialBtn) {
          oficialBtn.addEventListener('click', async () => {
            const isOficialNow = !s.oficial;
            await updateDoc(doc(db, "biblioteca_canciones", s.id), { oficial: isOficialNow });
            showToast(isOficialNow ? `"${s.nombre}" ahora es Oficial` : `"${s.nombre}" ya no es Oficial`);
          });
        }

        if (editBtn) {
          editBtn.addEventListener('click', async () => {
            editingSongId = s.id;
            document.getElementById('song-name-input').value = s.nombre;
            document.getElementById('song-artist-input').value = s.artista;
            document.getElementById('song-key-input').value = s.tonoBase;
            document.getElementById('song-type-input').value = s.tipo || "alabanza";
            document.getElementById('song-youtube-input').value = s.youtube || "";

            // Cargar letra asíncronamente
            document.getElementById('song-lyrics-input').value = "Cargando letra...";
            try {
              const cached = window._lyricsCache && window._lyricsCache[s.id];
              if (cached && cached.letra) {
                document.getElementById('song-lyrics-input').value = cached.letra;
              } else {
                const snap = await getDoc(doc(db, "letras_canciones", s.id));
                const letra = snap.exists() ? (snap.data().letra || '') : '';
                document.getElementById('song-lyrics-input').value = letra;
                if (!window._lyricsCache) window._lyricsCache = {};
                window._lyricsCache[s.id] = {
                  nombre: s.nombre,
                  tonoBase: s.tonoBase,
                  tonoServicio: s.tonoBase,
                  youtube: s.youtube || '',
                  letra: letra
                };
              }
            } catch (err) {
              console.error("Error cargando letra para editar:", err);
              document.getElementById('song-lyrics-input').value = "";
            }

            const btnSubmit = document.querySelector('#form-add-song button[type="submit"]');
            if (btnSubmit) {
              btnSubmit.textContent = "Actualizar Canción";
              btnSubmit.style.background = "var(--teal)";
            }
            const modal = document.getElementById('admin-song-modal');
            const title = document.getElementById('song-modal-title');
            if (title) title.textContent = "Editar Canción";
            if (modal) modal.classList.add('active');
          });
        }

        if (delBtn) {
          delBtn.addEventListener('click', async () => {
            if (await customConfirm(`¿Quieres borrar definitivamente "${s.nombre}" del catálogo?`)) {
              await deleteDoc(doc(db, "biblioteca_canciones", s.id));
              await deleteDoc(doc(db, "letras_canciones", s.id));
              if (window._lyricsCache) delete window._lyricsCache[s.id];
            }
          });
        }
      }

      return div;
    }

    function renderizarMantenimientoCanciones() {
      const todasList = document.getElementById('repertorio-todas-list');
      const totalCount = document.getElementById('repertorio-total-count');

      if (!todasList) return;

      const query = removeAccents(document.getElementById('search-admin-canciones')?.value || '').toLowerCase().trim();

      todasList.innerHTML = "";

      // Todas las canciones ordenadas alfabéticamente
      const todas = [...cacheSongs].filter(s => !!s).sort((a, b) =>
        (a.nombre || '').localeCompare(b.nombre || '')
      );

      let filtradas = todas;

      if (query) {
        filtradas = todas.filter(s => {
          const sNombre = removeAccents(s.nombre || '').toLowerCase();
          const sArtista = removeAccents(s.artista || '').toLowerCase();
          return sNombre.includes(query) || sArtista.includes(query);
        });
        window._adminSelectedArtist = null; // Reset filter
      }

      if (!query) {
        // Renderizar lista de artistas como un acordeón
        const artistCounts = {};
        todas.forEach(s => {
          const art = s.artista || 'Desconocido';
          artistCounts[art] = (artistCounts[art] || 0) + 1;
        });
        const sortedArtists = Object.keys(artistCounts).sort((a, b) => a.localeCompare(b));

        if (totalCount) {
          totalCount.textContent = `${sortedArtists.length} artistas`;
        }

        if (sortedArtists.length === 0) {
          todasList.innerHTML = "<p style='color:var(--text3);font-size:12px;text-align:center;padding:20px;'>No se encontraron canciones.</p>";
          return;
        }

        sortedArtists.forEach(art => {
          const artistGroup = document.createElement('div');
          artistGroup.className = 'artist-accordion-group';
          artistGroup.style.marginBottom = '6px';

          const isExpanded = window._adminSelectedArtist === art;
          if (isExpanded) {
            artistGroup.classList.add('expanded');
          }

          const header = document.createElement('div');
          header.className = 'artist-row-item';
          if (isExpanded) {
            header.style.borderColor = 'var(--teal)';
            header.style.background = 'rgba(78, 205, 196, 0.08)';
          }
          header.innerHTML = `
            <span class="artist-row-name">${art}</span>
            <span class="artist-row-count">${artistCounts[art]} ${artistCounts[art] === 1 ? 'canción' : 'canciones'}</span>
          `;

          const collapseDiv = document.createElement('div');
          collapseDiv.className = 'artist-songs-collapse';
          collapseDiv.style.display = isExpanded ? 'block' : 'none';
          collapseDiv.style.padding = '4px 0 8px 0';

          if (isExpanded) {
            const artistSongs = todas.filter(s => (s.artista || 'Desconocido') === art);
            artistSongs.forEach(s => {
              const card = crearCartaCancionAdmin(s, artistSongs);
              collapseDiv.appendChild(card);
            });
          }

          header.onclick = (e) => {
            e.stopPropagation();
            const container = todasList;
            const currentlyExpanded = container.querySelector('.artist-accordion-group.expanded');

            const groupEl = artistGroup;
            const isNowExpanding = !groupEl.classList.contains('expanded');

            if (currentlyExpanded && currentlyExpanded !== groupEl) {
              currentlyExpanded.classList.remove('expanded');
              const prevHeader = currentlyExpanded.querySelector('.artist-row-item');
              if (prevHeader) {
                prevHeader.style.borderColor = '';
                prevHeader.style.background = '';
              }
              const prevCollapse = currentlyExpanded.querySelector('.artist-songs-collapse');
              if (prevCollapse) {
                prevCollapse.style.display = 'none';
                prevCollapse.innerHTML = '';
              }
            }

            if (isNowExpanding) {
              groupEl.classList.add('expanded');
              header.style.borderColor = 'var(--teal)';
              header.style.background = 'rgba(78, 205, 196, 0.08)';
              collapseDiv.style.display = 'block';

              collapseDiv.innerHTML = '';
              const artistSongs = todas.filter(s => (s.artista || 'Desconocido') === art);
              artistSongs.forEach(s => {
                const card = crearCartaCancionAdmin(s, artistSongs);
                collapseDiv.appendChild(card);
              });

              window._adminSelectedArtist = art;
            } else {
              groupEl.classList.remove('expanded');
              header.style.borderColor = '';
              header.style.background = '';
              collapseDiv.style.display = 'none';
              collapseDiv.innerHTML = '';

              window._adminSelectedArtist = null;
            }
          };

          artistGroup.appendChild(header);
          artistGroup.appendChild(collapseDiv);
          todasList.appendChild(artistGroup);
        });
        return;
      }

      if (totalCount) {
        totalCount.textContent = `${filtradas.length} de ${todas.length} canciones`;
      }

      if (filtradas.length === 0) {
        todasList.innerHTML = "<p style='color:var(--text3);font-size:12px;text-align:center;padding:20px;'>No se encontraron canciones.</p>";
      } else {
        filtradas.forEach(s => {
          const card = crearCartaCancionAdmin(s, filtradas);
          todasList.appendChild(card);
        });
      }
    }

    // Listener de búsqueda en tiempo real
    const searchInput = document.getElementById('search-admin-canciones');
    if (searchInput && !searchInput.dataset.listenerAdded) {
      searchInput.dataset.listenerAdded = '1';
      searchInput.addEventListener('input', debounce(() => renderizarMantenimientoCanciones(), 300));
    }


    // ====================================================
    // LOGICA PARA DROPDOWN MULTISELECT DE INSTRUMENTOS
    // ====================================================
    const msHeader = document.getElementById('inst-multiselect-header');
    const msDropdown = document.getElementById('inst-multiselect-dropdown');
    const msText = document.getElementById('inst-multiselect-text');
    const msCheckboxes = document.querySelectorAll('.inst-cb');

    msHeader.addEventListener('click', (e) => {
      msDropdown.classList.toggle('active');
      e.stopPropagation();
    });

    document.addEventListener('click', (e) => {
      if (!msDropdown.contains(e.target) && e.target !== msHeader) {
        msDropdown.classList.remove('active');
      }
    });

    msCheckboxes.forEach(cb => {
      cb.addEventListener('change', () => {
        const selected = Array.from(msCheckboxes).filter(c => c.checked).map(c => c.value);
        if (selected.length === 0) msText.textContent = "Seleccionar roles...";
        else msText.textContent = selected.join(', ');
      });
    });

    function resetMemberForm() {
      editingUserKey = null;
      document.getElementById('form-add-member').reset();
      document.getElementById('member-user-input').disabled = false;
      document.querySelectorAll('.inst-cb').forEach(c => c.checked = false);
      document.getElementById('inst-multiselect-text').textContent = "Seleccionar roles...";
      const btnSubmit = document.querySelector('#form-add-member button[type="submit"]');
      btnSubmit.textContent = "Agregar Integrante";
      btnSubmit.style.background = "var(--purple)";
      const cancelBtn = document.getElementById('btn-cancel-edit');
      if (cancelBtn) cancelBtn.style.display = 'none';
    }

    // Envío Formulario Nuevo Integrante / Editar
    document.getElementById('form-add-member').addEventListener('submit', async (e) => {
      e.preventDefault();
      const userKey = editingUserKey || document.getElementById('member-user-input').value.trim().toLowerCase();

      // Obtener los instrumentos seleccionados de los checkboxes
      const selectedChips = Array.from(msCheckboxes).filter(c => c.checked).map(c => c.value);

      if (selectedChips.length === 0) {
        customAlert("Por favor, selecciona al menos un rol o instrumento de la lista.");
        return;
      }

      const instVal = selectedChips.join(', ');
      const isCoro = !selectedChips.some(val => ["Batería", "Bajo", "Teclado", "Guitarra Eléctrica", "Guitarra Acústica", "Percusión"].includes(val));

      const payload = {
        nombre: document.getElementById('member-name-input').value.trim(),
        type: isCoro ? 'corista' : 'musico',
        instrumento: instVal,
        usuario: userKey,
        password: document.getElementById('member-pass-input').value.trim(),
        role: document.getElementById('member-role-input').value
      };
      await setDoc(doc(db, "usuarios", userKey), payload);

      const wasEditing = !!editingUserKey;
      resetMemberForm();
      customAlert(wasEditing ? "Integrante actualizado exitosamente." : "Integrante guardado exitosamente.");
    });


    function renderizarMantenimientoMiembros() {
      const listCont = document.getElementById('global-members-list');
      listCont.innerHTML = "";
      const filtrados = cacheMembers.filter(m => m.usuario !== 'admin');
      if (filtrados.length === 0) {
        listCont.innerHTML = "<p style='color:var(--text3);font-size:12px;text-align:center;'>No hay músicos registrados.</p>";
        return;
      }
      filtrados.forEach(m => {
        const div = document.createElement('div');
        div.className = "member-row";
        div.style.justifyContent = "space-between";
        const avatarPicStyle = m.profilePic
          ? `background-image: url(${m.profilePic}); background-size: cover; background-position: center; color: transparent;`
          : '';
        const avatarInitials = m.profilePic ? '' : m.nombre.substring(0, 2).toUpperCase();

        div.innerHTML = `
        <div style="display:flex; align-items:center; gap:10px;">
          <div class="avatar av-purple" style="${avatarPicStyle}">${avatarInitials}</div>
          <div class="member-info">
            <div class="member-name">${m.nombre} ${m.role === 'lider' ? '<b style="color:var(--gold)">[Líder]</b>' : ''}</div>
            <div class="member-role">User: ${m.usuario} | Clave: ${m.password} | Instrumento: ${m.instrumento}</div>
          </div>
        </div>
        ${currentUserRole === 'lider' ? `
          <div style="display:flex; gap:6px;">
            <button class="chip chip-teal click-edit-member" style="cursor:pointer; border:none; padding: 4px 8px; border-radius: 4px;" title="Editar"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg></button>
            <button class="chip chip-coral click-del-member" style="cursor:pointer; border:none; padding: 4px 8px; border-radius: 4px;" title="Eliminar"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg></button>
          </div>
        ` : ''}
      `;
        if (currentUserRole === 'lider') {
          div.querySelector('.click-edit-member').addEventListener('click', () => {
            editingUserKey = m.usuario;
            document.getElementById('member-name-input').value = m.nombre;
            document.getElementById('member-user-input').value = m.usuario;
            document.getElementById('member-user-input').disabled = true;
            document.getElementById('member-pass-input').value = m.password;
            document.getElementById('member-role-input').value = m.role;

            const instArr = m.instrumento.split(',').map(s => s.trim());
            document.querySelectorAll('.inst-cb').forEach(c => {
              c.checked = instArr.includes(c.value);
            });
            document.getElementById('inst-multiselect-text').textContent = m.instrumento;

            const btnSubmit = document.querySelector('#form-add-member button[type="submit"]');
            btnSubmit.textContent = "Actualizar Integrante";
            btnSubmit.style.background = "var(--teal)";

            let cancelBtn = document.getElementById('btn-cancel-edit');
            if (!cancelBtn) {
              cancelBtn = document.createElement('button');
              cancelBtn.id = 'btn-cancel-edit';
              cancelBtn.type = 'button';
              cancelBtn.className = 'btn-primary';
              cancelBtn.style.background = 'var(--coral)';
              cancelBtn.style.marginTop = '8px';
              cancelBtn.textContent = 'Cancelar Edición';
              cancelBtn.onclick = () => resetMemberForm();
              document.getElementById('form-add-member').appendChild(cancelBtn);
            }
            cancelBtn.style.display = 'block';

            document.getElementById('form-add-member').scrollIntoView({ behavior: 'smooth' });
          });

          div.querySelector('.click-del-member').addEventListener('click', async () => {
            if (await customConfirm(`¿Eliminar la cuenta de "${m.nombre}" del sistema de acceso?`)) {
              await deleteDoc(doc(db, "usuarios", m.usuario));
            }
          });
        }
        listCont.appendChild(div);
      });
    }

    // ====================================================
    // LOGICA DE LA VISTA EXCLUSIVA DEL MÚSICO
    // ====================================================
    let unsubscribeMusicoService = null;
    const btnMusicoConfirm = document.getElementById('btn-musico-confirm');
    const btnMusicoDecline = document.getElementById('btn-musico-decline');
    const btnMusicoMaybe = document.getElementById('btn-musico-maybe');

    function iniciarVistaMusico() {
      // Controladores Pestañas Músico
      document.querySelectorAll('.nav-tab-musico').forEach(tab => {
        tab.addEventListener('click', () => {
          document.querySelectorAll('.nav-tab-musico').forEach(t => t.classList.remove('active'));
          document.querySelectorAll('#screen-musico .tab-panel').forEach(p => p.classList.remove('active'));
          tab.classList.add('active');
          document.getElementById(tab.dataset.mtab).classList.add('active');
          localStorage.setItem('activeMusicoTab', tab.dataset.mtab);

          // Autodesplazar pestaña activa para que sea completamente visible en móvil
          scrollActiveTabToCenter(tab);

          // Refresh views on tab change
          if (tab.dataset.mtab === 'mtab-ensayos-musico' && typeof renderEnsayosMusico === 'function') {
            renderEnsayosMusico();
          } else if (tab.dataset.mtab === 'mtab-repertorio-musico' && typeof renderRepertorioMusico === 'function') {
            renderRepertorioMusico();
          }
        });
      });

      const msDate = document.getElementById('musico-service-date');
      const maDate = document.getElementById('musico-avail-date');

      // Set next sunday
      const baseDay = new Date();
      baseDay.setDate(baseDay.getDate() + (7 - baseDay.getDay()) % 7);
      const dateStr = window.formatLocalDate(baseDay);

      msDate.value = dateStr;
      maDate.value = dateStr;

      msDate.addEventListener('change', () => cargarServicioMusico(msDate.value));
      maDate.addEventListener('change', () => cargarAsistenciaMusico(maDate.value));

      cargarServicioMusico(dateStr);
      cargarAsistenciaMusico(dateStr);

      // Configurar controles de pestaña de Repertorio
      setupRepertorioMusico();
    }

    function setupRepertorioMusico() {
      // Toggle Alabanzas (Rápidas) colapsable
      const headRapidas = document.getElementById('head-rapidas');
      const bodyRapidas = document.getElementById('body-rapidas');
      const arrowRapidas = document.getElementById('arrow-rapidas');
      if (headRapidas && bodyRapidas && arrowRapidas) {
        headRapidas.onclick = () => {
          const isHidden = bodyRapidas.style.display === 'none';
          bodyRapidas.style.display = isHidden ? 'block' : 'none';
          arrowRapidas.textContent = isHidden ? '▲' : '▼';
        };
      }

      // Toggle Adoración (Lentas) colapsable
      const headLentas = document.getElementById('head-lentas');
      const bodyLentas = document.getElementById('body-lentas');
      const arrowLentas = document.getElementById('arrow-lentas');
      if (headLentas && bodyLentas && arrowLentas) {
        headLentas.onclick = () => {
          const isHidden = bodyLentas.style.display === 'none';
          bodyLentas.style.display = isHidden ? 'block' : 'none';
          arrowLentas.textContent = isHidden ? '▲' : '▼';
        };
      }

      // Configurar buscadores en tiempo real
      const searchRapidas = document.getElementById('search-rapidas');
      if (searchRapidas) {
        searchRapidas.addEventListener('input', debounce(() => renderRepertorioMusico(), 300));
      }
      const searchLentas = document.getElementById('search-lentas');
      if (searchLentas) {
        searchLentas.addEventListener('input', debounce(() => renderRepertorioMusico(), 300));
      }

      // Renderizado inicial
      renderRepertorioMusico();
    }

    window._musicoSelectedArtist = null;

    function crearCartaCancionMusico(s, playlistContext) {
      const isFav = window.misFavoritos && window.misFavoritos.includes(s.id);
      const cardBorder = s.oficial
        ? 'border-bottom: 1.5px solid rgba(244,197,66, 0.4) !important;'
        : (s.tipo === 'adoracion'
          ? 'border-bottom: 1px solid rgba(155, 143, 255, 0.25) !important;'
          : 'border-bottom: 1px solid rgba(78, 205, 196, 0.25) !important;');

      const toneStyle = s.tipo === 'adoracion'
        ? 'background: rgba(155, 143, 255, 0.12); color: var(--purple); border: 1.5px solid rgba(155, 143, 255, 0.3);'
        : 'background: rgba(78, 205, 196, 0.12); color: var(--teal); border: 1.5px solid rgba(78, 205, 196, 0.3);';

      const youtubeBtn = s.youtube && s.youtube.trim()
        ? `<a href="${s.youtube}" target="_blank" class="repertorio-action-btn repertorio-btn-youtube" style="font-size: 11px; min-height: unset; padding: 6px 10px; margin: 0; display: inline-flex; align-items: center; gap: 4px;">YouTube</a>`
        : '';

      const card = document.createElement('div');
      card.className = 'musico-song-card';
      card.style.cssText = `background: transparent !important; border: none !important; border-radius: 0 !important; margin-bottom: 0 !important; padding: 14px 4px !important; box-shadow: none !important; ${cardBorder}`;

      card.innerHTML = `
        <!-- Favorito btn -->
        <div style="display:flex; align-items:center; justify-content:center;">
          <button class="btn-fav-song ${isFav ? 'es-fav' : ''}" data-id="${s.id}">★</button>
        </div>
        <!-- Centro: Info -->
        <div class="song-card-info" style="margin-left: 4px; flex:1; min-width:0;">
          <div class="song-card-name" style="font-weight: 600; display:flex; align-items:center; gap:6px;">
            ${s.nombre} ${s.oficial ? '<span class="badge-oficial">OFICIAL</span>' : ''}
          </div>
          <div class="song-card-artist" style="color: var(--text2); font-size: 11px; margin-top: 2px;">${s.artista}</div>
        </div>
        
        <!-- Extremo Derecho: Tono y YouTube -->
        <div style="display:flex; align-items:center; gap: 8px; margin-left:auto; flex-shrink:0; padding-right: 4px;">
          <div class="tone-indicator" style="font-size:11px; padding: 4px 10px; cursor:default; margin: 0; ${toneStyle}">Base: ${s.tonoBase}</div>
          ${youtubeBtn}
        </div>
      `;

      card.onclick = (e) => {
        if (e.target.classList.contains('btn-fav-song') || e.target.closest('.repertorio-btn-youtube')) {
          return;
        }
        if (window.abrirModalLetraGlobal) window.abrirModalLetraGlobal(s.id, playlistContext);
      };

      const btnFav = card.querySelector('.btn-fav-song');
      if (btnFav) {
        btnFav.addEventListener('click', async (e) => {
          e.stopPropagation();
          if (!activeSessionUser || !activeSessionUser.usuario) return;
          const uid = activeSessionUser.usuario;
          const refDoc = doc(db, "usuarios", uid);
          if (isFav) {
            await updateDoc(refDoc, { favoritos: arrayRemove(s.id) });
            window.misFavoritos = window.misFavoritos.filter(id => id !== s.id);
          } else {
            await updateDoc(refDoc, { favoritos: arrayUnion(s.id) });
            if (!window.misFavoritos) window.misFavoritos = [];
            window.misFavoritos.push(s.id);
          }
          renderRepertorioMusico();
        });
      }

      return card;
    }

    function renderRepertorioMusico() {
      const listCont = document.getElementById('list-repertorio-musico');
      const countEl = document.getElementById('count-repertorio-musico');
      const searchInput = document.getElementById('search-repertorio-musico');

      if (!listCont) return;

      const query = removeAccents(searchInput?.value || '').toLowerCase().trim();
      const activeTabBtn = document.querySelector('.musico-subtab.active');
      const currentSubtab = activeTabBtn ? activeTabBtn.dataset.subtab : 'todas';

      const allSongs = [...(cacheSongs || [])].sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));

      let filtered = allSongs;

      if (query) {
        filtered = allSongs.filter(s => {
          const sNombre = removeAccents(s.nombre || '').toLowerCase();
          const sArtista = removeAccents(s.artista || '').toLowerCase();
          return sNombre.includes(query) || sArtista.includes(query);
        });
        window._musicoSelectedArtist = null; // Reset filter
      }

      if (!query) {
        if (currentSubtab === 'todas') {
          // Renderizar lista de artistas como un acordeón
          const artistCounts = {};
          allSongs.forEach(s => {
            const art = s.artista || 'Desconocido';
            artistCounts[art] = (artistCounts[art] || 0) + 1;
          });
          const sortedArtists = Object.keys(artistCounts).sort((a, b) => a.localeCompare(b));

          if (countEl) {
            countEl.textContent = `${sortedArtists.length} artistas`;
          }

          listCont.innerHTML = '';
          if (sortedArtists.length === 0) {
            listCont.innerHTML = `<p style="color:var(--text3); font-size:12px; text-align:center; padding:20px;">No hay canciones registradas.</p>`;
            return;
          }

          sortedArtists.forEach(art => {
            const artistGroup = document.createElement('div');
            artistGroup.className = 'artist-accordion-group';
            artistGroup.style.marginBottom = '6px';

            const isExpanded = window._musicoSelectedArtist === art;
            if (isExpanded) {
              artistGroup.classList.add('expanded');
            }

            const header = document.createElement('div');
            header.className = 'artist-row-item';
            if (isExpanded) {
              header.style.borderColor = 'var(--teal)';
              header.style.background = 'rgba(78, 205, 196, 0.08)';
            }
            header.innerHTML = `
              <div style="display: flex; align-items: center; gap: 8px;">
                <svg class="chevron-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="transition: transform 0.2s; color: var(--teal); ${isExpanded ? 'transform: rotate(90deg);' : ''}">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
                <span class="artist-row-name">${art}</span>
              </div>
              <span class="artist-row-count">${artistCounts[art]} ${artistCounts[art] === 1 ? 'canción' : 'canciones'}</span>
            `;

            const collapseDiv = document.createElement('div');
            collapseDiv.className = 'artist-songs-collapse';
            collapseDiv.style.display = isExpanded ? 'block' : 'none';
            collapseDiv.style.padding = '4px 0 8px 0';

            if (isExpanded) {
              const artistSongs = allSongs.filter(s => (s.artista || 'Desconocido') === art);
              artistSongs.forEach(s => {
                const card = crearCartaCancionMusico(s, artistSongs);
                collapseDiv.appendChild(card);
              });
            }

            header.onclick = (e) => {
              e.stopPropagation();
              const container = listCont;
              const currentlyExpanded = container.querySelector('.artist-accordion-group.expanded');

              const groupEl = artistGroup;
              const isNowExpanding = !groupEl.classList.contains('expanded');

              if (currentlyExpanded && currentlyExpanded !== groupEl) {
                currentlyExpanded.classList.remove('expanded');
                const prevHeader = currentlyExpanded.querySelector('.artist-row-item');
                if (prevHeader) {
                  prevHeader.style.borderColor = '';
                  prevHeader.style.background = '';
                  const prevChevron = prevHeader.querySelector('.chevron-icon');
                  if (prevChevron) prevChevron.style.transform = '';
                }
                const prevCollapse = currentlyExpanded.querySelector('.artist-songs-collapse');
                if (prevCollapse) {
                  prevCollapse.style.display = 'none';
                  prevCollapse.innerHTML = '';
                }
              }

              if (isNowExpanding) {
                groupEl.classList.add('expanded');
                header.style.borderColor = 'var(--teal)';
                header.style.background = 'rgba(78, 205, 196, 0.08)';
                const chevron = header.querySelector('.chevron-icon');
                if (chevron) chevron.style.transform = 'rotate(90deg)';
                collapseDiv.style.display = 'block';

                collapseDiv.innerHTML = '';
                const artistSongs = allSongs.filter(s => (s.artista || 'Desconocido') === art);
                artistSongs.forEach(s => {
                  const card = crearCartaCancionMusico(s, artistSongs);
                  collapseDiv.appendChild(card);
                });

                window._musicoSelectedArtist = art;
              } else {
                groupEl.classList.remove('expanded');
                header.style.borderColor = '';
                header.style.background = '';
                const chevron = header.querySelector('.chevron-icon');
                if (chevron) chevron.style.transform = '';
                collapseDiv.style.display = 'none';
                collapseDiv.innerHTML = '';

                window._musicoSelectedArtist = null;
              }
            };

            artistGroup.appendChild(header);
            artistGroup.appendChild(collapseDiv);
            listCont.appendChild(artistGroup);
          });
          return;
        } else if (currentSubtab === 'favoritos') {
          filtered = allSongs.filter(s => window.misFavoritos && window.misFavoritos.includes(s.id));
        } else if (currentSubtab === 'oficial') {
          filtered = allSongs.filter(s => s.oficial === true);
        }
      } else {
        // Con búsqueda, filtrar según la pestaña activa
        if (currentSubtab === 'favoritos') {
          filtered = filtered.filter(s => window.misFavoritos && window.misFavoritos.includes(s.id));
        } else if (currentSubtab === 'oficial') {
          filtered = filtered.filter(s => s.oficial === true);
        }
      }

      if (countEl) {
        countEl.textContent = `${filtered.length} canciones`;
      }

      listCont.innerHTML = '';

      if (filtered.length === 0) {
        listCont.innerHTML = `<p style="color:var(--text3); font-size:12px; text-align:center; padding:20px;">No se encontraron canciones en esta vista.</p>`;
        return;
      }

      filtered.forEach(s => {
        const card = crearCartaCancionMusico(s, filtered);
        listCont.appendChild(card);
      });
    }

    // Inicializar listeners del repertorio musico
    const searchInputMusico = document.getElementById('search-repertorio-musico');
    if (searchInputMusico && !searchInputMusico.dataset.bound) {
      searchInputMusico.dataset.bound = 'true';
      searchInputMusico.addEventListener('input', debounce(() => renderRepertorioMusico(), 300));
    }

    document.querySelectorAll('.musico-subtab').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.musico-subtab').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        window._musicoSelectedArtist = null; // Reset filter
        renderRepertorioMusico();
      });
    });

    function cargarServicioMusico(dateStr) {
      if (!dateStr) return;
      const content = document.getElementById('musico-service-content');
      content.innerHTML = "<div style='display:flex; flex-direction:column; align-items:center; justify-content:center; padding:40px 20px; gap:12px;'><div style='width:30px; height:30px; border:3px solid rgba(229,180,60,0.2); border-top-color:var(--gold); border-radius:50%; animation:spin 1s linear infinite;'></div><p style='color:var(--text3); font-size:13px; margin:0;'>Cargando datos del servicio...</p></div>";

      // Cancelar suscripción anterior y crear nueva (tiempo real)
      if (window._unsubMusicoServicePlan) { window._unsubMusicoServicePlan(); }

      window._unsubMusicoServicePlan = onSnapshot(doc(db, "planes_servicio", dateStr), (snap) => {
        if (!snap.exists()) {
          content.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 40px 20px; background: rgba(255, 255, 255, 0.02); border: 1px dashed var(--border2); border-radius: var(--radius); margin-top: 10px;">
              <span style="font-size: 40px; margin-bottom: 12px; display: block;">🗓️</span>
              <p style="color: var(--text2); font-size: 14px; font-weight: 500; margin-bottom: 18px; max-width: 280px; line-height: 1.5;">
                Aún no hay programación creada para el <b>${dateStr}</b>.
              </p>
              <button id="btn-crear-servicio-musico" class="btn-primary" style="margin-top: 0; max-width: 220px; display: flex; align-items: center; justify-content: center; gap: 8px;">
                <span>➕</span> Agregar Servicio
              </button>
            </div>
          `;
          const btnCrear = document.getElementById('btn-crear-servicio-musico');
          if (btnCrear) {
            btnCrear.addEventListener('click', async () => {
              try {
                btnCrear.disabled = true;
                btnCrear.textContent = "Creando...";
                const docData = {
                  fecha: dateStr,
                  cancionesSeleccionadas: {},
                  musicosAsignados: {},
                  disponibilidad: {}
                };
                await setDoc(doc(db, "planes_servicio", dateStr), docData);
                showToast("Servicio agregado correctamente");
              } catch (err) {
                console.error(err);
                showToast("Error al agregar el servicio");
                btnCrear.disabled = false;
                btnCrear.textContent = "Agregar Servicio";
              }
            });
          }
          return;
        }
        const data = snap.data();

        // 🔔 Detectar cambios de tono y mostrar notificación
        const cambios = data.cambiosTono || {};
        for (const [songId, info] of Object.entries(cambios)) {
          const prev = (window._prevCambiosTono || {})[songId];
          if (prev && info.timestamp !== prev.timestamp && info.usuario !== activeSessionUser.nombre) {
            const song = cacheSongs.find(s => s.id === songId) || (data.customSongsMetadata && data.customSongsMetadata[songId]);
            showToast(`${info.usuario} cambió "${song ? song.nombre : songId}" → ${info.tono}`);
          }
        }
        window._prevCambiosTono = Object.assign({}, cambios);

        // Cache global para que el modal de agregar pueda leer los datos
        window._currentServiceData = data;

        let html = "";

        // Nota del líder
        if (data.nota_adicional && data.nota_adicional.trim() !== "") {
          html += `<div class="card" style="border-color:var(--purple);background:rgba(155,143,255,0.06);margin-bottom:16px;">
          <h4 style="font-size:11px;text-transform:uppercase;color:var(--purple);margin-bottom:8px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px;"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"></path><path d="m15 5 4 4"></path></svg> Nota del Líder</h4>
          <p style="font-size:14px;color:var(--text2);line-height:1.6;margin:0;">${data.nota_adicional.replace(/\n/g, '<br>')}</p>
        </div>`;
        }

        // Canciones seleccionadas
        const cancionesSeleccionadas = data.cancionesSeleccionadas || {};
        const selectedIds = Object.keys(cancionesSeleccionadas).filter(k => cancionesSeleccionadas[k] !== false);
        const ordenCanciones = data.ordenCanciones || [];
        const customSongsMetadata = data.customSongsMetadata || {};

        let allSelected = [];
        selectedIds.forEach(id => {
          if (id.startsWith('custom_')) {
            const meta = customSongsMetadata[id];
            if (meta) {
              allSelected.push({
                id: id,
                nombre: meta.nombre,
                artista: meta.artista || "Personalizada",
                tonoBase: meta.tonoBase,
                tipo: meta.tipo,
                isCustom: true
              });
            }
          } else {
            const song = cacheSongs.find(s => s.id === id);
            if (song) {

              let songCopy = { ...song };
              const refData = typeof data !== 'undefined' ? data : (typeof dataServicio !== 'undefined' ? dataServicio : {});
              if (refData.cancionesSeleccionadasTipos && refData.cancionesSeleccionadasTipos[id]) {
                songCopy.tipo = refData.cancionesSeleccionadasTipos[id];
              }
              allSelected.push(songCopy);
            }
          }
        });

        // Ordenar según orden guardado
        allSelected.sort((a, b) => {
          const ia = ordenCanciones.indexOf(a.id);
          const ib = ordenCanciones.indexOf(b.id);
          if (ia === -1 && ib === -1) return 0;
          if (ia === -1) return 1;
          if (ib === -1) return -1;
          return ia - ib;
        });

        const adoraciones = allSelected.filter(s => s.tipo === 'adoracion');
        const alabanzas = allSelected.filter(s => s.tipo === 'alabanza');

        // Guardar la lista ordenada globalmente para la paginación de letras
        window._currentServiceSongs = [...adoraciones, ...alabanzas];

        const renderGroup = (songs, titulo, color, emoji, startNum, type) => {
          const sectionColorVar = color === 'teal' ? 'var(--teal)' : 'var(--purple)';
          const sectionBg = color === 'teal'
            ? 'linear-gradient(180deg, rgba(78, 205, 196, 0.06) 0%, rgba(78, 205, 196, 0.01) 100%)'
            : 'linear-gradient(180deg, rgba(155, 143, 255, 0.06) 0%, rgba(155, 143, 255, 0.01) 100%)';
          const sectionBorder = color === 'teal' ? '1.5px solid rgba(78, 205, 196, 0.35)' : '1.5px solid rgba(155, 143, 255, 0.35)';
          const sectionGlow = color === 'teal' ? '0 8px 32px rgba(78, 205, 196, 0.08)' : '0 8px 32px rgba(155, 143, 255, 0.08)';

          let g = `
          <div class="section-group-card" style="background: ${sectionBg}; border: ${sectionBorder}; border-radius: var(--radius); padding: 16px; margin-bottom: 20px; box-shadow: ${sectionGlow};">
            <h4 style="font-size:12px; font-weight: 700; text-transform:uppercase; color:${sectionColorVar}; letter-spacing:1px; margin: 0 0 12px; display: flex; align-items: center; gap: 6px;">
              <span>${emoji}</span> ${titulo}
            </h4>
            <div style="display: flex; flex-direction: column; gap: 8px;">
          `;

          if (songs.length === 0) {
            g += `<p style="color:var(--text3); font-size:12px; padding:12px; text-align:center; background:rgba(0,0,0,0.2); border-radius:10px; margin: 0;">Ninguna canción seleccionada en esta sección.</p>`;
          } else {
            songs.forEach((s, i) => {
              const tone = cancionesSeleccionadas[s.id];
              const hasLetra = s.letra && s.letra.trim() !== "";
              if (hasLetra) {
                window._lyricsCache = window._lyricsCache || {};
                window._lyricsCache[s.id] = { nombre: s.nombre, tonoBase: s.tonoBase, tonoServicio: tone, letra: s.letra };
              }
              const num = startNum + i;
              const safeNombre = (s.nombre || "").replace(/"/g, '&quot;');

              const cardBorder = type === 'alabanza'
                ? 'border-bottom: 1px solid rgba(78, 205, 196, 0.25) !important;'
                : 'border-bottom: 1px solid rgba(155, 143, 255, 0.25) !important;';
              const numColor = type === 'alabanza' ? 'color: rgba(78, 205, 196, 0.4);' : 'color: rgba(155, 143, 255, 0.4);';
              const badgeStyle = type === 'alabanza'
                ? `background: rgba(78, 205, 196, 0.12); color: var(--teal); border: 1.5px solid rgba(78, 205, 196, 0.3);`
                : `background: rgba(155, 143, 255, 0.12); color: var(--purple); border: 1.5px solid rgba(155, 143, 255, 0.3);`;

              g += `<div class="musico-song-card musico-service-song-card" data-song-id="${s.id}" style="background: transparent !important; border: none !important; border-radius: 0 !important; margin-bottom: 0 !important; padding: 14px 4px !important; box-shadow: none !important; ${cardBorder} cursor: pointer;">
              <!-- Extremo Izquierdo: Reordenamiento y Número -->
              <div style="display:flex; align-items:center; gap:8px;">
                <div class="song-order-btns">
                  <button class="order-btn btn-order-up" data-song-id="${s.id}" data-type="${type}">▲</button>
                  <button class="order-btn btn-order-down" data-song-id="${s.id}" data-type="${type}">▼</button>
                </div>
                <div class="song-num" style="min-width: 24px; ${numColor}">${num}</div>
              </div>
              
              <!-- Centro: Info -->
              <div class="song-card-info" style="margin-left: 4px; flex:1; min-width:0;">
                <div class="song-card-name" style="font-weight: 600;">${s.nombre}</div>
                <div class="song-card-artist" style="color: var(--text2); font-size: 11px; margin-top: 2px;">${s.artista}</div>
              </div>
              
              <!-- Extremo Derecho: Tono y Quitar inline -->
              <div style="display:flex; align-items:center; gap: 14px; margin-left:auto; flex-shrink:0; padding-right: 6px;">
                <div class="song-tone-badge" data-song-id="${s.id}" data-current-tone="${tone}" data-song-name="${safeNombre}" data-date="${dateStr}" style="${badgeStyle}; cursor: pointer; margin: 0;">${tone}</div>
                <button class="btn-remove-song-musico btn-remove-song-inline" data-song-id="${s.id}" title="Quitar canción">✕</button>
              </div>
            </div>`;
            });
          }

          // Agregar botón "+"
          g += `
        <button class="btn-add-song-musico" data-type="${type}" style="width: 100%; background: rgba(${color === 'teal' ? '78,205,196' : '155,143,255'}, 0.08); border: 1px dashed var(--${color}); color: var(--${color}); border-radius: 10px; padding: 12px; font-family: var(--font-body); font-size: 13px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; margin-top: 8px; border-style: dashed;">
          <span></span> Agregar otra canción
        </button>`;

          return g;
        };

        // Adoración primero, luego Alabanza
        html += renderGroup(adoraciones, 'Adoración (Lentas)', 'purple', '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px;"><path d="M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z"></path><path d="M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"></path><path d="M12 2v2"></path><path d="M12 22v-2"></path><path d="m17 20.66-1-1.73"></path><path d="M11 10.27 7 3.34"></path><path d="m20.66 17-1.73-1"></path><path d="m3.34 7 1.73 1"></path><path d="M14 12h8"></path><path d="M2 12h2"></path><path d="m20.66 7-1.73 1"></path><path d="m3.34 17 1.73-1"></path><path d="m17 3.34-1 1.73"></path><path d="m11 13.73-4 6.93"></path></svg>', 1, 'adoracion');
        html += renderGroup(alabanzas, 'Alabanza (Rápidas)', 'teal', '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px;"><path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z"></path></svg>', adoraciones.length + 1, 'alabanza');

        content.innerHTML = html;

        // Eventos: click en tarjeta para abrir modal/split
        content.querySelectorAll('.musico-service-song-card').forEach(card => {
          card.addEventListener('click', (e) => {
            if (
              e.target.closest('.song-order-btns') ||
              e.target.classList.contains('song-tone-badge') ||
              e.target.classList.contains('btn-remove-song-musico')
            ) {
              return;
            }
            const songId = card.dataset.songId;
            if (window.abrirModalLetraGlobal) window.abrirModalLetraGlobal(songId, window._currentServiceSongs);
          });
        });

        // Eventos: tone badge → abrir picker
        content.querySelectorAll('.song-tone-badge').forEach(badge => {
          badge.addEventListener('click', () => {
            abrirTonePicker(badge.dataset.songId, badge.dataset.currentTone, badge.dataset.songName, badge.dataset.date);
          });
        });

        // Eventos: botones de orden ▲▼
        content.querySelectorAll('.btn-order-up').forEach(btn => {
          btn.addEventListener('click', () => moverCancionOrden(btn.dataset.songId, -1, allSelected, ordenCanciones, dateStr, btn.dataset.type));
        });
        content.querySelectorAll('.btn-order-down').forEach(btn => {
          btn.addEventListener('click', () => moverCancionOrden(btn.dataset.songId, 1, allSelected, ordenCanciones, dateStr, btn.dataset.type));
        });

        // Evento: remover canción con advertencia clara
        content.querySelectorAll('.btn-remove-song-musico').forEach(btn => {
          btn.addEventListener('click', async () => {
            const songId = btn.dataset.songId;
            const sName = cacheSongs.find(s => s.id === songId)?.nombre || (customSongsMetadata[songId]?.nombre) || "Canción";
            if (await customConfirm(`ATENCIÓN:\nSi quitas "${sName}", se eliminará de la vista de TODO el equipo y tendrás que agregarla de nuevo si te equivocas.\n\n¿Quieres continuar y quitarla?`)) {
              const path = `cancionesSeleccionadas.${songId}`;
              await updateDoc(doc(db, "planes_servicio", dateStr), {
                [path]: false
              });
              showToast(`"${sName}" quitada del servicio`);
            }
          });
        });

        // Evento: agregar canción
        content.querySelectorAll('.btn-add-song-musico').forEach(btn => {
          btn.addEventListener('click', () => {
            const type = btn.dataset.type;
            window._targetAddSongType = type;
            window._targetAddSongDate = dateStr;

            document.getElementById('musico-add-song-title').textContent = `Agregar a ${type === 'adoracion' ? 'Adoración' : 'Alabanza'}`;
            document.getElementById('musico-add-song-search').value = "";
            document.getElementById('musico-custom-name').value = "";
            document.getElementById('musico-custom-artist').value = "";
            document.getElementById('musico-custom-tone').value = "C";

            renderAddSongResults(type, "");

            window._selectedSongsToAdd = new Set();
            const btnAddSel1 = document.getElementById('btn-musico-add-selected');
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

            document.getElementById('musico-add-song-modal').classList.add('active');
            setTimeout(() => document.getElementById('musico-custom-name').focus(), 100);
          });
        });

        actualizarLetraSiAbierta();
      });
    }

    function cargarAsistenciaMusico(dateStr) {
      if (!dateStr) return;
      const sCard = document.getElementById('musico-avail-status-card');
      sCard.style.display = 'block';

      if (unsubscribeMusicoService) unsubscribeMusicoService();

      unsubscribeMusicoService = onSnapshot(doc(db, "planes_servicio", dateStr), (snap) => {
        const data = snap.exists() ? snap.data() : { disponibilidad: {}, musicosAsignados: {} };
        const disp = data.disponibilidad || {};

        const myStat = disp[activeSessionUser.usuario];
        const pCur = document.getElementById('musico-avail-current');

        if (myStat === 'confirmado') {
          pCur.innerHTML = `Estado actual: <span style="color:var(--teal); font-weight:bold;">Voy a Asistir</span>`;
          btnMusicoConfirm.style.opacity = '1';
          btnMusicoConfirm.style.boxShadow = '0 0 15px rgba(78,205,196,0.4)';
          btnMusicoDecline.style.opacity = '0.3';
          btnMusicoDecline.style.boxShadow = 'none';
          btnMusicoMaybe.style.opacity = '0.3';
          btnMusicoMaybe.style.boxShadow = 'none';
        } else if (myStat === 'ausente') {
          pCur.innerHTML = `Estado actual: <span style="color:var(--coral); font-weight:bold;">No Disponible</span>`;
          btnMusicoDecline.style.opacity = '1';
          btnMusicoDecline.style.boxShadow = '0 0 15px rgba(255,107,107,0.4)';
          btnMusicoConfirm.style.opacity = '0.3';
          btnMusicoConfirm.style.boxShadow = 'none';
          btnMusicoMaybe.style.opacity = '0.3';
          btnMusicoMaybe.style.boxShadow = 'none';
        } else if (myStat === 'indeciso') {
          pCur.innerHTML = `Estado actual: <span style="color:var(--gold); font-weight:bold;">No estoy seguro aún</span>`;
          btnMusicoMaybe.style.opacity = '1';
          btnMusicoMaybe.style.boxShadow = '0 0 15px rgba(244,197,66,0.4)';
          btnMusicoConfirm.style.opacity = '0.3';
          btnMusicoConfirm.style.boxShadow = 'none';
          btnMusicoDecline.style.opacity = '0.3';
          btnMusicoDecline.style.boxShadow = 'none';
        } else {
          pCur.innerHTML = `Estado actual: <span style="color:var(--text3);">Sin confirmar</span>`;
          btnMusicoConfirm.style.opacity = '1';
          btnMusicoDecline.style.opacity = '1';
          btnMusicoMaybe.style.opacity = '1';
          btnMusicoConfirm.style.boxShadow = 'none';
          btnMusicoDecline.style.boxShadow = 'none';
          btnMusicoMaybe.style.boxShadow = 'none';
        }

        btnMusicoConfirm.onclick = () => actualizarDisponibilidadMusico(dateStr, 'confirmado');
        btnMusicoDecline.onclick = () => actualizarDisponibilidadMusico(dateStr, 'ausente');
        btnMusicoMaybe.onclick = () => actualizarDisponibilidadMusico(dateStr, 'indeciso');

        const tDiv = document.getElementById('musico-team-status');
        let thtml = `<h4 style="font-size: 13px; text-transform: uppercase; color: var(--gold); margin: 0 0 10px;">Estado de tus compañeros</h4><div class="card">`;
        const mlist = cacheMembers.filter(m => m.usuario !== 'admin' && m.usuario !== activeSessionUser.usuario);
        if (mlist.length === 0) {
          thtml += `<p style='color:var(--text3); font-size:13px;'>No hay más miembros registrados.</p>`;
        } else {
          mlist.forEach(m => {
            const st = disp[m.usuario];
            let badge = `<span class="status-badge status-none" style="background:rgba(255,255,255,0.05); color:var(--text3); border:1px solid rgba(255,255,255,0.1); font-size:11px; padding:2px 8px; border-radius:12px; font-weight:600; white-space:nowrap;">Sin Confir.</span>`;
            if (st === 'confirmado') badge = `<span class="status-badge status-si" style="background:rgba(78,205,196,0.15); color:var(--teal); border:1px solid rgba(78,205,196,0.3); font-size:11px; padding:2px 8px; border-radius:12px; font-weight:600; white-space:nowrap;">Confirma</span>`;
            if (st === 'ausente') badge = `<span class="status-badge status-no" style="background:rgba(255,107,107,0.15); color:var(--coral); border:1px solid rgba(255,107,107,0.3); font-size:11px; padding:2px 8px; border-radius:12px; font-weight:600; white-space:nowrap;">No Puede</span>`;
            if (st === 'indeciso') badge = `<span class="status-badge status-duda" style="background:rgba(244,197,66,0.15); color:var(--gold); border:1px solid rgba(244,197,66,0.3); font-size:11px; padding:2px 8px; border-radius:12px; font-weight:600; white-space:nowrap;">No Seguro</span>`;

            let avatarClass = "av-gold";
            if (m.instrumento.includes('Batería') || m.instrumento.includes('Percusión')) avatarClass = "av-purple";
            else if (m.instrumento.includes('Voz') || m.instrumento.includes('Corista')) avatarClass = "av-teal";

            const avatarPicStyle = m.profilePic
              ? `background-image: url(${m.profilePic}); background-size: cover; background-position: center; color: transparent;`
              : '';
            const avatarInitials = m.profilePic ? '' : m.nombre.substring(0, 2).toUpperCase();

            thtml += `
          <div class="member-row" style="padding-bottom: 8px; margin-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.05);">
            <div class="avatar ${avatarClass}" style="width: 28px; height: 28px; font-size: 11px; ${avatarPicStyle}">${avatarInitials}</div>
            <div class="member-info">
              <div class="member-name">${m.nombre}</div>
              <div class="member-role">${m.instrumento}</div>
            </div>
            ${badge}
          </div>`;
          });
        }
        thtml += `</div>`;
        tDiv.innerHTML = thtml;
      });
    }

    async function actualizarDisponibilidadMusico(dateStr, estado) {
      if (!dateStr) return;
      const docRef = doc(db, "planes_servicio", dateStr);
      const snap = await getDoc(docRef);
      if (!snap.exists()) {
        await setDoc(docRef, {
          fecha: dateStr,
          cancionesSeleccionadas: {},
          musicosAsignados: {},
          disponibilidad: { [activeSessionUser.usuario]: estado },
          nota_adicional: ""
        });
      } else {
        const data = snap.data();
        const d = data.disponibilidad || {};
        d[activeSessionUser.usuario] = estado;

        const payload = { disponibilidad: d };
        // si declina, lo quitamos del equipo asignado
        if (estado === 'ausente') {
          const mAsig = data.musicosAsignados || {};
          mAsig[activeSessionUser.usuario] = false;
          payload.musicosAsignados = mAsig;
        }

        await updateDoc(docRef, payload);
      }
    }

    // ====================================================
    // MOTOR DE TRANSPOSICIÓN Y MODAL DE LETRAS
    // ====================================================
    const ACORDES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

    function transponerAcordeUnico(acorde, diff) {
      const match = acorde.match(/^([A-G][b#]?)(.*)$/);
      if (!match) return acorde;
      let base = match[1];
      let mods = match[2];

      const eq = { 'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#' };
      if (eq[base]) base = eq[base];

      let i = ACORDES.indexOf(base);
      if (i === -1) return acorde;

      let newI = (i + diff) % 12;
      if (newI < 0) newI += 12;
      let nuevoAcorde = ACORDES[newI];

      if (mods.includes('/')) {
        let parts = mods.split('/');
        let bajoMatch = parts[1].match(/^([A-G][b#]?)(.*)$/);
        if (bajoMatch) {
          let bBase = bajoMatch[1];
          if (eq[bBase]) bBase = eq[bBase];
          let bi = ACORDES.indexOf(bBase);
          if (bi !== -1) {
            let bnI = (bi + diff) % 12;
            if (bnI < 0) bnI += 12;
            parts[1] = ACORDES[bnI] + bajoMatch[2];
            mods = parts.join('/');
          }
        }
      }
      return nuevoAcorde + mods;
    }

    function renderizarLetraTranspuesta(texto, tonoBase, tonoDestino) {
      if (!texto) return "";

      // Convertir acordes en español a inglés al vuelo para transposición y resaltado correctos
      texto = convertirTextoEspañolAIngles(texto);
      tonoBase = tonoBase ? normalizarTono(tonoBase) : null;
      tonoDestino = tonoDestino ? normalizarTono(tonoDestino) : null;

      let diff = 0;
      if (tonoBase && tonoDestino) {
        const eq = { 'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#' };
        let tb = tonoBase.replace(/m$/, '');
        let td = tonoDestino.replace(/m$/, '');
        if (eq[tb]) tb = eq[tb];
        if (eq[td]) td = eq[td];

        const idxBase = ACORDES.indexOf(tb);
        const idxDest = ACORDES.indexOf(td);

        if (idxBase !== -1 && idxDest !== -1) {
          diff = idxDest - idxBase;
        }
      }

      const lineas = texto.split('\n');
      return lineas.map(linea => {
        const trimmed = linea.trim();
        if (trimmed === '') return linea;

        // Heurística para detectar si es una línea de acordes
        // Si quitamos los acordes y signos, la cantidad de letras restantes debe ser muy pequeña en proporción
        const sinAcordes = linea.replace(/([A-G][b#]?(?:m|min|maj|dim|aug|sus|add)?\d?(?:\/[A-G][b#]?)?)/g, '');
        const sinEspaciosYSig = sinAcordes.replace(/[\s\|\-\(\)\*\,\.]/g, '');
        const isChordLine = sinEspaciosYSig.length <= linea.length * 0.3;

        return linea.replace(/([A-G][b#]?(?:m|min|maj|dim|aug|sus|add)?\d?(?:\/[A-G][b#]?)?)/g, (match, p1, offset, fullStr) => {
          const prevChar = offset > 0 ? fullStr[offset - 1] : ' ';
          const nextChar = offset + match.length < fullStr.length ? fullStr[offset + match.length] : ' ';

          if (/[a-zA-Z]/.test(prevChar) || /[a-zA-Z]/.test(nextChar)) {
            return match;
          }

          // Si NO es línea de acordes, evitamos reemplazar letras sueltas como 'A' o 'D' que suelen ser palabras (A la batalla, D...)
          if (!isChordLine && match.length === 1 && !['[', '{', '(', '<'].includes(prevChar)) {
            return match;
          }

          if (diff === 0) return `<span class="chord-highlight">${match}</span>`;
          let trans = transponerAcordeUnico(match, diff);
          return `<span class="chord-highlight">${trans}</span>`;
        });
      }).join('\n');
    }

    // ====================================================
    // WAKE LOCK & AUTOSCROLL & ZOOM MANAGER
    // ====================================================
    let wakeLock = null;
    async function requestWakeLock() {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await navigator.wakeLock.request('screen');
          console.log("[WAKE LOCK] Pantalla activa forzada.");
        }
      } catch (err) {
        console.warn("[WAKE LOCK] Error al solicitar o no soportado:", err);
      }
    }

    function releaseWakeLock() {
      if (wakeLock) {
        wakeLock.release().then(() => {
          wakeLock = null;
          console.log("[WAKE LOCK] Pantalla liberada.");
        });
      }
    }

    let _scrollInterval = null;
    let _scrollSpeed = 2; // 1 a 5
    let _currentZoom = window.innerWidth >= 768 ? 22 : 22; // default tablet: 32, mobile: 28


    function detenerAutoscroll() {
      if (_scrollInterval) {
        clearInterval(_scrollInterval);
        _scrollInterval = null;
      }

      const mobBtn = document.getElementById('lyrics-modal-autoscroll-btn');
      if (mobBtn) {
        mobBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px;"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg> AutoScroll';
        mobBtn.style.color = 'var(--teal)';
      }
      const mobCtrl = document.getElementById('lyrics-modal-speed-ctrl');
      if (mobCtrl) mobCtrl.style.display = 'none';

      const panBtn = document.getElementById('panel-lyrics-autoscroll-btn');
      if (panBtn) {
        panBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px;"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg> AutoScroll';
        panBtn.style.color = 'var(--teal)';
      }
      const panCtrl = document.getElementById('panel-lyrics-speed-ctrl');
      if (panCtrl) panCtrl.style.display = 'none';
    }

    function toggleAutoscroll(containerId, btnId, ctrlId, speedValId) {
      const container = document.getElementById(containerId);
      const btn = document.getElementById(btnId);
      const ctrl = document.getElementById(ctrlId);
      const speedVal = document.getElementById(speedValId);

      if (!container || !btn) return;

      if (_scrollInterval) {
        detenerAutoscroll();
      } else {
        btn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px;"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg> Pausa';
        btn.style.color = 'var(--coral)';
        if (ctrl) ctrl.style.display = 'inline-flex';
        if (speedVal) speedVal.textContent = _scrollSpeed;

        const msMap = { 1: 65, 2: 45, 3: 30, 4: 20, 5: 12 };
        const intervalMs = msMap[_scrollSpeed] || 45;

        _scrollInterval = setInterval(() => {
          container.scrollTop += 1;
          if (container.scrollHeight - container.scrollTop <= container.clientHeight + 2) {
            detenerAutoscroll();
          }
        }, intervalMs);
      }
    }

    function cambiarVelocidadAutoscroll(dir, speedValId, containerId, btnId, ctrlId) {
      if (dir === 'up') {
        _scrollSpeed = Math.min(_scrollSpeed + 1, 5);
      } else {
        _scrollSpeed = Math.max(_scrollSpeed - 1, 1);
      }
      const speedVal = document.getElementById(speedValId);
      if (speedVal) speedVal.textContent = _scrollSpeed;

      if (_scrollInterval) {
        detenerAutoscroll();
        toggleAutoscroll(containerId, btnId, ctrlId, speedValId);
      }
    }

    function aplicarZoomLetra(dir, contentId, zoomValId) {
      if (dir === 'up') {
        _currentZoom = Math.min(_currentZoom + 2, 80);
      } else {
        _currentZoom = Math.max(_currentZoom - 2, 12);
      }
      const el = document.getElementById(contentId);
      if (el) el.style.setProperty('font-size', _currentZoom + 'px', 'important');

      const zoomVal = document.getElementById(zoomValId);
      if (zoomVal) zoomVal.textContent = _currentZoom;
    }


    function inicializarControlesLetra() {
      // --- Immersive Mode Toggle ---
      const lyricsBody = document.getElementById('lyrics-modal-body');
      if (lyricsBody && !lyricsBody.dataset.boundImmersive) {
        lyricsBody.dataset.boundImmersive = 'true';
        lyricsBody.addEventListener('click', (e) => {
          // Si el click fue en un botón u otro control interactivo, no ocultar
          if (e.target.tagName === 'BUTTON' || e.target.closest('button')) return;
          const modalInner = document.querySelector('.lyrics-modal');
          if (modalInner) modalInner.classList.toggle('immersive');
        });
      }

      // --- Controles de Móvil (Modal) ---
      const mobBtn = document.getElementById('lyrics-modal-autoscroll-btn');
      if (mobBtn && !mobBtn.dataset.bound) {
        mobBtn.dataset.bound = 'true';
        mobBtn.onclick = () => toggleAutoscroll('lyrics-modal-body', 'lyrics-modal-autoscroll-btn', 'lyrics-modal-speed-ctrl', 'lyrics-modal-speed-val');
      }
      const mobUp = document.getElementById('lyrics-modal-speed-up');
      if (mobUp && !mobUp.dataset.bound) {
        mobUp.dataset.bound = 'true';
        mobUp.onclick = () => cambiarVelocidadAutoscroll('up', 'lyrics-modal-speed-val', 'lyrics-modal-body', 'lyrics-modal-autoscroll-btn', 'lyrics-modal-speed-ctrl');
      }
      const mobDown = document.getElementById('lyrics-modal-speed-down');
      if (mobDown && !mobDown.dataset.bound) {
        mobDown.dataset.bound = 'true';
        mobDown.onclick = () => cambiarVelocidadAutoscroll('down', 'lyrics-modal-speed-val', 'lyrics-modal-body', 'lyrics-modal-autoscroll-btn', 'lyrics-modal-speed-ctrl');
      }
      const mobZoomUp = document.getElementById('lyrics-modal-zoom-up');
      if (mobZoomUp && !mobZoomUp.dataset.bound) {
        mobZoomUp.dataset.bound = 'true';
        mobZoomUp.onclick = () => aplicarZoomLetra('up', 'lyrics-modal-content', 'lyrics-modal-zoom-val');
      }
      const mobZoomDown = document.getElementById('lyrics-modal-zoom-down');
      if (mobZoomDown && !mobZoomDown.dataset.bound) {
        mobZoomDown.dataset.bound = 'true';
        mobZoomDown.onclick = () => aplicarZoomLetra('down', 'lyrics-modal-content', 'lyrics-modal-zoom-val');
      }

      // --- Controles de PC/Tablet (Split Panel) ---
      const panBtn = document.getElementById('panel-lyrics-autoscroll-btn');
      if (panBtn && !panBtn.dataset.bound) {
        panBtn.dataset.bound = 'true';
        panBtn.onclick = () => toggleAutoscroll('panel-lyrics-body', 'panel-lyrics-autoscroll-btn', 'panel-lyrics-speed-ctrl', 'panel-lyrics-speed-val');
      }
      const panUp = document.getElementById('panel-lyrics-speed-up');
      if (panUp && !panUp.dataset.bound) {
        panUp.dataset.bound = 'true';
        panUp.onclick = () => cambiarVelocidadAutoscroll('up', 'panel-lyrics-speed-val', 'panel-lyrics-body', 'panel-lyrics-autoscroll-btn', 'panel-lyrics-speed-ctrl');
      }
      const panDown = document.getElementById('panel-lyrics-speed-down');
      if (panDown && !panDown.dataset.bound) {
        panDown.dataset.bound = 'true';
        panDown.onclick = () => cambiarVelocidadAutoscroll('down', 'panel-lyrics-speed-val', 'panel-lyrics-body', 'panel-lyrics-autoscroll-btn', 'panel-lyrics-speed-ctrl');
      }
      const panZoomUp = document.getElementById('panel-lyrics-zoom-up');
      if (panZoomUp && !panZoomUp.dataset.bound) {
        panZoomUp.dataset.bound = 'true';
        panZoomUp.onclick = () => aplicarZoomLetra('up', 'panel-lyrics-content', 'panel-lyrics-zoom-val');
      }
      const panZoomDown = document.getElementById('panel-lyrics-zoom-down');
      if (panZoomDown && !panZoomDown.dataset.bound) {
        panZoomDown.dataset.bound = 'true';
        panZoomDown.onclick = () => aplicarZoomLetra('down', 'panel-lyrics-content', 'panel-lyrics-zoom-val');
      }
    }

    window.abrirModalLetraGlobal = async function (cancionId, playlistContext, forceModal = false, preserveScroll = false) {
      window._currentLyricsSongId = cancionId;
      window._currentLyricsPlaylistContext = playlistContext;

      detenerAutoscroll();
      inicializarControlesLetra();
      requestWakeLock();

      if (!preserveScroll) {
        const mobBody = document.getElementById('lyrics-modal-body');
        if (mobBody) mobBody.scrollTop = 0;
        const panBody = document.getElementById('panel-lyrics-body');
        if (panBody) panBody.scrollTop = 0;
      }

      const mobContent = document.getElementById('lyrics-modal-content');
      if (mobContent) mobContent.style.setProperty('font-size', _currentZoom + 'px', 'important');
      const panContent = document.getElementById('panel-lyrics-content');
      if (panContent) panContent.style.setProperty('font-size', _currentZoom + 'px', 'important');

      const mobZoomVal = document.getElementById('lyrics-modal-zoom-val');
      if (mobZoomVal) mobZoomVal.textContent = _currentZoom;
      const panZoomVal = document.getElementById('panel-lyrics-zoom-val');
      if (panZoomVal) panZoomVal.textContent = _currentZoom;


      const cache = window._lyricsCache || {};
      let song = cache[cancionId];
      if (!song || (!song.letra && !cancionId.startsWith('custom_'))) {
        // Buscar en la lista global de canciones
        const found = (cacheSongs || []).find(x => x.id === cancionId);
        if (found) {
          // Cargar letra asíncronamente desde letras_canciones
          let letra = '';
          try {
            const snap = await getDoc(doc(db, "letras_canciones", cancionId));
            if (snap.exists()) {
              letra = snap.data().letra || '';
            } else {
              // Fallback si no se ha migrado aún
              letra = found.letra || '';
            }
          } catch (e) {
            console.error("Error cargando acordes:", e);
            letra = found.letra || '';
          }
          if (song) {
            song.letra = fixCorruptedText(letra);
            song.nombre = fixCorruptedText(song.nombre);
          } else {
            song = {
              nombre: fixCorruptedText(found.nombre),
              tonoBase: found.tonoBase,
              tonoServicio: found.tonoBase,
              youtube: found.youtube || '',
              letra: fixCorruptedText(letra)
            };
          }
        } else if (cancionId.startsWith('custom_') && window._currentServiceData && window._currentServiceData.customSongsMetadata) {
          const meta = window._currentServiceData.customSongsMetadata[cancionId];
          if (meta) {
            song = {
              nombre: meta.nombre,
              tonoBase: meta.tonoBase,
              tonoServicio: meta.tonoBase,
              youtube: meta.youtube || '',
              letra: meta.letra
            };
          }
        }
      }
      if (!song) return;

      // Actualizar cache local
      if (!window._lyricsCache) window._lyricsCache = {};
      window._lyricsCache[cancionId] = song;

      const tonoMostrar = song.tonoServicio || song.tonoBase;
      window._currentLyricsToneDisplayed = tonoMostrar;
      const mtabRep = document.getElementById('mtab-repertorio-musico');
      const isRepActive = mtabRep && mtabRep.classList.contains('active');
      const ensayoActive = document.getElementById('ensayo-practice-overlay')?.classList.contains('active');
      const isSplitView = !forceModal && window.innerWidth >= 768 && isRepActive && !ensayoActive;


      // Elementos de destino dependiendo de la vista
      const destPrefix = isSplitView ? 'panel-lyrics-' : 'lyrics-modal-';

      document.getElementById(destPrefix + 'title').textContent = song.nombre;
      document.getElementById(destPrefix + 'meta').textContent = `Tono Original: ${song.tonoBase} | Tono del Servicio: ${tonoMostrar}`;

      // Configurar selector de tono
      const toneBtn = document.getElementById(destPrefix + 'tone-btn');
      const toneDisplay = document.getElementById(destPrefix + 'tone-display');
      if (toneDisplay) {
        toneDisplay.textContent = tonoMostrar;
      }

      if (toneBtn) {
        toneBtn.onclick = () => {
          const pOverlay = document.getElementById('practice-tone-picker-overlay');
          const pGrid = document.getElementById('practice-tone-picker-grid');
          const pTitle = document.getElementById('practice-tone-picker-song-name');

          if (pTitle) pTitle.textContent = `${song.nombre}`;

          const keys = ['C', 'Cm', 'C#', 'C#m', 'D', 'Dm', 'D#', 'D#m', 'E', 'Em', 'F', 'Fm', 'F#', 'F#m', 'G', 'Gm', 'G#', 'G#m', 'A', 'Am', 'A#', 'A#m', 'B', 'Bm'];
          const currentTonoPrac = song.tonoServicio || song.tonoBase;

          pGrid.innerHTML = keys.map(k =>
            `<button class="tone-grid-btn ${k === currentTonoPrac ? 'current' : ''}" data-key="${k}">${k}</button>`
          ).join('');

          pGrid.querySelectorAll('.tone-grid-btn').forEach(btn => {
            btn.onclick = () => {
              const selectedTone = btn.dataset.key;
              pOverlay.classList.remove('active');

              if (toneDisplay) {
                toneDisplay.textContent = selectedTone;
              }

              const isSongHasLetra = song.letra && song.letra.trim() !== "";
              const lyricsContentContainer = document.getElementById(destPrefix + 'content');
              if (isSongHasLetra && lyricsContentContainer) {
                lyricsContentContainer.innerHTML = renderizarLetraTranspuesta(song.letra, song.tonoBase, selectedTone);
              }
              document.getElementById(destPrefix + 'meta').textContent = `Tono Original: ${song.tonoBase} | Tono de Práctica: ${selectedTone}`;

              song.tonoServicio = selectedTone;
              window._lyricsCache[cancionId] = song;

              // Sincronizar con Firebase si estamos en el contexto de un Servicio
              if (window._currentLyricsPlaylistContext && window._currentLyricsPlaylistContext.includes('-')) {
                 const dateStr = window._currentLyricsPlaylistContext;
                 const path = `cancionesSeleccionadas.${cancionId}`;
                 const cambioPath = `cambiosTono.${cancionId}`;
                 
                 updateDoc(doc(db, "planes_servicio", dateStr), {
                   [path]: selectedTone,
                   [cambioPath]: {
                     usuario: (activeSessionUser ? activeSessionUser.nombre : "Usuario"),
                     tono: selectedTone,
                     timestamp: Date.now()
                   }
                 }).then(() => {
                   if (typeof showToast === 'function') showToast(`Tono cambiado a ${selectedTone} para todos.`);
                 }).catch(err => {
                   console.error("Error sincronizando el tono en Firebase:", err);
                 });
              }
            };
          });

          pOverlay.classList.add('active');
        };
      }

      // YouTube Link
      const ytUrl = song.youtube || (cacheSongs.find(x => x.id === cancionId) || {}).youtube;
      const ytLinkElem = document.getElementById(destPrefix + 'yt-link');
      if (ytLinkElem) {
        if (ytUrl && ytUrl.trim() !== "") {
          ytLinkElem.href = ytUrl;
          ytLinkElem.style.display = "inline-flex";
        } else {
          ytLinkElem.href = "#";
          ytLinkElem.style.display = "none";
        }
      }

      // Botón Favoritos en Encabezado
      const favBtn = document.getElementById(destPrefix + 'fav-btn');
      if (favBtn) {
        const isFav = (window.misFavoritos || []).includes(cancionId);
        if (isFav) favBtn.classList.add('es-fav');
        else favBtn.classList.remove('es-fav');

        const newFavBtn = favBtn.cloneNode(true);
        favBtn.parentNode.replaceChild(newFavBtn, favBtn);

        newFavBtn.addEventListener('click', async (e) => {
          e.stopPropagation();
          if (!activeSessionUser || !activeSessionUser.usuario) return;
          const uid = activeSessionUser.usuario;
          const refDoc = doc(db, "usuarios", uid);
          const currentlyFav = (window.misFavoritos || []).includes(cancionId);
          if (currentlyFav) {
            await updateDoc(refDoc, { favoritos: arrayRemove(cancionId) });
            window.misFavoritos = window.misFavoritos.filter(id => id !== cancionId);
            newFavBtn.classList.remove('es-fav');
          } else {
            await updateDoc(refDoc, { favoritos: arrayUnion(cancionId) });
            if (!window.misFavoritos) window.misFavoritos = [];
            window.misFavoritos.push(cancionId);
            newFavBtn.classList.add('es-fav');
          }
          if (typeof renderRepertorioMusico === 'function') renderRepertorioMusico();
        });
      }

      const hasLetra = song.letra && song.letra.trim() !== "";
      const lyricsContentContainer = document.getElementById(destPrefix + 'content');
      const lyricsHtml = hasLetra ? renderizarLetraTranspuesta(song.letra, song.tonoBase, tonoMostrar) : `
            <div style="text-align:center; padding: 60px 20px; color: var(--text3);">
              <div style="font-size: 48px; margin-bottom: 16px;"></div>
              <h4 style="color: var(--text2); margin-bottom: 8px; font-family: var(--font-display); font-size: 22px;">Letra no disponible</h4>
              <p style="font-size: 13px; max-width: 280px; margin: 0 auto; line-height: 1.5;">Esta canción aún no tiene la letra registrada en el repertorio global.</p>
            </div>
          `;

      if (isSplitView) {
        const panelLyricsBody = document.getElementById('panel-lyrics-body');
        if (panelLyricsBody) {
          const newBody = panelLyricsBody.cloneNode(true);
          panelLyricsBody.parentNode.replaceChild(newBody, panelLyricsBody);
          newBody.addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON' || e.target.closest('button') || e.target.tagName === 'A' || e.target.closest('a')) return;
            window.abrirModalLetraGlobal(cancionId, playlistContext, true);
          });
        }

        document.getElementById('panel-lyrics-content').innerHTML = lyricsHtml;
        document.getElementById('panel-lyrics-tone-display').textContent = tonoMostrar;
        document.querySelector('#musico-lyrics-detail-panel .lyrics-detail-placeholder').style.display = 'none';
        document.querySelector('#musico-lyrics-detail-panel .lyrics-detail-content-area').style.display = 'flex';

        const panelCloseBtn = document.getElementById('panel-lyrics-close');
        if (panelCloseBtn) {
          panelCloseBtn.onclick = () => {
            document.querySelector('#musico-lyrics-detail-panel .lyrics-detail-placeholder').style.display = 'block';
            document.querySelector('#musico-lyrics-detail-panel .lyrics-detail-content-area').style.display = 'none';
          };
        }
      } else {
        document.getElementById('lyrics-modal-content').innerHTML = lyricsHtml;
        document.getElementById('lyrics-modal-tone-display').textContent = tonoMostrar;
        window.abrirModalConHistorial('lyrics-modal-overlay');

        // Configurar Paginación (solo para el Modal, ya que en Split-View navegas haciendo click en la lista)
        const currentList = playlistContext || window._currentServiceSongs || [];
        const currentIndex = currentList.findIndex(s => s.id === cancionId);

        const prevBtn = document.getElementById('lyrics-modal-prev');
        const nextBtn = document.getElementById('lyrics-modal-next');
        const prevNameLabel = document.getElementById('lyrics-modal-prev-name');
        const nextNameLabel = document.getElementById('lyrics-modal-next-name');
        const pageIndicator = document.getElementById('lyrics-modal-page-indicator');
        const closeBtn = document.getElementById('lyrics-modal-close');
        if (closeBtn) {
          closeBtn.onclick = () => {
            window.cerrarModalConHistorial('lyrics-modal-overlay');
          };
        }

        if (prevBtn && nextBtn && pageIndicator) {
          if (currentIndex !== -1 && currentList.length > 1) {
            pageIndicator.style.display = 'block';
            pageIndicator.textContent = `${currentIndex + 1} de ${currentList.length}`;

            // Botón Anterior
            if (currentIndex > 0) {
              const prevSong = currentList[currentIndex - 1];
              const prevName = prevSong.nombre || "Anterior";
              prevBtn.innerHTML = `Anterior`;
              if (prevNameLabel) {
                prevNameLabel.textContent = prevName;
                prevNameLabel.style.display = 'block';
              }
              prevBtn.style.opacity = '1';
              prevBtn.style.pointerEvents = 'auto';
              prevBtn.onclick = () => {
                window.abrirModalLetraGlobal(prevSong.id, currentList);
              };
            } else {
              prevBtn.innerHTML = `Anterior`;
              if (prevNameLabel) {
                prevNameLabel.textContent = '';
                prevNameLabel.style.display = 'none';
              }
              prevBtn.style.opacity = '0.3';
              prevBtn.style.pointerEvents = 'none';
              prevBtn.onclick = null;
            }

            // Botón Siguiente
            if (currentIndex < currentList.length - 1) {
              const nextSong = currentList[currentIndex + 1];
              const nextName = nextSong.nombre || "Siguiente";
              nextBtn.innerHTML = `Siguiente`;
              if (nextNameLabel) {
                nextNameLabel.textContent = nextName;
                nextNameLabel.style.display = 'block';
              }
              nextBtn.style.opacity = '1';
              nextBtn.style.pointerEvents = 'auto';
              nextBtn.onclick = () => {
                window.abrirModalLetraGlobal(nextSong.id, currentList);
              };
            } else {
              nextBtn.innerHTML = `Siguiente`;
              if (nextNameLabel) {
                nextNameLabel.textContent = '';
                nextNameLabel.style.display = 'none';
              }
              nextBtn.style.opacity = '0.3';
              nextBtn.style.pointerEvents = 'none';
              nextBtn.onclick = null;
            }
          } else {
            pageIndicator.style.display = 'none';
            prevBtn.style.opacity = '0.3';
            prevBtn.style.pointerEvents = 'none';
            prevBtn.onclick = null;
            if (prevNameLabel) prevNameLabel.style.display = 'none';
            nextBtn.style.opacity = '0.3';
            nextBtn.style.pointerEvents = 'none';
            nextBtn.onclick = null;
            if (nextNameLabel) nextNameLabel.style.display = 'none';
          }
        }
      }
    };

    const closeLyricsModal = () => {
      document.getElementById('lyrics-modal-overlay').classList.remove('active');
      releaseWakeLock();
      detenerAutoscroll();
    };
    document.getElementById('lyrics-modal-close').addEventListener('click', closeLyricsModal);
    document.getElementById('lyrics-modal-back-btn').addEventListener('click', closeLyricsModal);

    document.getElementById('practice-modal-close').addEventListener('click', () => {
      window.cerrarModalConHistorial('ensayo-practice-overlay');
    });

    // ====================================================
    // FUNCIONES AUXILIARES: TOAST, TONO, ORDEN, CONFIG
    // ====================================================

    function showToast(msg, options = {}) {
      const toast = document.getElementById('toast-notification');
      if (!toast) return;
      const { duration = 4500, type = 'info' } = options;
      // Clear previous content
      toast.innerHTML = '';
      const messageSpan = document.createElement('span');
      messageSpan.textContent = msg;
      toast.appendChild(messageSpan);
      // X button
      const closeBtn = document.createElement('button');
      closeBtn.innerHTML = '&times;';
      closeBtn.style.background = 'none';
      closeBtn.style.border = 'none';
      closeBtn.style.color = 'var(--text2)';
      closeBtn.style.fontSize = '20px';
      closeBtn.style.cursor = 'pointer';
      closeBtn.style.marginLeft = '12px';
      closeBtn.addEventListener('click', () => {
        toast.classList.remove('show');
        clearTimeout(window._toastTimer);
      });
      toast.appendChild(closeBtn);
      toast.classList.add('show');
      clearTimeout(window._toastTimer);
      window._toastTimer = setTimeout(() => toast.classList.remove('show'), duration);
    }

    function abrirTonePicker(songId, currentTone, songName, dateStr) {
      const overlay = document.getElementById('tone-picker-overlay');
      const grid = document.getElementById('tone-picker-grid');
      document.getElementById('tone-picker-song-name').textContent = songName;

      const keys = ['C', 'Cm', 'C#', 'C#m', 'D', 'Dm', 'D#', 'D#m', 'E', 'Em', 'F', 'Fm', 'F#', 'F#m', 'G', 'Gm', 'G#', 'G#m', 'A', 'Am', 'A#', 'A#m', 'B', 'Bm'];
      grid.innerHTML = keys.map(k =>
        `<button class="tone-grid-btn ${k === currentTone ? 'current' : ''}" data-key="${k}">${k}</button>`
      ).join('');

      grid.querySelectorAll('.tone-grid-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const newTone = btn.dataset.key;
          overlay.classList.remove('active');
          const path = `cancionesSeleccionadas.${songId}`;
          const cambioPath = `cambiosTono.${songId}`;
          await updateDoc(doc(db, "planes_servicio", dateStr), {
            [path]: newTone,
            [cambioPath]: {
              usuario: activeSessionUser.nombre,
              tono: newTone,
              timestamp: Date.now()
            }
          });
        });
      });

      overlay.classList.add('active');
    }

    document.getElementById('tone-picker-close').addEventListener('click', () => {
      document.getElementById('tone-picker-overlay').classList.remove('active');
    });

    document.getElementById('practice-tone-picker-close').addEventListener('click', () => {
      document.getElementById('practice-tone-picker-overlay').classList.remove('active');
    });

    async function moverCancionOrden(songId, dir, allSelected, currentOrder, dateStr, type) {
      // Filtrar canciones del mismo tipo
      const songsOfType = allSelected.filter(s => s.tipo === type);
      const idsOfType = songsOfType.map(s => s.id);

      let orden = currentOrder.length > 0 ? [...currentOrder] : [];

      // Filtrar la ordenación actual para incluir solo las del tipo correspondiente
      let ordenFiltered = orden.filter(id => idsOfType.includes(id));

      // Asegurar que todas las seleccionadas de este tipo estén en la lista
      idsOfType.forEach(id => {
        if (!ordenFiltered.includes(id)) {
          ordenFiltered.push(id);
        }
      });

      const idx = ordenFiltered.indexOf(songId);
      if (idx === -1) return;
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= ordenFiltered.length) return;

      // Intercambiar posiciones
      [ordenFiltered[idx], ordenFiltered[newIdx]] = [ordenFiltered[newIdx], ordenFiltered[idx]];

      // Reconstruir la lista final de ordenación: Adoración primero, Alabanza después
      const otherType = type === 'adoracion' ? 'alabanza' : 'adoracion';
      const otherSongs = allSelected.filter(s => s.tipo === otherType);
      const otherIds = otherSongs.map(s => s.id);

      let otherOrderFiltered = orden.filter(id => otherIds.includes(id));
      otherIds.forEach(id => {
        if (!otherOrderFiltered.includes(id)) {
          otherOrderFiltered.push(id);
        }
      });

      // Armar el array final respetando la regla: Adoración primero, Alabanza después
      const finalOrder = type === 'adoracion'
        ? [...ordenFiltered, ...otherOrderFiltered]
        : [...otherOrderFiltered, ...ordenFiltered];

      await updateDoc(doc(db, "planes_servicio", dateStr), { ordenCanciones: finalOrder });
    }

    // --- Configuración: Enlace de WhatsApp ---
    async function cargarConfiguracion() {
      try {
        const snap = await getDoc(doc(db, "config", "app_settings"));
        if (snap.exists() && snap.data().whatsapp_link) {
          window._whatsappGroupLink = snap.data().whatsapp_link;
          const input = document.getElementById('whatsapp-group-link-input');
          if (input) input.value = window._whatsappGroupLink;
        }
      } catch (e) { console.error('Error cargando config:', e); }
    }

    document.getElementById('btn-save-whatsapp-link').addEventListener('click', async () => {
      const link = document.getElementById('whatsapp-group-link-input').value.trim();
      try {
        await setDoc(doc(db, "config", "app_settings"), { whatsapp_link: link }, { merge: true });
        window._whatsappGroupLink = link;
        const status = document.getElementById('whatsapp-link-status');
        status.textContent = 'Enlace guardado correctamente';
        setTimeout(() => status.textContent = '', 3500);
      } catch (e) { customAlert('Error al guardar: ' + e.message); }
    });

    // ====================================================
    // LISTA Y GESTIÓN DE CANCIONES SELECCIONADAS (LÍDER)
    // ====================================================
    function renderSelectedSongsAdmin(dataServicio) {
      const cont = document.getElementById('admin-selected-songs-container');
      if (!cont) return;

      const cancionesSeleccionadas = dataServicio.cancionesSeleccionadas || {};
      const selectedIds = Object.keys(cancionesSeleccionadas).filter(k => cancionesSeleccionadas[k] !== false);
      const ordenCanciones = dataServicio.ordenCanciones || [];
      const customSongsMetadata = dataServicio.customSongsMetadata || {};
      const dateStr = serviceDateSelect.value;

      let allSelected = [];
      selectedIds.forEach(id => {
        if (id.startsWith('custom_')) {
          const meta = customSongsMetadata[id];
          if (meta) {
            allSelected.push({
              id: id,
              nombre: meta.nombre,
              artista: meta.artista || "Personalizada",
              tonoBase: meta.tonoBase,
              tipo: meta.tipo,
              isCustom: true
            });
          }
        } else {
          const song = cacheSongs.find(s => s.id === id);
          if (song) {

            let songCopy = { ...song };
            const refData = typeof data !== 'undefined' ? data : (typeof dataServicio !== 'undefined' ? dataServicio : {});
            if (refData.cancionesSeleccionadasTipos && refData.cancionesSeleccionadasTipos[id]) {
              songCopy.tipo = refData.cancionesSeleccionadasTipos[id];
            }
            allSelected.push(songCopy);
          }
        }
      });

      // Ordenar por ordenCanciones
      allSelected.sort((a, b) => {
        const ia = ordenCanciones.indexOf(a.id);
        const ib = ordenCanciones.indexOf(b.id);
        if (ia === -1 && ib === -1) return 0;
        if (ia === -1) return 1;
        if (ib === -1) return -1;
        return ia - ib;
      });

      const adoraciones = allSelected.filter(s => s.tipo === 'adoracion');
      const alabanzas = allSelected.filter(s => s.tipo === 'alabanza');

      // Guardar la lista ordenada globalmente para la paginación de letras
      window._currentServiceSongs = [...adoraciones, ...alabanzas];

      if (allSelected.length === 0) {
        cont.innerHTML = `
          <div style="text-align: center; padding: 30px 20px; background: var(--bg3); border: 1px dashed var(--border); border-radius: var(--radius); margin-bottom: 20px;">
            <div style="font-size: 24px; margin-bottom: 10px;">🎶</div>
            <h4 style="color: var(--text); font-size: 14px; margin: 0 0 15px;">No hay canciones seleccionadas aún</h4>
            <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
              <button class="btn-add-song-trigger-dynamic" data-type="adoracion" style="background: rgba(155, 143, 255, 0.15); border: 1px solid var(--purple); color: var(--purple); padding: 8px 16px; border-radius: 20px; font-size: 12px; font-weight: bold; cursor: pointer;">
                + Agregar Adoración
              </button>
              <button class="btn-add-song-trigger-dynamic" data-type="alabanza" style="background: rgba(78, 205, 196, 0.15); border: 1px solid var(--teal); color: var(--teal); padding: 8px 16px; border-radius: 20px; font-size: 12px; font-weight: bold; cursor: pointer;">
                + Agregar Alabanza
              </button>
            </div>
          </div>
        `;
        
        // Attach click listeners to the new dynamic buttons
        cont.querySelectorAll('.btn-add-song-trigger-dynamic').forEach(btn => {
          btn.addEventListener('click', () => {
            const type = btn.dataset.type;
            window._targetAddSongType = type;
            window._targetAddSongDate = serviceDateSelect.value;
            
            document.getElementById('musico-add-song-title').textContent = \`Agregar a \${type === 'adoracion' ? 'Adoración' : 'Alabanza'}\`;
            document.getElementById('musico-add-song-search').value = "";
            document.getElementById('musico-custom-name').value = "";
            document.getElementById('musico-custom-artist').value = "";
            document.getElementById('musico-custom-tone').value = "C";
            
            // Llamar a la función que renderiza resultados del modal
            if (typeof renderAddSongResults === 'function') {
              renderAddSongResults(type, "");
            }
            
            window._selectedSongsToAdd = new Set();
            const btnAddSel2 = document.getElementById('btn-musico-add-selected');
            if (btnAddSel2) btnAddSel2.style.display = 'none';
            const customCont2 = document.getElementById('musico-custom-song-container');
            if (customCont2) customCont2.style.display = 'none';
            
            const modal = document.getElementById('musico-add-song-modal');
            if (modal) modal.classList.add('active');
          });
        });
        
        return;
      }

      let html = "";

      const renderAdminGroup = (songs, titulo, color, emoji, startNum, type) => {
        const sectionColorVar = color === 'teal' ? 'var(--teal)' : 'var(--purple)';
        const sectionBg = color === 'teal'
          ? 'linear-gradient(180deg, rgba(78, 205, 196, 0.06) 0%, rgba(78, 205, 196, 0.01) 100%)'
          : 'linear-gradient(180deg, rgba(155, 143, 255, 0.06) 0%, rgba(155, 143, 255, 0.01) 100%)';
        const sectionBorder = color === 'teal' ? '1.5px solid rgba(78, 205, 196, 0.35)' : '1.5px solid rgba(155, 143, 255, 0.35)';
        const sectionGlow = color === 'teal' ? '0 8px 32px rgba(78, 205, 196, 0.08)' : '0 8px 32px rgba(155, 143, 255, 0.08)';

        let g = `
        <div class="section-group-card" style="background: ${sectionBg}; border: ${sectionBorder}; border-radius: var(--radius); padding: 16px; margin-bottom: 20px; box-shadow: ${sectionGlow};">
          <h4 style="font-size:12px; font-weight: 700; text-transform:uppercase; color:${sectionColorVar}; letter-spacing:1px; margin: 0 0 12px; display: flex; align-items: center; gap: 6px;">
            <span>${emoji}</span> ${titulo}
          </h4>
          <div style="display: flex; flex-direction: column; gap: 8px;">
        `;

        if (songs.length === 0) {
          g += `<p style="color:var(--text3); font-size:12px; padding:12px; text-align:center; background:rgba(0,0,0,0.2); border-radius:10px; margin: 0;">Ninguna canción seleccionada en esta sección.</p>`;
        } else {
          songs.forEach((s, i) => {
            const tone = cancionesSeleccionadas[s.id];
            const hasLetra = s.letra && s.letra.trim() !== "";
            if (hasLetra) {
              window._lyricsCache = window._lyricsCache || {};
              window._lyricsCache[s.id] = { nombre: s.nombre, tonoBase: s.tonoBase, tonoServicio: tone, letra: s.letra };
            }
            const num = startNum + i;
            const safeNombre = (s.nombre || "").replace(/"/g, '&quot;');

            const cardBorder = type === 'alabanza'
              ? 'border-bottom: 1px solid rgba(78, 205, 196, 0.25) !important;'
              : 'border-bottom: 1px solid rgba(155, 143, 255, 0.25) !important;';
            const numColor = type === 'alabanza' ? 'color: rgba(78, 205, 196, 0.4);' : 'color: rgba(155, 143, 255, 0.4);';
            const badgeStyle = type === 'alabanza'
              ? `background: rgba(78, 205, 196, 0.12); color: var(--teal); border: 1.5px solid rgba(78, 205, 196, 0.3);`
              : `background: rgba(155, 143, 255, 0.12); color: var(--purple); border: 1.5px solid rgba(155, 143, 255, 0.3);`;

            g += `
            <div class="musico-song-card admin-service-song-card" data-song-id="${s.id}" style="background: transparent !important; border: none !important; border-radius: 0 !important; margin-bottom: 0 !important; padding: 14px 4px !important; box-shadow: none !important; ${cardBorder} cursor: pointer;">
              <!-- Extremo Izquierdo: Reordenamiento y Número -->
              <div style="display:flex; align-items:center; gap:8px;">
                <div class="song-order-btns">
                  <button class="order-btn btn-admin-order-up" data-song-id="${s.id}" data-type="${type}">▲</button>
                  <button class="order-btn btn-admin-order-down" data-song-id="${s.id}" data-type="${type}">▼</button>
                </div>
                <div class="song-num" style="min-width: 24px; ${numColor}">${num}</div>
              </div>
              
              <!-- Centro: Info -->
              <div class="song-card-info" style="margin-left: 4px; flex:1; min-width:0;">
                <div class="song-card-name" style="font-weight: 600;">${s.nombre}</div>
                <div class="song-card-artist" style="font-size:11px; color: var(--text2); margin-top:2px;">${s.artista}</div>
              </div>
              
              <!-- Extremo Derecho: Tono y Quitar inline -->
              <div style="display:flex; align-items:center; gap: 14px; margin-left:auto; flex-shrink:0; padding-right: 6px;">
                <div class="tone-indicator" style="font-size:12px; padding: 4px 10px; cursor:pointer; margin: 0; ${badgeStyle}" onclick="window.abrirTonePickerAdmin('${s.id}', '${tone}', '${s.nombre.replace(/'/g, "\\'")}', '${dateStr}')">${tone}</div>
                <button class="btn-delete-selected-admin btn-remove-song-inline" data-song-id="${s.id}" title="Quitar canción">✕</button>
              </div>
            </div>
            `;
          });
        }
        g += `
          </div>
          <button class="btn-add-song-musico" data-type="${type}" style="width: 100%; background: rgba(${color === 'teal' ? '78,205,196' : '155,143,255'}, 0.08); border: 1px dashed var(--${color}); color: var(--${color}); border-radius: 10px; padding: 12px; font-family: var(--font-body); font-size: 13px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; margin-top: 8px; border-style: dashed;">
            <span></span> Agregar a ${titulo.split(' ')[0]}
          </button>
        </div>
        `;
        return g;
      };

      html += renderAdminGroup(adoraciones, 'Adoración (Lentas)', 'purple', '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px;"><path d="M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z"></path><path d="M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"></path><path d="M12 2v2"></path><path d="M12 22v-2"></path><path d="m17 20.66-1-1.73"></path><path d="M11 10.27 7 3.34"></path><path d="m20.66 17-1.73-1"></path><path d="m3.34 7 1.73 1"></path><path d="M14 12h8"></path><path d="M2 12h2"></path><path d="m20.66 7-1.73 1"></path><path d="m3.34 17 1.73-1"></path><path d="m17 3.34-1 1.73"></path><path d="m11 13.73-4 6.93"></path></svg>', 1, 'adoracion');
      html += renderAdminGroup(alabanzas, 'Alabanza (Rápidas)', 'teal', '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px;"><path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z"></path></svg>', adoraciones.length + 1, 'alabanza');

      cont.innerHTML = html;

      // Bind click en tarjeta para abrir letra
      cont.querySelectorAll('.admin-service-song-card').forEach(card => {
        card.addEventListener('click', (e) => {
          if (
            e.target.closest('.song-order-btns') ||
            e.target.classList.contains('tone-indicator') ||
            e.target.classList.contains('btn-delete-selected-admin')
          ) {
            return;
          }
          const songId = card.dataset.songId;
          if (window.abrirModalLetraGlobal) window.abrirModalLetraGlobal(songId, window._currentServiceSongs);
        });
      });

      // Bind reordering click events
      cont.querySelectorAll('.btn-admin-order-up').forEach(btn => {
        btn.addEventListener('click', () => moverCancionOrden(btn.dataset.songId, -1, allSelected, ordenCanciones, dateStr, btn.dataset.type));
      });
      cont.querySelectorAll('.btn-admin-order-down').forEach(btn => {
        btn.addEventListener('click', () => moverCancionOrden(btn.dataset.songId, 1, allSelected, ordenCanciones, dateStr, btn.dataset.type));
      });

      // Bind remove button
      cont.querySelectorAll('.btn-delete-selected-admin').forEach(btn => {
        btn.addEventListener('click', async () => {
          const songId = btn.dataset.songId;
          const sName = cacheSongs.find(s => s.id === songId)?.nombre || (customSongsMetadata[songId]?.nombre) || "Canción";
          const res = await customConfirm(`¿Estás seguro de quitar "${sName}" de este servicio?`);
          if (!res) return;

          try {
            await updateDoc(doc(db, "planes_servicio", dateStr), {
              [`cancionesSeleccionadas.${songId}`]: deleteField()
            });
            showToast(`"${sName}" quitada del servicio`);
          } catch (e) {
            console.error(e);
            showToast('Error al quitar la canción');
          }
        });
      });

      // Evento: agregar canción admin
      cont.querySelectorAll('.btn-add-song-musico').forEach(btn => {
        btn.addEventListener('click', () => {
          const type = btn.dataset.type;
          window._targetAddSongType = type;
          window._targetAddSongDate = dateStr;

          document.getElementById('musico-add-song-title').textContent = `Agregar a ${type === 'adoracion' ? 'Adoración' : 'Alabanza'}`;
          document.getElementById('musico-add-song-search').value = "";
          document.getElementById('musico-custom-name').value = "";
          document.getElementById('musico-custom-artist').value = "";
          document.getElementById('musico-custom-tone').value = "C";

          renderAddSongResults(type, "");

          window._selectedSongsToAdd = new Set();
          const btnAddSel1 = document.getElementById('btn-musico-add-selected');
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

          document.getElementById('musico-add-song-modal').classList.add('active');
          setTimeout(() => document.getElementById('musico-custom-name').focus(), 100);
        });
      });

    }

    window.abrirTonePickerAdmin = function (songId, currentTone, songName, dateStr) {
      abrirTonePicker(songId, currentTone, songName, dateStr);
    };

    // ====================================================
    // MODAL DE BÚSQUEDA Y ADICIÓN DE CANCIONES
    // ====================================================
    let currentPickerFilter = 'todas';

    function renderAddSongResults(type, filterText) {
      const resultsCont = document.getElementById('musico-add-song-results');
      if (!resultsCont) return;

      resultsCont.style.display = 'block';
      resultsCont.innerHTML = "";

      // Lógica perezosa para evitar congelamientos
      if (currentPickerFilter === 'todas' && filterText.trim().length < 2) {
        resultsCont.innerHTML = `<p style="color:var(--text3); font-size:12px; text-align:center; padding:15px;">Escribe al menos 2 letras para buscar en la lista global.</p>`;
        return;
      }

      const dataServicio = window._currentServiceData || {};
      const cancionesSeleccionadas = dataServicio.cancionesSeleccionadas || {};
      const selectedIds = Object.keys(cancionesSeleccionadas).filter(k => cancionesSeleccionadas[k] !== false);

      const filtered = cacheSongs.filter(s => {
        const sNombre = s.nombre || "";
        const sArtista = s.artista || "";
        const matchSearch = removeAccents(sNombre).toLowerCase().includes(filterText) || removeAccents(sArtista).toLowerCase().includes(filterText);
        const notAlreadySelected = !selectedIds.includes(s.id);
        const matchOficial = currentPickerFilter === 'todas' || s.oficial === true;

        return matchSearch && notAlreadySelected && matchOficial;
      });

      if (filtered.length === 0) {
        resultsCont.innerHTML = `<p style="color:var(--text3); font-size:12px; text-align:center; padding:15px;">No se encontraron canciones disponibles.</p>`;
        return;
      }

      filtered.forEach(s => {
        const isAlabanza = type === 'alabanza';
        const cardBorder = isAlabanza
          ? 'border-bottom: 1px solid rgba(78, 205, 196, 0.25) !important;'
          : 'border-bottom: 1px solid rgba(155, 143, 255, 0.25) !important;';
        const badgeStyle = isAlabanza
          ? `background: rgba(78, 205, 196, 0.12); color: var(--teal); border: 1.5px solid rgba(78, 205, 196, 0.3);`
          : `background: rgba(155, 143, 255, 0.12); color: var(--purple); border: 1.5px solid rgba(155, 143, 255, 0.3);`;

        const div = document.createElement('div');
        div.className = "musico-song-card";
        div.style.cssText = `background: transparent !important; border: none !important; border-radius: 0 !important; margin-bottom: 0 !important; padding: 14px 4px !important; box-shadow: none !important; cursor: pointer; ${cardBorder}`;

        const isChecked = window._selectedSongsToAdd && window._selectedSongsToAdd.has(s.id);

        div.innerHTML = `
          <div style="display: flex; flex-direction: column; width: 100%; gap: 6px;">
            <div class="song-card-name" style="font-weight: 600; white-space: normal; overflow: visible; word-break: break-word; overflow-wrap: break-word; line-height: 1.3; margin-left: 4px;">
              ${s.nombre} ${s.oficial ? '<span class="badge-oficial" style="display:inline-block; vertical-align:middle; margin-left:6px;">OFICIAL</span>' : ''}
            </div>
            
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <div class="song-card-artist" style="color: var(--text2); font-size: 12px; margin-left: 4px;">${s.artista}</div>
              <div style="display:flex; align-items:center; gap: 12px; padding-right: 6px;">
                <div class="tone-indicator" style="font-size:12px; padding: 4px 10px; cursor:default; margin: 0; ${badgeStyle}">Base: ${s.tonoBase}</div>
                <div class="custom-checkbox" style="width:22px; height:22px; border-radius:6px; border:2px solid ${isChecked ? 'var(--teal)' : 'var(--border2)'}; background:${isChecked ? 'var(--teal)' : 'transparent'}; display:flex; align-items:center; justify-content:center; transition: all 0.2s;">
                  ${isChecked ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0f0e17" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>' : ''}
                </div>
              </div>
            </div>
          </div>
        `;
        div.addEventListener('click', () => {
          if (!window._selectedSongsToAdd) window._selectedSongsToAdd = new Set();

          const checkbox = div.querySelector('.custom-checkbox');
          if (window._selectedSongsToAdd.has(s.id)) {
            window._selectedSongsToAdd.delete(s.id);
            checkbox.style.background = 'transparent';
            checkbox.style.borderColor = 'var(--border2)';
            checkbox.innerHTML = '';
          } else {
            window._selectedSongsToAdd.add(s.id);
            checkbox.style.background = 'var(--teal)';
            checkbox.style.borderColor = 'var(--teal)';
            checkbox.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0f0e17" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
          }

          const btnAddSel = document.getElementById('btn-musico-add-selected');
          if (btnAddSel) {
            if (window._selectedSongsToAdd.size > 0) {
              btnAddSel.style.display = 'flex';
              btnAddSel.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px;"><path d="M12 5v14"></path><path d="M5 12h14"></path></svg> Agregar ${window._selectedSongsToAdd.size}`;
            } else {
              btnAddSel.style.display = 'none';
            }
          }
        });
        resultsCont.appendChild(div);
      });
    }

    // Toggle de filtros en modal
    const btnFilterTodas = document.getElementById('filter-picker-todas');
    const btnFilterOficial = document.getElementById('filter-picker-oficial');
    if (btnFilterTodas && btnFilterOficial) {
      btnFilterTodas.addEventListener('click', () => {
        currentPickerFilter = 'todas';
        btnFilterTodas.style.background = 'var(--bg2)';
        btnFilterTodas.style.color = 'var(--gold)';
        btnFilterTodas.style.boxShadow = '0 1px 4px rgba(0,0,0,0.2)';
        btnFilterOficial.style.background = 'transparent';
        btnFilterOficial.style.color = 'var(--text2)';
        btnFilterOficial.style.boxShadow = 'none';
        const filterText = removeAccents(document.getElementById('musico-add-song-search')?.value || '').toLowerCase().trim();
        renderAddSongResults(window._targetAddSongType, filterText);
      });
      btnFilterOficial.addEventListener('click', () => {
        currentPickerFilter = 'oficial';
        btnFilterOficial.style.background = 'var(--bg2)';
        btnFilterOficial.style.color = 'var(--gold)';
        btnFilterOficial.style.boxShadow = '0 1px 4px rgba(0,0,0,0.2)';
        btnFilterTodas.style.background = 'transparent';
        btnFilterTodas.style.color = 'var(--text2)';
        btnFilterTodas.style.boxShadow = 'none';
        const filterText = removeAccents(document.getElementById('musico-add-song-search')?.value || '').toLowerCase().trim();
        renderAddSongResults(window._targetAddSongType, filterText);
      });
    }

    // Listener para el buscador en tiempo real del modal
    const modalSearchInput = document.getElementById('musico-add-song-search');
    if (modalSearchInput && !modalSearchInput.dataset.bound) {
      modalSearchInput.dataset.bound = 'true';
      modalSearchInput.addEventListener('input', debounce(() => {
        const filterText = removeAccents(modalSearchInput.value).toLowerCase().trim();
        renderAddSongResults(window._targetAddSongType, filterText);
      }, 300));
    }

    // Cerrar modal
    const btnCloseAddModal = document.getElementById('musico-add-song-close');
    if (btnCloseAddModal) {
      btnCloseAddModal.addEventListener('click', () => {
        document.getElementById('musico-add-song-modal').classList.remove('active');
      });
    }

    // Agregar canción personalizada
    // Toggle Agregar Manual
    const btnToggleCustom = document.getElementById('btn-musico-toggle-custom');
    if (btnToggleCustom) {
      btnToggleCustom.addEventListener('click', () => {
        const cont = document.getElementById('musico-custom-song-container');
        if (cont) {
          cont.style.display = cont.style.display === 'none' ? 'block' : 'none';
        }
      });
    }

    // Agregar Seleccionadas
    const btnAddSelected = document.getElementById('btn-musico-add-selected');
    if (btnAddSelected) {
      btnAddSelected.addEventListener('click', async () => {
        if (!window._selectedSongsToAdd || window._selectedSongsToAdd.size === 0) return;

        const dateStr = window._targetAddSongDate || serviceDateSelect.value || document.getElementById('musico-service-date').value;
        const docRef = doc(db, "planes_servicio", dateStr);
        const dataServicio = window._currentServiceData || {};
        let currentOrder = dataServicio.ordenCanciones || [];
        const type = window._targetAddSongType;

        let selData = {};
        let selTipos = {};

        window._selectedSongsToAdd.forEach(songId => {
          const s = (window.cacheSongs || []).find(x => x.id === songId);
          if (s) {
            selData[songId] = s.tonoBase || 'C';
            selTipos[songId] = type;
            if (!currentOrder.includes(songId)) {
              currentOrder.push(songId);
            }
          }
        });

        try {
          await setDoc(docRef, {
            cancionesSeleccionadas: selData,
            cancionesSeleccionadasTipos: selTipos,
            ordenCanciones: currentOrder
          }, { merge: true });
          
          showToast(`Se agregaron ${window._selectedSongsToAdd.size} canciones.`);
          document.getElementById('musico-add-song-modal').classList.remove('active');
          window._selectedSongsToAdd.clear();
          renderAddSongResults(type, document.getElementById('musico-add-song-search').value.trim());
        } catch (e) {
          console.error("Error agregando selección", e);
          showToast("Error al guardar selección.");
        }
      });
    }

    // Agregar canción personalizada
    const btnAddCustomSong = document.getElementById('btn-musico-add-custom');
    if (btnAddCustomSong) {
      btnAddCustomSong.addEventListener('click', async () => {
        const customName = document.getElementById('musico-custom-name').value.trim();
        const customArtist = document.getElementById('musico-custom-artist').value.trim() || "Personalizada";
        const customTone = document.getElementById('musico-custom-tone').value;
        const type = window._targetAddSongType;

        if (!customName) {
          customAlert("Por favor escribe el nombre de la canción.");
          return;
        }

        const dateStr = window._targetAddSongDate || serviceDateSelect.value || document.getElementById('musico-service-date').value;
        const customId = 'custom_' + Date.now();

        const docRef = doc(db, "planes_servicio", dateStr);
        const dataServicio = window._currentServiceData || {};
        const currentOrder = dataServicio.ordenCanciones || [];

        try {
          await setDoc(docRef, {
            cancionesSeleccionadas: {
              [customId]: customTone
            },
            cancionesSeleccionadasTipos: {
              [customId]: type
            },
            customSongsMetadata: {
              [customId]: {
                nombre: customName,
                artista: customArtist,
                tonoBase: customTone,
                tipo: type
              }
            },
            ordenCanciones: [...currentOrder, customId]
          }, { merge: true });

          document.getElementById('musico-add-song-modal').classList.remove('active');
        } catch (e) {
          console.error("Error agregando cancion custom", e);
        }
        showToast(`"${customName}" agregada de forma personalizada`);
      });
    }

    // Bind para los botones "+" en la vista de Líder/Admin
    document.querySelectorAll('.btn-add-song-trigger').forEach(btn => {
      btn.addEventListener('click', () => {
        const type = btn.dataset.type;
        window._targetAddSongType = type;
        window._targetAddSongDate = serviceDateSelect.value;

        document.getElementById('musico-add-song-title').textContent = `Agregar a ${type === 'adoracion' ? 'Adoración' : 'Alabanza'}`;
        document.getElementById('musico-add-song-search').value = "";
        document.getElementById('musico-custom-name').value = "";
        document.getElementById('musico-custom-artist').value = "";
        document.getElementById('musico-custom-tone').value = "C";

        renderAddSongResults(type, "");

        window._selectedSongsToAdd = new Set();
        const btnAddSel2 = document.getElementById('btn-musico-add-selected');
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

        document.getElementById('musico-add-song-modal').classList.add('active');
        setTimeout(() => document.getElementById('musico-custom-name').focus(), 100);
      });
    });

    // ====================================================
    // CONFIGURACIÓN Y LISTENER DEL BOTÓN S.O.S (MÚSICOS)
    // ====================================================
    const btnMusicoSos = document.getElementById('btn-musico-sos');
    if (btnMusicoSos) {
      btnMusicoSos.addEventListener('click', () => {
        const userName = activeSessionUser ? activeSessionUser.nombre : "Usuario";
        const msg = `*${userName}* necesita asistencia (S.O.S)`;
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

        const a = document.createElement('a');
        a.href = waUrl;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      });
    }

    // AUTO-LOGIN LOGIC ON LOAD
    async function intentarAutoLogin() {
      const savedUserKey = localStorage.getItem('sessionUserKey');
      const savedPassword = localStorage.getItem('sessionPassword');
      if (!savedUserKey || !savedPassword) {
        return;
      }

      // 1. Verificar cuentas maestras/admin hardcoded
      if (savedUserKey === "alimr4" && savedPassword === "030819") {
        iniciarSesionDashboard({ nombre: "Super Admin", role: "lider", usuario: "alimr4", password: "030819" });
        return;
      }
      if (savedUserKey === "imr4" && savedPassword === "222222") {
        iniciarSesionDashboard({ nombre: "Admin IMR4", role: "lider", usuario: "imr4", password: "222222" });
        return;
      }
      if (savedUserKey === "admin" && savedPassword === "1234") {
        iniciarSesionDashboard({ nombre: "Administrador", role: "lider", usuario: "admin", password: "1234" });
        return;
      }

      // 2. Verificar en Firestore en tiempo real
      try {
        const uSnap = await getDoc(doc(db, "usuarios", savedUserKey));
        if (uSnap.exists() && uSnap.data().password === savedPassword) {
          iniciarSesionDashboard(uSnap.data());
        } else {
          console.warn("Sesión local caducada o usuario modificado.");
          localStorage.removeItem('sessionUserKey');
          localStorage.removeItem('sessionPassword');
          localStorage.removeItem('activeLeaderTab');
          localStorage.removeItem('activeMusicoTab');
          if (typeof window.aplicarTemaPorUsuario === 'function') {
            window.aplicarTemaPorUsuario('dark');
          }
        }
      } catch (err) {
        console.error("Error al re-autenticar la sesión guardada:", err);
      }
    }

    intentarAutoLogin();

    // ====================================================
    // BANNER DE INSTALACIÓN PWA
    // ====================================================
    (function setupPWAInstallBanner() {
      const banner = document.getElementById('pwa-install-banner');
      const installBtn = document.getElementById('pwa-install-btn');
      const dismissBtn = document.getElementById('pwa-dismiss-btn');
      const closeBtn = document.getElementById('pwa-close-btn');
      const iosHint = document.getElementById('pwa-ios-hint');
      const screenLogin = document.getElementById('screen-login');
      if (!banner) return;

      let deferredPrompt = null;

      // Detectar iOS
      const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;

      window.intentarMostrarPwaBanner = function () {
        if (!screenLogin) return;
        // Solo mostrar si la pantalla de login está activa
        if (screenLogin.classList.contains('active')) {
          banner.style.display = 'block';
        } else {
          banner.style.display = 'none';
        }
      };

      if (isIOS) {
        // En iOS no hay evento, mostramos el banner con instrucciones de Safari
        if (iosHint) iosHint.style.display = 'block';
        if (installBtn) installBtn.style.display = 'none'; // ocultar botón instalar en iOS
        setTimeout(() => {
          window.intentarMostrarPwaBanner();
        }, 3000);
      } else {
        // En otros dispositivos, siempre intentamos mostrar después de 3 segundos
        setTimeout(() => {
          window.intentarMostrarPwaBanner();
        }, 3000);

        window.addEventListener('beforeinstallprompt', (e) => {
          e.preventDefault();
          deferredPrompt = e;
          window.intentarMostrarPwaBanner();
        });
      }

      // Botón INSTALAR
      if (installBtn) {
        installBtn.addEventListener('click', async () => {
          if (deferredPrompt) {
            banner.style.display = 'none';
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            console.log('[PWA] Install outcome:', outcome);
            deferredPrompt = null;
          } else {
            // Si no hay prompt nativo disponible, dar un toast amigable
            showToast("Usa las opciones de tu navegador para instalar la aplicación.");
          }
        });
      }

      // Botón AHORA NO
      if (dismissBtn) {
        dismissBtn.addEventListener('click', () => {
          banner.style.display = 'none';
        });
      }

      // Botón de cerrar "✕"
      if (closeBtn) {
        closeBtn.addEventListener('click', () => {
          banner.style.display = 'none';
        });
      }

      // Ocultar si el usuario ya instaló
      window.addEventListener('appinstalled', () => {
        banner.style.display = 'none';
        console.log('[PWA] App instalada exitosamente');
      });
    })();

    // ====================================================
    // LÓGICA DE FOTOS DE PERFIL (AVATARS)
    // ====================================================
    window.actualizarAvatares = function () {
      const user = activeSessionUser;
      if (!user) return;

      const pic = user.profilePic || "";
      const initials = user.nombre ? user.nombre.substring(0, 2).toUpperCase() : "US";

      // Actualizar avatares de cabecera
      const leaderAvatar = document.getElementById('leader-avatar');
      const musicoAvatar = document.getElementById('musico-avatar');

      [leaderAvatar, musicoAvatar].forEach(avatar => {
        if (avatar) {
          if (pic) {
            avatar.style.backgroundImage = `url(${pic})`;
            avatar.textContent = "";
            avatar.style.color = "transparent";
          } else {
            avatar.style.backgroundImage = "none";
            avatar.textContent = initials;
            avatar.style.color = "";
          }
        }
      });

      // Refrescar vistas activas que muestren avatares
      if (currentUserRole === 'lider') {
        const tabMiembros = document.getElementById('tab-miembros');
        if (tabMiembros && tabMiembros.classList.contains('active') && typeof renderizarMantenimientoMiembros === 'function') {
          renderizarMantenimientoMiembros();
        }
      }
    };

    function setupProfilePicUpload() {
      const uploaderInput = document.getElementById('global-profile-pic-input');
      if (!uploaderInput) return;

      const leaderAvBtn = document.getElementById('leader-avatar-container');
      const musicoAvBtn = document.getElementById('musico-avatar-container');

      const triggerUpload = () => {
        uploaderInput.click();
      };

      // NO sobreescribir onclick del contenedor del avatar — ya manejado en el módulo principal
      // Solo conectar el botón interno "Cambiar foto"

      const btnLeaderChangePic = document.getElementById('btn-leader-change-pic');
      if (btnLeaderChangePic) btnLeaderChangePic.onclick = triggerUpload;

      const btnChangePic = document.getElementById('btn-musico-change-pic');
      if (btnChangePic) btnChangePic.onclick = triggerUpload;

      const btnMusicoLogoutDrop = document.getElementById('btn-musico-logout-dropdown');
      if (btnMusicoLogoutDrop) {
        btnMusicoLogoutDrop.addEventListener('click', () => {
          if (typeof window._cerrarSesion === 'function') window._cerrarSesion();
        });
      }

      const updateLogic = () => {
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.getRegistrations().then(function (registrations) {
            for (let registration of registrations) {
              registration.update();
            }
          });
        }
        setTimeout(() => window.location.reload(true), 1000);
      };

      const btnUpdateMusico = document.getElementById('btn-musico-update');
      if (btnUpdateMusico) btnUpdateMusico.onclick = updateLogic;

      const btnUpdateLeader = document.getElementById('btn-leader-update');
      if (btnUpdateLeader) btnUpdateLeader.onclick = updateLogic;


      uploaderInput.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
          showToast("Por favor, selecciona una imagen válida.");
          return;
        }

        const reader = new FileReader();
        reader.onload = function (event) {
          const img = new Image();
          img.onload = function () {
            const canvas = document.createElement('canvas');
            const maxDim = 120; // 120x120 pixels is plenty for an avatar
            let width = img.width;
            let height = img.height;

            if (width > height) {
              if (width > maxDim) {
                height = Math.round(height * maxDim / width);
                width = maxDim;
              }
            } else {
              if (height > maxDim) {
                width = Math.round(width * maxDim / height);
                height = maxDim;
              }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.75);

            if (!db || !doc || !setDoc) return;

            // Save to Firestore using username document ID
            const userRef = doc(db, "usuarios", activeSessionUser.usuario);
            setDoc(userRef, { profilePic: compressedBase64 }, { merge: true }).then(() => {
              activeSessionUser.profilePic = compressedBase64;
              window.actualizarAvatares();
              showToast("📷 Foto de perfil actualizada");

              // Update in local cacheMembers to propagate changes
              if (window.cacheMembers) {
                const mLocal = window.cacheMembers.find(m => m.usuario === activeSessionUser.usuario);
                if (mLocal) mLocal.profilePic = compressedBase64;
              }
            }).catch(err => {
              console.error("Error saving profile pic:", err);
              showToast("Error al guardar la foto");
            });
          };
          img.src = event.target.result;
        };
        reader.readAsDataURL(file);
      };
    }

    // Call after document load / login init
    setTimeout(setupProfilePicUpload, 500);

    // REGISTRO DE SERVICE WORKER PARA SOPORTE PWA CON NOTIFICACIÓN DE ACTUALIZACIÓN
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        let newWorker;

        navigator.serviceWorker.register('./sw.js?v=56')
          .then(reg => {
            console.log('PWA Service Worker registrado:', reg.scope);

            // Si ya hay un service worker esperando (el usuario recargó antes de actualizar)
            if (reg.waiting) {
              mostrarBannerActualizacion(reg.waiting);
            }

            // Escuchar si se encuentra una nueva versión instalando en segundo plano
            reg.addEventListener('updatefound', () => {
              newWorker = reg.installing;
              if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                  // Si el nuevo service worker terminó de instalarse y ya está esperando para activarse
                  if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    mostrarBannerActualizacion(newWorker);
                  }
                });
              }
            });
          })
          .catch(err => console.error('Error de registro de Service Worker:', err));

        // Detectar si el nuevo service worker tomó control ( skipWaiting() ) y recargar para refrescar la app
        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (!refreshing) {
            refreshing = true;
            window.location.reload();
          }
        });

        function mostrarBannerActualizacion(worker) {
          const banner = document.getElementById('pwa-update-banner');
          const btn = document.getElementById('pwa-update-btn');
          if (banner && btn) {
            // Mostrar la ventana emergente animándola desde abajo
            banner.style.transform = 'translateX(-50%) translateY(0)';
            btn.addEventListener('click', () => {
              // Notificar al worker para que active la nueva versión llamando skipWaiting()
              worker.postMessage({ type: 'SKIP_WAITING' });
            });
          }
        }
      });
    }
  

    window.customAlert = function(msg, title = "Aviso") {
      return new Promise(resolve => {
        const overlay = document.getElementById('custom-dialog-overlay');
        const box = overlay.querySelector('.modal-box');
        document.getElementById('custom-dialog-title').textContent = title;
        document.getElementById('custom-dialog-message').textContent = msg;
        
        const btnCancel = document.getElementById('custom-dialog-cancel');
        const btnConfirm = document.getElementById('custom-dialog-confirm');
        
        btnCancel.style.display = 'none';
        btnConfirm.textContent = 'Aceptar';
        box.style.borderColor = 'var(--teal)';
        btnConfirm.style.background = 'var(--teal)';
        btnConfirm.style.color = '#0f0e17';

        overlay.classList.add('active');

        const close = () => {
          overlay.classList.remove('active');
          btnConfirm.removeEventListener('click', close);
          resolve();
        };
        btnConfirm.addEventListener('click', close);
      });
    };

    window.customConfirm = function(msg, title = "Confirmación") {
      return new Promise(resolve => {
        const overlay = document.getElementById('custom-dialog-overlay');
        const box = overlay.querySelector('.modal-box');
        document.getElementById('custom-dialog-title').textContent = title;
        document.getElementById('custom-dialog-message').textContent = msg;
        
        const btnCancel = document.getElementById('custom-dialog-cancel');
        const btnConfirm = document.getElementById('custom-dialog-confirm');
        
        // Determinar si es una alerta destructiva por las palabras clave
        const isDanger = msg.toLowerCase().includes('borrar') || msg.toLowerCase().includes('eliminar') || msg.toLowerCase().includes('quitar') || msg.toLowerCase().includes('deshacer') || msg.toLowerCase().includes('atención');
        
        btnCancel.style.display = 'block';
        btnConfirm.textContent = isDanger ? 'Sí, continuar' : 'Confirmar';
        
        if (isDanger) {
           box.style.borderColor = 'var(--coral)';
           btnConfirm.style.background = 'var(--coral)';
           btnConfirm.style.color = '#fff';
        } else {
           box.style.borderColor = 'var(--teal)';
           btnConfirm.style.background = 'var(--teal)';
           btnConfirm.style.color = '#0f0e17';
        }

        overlay.classList.add('active');

        const onConfirm = () => {
          cleanup();
          resolve(true);
        };
        const onCancel = () => {
          cleanup();
          resolve(false);
        };
        const cleanup = () => {
          overlay.classList.remove('active');
          btnConfirm.removeEventListener('click', onConfirm);
          btnCancel.removeEventListener('click', onCancel);
        };

        btnConfirm.addEventListener('click', onConfirm);
        btnCancel.addEventListener('click', onCancel);
      });
    };
  
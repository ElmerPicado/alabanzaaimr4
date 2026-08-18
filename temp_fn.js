    function renderizarComponentesServicio(dataServicio) {
      const filterText = removeAccents(document.getElementById('search-service-songs').value).toLowerCase().trim();

      const teamCont = document.getElementById('service-team-container');

      // --- 0. MOSTRAR U OCULTAR CARD DE DISPONIBILIDAD PERSONAL ---
      const availCard = document.getElementById('my-availability-card');
      if (activeSessionUser && currentUserRole !== 'lider' && activeSessionUser.usuario !== 'admin') {
        if (availCard) availCard.style.display = 'block';
        const userAvail = dataServicio.disponibilidad ? dataServicio.disponibilidad[activeSessionUser.usuario] : null;
        const statusText = document.getElementById('my-avail-status');
        if (statusText) {
          if (userAvail === 'confirmado') {
            statusText.innerHTML = 'Tu estado: <span style="color:var(--teal);">Voy a Asistir</span>';
          } else if (userAvail === 'ausente') {
            statusText.innerHTML = 'Tu estado: <span style="color:var(--coral);">No Disponible</span>';
          } else {
            statusText.innerHTML = 'Tu estado: <span style="color:var(--text3);">Sin Confirmar</span>';
          }
        }
      } else {
        if (availCard) availCard.style.display = 'none';
      }

      // --- 0. NOTA ADICIONAL DEL LÍDER ---
      if (currentUserRole === 'lider' || currentUserRole === 'admin') {
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
        // 1a. Contar instrumentos asignados para advertir duplicados usando el instrumento SELECCIONADO actualmente
        const assignedCounts = {};
        miembrosFiltrados.forEach(m => {
          const assignedVal = dataServicio.musicosAsignados && dataServicio.musicosAsignados[m.usuario];
          if (assignedVal) {
            const instArr = m.instrumento.split(',').map(s => s.trim());
            const selectedInst = typeof assignedVal === 'string' ? assignedVal : instArr[0];
            assignedCounts[selectedInst] = (assignedCounts[selectedInst] || 0) + 1;
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
          const isChecked = dataServicio.musicosAsignados && !!dataServicio.musicosAsignados[m.usuario];
          const assignedValue = dataServicio.musicosAsignados ? dataServicio.musicosAsignados[m.usuario] : null;
          const userAvail = dataServicio.disponibilidad ? dataServicio.disponibilidad[m.usuario] : null;
          const instArr = m.instrumento.split(',').map(s => s.trim());
          const currentSelectedInst = typeof assignedValue === 'string' ? assignedValue : instArr[0];

          let statusBadge = "";
          // Calcular badge siempre para mostrar estado real
          if (userAvail === 'ausente' || userAvail === 'no') {
            statusBadge = `<span style="color:var(--coral); font-size:11px; margin-left: auto; margin-right: 10px; font-weight: 500;">Ausente</span>`;
          } else if (userAvail === 'no_estoy_seguro' || userAvail === 'duda' || userAvail === 'talvez') {
            statusBadge = `<span style="color:var(--coral); font-size:11px; margin-left: auto; margin-right: 10px; font-weight: 500;">En Duda</span>`;
          } else if (userAvail !== 'confirmado') {
            statusBadge = `<span style="color:var(--gold); font-size:11px; margin-left: auto; margin-right: 10px; font-weight: 500;">Sin Responder</span>`;
          }

          const containsVoice = m.instrumento.includes("Voz") || m.instrumento.includes("Corista");
          const containsRhythm = m.instrumento.includes("Batería") || m.instrumento.includes("Bajo") || m.instrumento.includes("Percusión");

          let avatarClass = "av-gold";
          if (containsRhythm) {
            avatarClass = "av-purple";
          } else if (containsVoice) {
            avatarClass = "av-teal";
          }

          const row = document.createElement('div');
          row.className = "member-row";
          // Si realmente está ausente, lo atenuamos, sino (aunque no haya respondido) lo dejamos normal para que el admin lo asigne
          if (userAvail === 'ausente' || userAvail === 'no') {
            row.style.opacity = "0.5";
          }

          const avatarPicStyle = m.profilePic
            ? `background-image: url(${m.profilePic}); background-size: cover; background-position: center; color: transparent;`
            : '';
          const avatarInitials = m.profilePic ? '' : m.nombre.substring(0, 2).toUpperCase();

          let roleHtml = `<div class="member-role">${m.instrumento}</div>`;
          if (instArr.length > 1 && (currentUserRole === 'lider' || currentUserRole === 'admin') && isAvailableGroup && isChecked) {
            let options = instArr.map(inst => `<option value="${inst}" ${inst === currentSelectedInst ? 'selected' : ''}>${inst}</option>`).join('');
            roleHtml = `<select class="member-role-select" data-user="${m.usuario}" style="background:transparent; border:1px solid var(--border2); color:var(--teal); font-size:11px; padding:2px; border-radius:4px; margin-top:2px; font-weight: 600; outline: none; cursor: pointer;">${options}</select>`;
          } else if (isChecked && typeof assignedValue === 'string') {
            roleHtml = `<div class="member-role" style="color: var(--teal); font-weight: 600;">${assignedValue}</div>`;
          }

          row.innerHTML = `
          <div class="avatar ${avatarClass}" style="${avatarPicStyle}">${avatarInitials}</div>
          <div class="member-info">
            <div class="member-name">${m.nombre}</div>
            ${roleHtml}
          </div>
          ${statusBadge}
          <div class="assign-check ${isChecked ? 'on' : ''} ${(!isAvailableGroup || (currentUserRole !== 'lider' && currentUserRole !== 'admin')) ? 'song-locked' : ''}"></div>
        `;

          if ((currentUserRole === 'lider' || currentUserRole === 'admin') && isAvailableGroup) {
            row.querySelector('.assign-check').addEventListener('click', async () => {
              const path = `musicosAsignados.${m.usuario}`;
              const newValue = !isChecked ? instArr[0] : false;
              if (!dataServicio.musicosAsignados) dataServicio.musicosAsignados = {};
              dataServicio.musicosAsignados[m.usuario] = newValue;
              
              // Recalcular advertencias e interfaz en tiempo real
              renderizarComponentesServicio(dataServicio);

              await updateDoc(doc(db, "planes_servicio", serviceDateSelect.value), {
                [path]: newValue
              });
            });

            const selectEl = row.querySelector('.member-role-select');
            if (selectEl) {
              selectEl.addEventListener('change', async (e) => {
                const newInst = e.target.value;
                if (!dataServicio.musicosAsignados) dataServicio.musicosAsignados = {};
                dataServicio.musicosAsignados[m.usuario] = newInst;

                // Recalcular advertencias e interfaz en tiempo real al cambiar el selector
                renderizarComponentesServicio(dataServicio);

                const path = `musicosAsignados.${m.usuario}`;
                await updateDoc(doc(db, "planes_servicio", serviceDateSelect.value), {
                  [path]: newInst
                });
              });
            }
          }
          return row;
        };

        // 1c. Clasificar miembros
        const disponibles = [];
        const sinConfirmarList = [];
        const noAsistiranList = [];

        miembrosFiltrados.forEach(m => {
          const userAvail = dataServicio.disponibilidad ? dataServicio.disponibilidad[m.usuario] : null;
          if (userAvail === 'confirmado') {
            disponibles.push(m);
          } else if (userAvail === 'ausente' || userAvail === 'no') {
            noAsistiranList.push({ member: m, icon: '❌', text: 'No asistirá' });
          } else if (userAvail === 'no_estoy_seguro' || userAvail === 'duda' || userAvail === 'talvez') {
            noAsistiranList.push({ member: m, icon: '❓', text: 'En duda' });
          } else {
            sinConfirmarList.push({ member: m, icon: '⏳', text: 'Sin responder' });
          }
        });


        // --- RENDERIZAR TODOS LOS INTEGRANTES (A PEDIDO DEL USUARIO) ---
        if (disponibles.length > 0) {
          const headerDisp = document.createElement('div');
          headerDisp.className = "block-title";
          headerDisp.style.marginTop = "0";
          headerDisp.style.color = "var(--teal)";
          headerDisp.style.borderBottomColor = "rgba(78,205,196,0.15)";
          headerDisp.textContent = "Confirmados";
          teamCont.appendChild(headerDisp);
          disponibles.forEach(m => teamCont.appendChild(crearFilaMiembro(m, true)));
        }

        if (sinConfirmarList.length > 0) {
          const headerUnc = document.createElement('div');
          headerUnc.className = "block-title";
          headerUnc.style.color = "var(--gold)";
          headerUnc.style.borderBottomColor = "rgba(255,183,3,0.15)";
          headerUnc.textContent = "Sin Confirmar (Asignables)";
          teamCont.appendChild(headerUnc);
          // PASAMOS TRUE AQUÍ TAMBIÉN PARA QUE SEAN ASIGNABLES POR EL LÍDER
          sinConfirmarList.forEach(item => teamCont.appendChild(crearFilaMiembro(item.member, true)));
        }

           if (disponibles.length === 0 && sinConfirmarList.length === 0) {
            const p = document.createElement('p');
            p.style.color = "var(--text3)";
            p.style.fontSize = "12px";
            p.style.padding = "12px 6px";
            p.style.textAlign = "center";
            p.textContent = "Ningún integrante disponible para esta fecha.";
            teamCont.appendChild(p);
        }

        // --- 2. RENDER DE REPERTORIO CON TONO DINÁMICO EN PÁGINA PRINCIPAL ---
        const contAlabanza = document.getElementById('service-alabanzas-list');
        const contAdoracion = document.getElementById('service-adoracion-list');
        if (contAlabanza) contAlabanza.innerHTML = "";
        if (contAdoracion) contAdoracion.innerHTML = "";

        const cancionesSeleccionadas = dataServicio.cancionesSeleccionadas || {};
        const filterEl = document.getElementById('search-service-songs');
        const searchVal = filterEl ? removeAccents(filterEl.value).toLowerCase().trim() : "";

        const filteredSongs = cacheSongs.filter(s => {
          const sNombre = s.nombre || "";
          const sArtista = s.artista || "";
          const matchSearch = removeAccents(sNombre).toLowerCase().includes(searchVal) || removeAccents(sArtista).toLowerCase().includes(searchVal);
          return matchSearch;
        });

        filteredSongs.forEach(s => {
          const isAlabanza = (s.tipo || 'alabanza').trim().toLowerCase() === 'alabanza';
          const cont = isAlabanza ? contAlabanza : contAdoracion;
          if (!cont) return;

          const isChecked = cancionesSeleccionadas[s.id] !== undefined && cancionesSeleccionadas[s.id] !== false;
          
          const cardBorder = isAlabanza
            ? 'border-bottom: 1px solid rgba(78, 205, 196, 0.25) !important;'
            : 'border-bottom: 1px solid rgba(155, 143, 255, 0.25) !important;';
          const badgeStyle = isAlabanza
            ? `background: rgba(78, 205, 196, 0.12); color: var(--teal); border: 1.5px solid rgba(78, 205, 196, 0.3);`
            : `background: rgba(155, 143, 255, 0.12); color: var(--purple); border: 1.5px solid rgba(155, 143, 255, 0.3);`;

          const div = document.createElement('div');
          div.className = "musico-song-card";
          div.style.cssText = `background: transparent !important; border: none !important; border-radius: 0 !important; margin-bottom: 0 !important; padding: 14px 4px !important; box-shadow: none !important; cursor: pointer; ${cardBorder}`;
          
          div.innerHTML = `
            <div style="display: flex; flex-direction: column; width: 100%; gap: 6px;">
              <div class="song-card-name" style="font-weight: 600; white-space: normal; overflow: visible; word-break: break-word; overflow-wrap: break-word; line-height: 1.3; margin-left: 4px;">
                ${s.nombre} ${s.oficial ? '<span class="badge-oficial" style="display:inline-block; vertical-align:middle; margin-left:6px;">OFICIAL</span>' : ''}
              </div>
              <div style="display: flex; align-items: center; justify-content: space-between;">
                <div class="song-card-artist" style="color: var(--text2); font-size: 12px; margin-left: 4px;">${s.artista}</div>
                <div style="display:flex; align-items:center; gap: 12px; padding-right: 6px;">
                  <button class="btn-preview-lyrics" data-song-id="${s.id}" style="background:transparent; border:1px solid var(--border2); color:var(--text2); border-radius:6px; padding:4px 8px; font-size:12px; cursor:pointer; display:flex; align-items:center; gap:4px;" title="Ver letra">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><line x1="10" y1="9" x2="8" y2="9"></line></svg>
                    Letra
                  </button>
                  <div class="tone-indicator" style="font-size:12px; padding: 4px 10px; cursor:default; margin: 0; ${badgeStyle}">Base: ${s.tonoBase}</div>
                  <div class="custom-checkbox" style="width:22px; height:22px; border-radius:6px; border:2px solid ${isChecked ? 'var(--teal)' : 'var(--border2)'}; background:${isChecked ? 'var(--teal)' : 'transparent'}; display:flex; align-items:center; justify-content:center; transition: all 0.2s;">
                    ${isChecked ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0f0e17" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>' : ''}
                  </div>
                </div>
              </div>
            </div>
          `;

          const btnPreview = div.querySelector('.btn-preview-lyrics');
          if (btnPreview) {
            btnPreview.addEventListener('click', (e) => {
              e.stopPropagation();
              if (window.abrirModalLetraGlobal) window.abrirModalLetraGlobal(s.id, s.tonoBase);
            });
          }

          div.addEventListener('click', async () => {
             if (currentUserRole !== 'lider' && currentUserRole !== 'admin') return;

             const newValue = !isChecked ? s.tonoBase : false;
             if (!dataServicio.cancionesSeleccionadas) dataServicio.cancionesSeleccionadas = {};
             dataServicio.cancionesSeleccionadas[s.id] = newValue;

             if (newValue) {
                if (!dataServicio.ordenCanciones) dataServicio.ordenCanciones = [];
                if (!dataServicio.ordenCanciones.includes(s.id)) {
                   dataServicio.ordenCanciones.push(s.id);
                }
             } else {
                if (dataServicio.ordenCanciones) {
                   dataServicio.ordenCanciones = dataServicio.ordenCanciones.filter(id => id !== s.id);
                }
             }

             renderizarComponentesServicio(dataServicio);
             
             try {
               await updateDoc(doc(db, "planes_servicio", serviceDateSelect.value), {
                 [`cancionesSeleccionadas.${s.id}`]: newValue,
                 ordenCanciones: dataServicio.ordenCanciones || []
               });
             } catch (err) {
               console.error("Error actualizando canción: ", err);
             }
          });

          cont.appendChild(div);
        });

        if (noAsistiranList.length > 0) {
          const headerNo = document.createElement('div');
          headerNo.className = "block-title";
          headerNo.style.color = "var(--coral)";
          headerNo.style.borderBottomColor = "rgba(244,63,94,0.15)";
          headerNo.textContent = "No Asistirán / En Duda";
          teamCont.appendChild(headerNo);
          // PASAMOS FALSE AQUÍ PARA QUE NO SE PUEDAN ASIGNAR FACILMENTE (song-locked)
          noAsistiranList.forEach(item => teamCont.appendChild(crearFilaMiembro(item.member, false)));
        }

//         // Eliminada sección de No Disponibles por petición del usuario

      // --- 2. RENDER DE REPERTORIO CON TONO DINÁMICO ---
      // (Global song lists have been hidden in favor of the 'Add Song' Modal for Admin, see renderSelectedSongsAdmin)

}
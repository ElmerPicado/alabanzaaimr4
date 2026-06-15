
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

        // Initialize view rendering
        renderEnsayosAdmin();
      };

      window.updateRehearsalsActiveUser = function (user) {
        activeSessionUser = user;
        renderEnsayosMusico();
      };
      // ==============================
      // ENSAYO MODAL LOGIC (ADMIN)
      // ==============================
      const btnAddEnsayo = document.getElementById('btn-add-ensayo');
      const modalEnsayo = document.getElementById('admin-ensayo-modal');
      const btnCancelEnsayo = document.getElementById('btn-cancel-ensayo');
      const btnSaveEnsayo = document.getElementById('btn-save-ensayo');
      const ensayoMiembrosList = document.getElementById('ensayo-miembros-list');

      // Open modal – populate members AND songs
      if (btnAddEnsayo) {
        btnAddEnsayo.addEventListener('click', () => {
          renderEnsayoMembers();
          renderEnsayoCancionesModal();
          // Reset fields
          document.getElementById('ensayo-nombre').value = '';
          document.getElementById('ensayo-fecha').value = '';
          document.getElementById('ensayo-hora').value = '';
          modalEnsayo.classList.add('active');
        });
      }

      // Populate song checkboxes inside the modal
      function renderEnsayoCancionesModal() {
        const cont = document.getElementById('ensayo-canciones-list');
        if (!cont) return;
        cont.innerHTML = '';
        if (!window.cacheSongs || window.cacheSongs.length === 0) {
          cont.innerHTML = `<p style='color:var(--text3);font-size:12px;text-align:center;'>No hay canciones en la biblioteca aún.</p>`;
          return;
        }
        window.cacheSongs.forEach(s => {
          const div = document.createElement('div');
          div.className = 'member-row';
          div.style.padding = '6px 0';
          div.innerHTML = `
        <div class="assign-check" data-song-id="${s.id}"></div>
        <div class="member-info">
          <div class="member-name" style="font-size:13px;">${s.nombre}</div>
          <div class="member-role">${s.artista} | <span class="chip-type chip-${s.tipo}">${s.tipo}</span></div>
        </div>
      `;
          div.querySelector('.assign-check').addEventListener('click', e => {
            e.stopPropagation();
            e.currentTarget.classList.toggle('on');
          });
          cont.appendChild(div);
        });
      }

      // Cancel modal
      if (btnCancelEnsayo) {
        btnCancelEnsayo.addEventListener('click', () => {
          modalEnsayo.classList.remove('active');
        });
      }

      // Render member checkboxes for ensayo selection
      window.renderEnsayoMembers = function () {
        if (!ensayoMiembrosList) return;
        ensayoMiembrosList.innerHTML = '';
        if (!window.cacheMembers) return;
        window.cacheMembers.forEach(member => {
          if (member.usuario === 'admin') return;
          const idVal = member.usuario || member.id;
          const div = document.createElement('div');
          div.className = 'member-row';
          div.innerHTML = `
        <div class="assign-check" data-id="${idVal}"></div>
        <div class="member-info">
          <div class="member-name">${member.nombre}</div>
          <div class="member-role">${member.instrumento || ''}</div>
        </div>
      `;
          // toggle check on click
          div.querySelector('.assign-check').addEventListener('click', (e) => {
            e.stopPropagation();
            const check = e.currentTarget;
            check.classList.toggle('on');
          });
          ensayoMiembrosList.appendChild(div);
        });
      }

      // Save ensayo – now includes hora and songs
      if (btnSaveEnsayo) {
        btnSaveEnsayo.addEventListener('click', async () => {
          const nombreInput = document.getElementById('ensayo-nombre');
          const fechaInput = document.getElementById('ensayo-fecha');
          const horaInput = document.getElementById('ensayo-hora');
          const nombre = nombreInput.value.trim();
          const fecha = fechaInput.value;
          const hora = horaInput ? horaInput.value : '';
          if (!fecha) { alert('Selecciona una fecha para el ensayo.'); return; }
          const defaultLabel = `Ensayo ${fecha}${hora ? ' ' + hora : ''}`;
          const etiqueta = nombre || defaultLabel;

          // Members
          const selectedIds = [];
          ensayoMiembrosList.querySelectorAll('.assign-check.on').forEach(el => {
            const id = el.getAttribute('data-id');
            if (id) selectedIds.push(id);
          });
          if (selectedIds.length === 0) { alert('Selecciona al menos un integrante.'); return; }

          // Songs
          const selectedSongIds = [];
          const cancionesListEl = document.getElementById('ensayo-canciones-list');
          if (cancionesListEl) {
            cancionesListEl.querySelectorAll('.assign-check.on').forEach(el => {
              const sid = el.getAttribute('data-song-id');
              if (sid) selectedSongIds.push(sid);
            });
          }

          try {
            await addDoc(collection(db, 'ensayos'), {
              nombre: etiqueta,
              fecha: fecha,
              hora: hora,
              miembros: selectedIds,
              canciones: selectedSongIds,
              confirmaciones: {}
            });
            modalEnsayo.classList.remove('active');
            nombreInput.value = ''; fechaInput.value = ''; if (horaInput) horaInput.value = '';
            showToast(`✅ Ensayo "${etiqueta}" creado`);
            renderEnsayosAdmin();
          } catch (err) {
            console.error('Error creando ensayo', err);
            alert('Error al crear el ensayo');
          }
        });
      }
    

    import { initializeApp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js";

    import {
      getFirestore,
      doc,
      setDoc,
      getDoc,
      collection,
      onSnapshot,
      updateDoc,
      deleteDoc,
      deleteField,
      addDoc
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
    const db = getFirestore(app);

    // Nodos DOM globales
    const screenLogin = document.getElementById('screen-login');
    const screenDashboard = document.getElementById('screen-dashboard');
    const loginForm = document.getElementById('login-form');
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

    // Poner el próximo domingo por defecto
    const baseDay = new Date();
    baseDay.setDate(baseDay.getDate() + (7 - baseDay.getDay()) % 7);
    serviceDateSelect.value = baseDay.toISOString().split('T')[0];

    // Controladores de Pestañas
    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(tab.dataset.tab).classList.add('active');
      });
    });
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const userVal = document.getElementById('login-email').value.trim().toLowerCase();
      const passVal = document.getElementById('login-password').value.trim();

      // 1. VALIDACIÓN CUENTA MAESTRA PRINCIPAL (SUPER ADMIN & GENERIC ADMIN)
      if (userVal === "alimr4" && passVal === "030819") {
        console.log("Acceso concedido al Super Administrador.");
        iniciarSesionDashboard({ nombre: "Super Admin", role: "lider", usuario: "alimr4" });
        return;
      }
      if (userVal === "imr4" && passVal === "222222") {
        console.log("Acceso concedido al Administrador General.");
        iniciarSesionDashboard({ nombre: "Admin IMR4", role: "lider", usuario: "imr4" });
        return;
      }
      if (userVal === "admin" && passVal === "1234") {
        console.log("Acceso concedido al Administrador General legacy.");
        iniciarSesionDashboard({ nombre: "Administrador", role: "lider", usuario: "admin" });
        return;
      }

      // 2. LOGICA DE CONSULTA PARA MÚSICOS REGISTRADOS
      try {
        const uSnap = await getDoc(doc(db, "usuarios", userVal));
        if (uSnap.exists() && uSnap.data().password === passVal) {
          iniciarSesionDashboard(uSnap.data());
        } else {
          alert("Credenciales inválidas. Revisa tu usuario y clave.");
        }
      } catch (err) {
        console.error(err);
        alert("Error de conexión a la base de datos de Firebase.");
      }
    });

    const screenMusico = document.getElementById('screen-musico');

    function iniciarSesionDashboard(userData) {
      activeSessionUser = userData;
      currentUserRole = userData.role;
      displayRole.textContent = currentUserRole === 'lider' ? 'Líder' : 'Músico';

      screenLogin.classList.remove('active');

      if (currentUserRole === 'lider') {
        // Vista de Líder
        document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'block');
        screenDashboard.classList.add('active');
        cargarConfiguracion();
      } else {
        // Vista de Músico
        document.getElementById('musico-name-badge').textContent = userData.nombre;
        screenMusico.classList.add('active');
        iniciarVistaMusico();
      }

      // Set user session in rehearsals logic
      if (window.updateRehearsalsActiveUser) {
        window.updateRehearsalsActiveUser(userData);
      }

      // Cargar datos base en caché sin importar el rol
      escucharBaseDatosGlobal();
    }

    function cerrarSesion() {
      screenLogin.classList.add('active');
      screenDashboard.classList.remove('active');
      screenMusico.classList.remove('active');
      if (unsubscribeService) unsubscribeService();
      if (unsubscribeMusicoService) unsubscribeMusicoService();
      if (window._unsubMusicoServicePlan) { window._unsubMusicoServicePlan(); window._unsubMusicoServicePlan = null; }
      window._prevCambiosTono = {};
      activeSessionUser = null;
    }

    btnLogout.addEventListener('click', cerrarSesion);
    document.getElementById('btn-musico-logout').addEventListener('click', cerrarSesion);

    // === CONTROLADOR DE TEMAS (CLARO / OSCURO) PARA MÚSICOS ===
    const btnMusicoTheme = document.getElementById('btn-musico-theme');
    const themeInit = localStorage.getItem('musico-theme') || 'dark';
    if (themeInit === 'light') {
      document.body.classList.add('theme-light');
      if (btnMusicoTheme) btnMusicoTheme.textContent = '🌙';
    } else {
      document.body.classList.remove('theme-light');
      if (btnMusicoTheme) btnMusicoTheme.textContent = '☀️';
    }
    if (btnMusicoTheme) {
      btnMusicoTheme.addEventListener('click', () => {
        document.body.classList.toggle('theme-light');
        const isLight = document.body.classList.contains('theme-light');
        localStorage.setItem('musico-theme', isLight ? 'light' : 'dark');
        btnMusicoTheme.textContent = isLight ? '🌙' : '☀️';
      });
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
        } else if (currentUserRole === 'musico') {
          const msDate = document.getElementById('musico-service-date').value;
          if (msDate) cargarServicioMusico(msDate);
        }
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
      });

      onSnapshot(collection(db, "planes_servicio"), (snap) => {
        cacheHistorial = [];
        snap.forEach(doc => cacheHistorial.push({ id: doc.id, ...doc.data() }));
        cacheHistorial.sort((a, b) => b.fecha.localeCompare(a.fecha));
        if (currentUserRole === 'lider') renderizarHistorialServicios();
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
            <div style="font-size:11px; color:var(--text3);">🎵 ${totalCanciones} canción(es) &nbsp;|&nbsp; 👥 ${totalMusicos} integrante(s)</div>
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
    document.getElementById('search-service-songs').addEventListener('input', () => {
      sincronizarPanelArmado();
    });

    // ====================================================
    // LOGICA CENTRAL: ARMADO DE SERVICIOS POR FECHA
    // ====================================================
    function sincronizarPanelArmado() {
      const targetDate = serviceDateSelect.value;
      if (!targetDate) return;

      if (unsubscribeService) unsubscribeService();

      const serviceDocRef = doc(db, "planes_servicio", targetDate);

      unsubscribeService = onSnapshot(serviceDocRef, async (snap) => {
        if (!snap.exists()) {
          // Inicializar estructura limpia de la fecha en Firestore para todos
          await setDoc(serviceDocRef, {
            fecha: targetDate,
            cancionesSeleccionadas: {}, // id_cancion: tono_elegido
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
      document.getElementById('service-team-container').innerHTML = `<p style='color:var(--text3);font-size:13px;text-align:center;padding:10px;'>No hay datos configurados para esta fecha.</p>`;
      document.getElementById('songs-alabanza-container').innerHTML = '';
      document.getElementById('songs-adoracion-container').innerHTML = '';
    }

    function generarMensajeTexto(dataServicio) {
      const targetDate = serviceDateSelect.value;
      if (!targetDate) return "";

      const partesFecha = targetDate.split('-');
      const objetoFecha = new Date(partesFecha[0], partesFecha[1] - 1, partesFecha[2]);
      const fechaLegible = objetoFecha.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });

      let msg = `*PROGRAMACIÓN DE ALABANZA - IMR4*\n🗓️ *${fechaLegible.toUpperCase()}*\n\n`;

      if (dataServicio.nota_adicional && dataServicio.nota_adicional.trim() !== "") {
        msg += `📌 *NOTA DEL LÍDER:*\n_${dataServicio.nota_adicional}_\n\n`;
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
            allSelected.push(song);
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
      msg += `*🙏 ADORACIÓN (Lentas):*\n`;
      if (adoraciones.length > 0) {
        adoraciones.forEach((s, idx) => {
          const tone = cancionesSeleccionadas[s.id];
          msg += `  ${idx + 1}. ${s.nombre} (_Tono: ${tone}_)\n`;
        });
      } else {
        msg += "  _Ninguna seleccionada_\n";
      }

      // Alabanza después
      msg += `\n*🔥 ALABANZA (Rápidas):*\n`;
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
      let cuerpoMusicos = " *🎹 Músicos:*\n";
      let cuerpoCoristas = " *🎤 Voces/Coros:*\n";

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

      msg += `\n_“Alabadle con salterio y arpa. Alabadle con pandero y danza...” Ps. 150_ 🙌🚀`;
      return msg;
    }

    function renderizarComponentesServicio(dataServicio) {
      const filterText = document.getElementById('search-service-songs').value.toLowerCase().trim();

      const teamCont = document.getElementById('service-team-container');
      const alabCont = document.getElementById('songs-alabanza-container');
      const adorCont = document.getElementById('songs-adoracion-container');

      // --- 0. MOSTRAR U OCULTAR CARD DE DISPONIBILIDAD PERSONAL ---
      const availCard = document.getElementById('my-availability-card');
      if (activeSessionUser && activeSessionUser.usuario !== 'admin') {
        availCard.style.display = 'block';
        const userAvail = dataServicio.disponibilidad ? dataServicio.disponibilidad[activeSessionUser.usuario] : null;
        const statusText = document.getElementById('my-avail-status');
        if (userAvail === 'confirmado') {
          statusText.innerHTML = 'Tu estado: <span style="color:var(--teal);">Voy a Asistir 👍</span>';
        } else if (userAvail === 'ausente') {
          statusText.innerHTML = 'Tu estado: <span style="color:var(--coral);">No Disponible 👎</span>';
        } else {
          statusText.innerHTML = 'Tu estado: <span style="color:var(--text3);">Sin Confirmar ⏳</span>';
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
          await updateDoc(doc(db, "planes_servicio", targetDate), {
            nota_adicional: val,
            mensajeEditado: deleteField()
          });
          showToast('📌 Nota guardada — el mensaje de WhatsApp se actualizó');
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
          warningBanner.innerHTML = `⚠️ Atención líder: Hay más de un integrante asignado para: <b>${duplicateInstruments.join(', ')}</b>.`;
          teamCont.appendChild(warningBanner);
        }

        // 1b. Helper para renderizar filas de miembros
        const crearFilaMiembro = (m, isAvailableGroup) => {
          const isChecked = dataServicio.musicosAsignados && dataServicio.musicosAsignados[m.usuario];
          const userAvail = dataServicio.disponibilidad ? dataServicio.disponibilidad[m.usuario] : null;

          let statusBadge = "";
          if (!isAvailableGroup) {
            if (userAvail === 'ausente') {
              statusBadge = `<span style="color:var(--coral); font-size:11px; margin-left: auto; margin-right: 10px; font-weight: 500;">❌ Ausente</span>`;
            } else {
              statusBadge = `<span style="color:var(--text3); font-size:11px; margin-left: auto; margin-right: 10px;">⏳ Sin Responder</span>`;
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

          row.innerHTML = `
          <div class="avatar ${avatarClass}">${m.nombre.substring(0, 2).toUpperCase()}</div>
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

        // Renderizar No Disponibles / Sin Confirmar
        const headerNoDisp = document.createElement('div');
        headerNoDisp.className = "block-title";
        headerNoDisp.style.marginTop = "20px";
        headerNoDisp.style.color = "var(--text3)";
        headerNoDisp.style.borderBottomColor = "rgba(255,255,255,0.05)";
        headerNoDisp.textContent = "No Disponibles / Sin Confirmar (Bloqueados)";
        teamCont.appendChild(headerNoDisp);

        if (noDisponibles.length === 0) {
          const p = document.createElement('p');
          p.style.color = "var(--text3)";
          p.style.fontSize = "12px";
          p.style.padding = "12px 6px";
          p.style.textAlign = "center";
          p.textContent = "Todos los integrantes han confirmado asistencia.";
          teamCont.appendChild(p);
        } else {
          noDisponibles.forEach(m => {
            teamCont.appendChild(crearFilaMiembro(m, false));
          });
        }
      }

      // --- 2. RENDER DE REPERTORIO CON TONO DINÁMICO ---
      alabCont.innerHTML = "";
      adorCont.innerHTML = "";

      const filteredSongs = cacheSongs.filter(s => s.nombre.toLowerCase().includes(filterText) || s.artista.toLowerCase().includes(filterText));

      filteredSongs.forEach(s => {
        const selectedTone = dataServicio.cancionesSeleccionadas && dataServicio.cancionesSeleccionadas[s.id];
        const isSelected = selectedTone !== undefined && selectedTone !== null && selectedTone !== false;
        const displayTone = isSelected ? selectedTone : s.tonoBase;
        const keysOptions = ['C', 'Cm', 'C#', 'C#m', 'D', 'Dm', 'D#', 'D#m', 'E', 'Em', 'F', 'Fm', 'F#', 'F#m', 'G', 'Gm', 'G#', 'G#m', 'A', 'Am', 'A#', 'A#m', 'B', 'Bm'];

        const item = document.createElement('div');
        item.className = "song-item";

        let keySelectionMarkup = "";
        if (isSelected) {
          if (currentUserRole === 'lider') {
            keySelectionMarkup = `
            <div style="margin-top:5px; display:inline-flex; align-items:center; gap:6px;">
              <span style="font-size:11px; color:var(--gold);">Tono en uso:</span>
              <select class="select-change-tone" style="background:var(--bg3); border:1px solid rgba(244,197,66,0.5); color:var(--gold); border-radius:4px; padding:2px 6px; font-size:11px; font-family:var(--font-body); outline:none; cursor:pointer;">
                ${keysOptions.map(t => `<option value="${t}" ${t === displayTone ? 'selected' : ''}>${t}</option>`).join('')}
              </select>
            </div>
          `;
          } else {
            keySelectionMarkup = `
            <div style="margin-top:5px; display:inline-flex; align-items:center; gap:6px;">
              <span style="font-size:11px; color:var(--gold);">Tono en uso:</span>
              <span style="background:rgba(244,197,66,0.15); color:var(--gold); border:1px solid rgba(244,197,66,0.3); padding:2px 8px; border-radius:4px; font-size:11px; font-weight:600;">${displayTone}</span>
            </div>
          `;
          }
        }

        item.innerHTML = `
        <div class="song-check ${isSelected ? 'checked' : ''} ${currentUserRole !== 'lider' ? 'song-locked' : ''}"></div>
        <div class="song-info">
          <div class="song-name">${s.nombre}</div>
          <div class="song-meta">${s.artista} | Tono Base: <b>${s.tonoBase}</b></div>
          ${keySelectionMarkup}
        </div>
      `;

        if (currentUserRole === 'lider') {
          item.querySelector('.song-check').addEventListener('click', async () => {
            const path = `cancionesSeleccionadas.${s.id}`;
            if (!isSelected) {
              await updateDoc(doc(db, "planes_servicio", serviceDateSelect.value), { [path]: s.tonoBase });
            } else {
              await updateDoc(doc(db, "planes_servicio", serviceDateSelect.value), { [path]: false });
            }
          });

          if (isSelected) {
            item.querySelector('.select-change-tone').addEventListener('change', async (e) => {
              const nuevoTono = e.target.value;
              const path = `cancionesSeleccionadas.${s.id}`;
              await updateDoc(doc(db, "planes_servicio", serviceDateSelect.value), {
                [path]: nuevoTono
              });
            });
          }
        }

        if (s.tipo === 'alabanza') alabCont.appendChild(item);
        else adorCont.appendChild(item);
      });

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
      if (!targetDate) { alert('Primero selecciona una fecha.'); return; }
      const newMsg = document.getElementById('whatsapp-preview').value;
      await updateDoc(doc(db, "planes_servicio", targetDate), {
        mensajeEditado: newMsg,
        estadoEnvio: 'pendiente'
      });
      alert("Borrador guardado. El historial lo muestra como 🟡 Pendiente.");
    });

    // Enviar por WhatsApp (iOS-safe: sin await antes de abrir enlace)
    document.getElementById('btn-copy-whatsapp').addEventListener('click', () => {
      const previewEl = document.getElementById('whatsapp-preview');
      const msg = previewEl.value;
      if (!msg || msg.startsWith("Selecciona") || msg.trim() === "") {
        alert("No hay datos cargados para generar un mensaje aún.");
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
      btnSubmit.textContent = "Guardar Canción";
      btnSubmit.style.background = "var(--gold)";
      const cancelBtn = document.getElementById('btn-cancel-song-edit');
      if (cancelBtn) cancelBtn.style.display = 'none';
    }

    // ====================================================
    // RESPALDO: CRUD MANTENIMIENTOS (REPERTORIO Y MIEMBROS)
    // ====================================================
    document.getElementById('form-add-song').addEventListener('submit', async (e) => {
      e.preventDefault();
      const idUnico = editingSongId || ("song_" + Date.now());
      const payload = {
        nombre: document.getElementById('song-name-input').value.trim(),
        artista: document.getElementById('song-artist-input').value.trim(),
        tonoBase: document.getElementById('song-key-input').value.trim(),
        tipo: document.getElementById('song-type-input').value,
        youtube: document.getElementById('song-youtube-input').value.trim(),
        letra: document.getElementById('song-lyrics-input').value
      };
      await setDoc(doc(db, "biblioteca_canciones", idUnico), payload);
      const wasEditing = !!editingSongId;
      resetSongForm();
      alert(wasEditing ? "Canción actualizada." : "Canción añadida al catálogo global.");
    });

    function renderizarMantenimientoCanciones() {
      const listCont = document.getElementById('global-songs-list');
      listCont.innerHTML = "";
      if (cacheSongs.length === 0) {
        listCont.innerHTML = "<p style='color:var(--text3);font-size:12px;text-align:center;'>Biblioteca vacía.</p>";
        return;
      }
      cacheSongs.forEach(s => {
        const div = document.createElement('div');
        div.className = "song-item";
        div.style.justifyContent = "space-between";
        div.innerHTML = `
        <div class="song-info">
          <div class="song-name">${s.nombre} <span class="chip ${s.tipo === 'alabanza' ? 'chip-teal' : 'chip-purple'}" style="font-size:9px; padding:2px 6px;">${s.tipo}</span></div>
          <div class="song-meta">${s.artista} | Tono Base: ${s.tonoBase}</div>
        </div>
        ${currentUserRole === 'lider' ? `
          <div style="display:flex; gap:6px;">
            <button class="chip chip-teal click-edit-song" style="cursor:pointer; border:none; padding: 4px 8px; border-radius: 4px;" title="Editar">✏️ Editar</button>
            <button class="chip chip-coral click-del-song" style="cursor:pointer; border:none; padding: 4px 8px; border-radius: 4px;" title="Eliminar">🗑️ Eliminar</button>
          </div>
        ` : ''}
      `;
        if (currentUserRole === 'lider') {
          div.querySelector('.click-edit-song').addEventListener('click', () => {
            editingSongId = s.id;
            document.getElementById('song-name-input').value = s.nombre;
            document.getElementById('song-artist-input').value = s.artista;
            document.getElementById('song-key-input').value = s.tonoBase;
            document.getElementById('song-type-input').value = s.tipo;
            document.getElementById('song-youtube-input').value = s.youtube || "";
            document.getElementById('song-lyrics-input').value = s.letra || "";

            const btnSubmit = document.querySelector('#form-add-song button[type="submit"]');
            btnSubmit.textContent = "Actualizar Canción";
            btnSubmit.style.background = "var(--teal)";

            let cancelBtn = document.getElementById('btn-cancel-song-edit');
            if (!cancelBtn) {
              cancelBtn = document.createElement('button');
              cancelBtn.id = 'btn-cancel-song-edit';
              cancelBtn.type = 'button';
              cancelBtn.className = 'btn-primary';
              cancelBtn.style.background = 'var(--coral)';
              cancelBtn.style.marginTop = '8px';
              cancelBtn.textContent = 'Cancelar Edición';
              cancelBtn.onclick = () => resetSongForm();
              document.getElementById('form-add-song').appendChild(cancelBtn);
            }
            cancelBtn.style.display = 'block';

            document.getElementById('form-add-song').scrollIntoView({ behavior: 'smooth' });
          });

          div.querySelector('.click-del-song').addEventListener('click', async () => {
            if (confirm(`¿Quieres borrar definitivamente "${s.nombre}" del catálogo?`)) {
              await deleteDoc(doc(db, "biblioteca_canciones", s.id));
            }
          });
        }
        listCont.appendChild(div);
      });
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
        alert("Por favor, selecciona al menos un rol o instrumento de la lista.");
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
      alert(wasEditing ? "Integrante actualizado exitosamente." : "Integrante guardado exitosamente.");
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
        div.innerHTML = `
        <div style="display:flex; align-items:center; gap:10px;">
          <div class="avatar av-purple">${m.nombre.substring(0, 2).toUpperCase()}</div>
          <div class="member-info">
            <div class="member-name">${m.nombre} ${m.role === 'lider' ? '<b style="color:var(--gold)">[Líder]</b>' : ''}</div>
            <div class="member-role">User: ${m.usuario} | Clave: ${m.password} | Instrumento: ${m.instrumento}</div>
          </div>
        </div>
        ${currentUserRole === 'lider' ? `
          <div style="display:flex; gap:6px;">
            <button class="chip chip-teal click-edit-member" style="cursor:pointer; border:none; padding: 4px 8px; border-radius: 4px;" title="Editar">✏️</button>
            <button class="chip chip-coral click-del-member" style="cursor:pointer; border:none; padding: 4px 8px; border-radius: 4px;" title="Eliminar">🗑️</button>
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
            if (confirm(`¿Eliminar la cuenta de "${m.nombre}" del sistema de acceso?`)) {
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

    function iniciarVistaMusico() {
      // Controladores Pestañas Músico
      document.querySelectorAll('.nav-tab-musico').forEach(tab => {
        tab.addEventListener('click', () => {
          document.querySelectorAll('.nav-tab-musico').forEach(t => t.classList.remove('active'));
          document.querySelectorAll('#screen-musico .tab-panel').forEach(p => p.classList.remove('active'));
          tab.classList.add('active');
          document.getElementById(tab.dataset.mtab).classList.add('active');
        });
      });

      const msDate = document.getElementById('musico-service-date');
      const maDate = document.getElementById('musico-avail-date');

      // Set next sunday
      const baseDay = new Date();
      baseDay.setDate(baseDay.getDate() + (7 - baseDay.getDay()) % 7);
      const dateStr = baseDay.toISOString().split('T')[0];

      msDate.value = dateStr;
      maDate.value = dateStr;

      msDate.addEventListener('change', () => cargarServicioMusico(msDate.value));
      maDate.addEventListener('change', () => cargarAsistenciaMusico(maDate.value));

      cargarServicioMusico(dateStr);
      cargarAsistenciaMusico(dateStr);
    }

    function cargarServicioMusico(dateStr) {
      if (!dateStr) return;
      const content = document.getElementById('musico-service-content');
      content.innerHTML = "<p style='color:var(--text3);font-size:13px;text-align:center;padding:20px;'>Cargando servicio...</p>";

      // Cancelar suscripción anterior y crear nueva (tiempo real)
      if (window._unsubMusicoServicePlan) { window._unsubMusicoServicePlan(); }

      window._unsubMusicoServicePlan = onSnapshot(doc(db, "planes_servicio", dateStr), (snap) => {
        if (!snap.exists()) {
          content.innerHTML = "<p style='color:var(--text3);font-size:13px;text-align:center;padding:20px;'>Aún no hay programación creada para esta fecha.</p>";
          return;
        }
        const data = snap.data();

        // 🔔 Detectar cambios de tono y mostrar notificación
        const cambios = data.cambiosTono || {};
        for (const [songId, info] of Object.entries(cambios)) {
          const prev = (window._prevCambiosTono || {})[songId];
          if (prev && info.timestamp !== prev.timestamp && info.usuario !== activeSessionUser.nombre) {
            const song = cacheSongs.find(s => s.id === songId) || (data.customSongsMetadata && data.customSongsMetadata[songId]);
            showToast(`🎵 ${info.usuario} cambió "${song ? song.nombre : songId}" → ${info.tono}`);
          }
        }
        window._prevCambiosTono = Object.assign({}, cambios);

        // Cache global para que el modal de agregar pueda leer los datos
        window._currentServiceData = data;

        let html = "";

        // Nota del líder
        if (data.nota_adicional && data.nota_adicional.trim() !== "") {
          html += `<div class="card" style="border-color:var(--purple);background:rgba(155,143,255,0.06);margin-bottom:16px;">
          <h4 style="font-size:11px;text-transform:uppercase;color:var(--purple);margin-bottom:8px;">📌 Nota del Líder</h4>
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
              allSelected.push(song);
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

        const renderGroup = (songs, titulo, color, emoji, startNum, type) => {
          let g = `<h4 style="font-size:11px;text-transform:uppercase;color:var(--${color});letter-spacing:0.8px;margin:20px 0 10px;">${emoji} ${titulo}</h4>`;
          if (songs.length === 0) {
            g += `<p style="color:var(--text3); font-size:12px; padding:12px; text-align:center; background:rgba(255,255,255,0.02); border-radius:10px;">Ninguna canción seleccionada en esta sección.</p>`;
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

              g += `<div class="musico-song-card" data-song-id="${s.id}">
              <!-- Extremo Izquierdo: Reordenamiento y Número -->
              <div style="display:flex; align-items:center; gap:8px;">
                <div class="song-order-btns">
                  <button class="order-btn btn-order-up" data-song-id="${s.id}" data-type="${type}">▲</button>
                  <button class="order-btn btn-order-down" data-song-id="${s.id}" data-type="${type}">▼</button>
                </div>
                <div class="song-num" style="min-width: 24px;">${num}</div>
              </div>
              
              <!-- Centro: Info e icono letra -->
              <div class="song-card-info" style="margin-left: 4px;">
                <div class="song-card-name">${s.nombre}</div>
                <div class="song-card-artist">${s.artista}</div>
                ${hasLetra ? `
                  <div>
                    <button class="btn-ver-letra" onclick="window.abrirModalLetraGlobal('${s.id}')">
                      📄 Ver Letra
                    </button>
                  </div>
                ` : ''}
              </div>
              
              <!-- Extremo Derecho: Tono -->
              <div style="display:flex; align-items:center;">
                <div class="song-tone-badge" data-song-id="${s.id}" data-current-tone="${tone}" data-song-name="${safeNombre}" data-date="${dateStr}">${tone}</div>
              </div>
              
              <!-- Botón Quitar en Esquina Superior Derecha -->
              <button class="btn-remove-song-musico btn-remove-song" data-song-id="${s.id}" title="Quitar canción">✕</button>
            </div>`;
            });
          }

          // Agregar botón "+"
          g += `
        <button class="btn-add-song-musico" data-type="${type}" style="width: 100%; background: rgba(${color === 'teal' ? '78,205,196' : '155,143,255'}, 0.08); border: 1px dashed var(--${color}); color: var(--${color}); border-radius: 10px; padding: 12px; font-family: var(--font-body); font-size: 13px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; margin-top: 8px; border-style: dashed;">
          <span>➕</span> Agregar otra canción
        </button>`;

          return g;
        };

        // Adoración primero, luego Alabanza
        html += renderGroup(adoraciones, 'Adoración (Lentas)', 'purple', '🙏', 1, 'adoracion');
        html += renderGroup(alabanzas, 'Alabanza (Rápidas)', 'teal', '🔥', adoraciones.length + 1, 'alabanza');

        content.innerHTML = html;

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
            if (confirm(`⚠️ ATENCIÓN:\nSi quitas "${sName}", se eliminará de la vista de TODO el equipo y tendrás que agregarla de nuevo si te equivocas.\n\n¿Quieres continuar y quitarla?`)) {
              const path = `cancionesSeleccionadas.${songId}`;
              await updateDoc(doc(db, "planes_servicio", dateStr), {
                [path]: false
              });
              showToast(`🗑️ "${sName}" quitada del servicio`);
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

            document.getElementById('musico-add-song-modal').classList.add('active');
          });
        });
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
          pCur.innerHTML = `Estado actual: <span style="color:var(--teal); font-weight:bold;">✅ Voy a Asistir</span>`;
          btnMusicoConfirm.style.opacity = '1';
          btnMusicoConfirm.style.boxShadow = '0 0 15px rgba(78,205,196,0.4)';
          btnMusicoDecline.style.opacity = '0.3';
          btnMusicoDecline.style.boxShadow = 'none';
        } else if (myStat === 'ausente') {
          pCur.innerHTML = `Estado actual: <span style="color:var(--coral); font-weight:bold;">❌ No Disponible</span>`;
          btnMusicoDecline.style.opacity = '1';
          btnMusicoDecline.style.boxShadow = '0 0 15px rgba(255,107,107,0.4)';
          btnMusicoConfirm.style.opacity = '0.3';
          btnMusicoConfirm.style.boxShadow = 'none';
        } else {
          pCur.innerHTML = `Estado actual: <span style="color:var(--text3);">Sin confirmar</span>`;
          btnMusicoConfirm.style.opacity = '1';
          btnMusicoDecline.style.opacity = '1';
          btnMusicoConfirm.style.boxShadow = 'none';
          btnMusicoDecline.style.boxShadow = 'none';
        }

        btnMusicoConfirm.onclick = () => actualizarDisponibilidadMusico(dateStr, 'confirmado');
        btnMusicoDecline.onclick = () => actualizarDisponibilidadMusico(dateStr, 'ausente');

        const tDiv = document.getElementById('musico-team-status');
        let thtml = `<h4 style="font-size: 13px; text-transform: uppercase; color: var(--gold); margin: 0 0 10px;">Estado de tus compañeros</h4><div class="card">`;
        const mlist = cacheMembers.filter(m => m.usuario !== 'admin' && m.usuario !== activeSessionUser.usuario);
        if (mlist.length === 0) {
          thtml += `<p style='color:var(--text3); font-size:13px;'>No hay más miembros registrados.</p>`;
        } else {
          mlist.forEach(m => {
            const st = disp[m.usuario];
            let badge = `<span class="status-badge status-none">Sin Confir.</span>`;
            if (st === 'confirmado') badge = `<span class="status-badge status-si">Confirma</span>`;
            if (st === 'ausente') badge = `<span class="status-badge status-no">No Puede</span>`;

            let avatarClass = "av-gold";
            if (m.instrumento.includes('Batería') || m.instrumento.includes('Percusión')) avatarClass = "av-purple";
            else if (m.instrumento.includes('Voz') || m.instrumento.includes('Corista')) avatarClass = "av-teal";

            thtml += `
          <div class="member-row" style="padding-bottom: 8px; margin-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.05);">
            <div class="avatar ${avatarClass}" style="width: 28px; height: 28px; font-size: 11px;">${m.nombre.substring(0, 2).toUpperCase()}</div>
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
          const mAsig =     // MOTOR DE TRANSPOSICIÓN Y MODAL DE LETRAS
    // ====================================================
    const ACORDES_SOSTENIDOS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const ACORDES_BEMOLES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
    
    // Tonos que convencionalmente usan bemoles en su armadura
    const TONOS_CON_BEMOLES = ['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Dm', 'Gm', 'Cm', 'Fm', 'Bbm', 'Ebm'];

    function getIndexAcorde(acorde) {
      const eq = { 'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#' };
      let b = acorde.replace(/m$/, '');
      if (eq[b]) b = eq[b];
      return ACORDES_SOSTENIDOS.indexOf(b);
    }

    function transponerAcordeUnico(acorde, diff, usarBemoles) {
      const match = acorde.match(/^([A-G][b#]?)(.*)$/);
      if (!match) return acorde;
      let base = match[1];
      let mods = match[2];

      const eq = { 'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#' };
      let baseNormalizada = eq[base] ? eq[base] : base;

      let i = ACORDES_SOSTENIDOS.indexOf(baseNormalizada);
      if (i === -1) return acorde;

      let newI = (i + diff) % 12;
      if (newI < 0) newI += 12;
      
      const escala = usarBemoles ? ACORDES_BEMOLES : ACORDES_SOSTENIDOS;
      let nuevoAcorde = escala[newI];

      if (mods.includes('/')) {
        let parts = mods.split('/');
        let bajoMatch = parts[1].match(/^([A-G][b#]?)(.*)$/);
        if (bajoMatch) {
          let bBase = bajoMatch[1];
          let bBaseNorm = eq[bBase] ? eq[bBase] : bBase;
          let bi = ACORDES_SOSTENIDOS.indexOf(bBaseNorm);
          if (bi !== -1) {
            let bnI = (bi + diff) % 12;
            if (bnI < 0) bnI += 12;
            parts[1] = escala[bnI] + bajoMatch[2];
            mods = parts.join('/');
          }
        }
      }
      return nuevoAcorde + mods;
    }

    function renderizarLetraTranspuesta(texto, tonoBase, tonoDestino) {
      if (!texto) return "";

      let diff = 0;
      let usarBemoles = false;
      if (tonoBase && tonoDestino) {
        const idxBase = getIndexAcorde(tonoBase);
        const idxDest = getIndexAcorde(tonoDestino);
        
        if (idxBase !== -1 && idxDest !== -1) {
          diff = idxDest - idxBase;
        }
        usarBemoles = TONOS_CON_BEMOLES.includes(tonoDestino);
      }

      const lineas = texto.split('\\n');
      return lineas.map(linea => {
        return linea.replace(/([A-G][b#]?(?:m|min|maj|dim|aug|sus|add)?\d?(?:\/[A-G][b#]?)?)/g, (match, p1, offset, fullStr) => {
          const prevChar = offset > 0 ? fullStr[offset - 1] : ' ';
          const nextChar = offset + match.length < fullStr.length ? fullStr[offset + match.length] : ' ';

          if (/[a-zA-Z]/.test(prevChar) || /[a-zA-Z]/.test(nextChar)) {
            return match;
          }

          if (diff === 0 && !usarBemoles) return `<span class="chord-highlight">${match}</span>`;
          let trans = transponerAcordeUnico(match, diff, usarBemoles);
          return `<span class="chord-highlight">${trans}</span>`;
        });
      }).join('\\n');
    }

    window.abrirModalLetraGlobal = function (cancionId) {
      const cache = window._lyricsCache || {};
      let song = cache[cancionId];
      let tonoMostrar = null;

      if (!song) {
        const sGlobal = window.cacheSongs ? window.cacheSongs.find(s => s.id === cancionId) : null;
        if (!sGlobal) return;
        
        let selectedTone = sGlobal.tonoBase;
        const sData = window._currentServiceData || {};
        if (sData.cancionesSeleccionadas && sData.cancionesSeleccionadas[cancionId]) {
          selectedTone = sData.cancionesSeleccionadas[cancionId];
        }
        
        song = {
          nombre: sGlobal.nombre,
          tonoBase: sGlobal.tonoBase,
          tonoServicio: selectedTone,
          letra: sGlobal.letra
        };
      }
      
      tonoMostrar = song.tonoServicio || song.tonoBase;

      document.getElementById('lyrics-modal-title').textContent = song.nombre;
      document.getElementById('lyrics-modal-meta').textContent = `Tono Original: ${song.tonoBase} | Tono del Servicio: ${tonoMostrar}`;
      document.getElementById('lyrics-modal-content').innerHTML = renderizarLetraTranspuesta(song.letra, song.tonoBase, tonoMostrar);
      document.getElementById('lyrics-modal-overlay').classList.add('active');
    };se} | Tono del Servicio: ${tonoMostrar}`;
      document.getElementById('lyrics-modal-content').innerHTML = renderizarLetraTranspuesta(song.letra, song.tonoBase, tonoMostrar);
      document.getElementById('lyrics-modal-overlay').classList.add('active');
    };

    document.getElementById('lyrics-modal-close').addEventListener('click', () => {
      document.getElementById('lyrics-modal-overlay').classList.remove('active');
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
        status.textContent = '✅ Enlace guardado correctamente';
        setTimeout(() => status.textContent = '', 3500);
      } catch (e) { alert('Error al guardar: ' + e.message); }
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
            allSelected.push(song);
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

      if (allSelected.length === 0) {
        cont.innerHTML = `<p style="color: var(--text3); font-size: 13px; text-align: center; padding: 10px;">No hay canciones seleccionadas aún.</p>`;
        return;
      }

      const adoraciones = allSelected.filter(s => s.tipo === 'adoracion');
      const alabanzas = allSelected.filter(s => s.tipo === 'alabanza');

      let html = "";

      const renderAdminGroup = (songs, titulo, color, emoji, startNum, type) => {
        if (songs.length === 0) return "";
        let g = `<h4 style="font-size:11px;text-transform:uppercase;color:var(--${color});letter-spacing:0.8px;margin:12px 0 6px;">${emoji} ${titulo}</h4>`;
        songs.forEach((s, i) => {
          const tone = cancionesSeleccionadas[s.id];
          const num = startNum + i;
          g += `
          <div class="musico-song-card" style="padding: 10px; margin-bottom: 6px; background: var(--bg2);">
            <!-- Extremo Izquierdo: Reordenamiento y Número -->
            <div style="display:flex; align-items:center; gap:8px;">
              <div class="song-order-btns">
                <button class="order-btn btn-admin-order-up" data-song-id="${s.id}" data-type="${type}">▲</button>
                <button class="order-btn btn-admin-order-down" data-song-id="${s.id}" data-type="${type}">▼</button>
              </div>
              <div class="song-num" style="font-size:24px; min-width: 24px;">${num}</div>
            </div>
            
            <!-- Centro: Info -->
            <div class="song-card-info" style="margin-left: 4px;">
              <div class="song-card-name" style="font-size:14px;">${s.nombre}</div>
              <div class="song-card-artist" style="font-size:11px;">${s.artista}</div>
            </div>
            
            <!-- Extremo Derecho: Tono -->
            <div style="display:flex; align-items:center;">
              <div class="tone-indicator" style="font-size:12px; margin-left:auto; margin-right:10px; padding: 4px 10px; cursor:pointer;" onclick="window.abrirTonePickerAdmin('${s.id}', '${tone}', '${s.nombre.replace(/'/g, "\\'")}', '${dateStr}')">${tone}</div>
            </div>
            
            <!-- Botón Quitar en Esquina Superior Derecha -->
            <button class="btn-delete-selected-admin btn-remove-song" data-song-id="${s.id}" title="Quitar canción">✕</button>
          </div>
        `;
        });
        return g;
      };

      html += renderAdminGroup(adoraciones, 'Adoración (Lentas)', 'purple', '🙏', 1, 'adoracion');
      html += renderAdminGroup(alabanzas, 'Alabanza (Rápidas)', 'teal', '🔥', adoraciones.length + 1, 'alabanza');

      cont.innerHTML = html;

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
          if (confirm(`⚠️ ATENCIÓN:\nSi quitas "${sName}", se eliminará de la vista de TODO el equipo y tendrás que agregarla de nuevo si te equivocas.\n\n¿Quieres continuar y quitarla?`)) {
            const path = `cancionesSeleccionadas.${songId}`;
            await updateDoc(doc(db, "planes_servicio", dateStr), {
              [path]: false
            });
            showToast(`🗑️ "${sName}" quitada del servicio`);
          }
        });
      });
    }

    window.abrirTonePickerAdmin = function (songId, currentTone, songName, dateStr) {
      abrirTonePicker(songId, currentTone, songName, dateStr);
    };

    // ====================================================
    // MODAL DE BÚSQUEDA Y ADICIÓN DE CANCIONES
    // ====================================================
    function renderAddSongResults(type, filterText) {
      const resultsCont = document.getElementById('musico-add-song-results');
      if (!resultsCont) return;

      resultsCont.innerHTML = "";

      const dataServicio = window._currentServiceData || {};
      const cancionesSeleccionadas = dataServicio.cancionesSeleccionadas || {};
      const selectedIds = Object.keys(cancionesSeleccionadas).filter(k => cancionesSeleccionadas[k] !== false);

      // Filtrar canciones del tipo correcto que coincidan y no estén ya agregadas
      const filtered = cacheSongs.filter(s => {
        const matchType = (s.tipo || "").toLowerCase() === (type || "").toLowerCase();
        const sNombre = s.nombre || "";
        const sArtista = s.artista || "";
        const matchSearch = sNombre.toLowerCase().includes(filterText) || sArtista.toLowerCase().includes(filterText);
        const notAlreadySelected = !selectedIds.includes(s.id);
        return matchType && matchSearch && notAlreadySelected;
      });

      if (filtered.length === 0) {
        resultsCont.innerHTML = `<p style="color:var(--text3); font-size:12px; text-align:center; padding:15px;">No se encontraron canciones disponibles en la biblioteca.</p>`;
        return;
      }

      filtered.forEach(s => {
        const div = document.createElement('div');
        div.className = "member-row";
        div.style.justifyContent = "space-between";
        div.style.padding = "8px 0";
        div.innerHTML = `
        <div class="member-info">
          <div class="member-name" style="font-size:13px;">${s.nombre}</div>
          <div class="member-role" style="font-size:11px;">${s.artista} | Tono sugerido: <b>${s.tonoBase}</b></div>
        </div>
        <button class="chip chip-teal btn-add-song-select" style="cursor:pointer; border:none; padding:6px 12px; font-weight:600;" data-id="${s.id}">
          ➕ Agregar
        </button>
      `;
        div.querySelector('.btn-add-song-select').addEventListener('click', async () => {
          const songId = s.id;
          const dateStr = window._targetAddSongDate || serviceDateSelect.value || document.getElementById('musico-service-date').value;
          const path = `cancionesSeleccionadas.${songId}`;

          const docRef = doc(db, "planes_servicio", dateStr);
          const currentOrder = dataServicio.ordenCanciones || [];
          await updateDoc(docRef, {
            [path]: s.tonoBase,
            ordenCanciones: [...currentOrder, songId]
          });

          document.getElementById('musico-add-song-modal').classList.remove('active');
          showToast(`🎵 "${s.nombre}" agregada al servicio`);
        });
        resultsCont.appendChild(div);
      });
    }

    // Listener para el buscador en tiempo real del modal
    const modalSearchInput = document.getElementById('musico-add-song-search');
    if (modalSearchInput) {
      modalSearchInput.addEventListener('input', () => {
        const filterText = modalSearchInput.value.toLowerCase().trim();
        renderAddSongResults(window._targetAddSongType, filterText);
      });
    }

    // Cerrar modal
    const btnCloseAddModal = document.getElementById('musico-add-song-close');
    if (btnCloseAddModal) {
      btnCloseAddModal.addEventListener('click', () => {
        document.getElementById('musico-add-song-modal').classList.remove('active');
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
          alert("Por favor escribe el nombre de la canción.");
          return;
        }

        const dateStr = window._targetAddSongDate || serviceDateSelect.value || document.getElementById('musico-service-date').value;
        const customId = 'custom_' + Date.now();

        const docRef = doc(db, "planes_servicio", dateStr);
        const dataServicio = window._currentServiceData || {};
        const currentOrder = dataServicio.ordenCanciones || [];

        await updateDoc(docRef, {
          [`cancionesSeleccionadas.${customId}`]: customTone,
          [`customSongsMetadata.${customId}`]: {
            nombre: customName,
            artista: customArtist,
            tonoBase: customTone,
            tipo: type
          },
          ordenCanciones: [...currentOrder, customId]
        });

        document.getElementById('musico-add-song-modal').classList.remove('active');
        showToast(`🚀 "${customName}" agregada de forma personalizada`);
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

        document.getElementById('musico-add-song-modal').classList.add('active');
      });
    });

    // ====================================================
    // CONFIGURACIÓN Y LISTENER DEL BOTÓN S.O.S (MÚSICOS)
    // ====================================================
    const btnMusicoSos = document.getElementById('btn-musico-sos');
    if (btnMusicoSos) {
      btnMusicoSos.addEventListener('click', () => {
        const userName = activeSessionUser ? activeSessionUser.nombre : "Usuario";
        const msg = `🚨 *${userName}* necesita asistencia (S.O.S) 🚨`;
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

    // REGISTRO DE SERVICE WORKER PARA SOPORTE PWA
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
          .then(reg => console.log('PWA Service Worker registrado:', reg.scope))
          .catch(err => console.error('Error de registro de Service Worker:', err));
      });
    }
  
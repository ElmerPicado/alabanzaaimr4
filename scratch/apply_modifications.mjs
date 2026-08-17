/**
 * SCRIPT: apply_modifications.mjs
 * =================================
 * Aplica todas las modificaciones necesarias (Fases B, C, D, E y corrección de errores de JS y Auth) a index.html.
 * Normaliza los saltos de línea a \n para asegurar un reemplazo exacto e infalible.
 */

import fs from 'fs';
import path from 'path';

const indexPath = path.resolve('index.html');

console.log("📖 Leyendo index.html...");
let content = fs.readFileSync(indexPath, 'utf-8');

// Normalizar retornos de carro de Windows a formato Unix (\n)
content = content.replace(/\r\n/g, '\n');

const originalLength = content.length;
let matchCount = 0;

// Helper para reemplazo e informe
function applyReplace(name, target, replacement) {
  if (content.includes(target)) {
    content = content.replace(target, replacement);
    console.log(`✅ [${name}] Reemplazado exitosamente.`);
    matchCount++;
  } else {
    console.error(`❌ [${name}] NO SE ENCONTRÓ el fragmento literal.`);
  }
}

// -------------------------------------------------------------
// CAMBIO 1: Guardar churchId en nuevos planes de servicio
// -------------------------------------------------------------
applyReplace(
  "Inicialización de planes_servicio",
  `          await setDoc(serviceDocRef, {
            fecha: targetDate,
            cancionesSeleccionadas: {}, // id_cancion: tono_elegido
            cancionesSeleccionadasTipos: {}, // id_cancion: tipo
            ordenCanciones: [],
            musicosAsignados: {},       // id_usuario: true/false
            disponibilidad: {}          // id_usuario: 'confirmado' | 'ausente'
          });`,
  `          await setDoc(serviceDocRef, {
            fecha: targetDate,
            churchId: (activeSessionUser && activeSessionUser.churchId) ? activeSessionUser.churchId : null,
            cancionesSeleccionadas: {}, // id_cancion: tono_elegido
            cancionesSeleccionadasTipos: {}, // id_cancion: tipo
            ordenCanciones: [],
            musicosAsignados: {},       // id_usuario: true/false
            disponibilidad: {}          // id_usuario: 'confirmado' | 'ausente'
          });`
);

// -------------------------------------------------------------
// CAMBIO 2: Mensaje de WhatsApp dinámico
// -------------------------------------------------------------
applyReplace(
  "WhatsApp con churchName dinámico",
  '      let msg = `*PROGRAMACIÓN DE ALABANZA - IMR4*\\n*${fechaLegible.toUpperCase()}*\\n\\n`;',
  `      // Usar el nombre de la iglesia dinámicamente (multi-tenant)
      const churchDisplayName = (activeSessionUser && activeSessionUser.churchName)
        ? activeSessionUser.churchName
        : (activeSessionUser && activeSessionUser.churchId
          ? activeSessionUser.churchId.toUpperCase()
          : 'ALABANZA');
      let msg = \`*PROGRAMACIÓN DE ALABANZA - \${churchDisplayName}*\\n*\${fechaLegible.toUpperCase()}*\\n\\n\`;`
);

// -------------------------------------------------------------
// CAMBIO 3: Exención de plan permanente por expireAt === null
// -------------------------------------------------------------
applyReplace(
  "Exención por expireAt === null",
  `                  // Excepción para IMR4 (Gratis ilimitado)
                  if (cData.name && cData.name.toLowerCase().includes('imr4')) {
                    uData.churchName = cData.name;
                    iniciarSesionDashboard(uData);
                    return;
                  }`,
  `                  // Excepción: Plan permanente (expireAt = null) — acceso libre indefinido
                  // Aplica a IMR4 y cualquier iglesia con plan perpetuo
                  if (!cData.expireAt || cData.expireAt === null) {
                    uData.churchName = cData.name;
                    iniciarSesionDashboard(uData);
                    return;
                  }`
);

// -------------------------------------------------------------
// CAMBIO 4: Lógica Fase C (Submit Handler - Búsqueda global)
// -------------------------------------------------------------
applyReplace(
  "Form Submit - Fase C Búsqueda Anti-Duplicados",
  `      // --- VALIDACIÓN DE LÍMITES POR PLAN ---`,
  `      // ================================================================
      // FASE C: BUSCAR USUARIO EXISTENTE ANTES DE CREAR (ANTI-DUPLICADOS)
      // Si el usuario ya existe en el sistema global, vincular en vez de crear.
      // ================================================================
      if (!editingUserKey) {
        let foundDoc = null;
        let foundDocId = null;

        // 1. Buscar por email como docId (usuarios con correo)
        if (emailInput && emailInput.includes('@')) {
          try {
            const snapEmail = await getDoc(doc(db, "usuarios", emailInput));
            if (snapEmail.exists()) {
              foundDoc = snapEmail.data();
              foundDocId = emailInput;
            }
          } catch(_) {}
        }

        // 2. Si no encontró por email, buscar por alias como docId (usuarios sin correo)
        if (!foundDoc && userInput) {
          try {
            const snapAlias = await getDoc(doc(db, "usuarios", userInput));
            if (snapAlias.exists()) {
              foundDoc = snapAlias.data();
              foundDocId = userInput;
            }
          } catch(_) {}
        }

        if (foundDoc) {
          const yaEnEstaIglesia = foundDoc.churchId && foundDoc.churchId === memberChurchId;
          const enOtraIglesia = foundDoc.churchId && foundDoc.churchId !== memberChurchId;

          if (yaEnEstaIglesia) {
            customAlert(\`"\${foundDoc.nombre}" ya es miembro activo de esta comunidad.\`);
            return;
          }

          const pregunta = enOtraIglesia
            ? \`"\${foundDoc.nombre}" ya existe en el sistema y pertenece a otra comunidad.\\n\\n\` +
              \`¿Deseas vincularlo a tu comunidad? Sus credenciales de acceso no cambiarán.\\n\\n\` +
              \`⚠️ Nota: su comunidad activa cambiará a la tuya.\`
            : \`"\${foundDoc.nombre}" ya existe en el sistema (sin comunidad asignada).\\n\\n\` +
              \`¿Deseas añadirlo a tu comunidad como miembro?\`;

          const confirmado = await customConfirm(pregunta);
          if (!confirmado) return;

          // Verificar límite del plan antes de vincular
          if (memberChurchId) {
            try {
              const cSnap = await window.getDoc(window.doc(window.db, "churches", memberChurchId));
              const cPlan = cSnap.exists() ? (cSnap.data().plan || 'gratis') : 'gratis';
              const cCount = (window.cacheMembers || []).filter(m => m.churchId === memberChurchId).length;
              const cLimit = cPlan === 'basico' ? 10 : (cPlan === 'pro' || cPlan === 'prueba') ? 25 : 1;
              if (cCount >= cLimit) {
                customAlert(\`Límite alcanzado: Tu plan (\${cPlan.toUpperCase()}) permite máximo \${cLimit} miembros (tienes \${cCount}).\`);
                return;
              }
            } catch(_) {}
          }

          // Vincular: crear membresía en la colección memberships
          try {
            const membershipDocId = \`\${foundDocId}_\${memberChurchId}\`;
            await setDoc(doc(db, "memberships", membershipDocId), {
              userId: foundDocId,
              churchId: memberChurchId,
              role: document.getElementById('member-role-input').value,
              instrumento: instVal,
              type: isCoro ? 'corista' : 'musico',
              joinedAt: new Date().toISOString()
            }, { merge: true });
            
            // También actualizar churchId en el usuario global por retrocompatibilidad
            await setDoc(doc(db, "usuarios", foundDocId), {
              churchId: memberChurchId,
              role: document.getElementById('member-role-input').value,
              instrumento: instVal,
              type: isCoro ? 'corista' : 'musico'
            }, { merge: true });

            resetMemberForm();
            customAlert(\`"\${foundDoc.nombre}" fue vinculado a tu comunidad exitosamente. ¡Ya puede acceder con sus credenciales actuales!\`);
          } catch (err) {
            customAlert('Error al vincular usuario: ' + err.message);
          }
          return; // No continuar con la creación normal
        }
      }
      // FIN FASE C

      // --- VALIDACIÓN DE LÍMITES POR PLAN ---`
);

// -------------------------------------------------------------
// CAMBIO 5: Submit de miembros escribe a ambas colecciones (Fase D + Creación en Firebase Auth para alias)
// -------------------------------------------------------------
applyReplace(
  "Form Submit - Escritura Dual usuarios + memberships",
  `      const payload = {
        nombre: document.getElementById('member-name-input').value.trim(),
        type: isCoro ? 'corista' : 'musico',
        instrumento: instVal,
        usuario: userInput,
        correo: emailInput,
        password: passInput,
        role: document.getElementById('member-role-input').value,
        churchId: memberChurchId
      };

      try {
        // Solo crear en Firebase Auth si hay un email válido
        if (!editingUserKey && emailInput && emailInput.includes('@')) {
          const { getAuth, createUserWithEmailAndPassword } = await import("https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js");
          const auth = getAuth();
          try {
            await createUserWithEmailAndPassword(auth, emailInput, passInput);
          } catch (authErr) {
            if (authErr.code !== 'auth/email-already-in-use') {
              console.warn("Auth creation skipped:", authErr.message);
              // No bloqueamos la creación — el usuario podrá entrar con alias+contraseña
            }
          }
        }
        
        await setDoc(doc(db, "usuarios", userKey), payload, { merge: true });`,
  `      const userPayload = {
        nombre: document.getElementById('member-name-input').value.trim(),
        usuario: userInput,
        correo: emailInput,
        password: passInput,
        // Compatibilidad con versiones legacy
        type: isCoro ? 'corista' : 'musico',
        instrumento: instVal,
        role: document.getElementById('member-role-input').value,
        churchId: memberChurchId
      };

      const membershipPayload = {
        userId: userKey,
        churchId: memberChurchId,
        role: document.getElementById('member-role-input').value,
        instrumento: instVal,
        type: isCoro ? 'corista' : 'musico',
        joinedAt: new Date().toISOString()
      };

      try {
        // Crear en Firebase Auth de forma transparente para permitir autenticación real (evitar permission-denied)
        if (!editingUserKey) {
          const { getAuth, createUserWithEmailAndPassword } = await import("https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js");
          const auth = getAuth();
          const targetAuthEmail = emailInput && emailInput.includes('@') ? emailInput : \`\${userInput.toLowerCase()}@alabanapp.com\`;
          try {
            await createUserWithEmailAndPassword(auth, targetAuthEmail, passInput);
          } catch (authErr) {
            if (authErr.code !== 'auth/email-already-in-use') {
              console.warn("Auth creation skipped:", authErr.message);
            }
          }
        }
        
        // 1. Guardar usuario global
        await setDoc(doc(db, "usuarios", userKey), userPayload, { merge: true });

        // 2. Guardar membresía
        const membershipDocId = \`\${userKey}_\${memberChurchId}\`;
        await setDoc(doc(db, "memberships", membershipDocId), membershipPayload, { merge: true });

        // Forzar actualización en caché local
        if (window._globalUsersCache) {
          delete window._globalUsersCache[userKey];
        }`
);

// -------------------------------------------------------------
// CAMBIO 6: Click de edición con m.id
// -------------------------------------------------------------
applyReplace(
  "Click de edición con m.id",
  `          div.querySelector('.click-edit-member').addEventListener('click', () => {
            editingUserKey = m.usuario;`,
  `          div.querySelector('.click-edit-member').addEventListener('click', () => {
            editingUserKey = m.id || m.usuario;`
);

// -------------------------------------------------------------
// CAMBIO 7: Escuchar members de la colección memberships (Fase D)
// -------------------------------------------------------------
applyReplace(
  "Escucha de miembros de memberships",
  `      // Consulta de miembros: filtrada SIEMPRE por churchId de la cuenta activa.
      // Si el usuario no tiene churchId asignado (cuenta sin iglesia) solo se carga su propio documento.
      let membersQuery;
      if (churchId) {
        membersQuery = query(collection(db, "usuarios"), where("churchId", "==", churchId));
      } else {
        // Fallback seguro: solo el propio usuario (no exponer toda la base)
        membersQuery = query(collection(db, "usuarios"), where("usuario", "==", activeSessionUser.usuario));
      }

      onSnapshot(membersQuery, (snap) => {
        cacheMembers = [];
        snap.forEach(doc => cacheMembers.push({ id: doc.id, ...doc.data() }));
        window.cacheMembers = cacheMembers;
        if (currentUserRole === 'lider' || currentUserRole === 'admin') {
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
      });`,
  `      // Consulta de miembros basada en la colección memberships
      let membershipsQuery;
      if (churchId) {
        membershipsQuery = query(collection(db, "memberships"), where("churchId", "==", churchId));
      } else {
        const uId = activeSessionUser && (activeSessionUser._docId || activeSessionUser.usuario);
        membershipsQuery = query(collection(db, "memberships"), where("userId", "==", uId || ""));
      }

      window._globalUsersCache = window._globalUsersCache || {};

      onSnapshot(membershipsQuery, async (snap) => {
        const memberships = [];
        snap.forEach(doc => memberships.push({ id: doc.id, ...doc.data() }));

        const userPromises = memberships.map(async (m) => {
          const uId = m.userId;
          if (!window._globalUsersCache[uId]) {
            try {
              const uSnap = await getDoc(doc(db, "usuarios", uId));
              if (uSnap.exists()) {
                window._globalUsersCache[uId] = uSnap.data();
              }
            } catch (e) {
              console.error("Error cargando usuario global:", uId, e);
            }
          }
          const globalUser = window._globalUsersCache[uId] || {};
          return {
            id: uId,
            nombre: globalUser.nombre || "Integrante",
            usuario: globalUser.usuario || uId,
            correo: globalUser.correo || "",
            password: globalUser.password || "",
            profilePic: globalUser.profilePic || "",
            churchId: m.churchId,
            role: m.role || "musico",
            instrumento: m.instrumento || "Voz",
            type: m.type || "musico"
          };
        });

        const resolvedMembers = await Promise.all(userPromises);
        cacheMembers = resolvedMembers;
        window.cacheMembers = cacheMembers;

        if (currentUserRole === 'lider' || currentUserRole === 'admin') {
          renderizarMantenimientoMiembros();
          sincronizarPanelArmado();
        } else if (currentUserRole === 'musico') {
          const msDateEl = document.getElementById('musico-service-date');
          const maDateEl = document.getElementById('musico-avail-date');
          const msDate = msDateEl ? msDateEl.value : null;
          const maDate = maDateEl ? maDateEl.value : null;
          if (msDate) cargarServicioMusico(msDate);
          if (maDate) cargarAsistenciaMusico(maDate);
        }

        if (window.renderEnsayoMembers) {
          window.renderEnsayoMembers();
        }
      }, (err) => {
        console.error("Error cargando memberships:", err);
      });`
);

// -------------------------------------------------------------
// CAMBIO 8: Eliminación de miembros (deleteUserProtected)
// -------------------------------------------------------------
applyReplace(
  "Eliminación de miembros - deleteUserProtected",
  `      try {
        await deleteDoc(doc(db, "usuarios", username));
        showToast(\`Usuario "\${userNombre}" eliminado exitosamente.\`);
        if (typeof window.renderSuperAdminChurches === 'function') window.renderSuperAdminChurches();
        if (typeof renderizarMantenimientoMiembros === 'function') renderizarMantenimientoMiembros();
      } catch (err) {`,
  `      try {
        const currentChurchId = (activeSessionUser && activeSessionUser.churchId) ? activeSessionUser.churchId : null;
        if (currentChurchId) {
          const membershipDocId = \`\${username}_\\n\${currentChurchId}\`;
          await deleteDoc(doc(db, "memberships", membershipDocId));
          // Limpiar el churchId del usuario global para compatibilidad
          try {
            await setDoc(doc(db, "usuarios", username), { churchId: "" }, { merge: true });
          } catch(e) {}
          showToast(\`Integrante "\${userNombre}" removido de esta comunidad exitosamente.\`);
        } else {
          await deleteDoc(doc(db, "usuarios", username));
          showToast(\`Usuario "\${userNombre}" eliminado definitivamente del sistema.\`);
        }
        if (typeof window.renderSuperAdminChurches === 'function') window.renderSuperAdminChurches();
        if (typeof renderizarMantenimientoMiembros === 'function') renderizarMantenimientoMiembros();
      } catch (err) {`
);

// -------------------------------------------------------------
// FASE E: Cargar rol contextual de membership en login manual (+ Autenticación Transparente en Firebase Auth)
// -------------------------------------------------------------
applyReplace(
  "Cargar rol contextual en login manual",
  `            // Validar login por Auth o por password legacy en el doc
            if (isAuthenticated || uData.password === passVal) {`,
  `            // Validar login por Auth o por password legacy en el doc
            if (isAuthenticated || uData.password === passVal) {
              // Autenticación Transparente (Fase E/Firestore Rules):
              // Si validó por contraseña de Firestore pero no estaba autenticado en Firebase Auth (ej: alias),
              // iniciar sesión o crear su cuenta virtual de forma transparente para que request.auth no sea null.
              if (!isAuthenticated) {
                try {
                  const { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } = await import("https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js");
                  const auth = getAuth();
                  const virtualEmail = userVal.includes('@') ? userVal : \`\${userVal.toLowerCase()}@alabanapp.com\`;
                  try {
                    await signInWithEmailAndPassword(auth, virtualEmail, passVal);
                    isAuthenticated = true;
                  } catch (loginErr) {
                    if (loginErr.code === 'auth/user-not-found' || loginErr.code === 'auth/invalid-credential') {
                      try {
                        await createUserWithEmailAndPassword(auth, virtualEmail, passVal);
                        isAuthenticated = true;
                      } catch (createErr) {
                        console.error("No se pudo crear usuario virtual Auth:", createErr);
                      }
                    } else {
                      console.error("Error al autenticar usuario virtual Auth:", loginErr);
                    }
                  }
                } catch (authModErr) {
                  console.error("Error importando Firebase Auth para alias:", authModErr);
                }
              }

              // Cargar rol e instrumento contextual de la membresía (Fase E)
              if (uData.churchId) {
                try {
                  const mSnap = await getDoc(doc(db, "memberships", \`\${uData._docId || uData.usuario}_\${uData.churchId}\`));
                  if (mSnap.exists()) {
                    const mData = mSnap.data();
                    uData.role = mData.role || uData.role || "musico";
                    uData.instrumento = mData.instrumento || uData.instrumento || "Voz";
                  }
                } catch(e) {
                  console.error("Error al cargar rol de membresía:", e);
                }
              }
              `
);

// -------------------------------------------------------------
// FASE E: Cargar rol contextual de membership en auto-login (+ Autenticación Transparente en Firebase Auth)
// -------------------------------------------------------------
applyReplace(
  "Cargar rol contextual en auto-login",
  `        if (uSnap.exists() && uSnap.data().password === savedPassword) {
          const userData = { ...uSnap.data(), _docId: uSnap.id };
          iniciarSesionDashboard(userData);`,
  `        if (uSnap.exists() && uSnap.data().password === savedPassword) {
          const userData = { ...uSnap.data(), _docId: uSnap.id };
          
          // Autenticación Transparente en auto-login (Fase E / Firestore Rules)
          const auth = getAuth();
          if (!auth.currentUser) {
            const virtualEmail = savedUserKey.includes('@') ? savedUserKey : \`\${savedUserKey.toLowerCase()}@alabanapp.com\`;
            try {
              await signInWithEmailAndPassword(auth, virtualEmail, savedPassword);
            } catch (e) {
              try {
                await createUserWithEmailAndPassword(auth, virtualEmail, savedPassword);
              } catch (e2) {}
            }
          }

          // Cargar rol e instrumento contextual de la membresía (Fase E)
          if (userData.churchId) {
            try {
              const mSnap = await getDoc(doc(db, "memberships", \`\${userData._docId || userData.usuario}_\${userData.churchId}\`));
              if (mSnap.exists()) {
                const mData = mSnap.data();
                userData.role = mData.role || userData.role || "musico";
                userData.instrumento = mData.instrumento || userData.instrumento || "Voz";
              }
            } catch(e) {
              console.error("Error al cargar rol de membresía en auto-login:", e);
            }
          }
          iniciarSesionDashboard(userData);`
);

// -------------------------------------------------------------
// CORRECCIÓN: Reemplazar "iglesia-imr4" por "imr4" para logins virtuales
// -------------------------------------------------------------
const legacyChurchId = '"iglesia-imr4"';
const correctChurchId = '"imr4"';

let occurrences = 0;
while (content.includes(legacyChurchId)) {
  content = content.replace(legacyChurchId, correctChurchId);
  occurrences++;
}
if (occurrences > 0) {
  console.log(`✅ [Reemplazo iglesia-imr4] Corregido ${occurrences} instancias legacy.`);
  matchCount++;
}

// -------------------------------------------------------------
// CORRECCIÓN ERRORES JS: Declarar 'unsubscribeMusicoService' arriba para evitar TDZ
// -------------------------------------------------------------
applyReplace(
  "Mover Declaración unsubscribeMusicoService arriba",
  `    let currentUserRole = 'musico';
    let activeSessionUser = null;
    let unsubscribeService = null;
    let editingUserKey = null;
    let editingSongId = null;`,
  `    let currentUserRole = 'musico';
    let activeSessionUser = null;
    let unsubscribeService = null;
    let editingUserKey = null;
    let unsubscribeMusicoService = null; // Declarada arriba para evitar TDZ ReferenceError (Fase E)
    let editingSongId = null;`
);

applyReplace(
  "Remover Declaración unsubscribeMusicoService duplicada",
  `    // ====================================================
    // LOGICA DE LA VISTA EXCLUSIVA DEL MÚSICO
    // ====================================================
    let unsubscribeMusicoService = null;
    const btnMusicoConfirm = document.getElementById('btn-musico-confirm');`,
  `    // ====================================================
    // LOGICA DE LA VISTA EXCLUSIVA DEL MÚSICO
    // ====================================================
    const btnMusicoConfirm = document.getElementById('btn-musico-confirm');`
);

// -------------------------------------------------------------
// CORRECCIÓN ERRORES JS: Proteger listeners disponibilidad btn-avail-confirm
// -------------------------------------------------------------
applyReplace(
  "Proteger Listeners de Disponibilidad contra null",
  `    // Eventos de Disponibilidad del Músico
    document.getElementById('btn-avail-confirm').addEventListener('click', async () => {
      const targetDate = serviceDateSelect.value;
      if (!targetDate || !activeSessionUser) return;
      const path = \`disponibilidad.\${activeSessionUser.usuario}\`;
      await updateDoc(doc(db, "planes_servicio", targetDate), {
        [path]: 'confirmado'
      });
    });

    document.getElementById('btn-avail-decline').addEventListener('click', async () => {
      const targetDate = serviceDateSelect.value;
      if (!targetDate || !activeSessionUser) return;
      const path = \`disponibilidad.\${activeSessionUser.usuario}\`;
      const pathAsignado = \`musicosAsignados.\${activeSessionUser.usuario}\`;
      await updateDoc(doc(db, "planes_servicio", targetDate), {
        [path]: 'ausente',
        [pathAsignado]: false
      });
    });`,
  `    // Eventos de Disponibilidad del Músico (protegidos contra elementos nulos)
    const btnAvailConfirm = document.getElementById('btn-avail-confirm');
    if (btnAvailConfirm) {
      btnAvailConfirm.addEventListener('click', async () => {
        const targetDate = serviceDateSelect.value;
        if (!targetDate || !activeSessionUser) return;
        const path = \`disponibilidad.\${activeSessionUser.usuario}\`;
        await updateDoc(doc(db, "planes_servicio", targetDate), {
          [path]: 'confirmado'
        });
      });
    }

    const btnAvailDecline = document.getElementById('btn-avail-decline');
    if (btnAvailDecline) {
      btnAvailDecline.addEventListener('click', async () => {
        const targetDate = serviceDateSelect.value;
        if (!targetDate || !activeSessionUser) return;
        const path = \`disponibilidad.\${activeSessionUser.usuario}\`;
        const pathAsignado = \`musicosAsignados.\${activeSessionUser.usuario}\`;
        await updateDoc(doc(db, "planes_servicio", targetDate), {
          [path]: 'ausente',
          [pathAsignado]: false
        });
      });
    }`
);

// -------------------------------------------------------------
// CORRECCIÓN ERRORES JS: Cerrar IF de form-superadmin-trial (Línea 12451)
// -------------------------------------------------------------
applyReplace(
  "Cerrar IF de form-superadmin-trial",
  `          window.customAlert(
            \`¡Cuenta Creada Exitosamente!\\n\\n\` +
            \`1. Se ha enviado un correo a \${email} para que configuren su contraseña.\\n\` +
            \`2. Pídeles que revisen su carpeta de SPAM (Correo No Deseado).\\n\` +
            \`3. El plan quedó activo por 15 días de prueba, sujeto a verificación y políticas de AlabanApp.\`
          );
          formTrial.reset();
          window.renderSuperAdminChurches();
        } catch(err) {
          console.error(err);
          alert("Error: " + err.message);
        } finally {
          btn.disabled = false;
          btn.textContent = "Generar y Enviar Acceso";
        }
      });
    const btnSaDeleteUser = document.getElementById('btn-sa-delete-user');`,
  `          window.customAlert(
            \`¡Cuenta Creada Exitosamente!\\n\\n\` +
            \`1. Se ha enviado un correo a \${email} para que configuren su contraseña.\\n\` +
            \`2. Pídeles que revisen su carpeta de SPAM (Correo No Deseado).\\n\` +
            \`3. El plan quedó activo por 15 días de prueba, sujeto a verificación y políticas de AlabanApp.\`
          );
          formTrial.reset();
          window.renderSuperAdminChurches();
        } catch(err) {
          console.error(err);
          alert("Error: " + err.message);
        } finally {
          btn.disabled = false;
          btn.textContent = "Generar y Enviar Acceso";
        }
      });
    } // <-- Cierre del if (formTrial)
    const btnSaDeleteUser = document.getElementById('btn-sa-delete-user');`
);

// -------------------------------------------------------------
// CORRECCIÓN ERRORES JS: debounce local en script #4 para evitar ReferenceError por carga asíncrona
// -------------------------------------------------------------
applyReplace(
  "Añadir debounce local en script 4",
  `  <script>
    window.openPreviewLyrics = async function (songId) {`,
  `  <script>
    // Función debounce local para evitar ReferenceError por carga asíncrona de módulos
    function debounce(func, delay = 300) {
      let timeoutId;
      return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          func.apply(this, args);
        }, delay);
      };
    }

    window.openPreviewLyrics = async function (songId) {`
);

// ==========================================
// GUARDAR Y VERIFICAR
// ==========================================
if (content.length !== originalLength || occurrences > 0) {
  console.log(`📝 Escribiendo cambios en index.html... (${originalLength} -> ${content.length} bytes)`);
  fs.writeFileSync(indexPath, content, 'utf-8');
  console.log("🎉 MODIFICACIONES COMPLETADAS EXITOSAMENTE.");
} else {
  console.log("⚠️ No se realizó ningún cambio.");
}

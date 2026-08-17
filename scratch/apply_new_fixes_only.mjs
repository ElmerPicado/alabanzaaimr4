/**
 * SCRIPT: apply_new_fixes_only.mjs
 * ==================================
 * Aplica todas las correcciones nuevas de JavaScript, Auth, e iglesia-imr4
 * sobre la versión limpia comitada del repositorio de index.html.
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
// CAMBIO 1: Pre-convertir alias en el login principal para evitar deadlock
// -------------------------------------------------------------
applyReplace(
  "Pre-convertir alias en el login principal",
  `          // Primero intentamos Auth de Firebase v10
          let isAuthenticated = false;
          let firebaseUser = null;
          try {
            const auth = getAuth();
            const userCredential = await signInWithEmailAndPassword(auth, userVal, passVal);
            isAuthenticated = true;
            firebaseUser = userCredential.user;
          } catch(authErr) {
            // Fallback silencioso a la lógica de contraseña en el documento
          }
          
          // ID para buscar en \`usuarios\`
          // Los documentos se guardan con el email como ID (ej: "joselinedelb@gmail.com")
          // Si autenticado con Firebase, buscamos primero por email exacto, luego por alias (usuario field)
          let userIdToSearch = userVal;
          if (isAuthenticated && firebaseUser) {
            userIdToSearch = firebaseUser.email; // usar email exacto, no stripear
          }`,
  `          // Primero intentamos Auth de Firebase v10
          let isAuthenticated = false;
          let firebaseUser = null;
          
          // Pre-convertir alias a email virtual y asegurar clave >= 6 (Fase E / Evitar Deadlock de Permisos)
          let loginEmail = userVal;
          if (loginEmail && !loginEmail.includes('@')) {
            loginEmail = \`\${loginEmail.toLowerCase()}@alabanapp.com\`;
          }
          let loginPassword = passVal;
          if (loginPassword && loginPassword.length < 6) {
            loginPassword = loginPassword.padEnd(6, '0');
          }

          try {
            const auth = getAuth();
            const userCredential = await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
            isAuthenticated = true;
            firebaseUser = userCredential.user;
          } catch(authErr) {
            // Fallback silencioso a la lógica de contraseña en el documento
          }
          
          // ID para buscar en \`usuarios\`
          let userIdToSearch = userVal;
          if (isAuthenticated && firebaseUser) {
            if (firebaseUser.email.endsWith('@alabanapp.com')) {
              userIdToSearch = firebaseUser.email.split('@')[0];
            } else {
              userIdToSearch = firebaseUser.email;
            }
          }`
);

// -------------------------------------------------------------
// CAMBIO 2: Limpiar Autenticación Transparente redundante del login manual
// -------------------------------------------------------------
applyReplace(
  "Limpiar Auth redundante en login manual",
  `            // Validar login por Auth o por password legacy en el doc
            if (isAuthenticated || uData.password === passVal) {
              // Autenticación Transparente en el login manual (Fase E / Firestore Rules)
              if (!isAuthenticated) {
                try {
                  const { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } = await import("https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js");
                  const auth = getAuth();
                  const virtualEmail = userVal.includes('@') ? userVal : \`\${userVal.toLowerCase()}@alabanapp.com\`;
                  let virtualPassword = passVal;
                  if (virtualPassword && virtualPassword.length < 6) {
                    virtualPassword = virtualPassword.padEnd(6, '0');
                  }
                  try {
                    await signInWithEmailAndPassword(auth, virtualEmail, virtualPassword);
                    isAuthenticated = true;
                  } catch (loginErr) {
                    if (loginErr.code === 'auth/user-not-found' || loginErr.code === 'auth/invalid-credential') {
                      try {
                        await createUserWithEmailAndPassword(auth, virtualEmail, virtualPassword);
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

              // Cargar rol e instrumento contextual de la membresía (Fase E)`,
  `            // Validar login por Auth o por password legacy en el doc
            if (isAuthenticated || uData.password === passVal) {
              // Cargar rol e instrumento contextual de la membresía (Fase E)`
);

// -------------------------------------------------------------
// CAMBIO 3: Pre-autenticar en intentarAutoLogin antes de consultar Firestore
// -------------------------------------------------------------
applyReplace(
  "Pre-autenticar en intentarAutoLogin",
  `      // 2. Verificar en Firestore en tiempo real
      try {
        const uSnap = await getDoc(doc(db, "usuarios", savedUserKey));
        if (uSnap.exists() && uSnap.data().password === savedPassword) {
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
          iniciarSesionDashboard(userData);
        } else {`,
  `      // 2. Autenticación Transparente en Firebase Auth primero (Evita deadlock de permisos en Firestore)
      let isAuthenticated = false;
      let firebaseUser = null;
      
      let loginEmail = savedUserKey;
      if (loginEmail && !loginEmail.includes('@')) {
        loginEmail = \`\${loginEmail.toLowerCase()}@alabanapp.com\`;
      }
      let loginPassword = savedPassword;
      if (loginPassword && loginPassword.length < 6) {
        loginPassword = loginPassword.padEnd(6, '0');
      }

      try {
        const auth = getAuth();
        const userCredential = await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
        isAuthenticated = true;
        firebaseUser = userCredential.user;
      } catch (e) {
        console.warn("Auto-login Auth pre-auth failed:", e.message);
      }

      // 3. Verificar en Firestore en tiempo real
      try {
        let userIdToSearch = savedUserKey;
        if (isAuthenticated && firebaseUser) {
          if (firebaseUser.email.endsWith('@alabanapp.com')) {
            userIdToSearch = firebaseUser.email.split('@')[0];
          } else {
            userIdToSearch = firebaseUser.email;
          }
        }

        const uSnap = await getDoc(doc(db, "usuarios", userIdToSearch));
        if (uSnap.exists() && uSnap.data().password === savedPassword) {
          const userData = { ...uSnap.data(), _docId: uSnap.id };

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
          iniciarSesionDashboard(userData);
        } else {`
);

// -------------------------------------------------------------
// CAMBIO 4: Reemplazar "iglesia-imr4" por "imr4" para logins virtuales
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

// ==========================================
// GUARDAR Y VERIFICAR
// ==========================================
if (content.length !== originalLength || occurrences > 0) {
  console.log(`📝 Escribiendo cambios en index.html... (${originalLength} -> ${content.length} bytes)`);
  fs.writeFileSync(indexPath, content, 'utf-8');
  console.log("🎉 NUEVOS CAMBIOS APLICADOS CON ÉXITO.");
} else {
  console.log("⚠️ No se realizó ningún cambio.");
}

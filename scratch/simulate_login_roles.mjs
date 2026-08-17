/**
 * SIMULACIÓN: Diagnosticar roles de login de epicado e imr4
 * ==========================================================
 * Simula el flujo del frontend al recuperar el usuario de Firestore y su membership
 * para ver qué rol final se asigna y en qué rama del IF cae.
 */

import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDjA2d8zn02Iu9Nm-Jy2mVw6GgbjeKUEJ4",
  authDomain: "alabanza-d2185.firebaseapp.com",
  projectId: "alabanza-d2185",
  storageBucket: "alabanza-d2185.firebasestorage.app",
  messagingSenderId: "696632316366",
  appId: "1:696632316366:web:65f7c3dc52cda226c4f346"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function checkUser(username) {
  console.log(`\n🔎 Diagnosticando usuario: "${username}"`);
  
  // 1. Cargar usuario de Firestore
  const uSnap = await getDoc(doc(db, "usuarios", username));
  if (!uSnap.exists()) {
    console.error(`❌ El usuario "${username}" no existe en Firestore (usuarios).`);
    return;
  }
  const uData = { ...uSnap.data(), _docId: uSnap.id };
  console.log(`   Firestore usuarios.role:        "${uData.role}"`);
  console.log(`   Firestore usuarios.churchId:    "${uData.churchId}"`);

  // 2. Cargar membership
  if (uData.churchId) {
    const mDocId = `${uData._docId || uData.usuario}_${uData.churchId}`;
    const mSnap = await getDoc(doc(db, "memberships", mDocId));
    if (mSnap.exists()) {
      const mData = mSnap.data();
      console.log(`   Firestore memberships.role:    "${mData.role}"`);
      
      // Simular sobreescritura de rol
      uData.role = mData.role || uData.role || "musico";
      console.log(`   Rol final simulado (uData.role): "${uData.role}"`);
    } else {
      console.error(`❌ No existe documento de membership en "memberships/${mDocId}"!`);
    }
  }

  // Simular flujo IF de iniciarSesionDashboard
  const currentUserRole = uData.role;
  console.log(`   Simulando iniciarSesionDashboard con rol final "${currentUserRole}":`);
  if (currentUserRole === 'superadmin') {
    console.log("   ➡️ Cae en: SUPERADMIN");
  } else if (currentUserRole === 'lider' || currentUserRole === 'admin') {
    console.log("   ➡️ Cae en: LIDER / ADMIN (Muestra botón de Panel) ✅");
  } else {
    console.log("   ➡️ Cae en: MÚSICO ESTRICTO (Oculta botón de Panel) ❌");
  }
}

async function run() {
  await signInWithEmailAndPassword(auth, "epicadomiranda@gmail.com", "Pd030819");
  
  await checkUser("imr4");
  await checkUser("epicado");
  
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });

/**
 * SCRIPT: Leer las Firestore Security Rules actuales
 * Requiere firebase-admin con service account, o simplemente
 * hacemos el diagnóstico desde la SDK de cliente para saber
 * si las queries están siendo bloqueadas.
 *
 * Este script verifica:
 * 1. Si un usuario autenticado puede leer la colección 'usuarios'
 * 2. Si la query WHERE churchId == 'imr4' devuelve resultados
 * 3. Simula exactamente el flujo de escucharBaseDatosGlobal()
 */

import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc
} from "firebase/firestore";

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

const sep = "─".repeat(60);

async function checkFirestoreAccess() {
  console.log("\n🔍 DIAGNÓSTICO DE FIRESTORE RULES Y QUERIES\n");

  // === PRUEBA 1: Login como epicado (usuario sin correo - auth heredado) ===
  console.log(`${sep}`);
  console.log("PRUEBA 1: Login como superadmin (con Firebase Auth)");
  console.log(`${sep}`);

  try {
    await signInWithEmailAndPassword(auth, "epicadomiranda@gmail.com", "Pd030819");
    console.log("✅ Firebase Auth: OK (epicadomiranda@gmail.com autenticado)\n");
  } catch (e) {
    console.error("❌ Error de auth:", e.message);
    process.exit(1);
  }

  // === PRUEBA 2: Query directa de usuarios WHERE churchId == "imr4" ===
  console.log(`${sep}`);
  console.log("PRUEBA 2: query(usuarios, where('churchId','==','imr4'))");
  console.log(`${sep}`);
  try {
    const q = query(collection(db, "usuarios"), where("churchId", "==", "imr4"));
    const snap = await getDocs(q);
    console.log(`✅ Query OK. Documentos retornados: ${snap.docs.length}`);
    snap.forEach(d => {
      console.log(`   - "${d.id}" | nombre: ${d.data().nombre} | role: ${d.data().role}`);
    });
  } catch (e) {
    console.error("❌ QUERY BLOQUEADA por Firestore Rules:", e.message);
    console.error("   → Código de error:", e.code);
  }

  // === PRUEBA 3: Leer colección entera de usuarios (sin filtro) ===
  console.log(`\n${sep}`);
  console.log("PRUEBA 3: getDocs(collection(db, 'usuarios')) — sin filtro");
  console.log(`${sep}`);
  try {
    const snap = await getDocs(collection(db, "usuarios"));
    console.log(`✅ Lectura sin filtro OK. Total docs: ${snap.docs.length}`);
  } catch (e) {
    console.error("❌ LECTURA BLOQUEADA por Firestore Rules:", e.message);
    console.error("   → Código de error:", e.code);
  }

  // === PRUEBA 4: Leer doc individual de un usuario sin correo ===
  console.log(`\n${sep}`);
  console.log("PRUEBA 4: getDoc(usuarios/epicado) — usuario sin correo");
  console.log(`${sep}`);
  try {
    const snap = await getDoc(doc(db, "usuarios", "epicado"));
    if (snap.exists()) {
      const d = snap.data();
      console.log(`✅ Doc individual OK.`);
      console.log(`   churchId: ${d.churchId}`);
      console.log(`   role: ${d.role}`);
      console.log(`   nombre: ${d.nombre}`);
    } else {
      console.log("⚠️  El documento 'epicado' NO existe.");
    }
  } catch (e) {
    console.error("❌ LECTURA INDIVIDUAL BLOQUEADA:", e.message);
  }

  // === PRUEBA 5: Leer colección 'churches' ===
  console.log(`\n${sep}`);
  console.log("PRUEBA 5: getDocs(collection(db, 'churches'))");
  console.log(`${sep}`);
  try {
    const snap = await getDocs(collection(db, "churches"));
    console.log(`✅ Churches OK. Total docs: ${snap.docs.length}`);
  } catch (e) {
    console.error("❌ CHURCHES BLOQUEADA:", e.message, e.code);
  }

  // === PRUEBA 6: Leer colección 'planes_servicio' ===
  console.log(`\n${sep}`);
  console.log("PRUEBA 6: getDocs(collection(db, 'planes_servicio'))");
  console.log(`${sep}`);
  try {
    const snap = await getDocs(collection(db, "planes_servicio"));
    console.log(`✅ planes_servicio OK. Total docs: ${snap.docs.length}`);
  } catch (e) {
    console.error("❌ PLANES_SERVICIO BLOQUEADA:", e.message, e.code);
  }

  console.log(`\n${"═".repeat(60)}`);
  console.log("✅ Diagnóstico completado.");
  console.log(`${"═".repeat(60)}\n`);
  process.exit(0);
}

checkFirestoreAccess().catch(err => {
  console.error("❌ Error fatal:", err.message);
  process.exit(1);
});

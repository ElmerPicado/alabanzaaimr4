/**
 * DIAGNÓSTICO: Estado de planes_servicio
 * =======================================
 * Verifica si los documentos de planes_servicio tienen el campo churchId
 * Esta es la causa del problema: planes históricos sin churchId quedan invisibles.
 */

import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, collection, getDocs } from "firebase/firestore";

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

async function check() {
  await signInWithEmailAndPassword(auth, "epicadomiranda@gmail.com", "Pd030819");

  const snap = await getDocs(collection(db, "planes_servicio"));
  const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  const conChurchId = docs.filter(d => d.churchId);
  const sinChurchId = docs.filter(d => !d.churchId);
  const deImr4 = docs.filter(d => d.churchId === "imr4");

  console.log(`\nTotal planes_servicio: ${docs.length}`);
  console.log(`  Con churchId:       ${conChurchId.length}`);
  console.log(`  Sin churchId:       ${sinChurchId.length}  ← ESTOS SON INVISIBLES PARA IMR4`);
  console.log(`  churchId === "imr4": ${deImr4.length}`);

  if (sinChurchId.length > 0) {
    console.log(`\n⚠️  Planes SIN churchId (invisibles en la UI de IMR4):`);
    sinChurchId.slice(0, 10).forEach(p => {
      console.log(`   - "${p.id}" | fecha: ${p.fecha || p.id}`);
    });
    if (sinChurchId.length > 10) console.log(`   ... y ${sinChurchId.length - 10} más.`);
  }

  if (deImr4.length > 0) {
    console.log(`\n✅ Planes con churchId="imr4":`);
    deImr4.forEach(p => console.log(`   - "${p.id}"`));
  }

  console.log(`\n📋 DIAGNÓSTICO:`);
  if (sinChurchId.length > 0) {
    console.log(`  ❌ HAY ${sinChurchId.length} planes de servicio SIN churchId.`);
    console.log(`     La query actual WHERE churchId=='imr4' NO los encuentra.`);
    console.log(`     SOLUCIÓN: Asignar churchId='imr4' a estos documentos.`);
    console.log(`     → Ejecutar: node scratch/fix_planes_servicio_churchid.mjs`);
  } else {
    console.log(`  ✅ Todos los planes tienen churchId. El bug está en otro lugar.`);
  }

  process.exit(0);
}

check().catch(e => { console.error(e); process.exit(1); });

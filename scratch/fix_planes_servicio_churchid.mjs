/**
 * SCRIPT: fix_planes_servicio_churchid.mjs
 * =========================================
 * Asigna churchId='imr4' a los 36 planes de servicio históricos
 * que no tienen este campo.
 *
 * SEGURO: Solo agrega el campo churchId, no modifica ningún otro dato.
 * REVERSIBLE: El campo puede eliminarse si es necesario.
 *
 * Ejecutar: node scratch/fix_planes_servicio_churchid.mjs
 * Dry-run:  node scratch/fix_planes_servicio_churchid.mjs --dry-run
 */

import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import {
  getFirestore,
  collection,
  getDocs,
  writeBatch,
  doc
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

const isDryRun = process.argv.includes("--dry-run");
const TARGET_CHURCH_ID = "imr4";
const sep = "═".repeat(60);

async function fix() {
  console.log(`\n${sep}`);
  console.log(isDryRun
    ? "🔎 DRY RUN: Asignando churchId='imr4' a planes_servicio (sin guardar)"
    : "🔧 ASIGNANDO churchId='imr4' a planes_servicio históricos"
  );
  console.log(`${sep}\n`);

  console.log("🔌 Autenticando...");
  await signInWithEmailAndPassword(auth, "epicadomiranda@gmail.com", "Pd030819");
  console.log("✅ Autenticado.\n");

  // Leer todos los planes sin churchId
  const snap = await getDocs(collection(db, "planes_servicio"));
  const sinChurchId = snap.docs.filter(d => !d.data().churchId);

  console.log(`Total planes_servicio:  ${snap.docs.length}`);
  console.log(`Sin churchId:           ${sinChurchId.length}`);
  console.log(`Target churchId:        "${TARGET_CHURCH_ID}"\n`);

  if (sinChurchId.length === 0) {
    console.log("✅ Todos los planes ya tienen churchId. Nada que hacer.");
    process.exit(0);
  }

  if (isDryRun) {
    console.log("🔎 Planes que serían actualizados:");
    sinChurchId.forEach(d => {
      console.log(`   - "${d.id}" | fecha: ${d.data().fecha || d.id}`);
    });
    console.log(`\n🔎 [DRY RUN] Se haría batch.update en ${sinChurchId.length} documentos.`);
    console.log(`   Nada fue modificado.`);
  } else {
    // Procesar en lotes de 450 (límite Firestore: 500 ops por batch)
    const CHUNK_SIZE = 450;
    let totalUpdated = 0;

    for (let i = 0; i < sinChurchId.length; i += CHUNK_SIZE) {
      const chunk = sinChurchId.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);

      chunk.forEach(d => {
        batch.update(doc(db, "planes_servicio", d.id), { churchId: TARGET_CHURCH_ID });
      });

      await batch.commit();
      totalUpdated += chunk.length;
      console.log(`✅ Lote ${Math.floor(i / CHUNK_SIZE) + 1}: ${chunk.length} documentos actualizados.`);
    }

    console.log(`\n${sep}`);
    console.log(`✅ COMPLETADO: ${totalUpdated} planes de servicio actualizados.`);
    console.log(`   Todos ahora tienen churchId="${TARGET_CHURCH_ID}".`);
    console.log(`\n   El historial de IMR4 debería ser visible ahora en la app.`);
    console.log(`   Pide a epicado que recargue la página.`);
  }

  console.log(`\n${sep}\n`);
  process.exit(0);
}

fix().catch(err => {
  console.error("❌ Error fatal:", err.message);
  process.exit(1);
});

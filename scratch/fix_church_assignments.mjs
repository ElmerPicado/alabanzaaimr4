/**
 * SCRIPT: fix_church_assignments.mjs
 * ====================================
 * Corrige los churchId incorrectos de:
 *   - joselinedelbgmailcom (admin que está en imr4 en vez de su church)
 *   - pruebasgmailcom (admin que está en imr4 en vez de su church)
 *
 * REVERSIBLE: Guarda los valores originales antes de modificar.
 * SIN EFECTO COLATERAL: Solo actualiza 2 documentos.
 *
 * Ejecutar: node scratch/fix_church_assignments.mjs
 * Para hacer rollback: node scratch/fix_church_assignments.mjs --rollback
 */

import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, getDoc, updateDoc } from "firebase/firestore";

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

// ──────────────────────────────────────────────────────────────
// CONFIGURACIÓN DE CORRECCIONES
// Antes de modificar, verifica estos IDs en el output del diagnóstico
// ──────────────────────────────────────────────────────────────
const CORRECTIONS = [
  {
    docId: "joselinedelbgmailcom",
    nombreDisplay: "Admin iglesia la trinidad (joselinedelb@gmail.com)",
    churchIdActual: "imr4",
    churchIdCorrecto: "ef1e7181-f380-4bc1-941d-3cd3fc6e4421",
    churchNombreCorrecto: "iglesia metodista la trinidad (plan PAGA)"
  },
  {
    docId: "pruebasgmailcom",
    nombreDisplay: "Pruebas (pruebas@gmail.com)",
    churchIdActual: "imr4",
    churchIdCorrecto: "ac8725ec-c184-4840-957e-6ab87c753f0b",
    churchNombreCorrecto: "Trinity (plan BASICO)"
  }
];

const isRollback = process.argv.includes("--rollback");
const isDryRun = process.argv.includes("--dry-run");

const sep = "═".repeat(60);

async function run() {
  console.log(`\n${sep}`);
  console.log(isRollback
    ? "↩️  ROLLBACK: Restaurando churchIds originales"
    : isDryRun
      ? "🔎 DRY RUN: Simulando correcciones (sin guardar)"
      : "🔧 CORRECCIÓN DE CHURCH ASSIGNMENTS"
  );
  console.log(`${sep}\n`);

  // Autenticación
  console.log("🔌 Autenticando...");
  try {
    await signInWithEmailAndPassword(auth, "epicadomiranda@gmail.com", "Pd030819");
    console.log("✅ Autenticado.\n");
  } catch (e) {
    console.error("❌ Error de autenticación:", e.message);
    process.exit(1);
  }

  for (const fix of CORRECTIONS) {
    console.log(`${"─".repeat(60)}`);
    console.log(`📋 Usuario: ${fix.nombreDisplay}`);
    console.log(`   DocID:   "${fix.docId}"`);

    // Leer estado actual
    const snap = await getDoc(doc(db, "usuarios", fix.docId));
    if (!snap.exists()) {
      console.log(`   ⚠️  Documento no encontrado. Saltando.`);
      continue;
    }

    const actual = snap.data();
    console.log(`   churchId actual:   "${actual.churchId || "(vacío)"}"`);
    console.log(`   role actual:       "${actual.role}"`);

    if (isRollback) {
      // Rollback: restaurar churchId original (imr4)
      const targetChurchId = fix.churchIdActual;
      console.log(`\n   ↩️  Rollback: restaurando churchId a "${targetChurchId}"`);
      if (!isDryRun) {
        await updateDoc(doc(db, "usuarios", fix.docId), { churchId: targetChurchId });
        console.log(`   ✅ Rollback completado.`);
      } else {
        console.log(`   🔎 [DRY RUN] updateDoc(usuarios/${fix.docId}, { churchId: "${targetChurchId}" })`);
      }
    } else {
      // Corrección normal
      if (actual.churchId === fix.churchIdCorrecto) {
        console.log(`   ✅ Ya tiene el churchId correcto. Nada que hacer.`);
        continue;
      }

      // Verificar que el church de destino existe
      const churchSnap = await getDoc(doc(db, "churches", fix.churchIdCorrecto));
      if (!churchSnap.exists()) {
        console.error(`   ❌ El church de destino "${fix.churchIdCorrecto}" NO EXISTE en Firestore.`);
        console.error(`      Verifica el ID antes de continuar.`);
        continue;
      }

      const churchData = churchSnap.data();
      console.log(`   Church destino:    "${fix.churchNombreCorrecto}"`);
      console.log(`   Church nombre DB:  "${churchData.name}"`);
      console.log(`   Church plan:       "${churchData.plan}"`);
      console.log(`   Church status:     "${churchData.status}"`);
      console.log(`\n   🔧 Cambio: "${actual.churchId}" → "${fix.churchIdCorrecto}"`);

      if (!isDryRun) {
        await updateDoc(doc(db, "usuarios", fix.docId), {
          churchId: fix.churchIdCorrecto
        });
        console.log(`   ✅ Actualizado correctamente.`);
      } else {
        console.log(`   🔎 [DRY RUN] updateDoc(usuarios/${fix.docId}, { churchId: "${fix.churchIdCorrecto}" })`);
      }
    }
    console.log();
  }

  console.log(`\n${sep}`);
  if (isDryRun) {
    console.log("🔎 DRY RUN completado. Nada fue modificado.");
    console.log("   → Para aplicar: node scratch/fix_church_assignments.mjs");
  } else if (isRollback) {
    console.log("↩️  ROLLBACK completado.");
    console.log("   Todos los usuarios restaurados a churchId: 'imr4'");
  } else {
    console.log("✅ Correcciones completadas.");
    console.log("\n⚠️  NOTA: El sistema puede tardar unos segundos en reflejar los cambios.");
    console.log("   Pide a joselinedelb y pruebas@gmail.com que cierren sesión y vuelvan a entrar.");
    console.log("\n   Para deshacer: node scratch/fix_church_assignments.mjs --rollback");
  }
  console.log(`${sep}\n`);
  process.exit(0);
}

run().catch(err => {
  console.error("❌ Error fatal:", err.message);
  process.exit(1);
});

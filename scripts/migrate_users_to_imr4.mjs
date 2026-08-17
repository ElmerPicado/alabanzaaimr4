/**
 * SCRIPT 2: migrate_users_to_imr4.mjs
 * ======================================
 * Migra TODOS los usuarios existentes en la colección `usuarios` de Firestore
 * asignándoles churchId = "imr4" si aún no tienen uno.
 *
 * ✅ Solo actualiza usuarios SIN churchId (no toca los que ya tienen uno correcto).
 * ✅ Excluye al superadmin (epicadomiranda@gmail.com).
 * ✅ Genera un reporte final de lo migrado.
 *
 * Ejecutar: node scripts/migrate_users_to_imr4.mjs
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// ─── CONFIGURACIÓN ────────────────────────────────────────────────────────────
const SERVICE_ACCOUNT_PATH = "./serviceAccountKey.json";
const IMR4_CHURCH_ID = "imr4";

// Usuarios que NO deben migrarse (cuentas del sistema)
const EXCLUDE_USERS = [
  "epicadomiranda@gmail.com",
  "superadmin",
];
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🔌 Conectando con Firebase Admin SDK...");

  let serviceAccount;
  try {
    const { createRequire } = await import("module");
    const require = createRequire(import.meta.url);
    serviceAccount = require(SERVICE_ACCOUNT_PATH);
  } catch (e) {
    console.error(
      "❌ No se encontró serviceAccountKey.json en la raíz del proyecto.\n" +
      "   Descárgalo desde Firebase Console → Configuración → Cuentas de servicio."
    );
    process.exit(1);
  }

  initializeApp({ credential: cert(serviceAccount) });
  const db = getFirestore();

  console.log("🔍 Leyendo todos los usuarios de Firestore...");
  const usersSnap = await db.collection("usuarios").get();

  if (usersSnap.empty) {
    console.log("⚠️  No hay usuarios en la colección.");
    return;
  }

  let total = 0;
  let migrated = 0;
  let skipped = 0;
  let alreadyAssigned = 0;
  const migratedList = [];
  const skippedList = [];

  // Procesar en lotes de 500 (límite de Firestore batch)
  const BATCH_SIZE = 400;
  let batch = db.batch();
  let batchCount = 0;

  for (const userDoc of usersSnap.docs) {
    total++;
    const data = userDoc.data();
    const uid = userDoc.id;

    // Excluir cuentas del sistema
    if (EXCLUDE_USERS.includes(uid) || EXCLUDE_USERS.includes(data.usuario)) {
      skippedList.push(uid);
      skipped++;
      continue;
    }

    // Excluir usuarios que ya tienen churchId asignado
    if (data.churchId && data.churchId !== "") {
      alreadyAssigned++;
      console.log(`  ✓ Ya tiene churchId="${data.churchId}": ${uid}`);
      continue;
    }

    // Migrar: asignar churchId = "imr4"
    const userRef = db.collection("usuarios").doc(uid);
    batch.update(userRef, {
      churchId: IMR4_CHURCH_ID,
      migratedAt: new Date().toISOString(),
    });

    batchCount++;
    migratedList.push({ uid, nombre: data.nombre || uid, role: data.role || "musico" });
    migrated++;

    // Commit al llegar al límite del batch
    if (batchCount >= BATCH_SIZE) {
      console.log(`  📤 Committing batch de ${batchCount} usuarios...`);
      await batch.commit();
      batch = db.batch();
      batchCount = 0;
    }
  }

  // Commit del batch final
  if (batchCount > 0) {
    console.log(`  📤 Committing batch final de ${batchCount} usuarios...`);
    await batch.commit();
  }

  // ─── REPORTE FINAL ────────────────────────────────────────────────────────
  console.log("\n═══════════════════════════════════════════════");
  console.log("📊 REPORTE DE MIGRACIÓN A IMR4");
  console.log("═══════════════════════════════════════════════");
  console.log(`  Total de usuarios en la base:   ${total}`);
  console.log(`  ✅ Migrados a churchId=imr4:     ${migrated}`);
  console.log(`  ⏭️  Ya tenían churchId asignado:  ${alreadyAssigned}`);
  console.log(`  🚫 Excluidos (sistema):          ${skipped}`);

  if (migratedList.length > 0) {
    console.log("\n👥 Usuarios migrados:");
    migratedList.forEach(u => {
      console.log(`   • [${u.role}] ${u.nombre} (${u.uid})`);
    });
  }

  if (skippedList.length > 0) {
    console.log("\n🚫 Usuarios excluidos:");
    skippedList.forEach(uid => console.log(`   • ${uid}`));
  }

  console.log("\n✅ Migración completada exitosamente.");
  console.log("   Todos los usuarios ya están correctamente vinculados a la cuenta IMR4.\n");
}

main().catch((err) => {
  console.error("❌ Error fatal:", err.message);
  process.exit(1);
});

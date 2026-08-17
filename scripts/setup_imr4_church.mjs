/**
 * SCRIPT 1: setup_imr4_church.mjs
 * ======================================
 * Crea (o actualiza) el documento de la institución IMR4 en la colección
 * `churches` de Firestore con plan GRATIS e indefinido.
 *
 * Ejecutar: node scripts/setup_imr4_church.mjs
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// ─── CONFIGURACIÓN ────────────────────────────────────────────────────────────
// Coloca aquí la ruta de tu Service Account JSON descargado de Firebase Console
// Firebase Console → Configuración del proyecto → Cuentas de servicio → Generar nueva clave privada
const SERVICE_ACCOUNT_PATH = "./serviceAccountKey.json";

// ID de la cuenta IMR4 (se usará como churchId en todos los usuarios)
const IMR4_CHURCH_ID = "imr4";

const IMR4_CHURCH_DATA = {
  name: "Iglesia Ministerio de Restauración (IMR4)",
  shortName: "IMR4",
  adminEmail: "epicadomiranda@gmail.com",
  adminUser: "epicado",
  phone: "",
  plan: "gratis",           // "gratis" | "prueba" | "paga"
  status: "activa",         // "activa" | "inactiva"
  expireAt: null,           // null = licencia indefinida para plan gratuito
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  notes: "Cuenta principal del sistema. Licencia gratuita indefinida.",
};
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
      "❌ No se encontró el archivo serviceAccountKey.json.\n" +
      "   Descárgalo desde Firebase Console → Configuración → Cuentas de servicio.\n" +
      "   Guárdalo como: " + SERVICE_ACCOUNT_PATH
    );
    process.exit(1);
  }

  initializeApp({ credential: cert(serviceAccount) });
  const db = getFirestore();

  console.log(`📋 Verificando si ya existe la institución con ID: "${IMR4_CHURCH_ID}"...`);
  const churchRef = db.collection("churches").doc(IMR4_CHURCH_ID);
  const existing = await churchRef.get();

  if (existing.exists) {
    console.log("⚠️  El documento ya existe. Actualizando campos sin sobrescribir datos críticos...");
    await churchRef.set(
      {
        ...IMR4_CHURCH_DATA,
        updatedAt: new Date().toISOString(),
        // Preservar campos que ya puedan existir (receiptUrl, whatsappLink, etc.)
      },
      { merge: true }
    );
    console.log("✅ Institución IMR4 actualizada correctamente.");
  } else {
    await churchRef.set(IMR4_CHURCH_DATA);
    console.log("✅ Institución IMR4 creada correctamente en Firestore.");
  }

  console.log("\n📄 Datos guardados:");
  console.table({ ...IMR4_CHURCH_DATA, id: IMR4_CHURCH_ID });

  console.log("\n👉 Siguiente paso: ejecuta el script de migración de usuarios:");
  console.log("   node scripts/migrate_users_to_imr4.mjs\n");
}

main().catch((err) => {
  console.error("❌ Error fatal:", err.message);
  process.exit(1);
});

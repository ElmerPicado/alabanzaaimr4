/**
 * SCRIPT: migrate_to_memberships.mjs
 * ====================================
 * Lee todos los usuarios de Firestore y crea sus correspondientes documentos
 * en la colección 'memberships' de forma segura.
 *
 * Mantiene la retrocompatibilidad: NO elimina el campo 'churchId' de la colección 'usuarios'.
 * Evita duplicados: Usa el ID de documento compuesto `${userId}_${churchId}` en 'memberships'.
 *
 * Ejecutar: node scratch/migrate_to_memberships.mjs
 * Dry-run:  node scratch/migrate_to_memberships.mjs --dry-run
 */

import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  writeBatch
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
const sep = "═".repeat(60);

async function migrate() {
  console.log(`\n${sep}`);
  console.log(isDryRun
    ? "🔎 DRY RUN: Creando memberships para todos los usuarios (sin guardar)"
    : "🔧 MIGRANDO USUARIOS A LA COLECCIÓN 'memberships'"
  );
  console.log(`${sep}\n`);

  console.log("🔌 Autenticando...");
  await signInWithEmailAndPassword(auth, "epicadomiranda@gmail.com", "Pd030819");
  console.log("✅ Autenticado.\n");

  // Leer todos los usuarios
  const usersSnap = await getDocs(collection(db, "usuarios"));
  const users = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  const usersWithChurch = users.filter(u => u.churchId && u.churchId.trim() !== "");
  
  console.log(`Total usuarios:            ${users.length}`);
  console.log(`Usuarios con churchId:     ${usersWithChurch.length}`);
  console.log(`Usuarios sin churchId:      ${users.length - usersWithChurch.length}\n`);

  if (usersWithChurch.length === 0) {
    console.log("✅ Ningún usuario tiene churchId para migrar. Fin.");
    process.exit(0);
  }

  if (isDryRun) {
    console.log("🔎 Memberships que se crearían:");
    usersWithChurch.forEach(u => {
      const membershipDocId = `${u.id}_${u.churchId}`;
      console.log(`   - ID Doc: "${membershipDocId}"`);
      console.log(`     userId:      "${u.id}"`);
      console.log(`     churchId:    "${u.churchId}"`);
      console.log(`     role:        "${u.role || 'musico'}"`);
      console.log(`     instrumento: "${u.instrumento || 'Voz'}"`);
      console.log(`     type:        "${u.type || 'musico'}"`);
      console.log();
    });
    console.log(`\n🔎 [DRY RUN] Se crearían ${usersWithChurch.length} memberships. Nada fue modificado.`);
  } else {
    const batch = writeBatch(db);
    let count = 0;

    usersWithChurch.forEach(u => {
      const membershipDocId = `${u.id}_${u.churchId}`;
      const mRef = doc(db, "memberships", membershipDocId);
      
      batch.set(mRef, {
        userId: u.id,
        churchId: u.churchId,
        role: u.role || "musico",
        instrumento: u.instrumento || "Voz",
        type: u.type || "musico",
        joinedAt: new Date().toISOString()
      }, { merge: true });
      
      count++;
    });

    await batch.commit();

    console.log(`\n${sep}`);
    console.log(`✅ COMPLETADO: ${count} memberships creadas en Firestore.`);
    console.log(`   La colección 'memberships' está lista y activa.`);
    console.log(`   (Los churchId originales de la colección 'usuarios' se mantuvieron intactos para seguridad)`);
  }

  console.log(`${sep}\n`);
  process.exit(0);
}

migrate().catch(err => {
  console.error("❌ Error fatal en migración:", err.message);
  process.exit(1);
});

/**
 * AUDIT COMPLETO DE FIRESTORE — audit_full_db.mjs
 * ================================================
 * Lee el estado real de la base de datos SIN modificar nada.
 * Genera un reporte completo de:
 *  - Colección churches
 *  - Usuarios por churchId (cuántos tiene cada church)
 *  - Usuarios SIN churchId
 *  - Usuarios con churchId inválido (apunta a church inexistente)
 *  - Roles existentes
 *
 * Ejecutar: node scratch/audit_full_db.mjs
 */

import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, collection, getDocs, doc, getDoc } from "firebase/firestore";

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

const sep = "═".repeat(60);

async function audit() {
  console.log(`\n${sep}`);
  console.log("🔍 AUDITORÍA COMPLETA DE FIRESTORE — AlabanApp");
  console.log(`${sep}\n`);

  // ── 1. AUTENTICACIÓN ──────────────────────────────────────────
  console.log("🔌 Autenticando con Firebase...");
  try {
    await signInWithEmailAndPassword(auth, "epicadomiranda@gmail.com", "Pd030819");
    console.log("✅ Autenticación exitosa.\n");
  } catch (e) {
    console.error("❌ Error de autenticación:", e.message);
    process.exit(1);
  }

  // ── 2. COLECCIÓN: churches ─────────────────────────────────────
  console.log(`${sep}`);
  console.log("🏛️  COLECCIÓN: churches");
  console.log(`${sep}`);

  const churchesSnap = await getDocs(collection(db, "churches"));
  const churches = {};

  if (churchesSnap.empty) {
    console.log("⚠️  La colección 'churches' está VACÍA.");
  } else {
    console.log(`Total de churches: ${churchesSnap.docs.length}\n`);
    churchesSnap.forEach(d => {
      const data = d.data();
      churches[d.id] = data;
      console.log(`  ID: "${d.id}"`);
      console.log(`    Nombre:   ${data.name || "(sin nombre)"}`);
      console.log(`    Plan:     ${data.plan || "(sin plan)"}`);
      console.log(`    Status:   ${data.status || "(sin status)"}`);
      console.log(`    ExpireAt: ${data.expireAt || "null (indefinido)"}`);
      console.log(`    Owner:    ${data.ownerEmail || data.adminEmail || "(sin owner)"}`);
      console.log(`    Members[]: ${Array.isArray(data.members) ? data.members.length + " (array en doc, no usado para queries)" : "(no existe)"}`);
      console.log();
    });
  }

  // ── 3. COLECCIÓN: usuarios ─────────────────────────────────────
  console.log(`${sep}`);
  console.log("👥 COLECCIÓN: usuarios");
  console.log(`${sep}`);

  const usersSnap = await getDocs(collection(db, "usuarios"));
  const totalUsers = usersSnap.docs.length;

  if (usersSnap.empty) {
    console.log("⚠️  La colección 'usuarios' está VACÍA.");
    process.exit(0);
  }

  console.log(`Total de usuarios: ${totalUsers}\n`);

  // Agrupar por churchId
  const byChurch = {};        // churchId -> lista de usuarios
  const sinChurchId = [];     // usuarios sin churchId
  const churchIdInvalido = []; // usuarios cuyo churchId no existe en churches
  const roleCount = {};       // role -> count

  usersSnap.forEach(d => {
    const u = { id: d.id, ...d.data() };
    const cid = u.churchId;
    const role = u.role || "(sin role)";

    // Contar roles
    roleCount[role] = (roleCount[role] || 0) + 1;

    if (!cid || cid.trim() === "") {
      sinChurchId.push(u);
    } else {
      // Verificar que el churchId exista
      if (!churches[cid]) {
        churchIdInvalido.push({ ...u, _churchIdValue: cid });
      } else {
        if (!byChurch[cid]) byChurch[cid] = [];
        byChurch[cid].push(u);
      }
    }
  });

  // ── 3a. Usuarios por church ──────────────────────────────────
  console.log("📊 USUARIOS POR COMMUNITY (churchId válido):");
  console.log("─".repeat(50));

  if (Object.keys(byChurch).length === 0) {
    console.log("  (ninguno tiene churchId válido)");
  } else {
    for (const [cid, members] of Object.entries(byChurch)) {
      const churchName = churches[cid]?.name || "(nombre desconocido)";
      console.log(`\n  Church "${cid}" → ${churchName}`);
      console.log(`  Total miembros: ${members.length}`);

      const conCorreo = members.filter(m => m.correo && m.correo.includes("@"));
      const sinCorreo = members.filter(m => !m.correo || !m.correo.includes("@"));
      console.log(`    Con correo:  ${conCorreo.length}`);
      console.log(`    Sin correo:  ${sinCorreo.length}`);

      // Listar roles dentro de este church
      const rolesDentro = {};
      members.forEach(m => {
        const r = m.role || "(sin role)";
        rolesDentro[r] = (rolesDentro[r] || 0) + 1;
      });
      console.log(`    Roles: ${JSON.stringify(rolesDentro)}`);

      if (sinCorreo.length > 0) {
        console.log(`    🔎 Miembros SIN correo en este church:`);
        sinCorreo.forEach(m => {
          console.log(`       - "${m.id}" | nombre: ${m.nombre || "(sin nombre)"} | usuario: ${m.usuario || "(sin usuario)"} | role: ${m.role || "(sin role)"}`);
        });
      }
    }
  }

  // ── 3b. Usuarios SIN churchId ────────────────────────────────
  console.log(`\n${"─".repeat(50)}`);
  console.log(`⚠️  USUARIOS SIN churchId: ${sinChurchId.length}`);
  console.log("─".repeat(50));

  if (sinChurchId.length === 0) {
    console.log("  ✅ Todos los usuarios tienen churchId asignado.");
  } else {
    sinChurchId.forEach(u => {
      console.log(`  - ID: "${u.id}" | nombre: ${u.nombre || "(sin nombre)"} | usuario: ${u.usuario || "(sin usuario)"} | role: ${u.role || "(sin role)"} | correo: ${u.correo || "(sin correo)"}`);
    });
  }

  // ── 3c. Usuarios con churchId INVÁLIDO ───────────────────────
  console.log(`\n${"─".repeat(50)}`);
  console.log(`❌ USUARIOS CON churchId QUE NO EXISTE EN 'churches': ${churchIdInvalido.length}`);
  console.log("─".repeat(50));

  if (churchIdInvalido.length === 0) {
    console.log("  ✅ Ningún usuario tiene un churchId huérfano.");
  } else {
    churchIdInvalido.forEach(u => {
      console.log(`  - ID: "${u.id}" | nombre: ${u.nombre || "(sin nombre)"} | churchId inválido: "${u._churchIdValue}"`);
    });
  }

  // ── 4. DISTRIBUCIÓN DE ROLES ─────────────────────────────────
  console.log(`\n${sep}`);
  console.log("🎭 DISTRIBUCIÓN GLOBAL DE ROLES (campo 'role' en usuarios)");
  console.log(`${sep}`);
  for (const [role, count] of Object.entries(roleCount)) {
    console.log(`  ${role}: ${count} usuario(s)`);
  }

  // ── 5. COLECCIÓN: memberships (si existe) ────────────────────
  console.log(`\n${sep}`);
  console.log("🔗 COLECCIÓN: memberships (nueva — si existe)");
  console.log(`${sep}`);
  try {
    const membSnap = await getDocs(collection(db, "memberships"));
    if (membSnap.empty) {
      console.log("  ℹ️  La colección 'memberships' NO existe todavía (0 documentos).");
      console.log("      Esto es esperado — la migración aún no se ha hecho.");
    } else {
      console.log(`  Total de memberships: ${membSnap.docs.length}`);
    }
  } catch (e) {
    console.log("  ℹ️  No se pudo leer 'memberships' (probablemente no existe).");
  }

  // ── 6. RESUMEN FINAL ──────────────────────────────────────────
  console.log(`\n${sep}`);
  console.log("📊 RESUMEN FINAL");
  console.log(`${sep}`);
  console.log(`  Total churches:               ${churchesSnap.docs.length}`);
  console.log(`  Total usuarios:               ${totalUsers}`);
  console.log(`  Usuarios CON churchId válido: ${totalUsers - sinChurchId.length - churchIdInvalido.length}`);
  console.log(`  Usuarios SIN churchId:        ${sinChurchId.length}`);
  console.log(`  Usuarios con churchId inválid:${churchIdInvalido.length}`);

  // Determinar si hay trabajo pendiente
  console.log("\n📋 ACCIONES REQUERIDAS:");
  if (sinChurchId.length > 0) {
    console.log(`  ⚠️  HAY ${sinChurchId.length} usuarios sin churchId.`);
    console.log(`      → Ejecutar: node scripts/migrate_users_to_imr4.mjs`);
    console.log(`         (Solo asignará churchId='imr4' a quienes no tienen uno)`);
  } else {
    console.log("  ✅ Todos los usuarios tienen churchId. Migración no necesaria.");
  }

  if (churchIdInvalido.length > 0) {
    console.log(`  ⚠️  HAY ${churchIdInvalido.length} usuarios con churchId que no existe en 'churches'.`);
    console.log(`      → Requiere revisión manual de esos churchIds.`);
  }

  if (!churches["imr4"]) {
    console.log("  ❌ El documento 'churches/imr4' NO EXISTE.");
    console.log("     → Ejecutar: node scripts/setup_imr4_church.mjs");
  } else {
    console.log("  ✅ 'churches/imr4' existe correctamente.");
  }

  console.log(`\n${sep}`);
  console.log("✅ Auditoría completada. Ningún dato fue modificado.");
  console.log(`${sep}\n`);

  process.exit(0);
}

audit().catch(err => {
  console.error("❌ Error fatal en auditoría:", err.message);
  process.exit(1);
});

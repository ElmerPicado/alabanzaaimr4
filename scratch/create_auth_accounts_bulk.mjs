/**
 * SCRIPT MIGRACIÓN: Creación masiva de cuentas Firebase Auth
 * =========================================================
 * Lee todos los usuarios de la colección 'usuarios' de Firestore y crea
 * sus correspondientes cuentas en Firebase Auth usando su contraseña de Firestore
 * y correo electrónico (o correo virtual alias@alabanapp.com si es alias).
 * Esto elimina el deadlock de reglas de seguridad en producción de forma definitiva.
 */

import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
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

async function run() {
  console.log("🔌 Autenticando administrador...");
  await signInWithEmailAndPassword(auth, "epicadomiranda@gmail.com", "Pd030819");
  console.log("✅ Autenticado.\n");

  console.log("📖 Leyendo todos los usuarios de Firestore...");
  const snap = await getDocs(collection(db, "usuarios"));
  const usuarios = [];
  snap.forEach(doc => usuarios.push({ id: doc.id, ...doc.data() }));
  console.log(`🔍 Total usuarios encontrados en Firestore: ${usuarios.length}`);

  let creados = 0;
  let yaExistian = 0;
  let fallidos = 0;

  for (const u of usuarios) {
    const alias = u.usuario || u.id;
    const password = u.password;
    if (!password) {
      console.log(`⚠️ Usuario [${alias}] no tiene contraseña en Firestore. Omitiendo.`);
      continue;
    }

    // Determinar el email de Auth
    let email = u.correo || alias;
    if (!email.includes('@')) {
      email = `${alias.toLowerCase()}@alabanapp.com`;
    }

    // Asegurarse de que la contraseña tenga mínimo 6 caracteres para cumplir con políticas de Firebase Auth
    let finalPassword = password;
    if (finalPassword.length < 6) {
      // Si la clave es muy corta (ej: 1234), rellenarla de forma predecible o alertar
      finalPassword = finalPassword.padEnd(6, '0'); 
    }

    console.log(`👤 Procesando: [${alias}] -> Correo Auth: "${email}" | Clave Auth: "${finalPassword}"`);

    try {
      // Intentar crear la cuenta en Firebase Auth
      await createUserWithEmailAndPassword(auth, email, finalPassword);
      console.log(`   ✅ Cuenta creada con éxito.`);
      creados++;
    } catch (e) {
      if (e.code === 'auth/email-already-in-use') {
        console.log(`   ℹ️ La cuenta ya existe en Firebase Auth.`);
        yaExistian++;
      } else {
        console.error(`   ❌ Error al crear:`, e.message);
        fallidos++;
      }
    }
  }

  console.log("\n=== RESUMEN DE MIGRACIÓN DE AUTH ===");
  console.log(`🎉 Cuentas creadas nuevas:  ${creados}`);
  console.log(`ℹ️ Cuentas que ya existían: ${yaExistian}`);
  console.log(`❌ Cuentas fallidas:        ${fallidos}`);
  process.exit(0);
}

run().catch(e => {
  console.error("❌ Error de ejecución:", e);
  process.exit(1);
});

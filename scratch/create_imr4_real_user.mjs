/**
 * SCRIPT: create_imr4_real_user.mjs
 * ===================================
 * Crea el usuario físico 'imr4' en Firestore en la colección 'usuarios'
 * y su membresía correspondiente en la colección 'memberships' con rol de administrador.
 * Esto permite que la sesión de imr4 con clave 222222 sea real y no dependa de mocks/hardcodeos.
 */

import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc } from "firebase/firestore";

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
  console.log("🔌 Autenticando...");
  await signInWithEmailAndPassword(auth, "epicadomiranda@gmail.com", "Pd030819");
  console.log("✅ Autenticado.\n");

  const userId = "imr4";
  const churchId = "imr4";

  console.log(`👤 Creando usuario global 'usuarios/${userId}'...`);
  await setDoc(doc(db, "usuarios", userId), {
    nombre: "Admin IMR4",
    usuario: "imr4",
    password: "222222",
    role: "admin",
    churchId: churchId,
    instrumento: "Administrador",
    type: "musico"
  }, { merge: true });

  console.log(`🔗 Creando membresía 'memberships/${userId}_${churchId}'...`);
  await setDoc(doc(db, "memberships", `${userId}_${churchId}`), {
    userId: userId,
    churchId: churchId,
    role: "admin",
    instrumento: "Administrador",
    type: "musico",
    joinedAt: new Date().toISOString()
  }, { merge: true });

  console.log("\n🎉 USUARIO REAL Y MEMBRESÍA DE IMR4 CREADOS CON ÉXITO.");
  process.exit(0);
}

run().catch(e => {
  console.error("❌ Error:", e.message);
  process.exit(1);
});

/**
 * DIAGNÓSTICO: Buscar datos de epicadomiranda@gmail.com en Firestore
 * =================================================================
 * Muestra el documento de usuario que se recupera para este email.
 */

import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";

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
  await signInWithEmailAndPassword(auth, "epicadomiranda@gmail.com", "Pd030819");
  console.log("✅ Autenticado como epicadomiranda@gmail.com");

  // 1. Buscar docId = "epicadomiranda@gmail.com"
  const snap1 = await getDoc(doc(db, "usuarios", "epicadomiranda@gmail.com"));
  console.log("\n1. Buscar usuarios/epicadomiranda@gmail.com:");
  console.log("   Existe:", snap1.exists());
  if (snap1.exists()) console.log(snap1.data());

  // 2. Buscar docId = "epicadomirandagmailcom"
  const snap2 = await getDoc(doc(db, "usuarios", "epicadomirandagmailcom"));
  console.log("\n2. Buscar usuarios/epicadomirandagmailcom:");
  console.log("   Existe:", snap2.exists());
  if (snap2.exists()) console.log(snap2.data());

  // 3. Buscar query por campo correo == "epicadomiranda@gmail.com"
  const q = query(collection(db, "usuarios"), where("correo", "==", "epicadomiranda@gmail.com"));
  const snap3 = await getDocs(q);
  console.log("\n3. Query correo == epicadomiranda@gmail.com:");
  console.log("   Docs encontrados:", snap3.docs.length);
  snap3.forEach(d => console.log(d.id, d.data()));

  // 4. Buscar query por campo usuario == "epicado"
  const q2 = query(collection(db, "usuarios"), where("usuario", "==", "epicado"));
  const snap4 = await getDocs(q2);
  console.log("\n4. Query usuario == epicado:");
  console.log("   Docs encontrados:", snap4.docs.length);
  snap4.forEach(d => console.log(d.id, d.data()));

  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });

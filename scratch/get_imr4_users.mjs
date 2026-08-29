import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const serviceAccount = require("../serviceAccountKey.json");

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function main() {
  const usersSnap = await db.collection("usuarios").where("churchId", "==", "imr4").get();
  
  if (usersSnap.empty) {
    console.log("No se encontraron usuarios con churchId = 'imr4'.");
    return;
  }

  const users = [];
  usersSnap.forEach(doc => {
    const data = doc.data();
    users.push({
      id: doc.id,
      nombre: data.nombre || data.usuario || 'Sin Nombre',
      role: data.role || 'N/A'
    });
  });

  console.log(`Total de usuarios IMR4: ${users.length}\n`);
  
  // Ordenar alfabéticamente
  users.sort((a, b) => a.nombre.localeCompare(b.nombre));
  
  for (const u of users) {
    console.log(`- ${u.nombre} (Rol: ${u.role})`);
  }
}

main().catch(console.error).finally(() => process.exit(0));

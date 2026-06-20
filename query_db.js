const fs = require('fs');

async function run() {
  try {
    console.log("Fetching users from Firestore REST API...");
    const usersResp = await fetch("https://firestore.googleapis.com/v1/projects/alabanza-d2185/databases/(default)/documents/usuarios");
    if (!usersResp.ok) {
      throw new Error(`Failed to fetch users: ${usersResp.status} ${usersResp.statusText}`);
    }
    const usersData = await usersResp.json();
    console.log("\n--- USUARIOS ---");
    if (usersData.documents) {
      usersData.documents.forEach(doc => {
        const fields = doc.fields;
        console.log(`Document: ${doc.name.split('/').pop()}`);
        console.log(`  Nombre: ${fields.nombre?.stringValue}`);
        console.log(`  Role: ${fields.role?.stringValue}`);
        console.log(`  Usuario: ${fields.usuario?.stringValue}`);
        console.log(`  Password: ${fields.password?.stringValue}`);
        console.log(`  Type: ${fields.type?.stringValue}`);
      });
    } else {
      console.log("No users found.");
    }

    console.log("\nFetching planes_servicio...");
    const planesResp = await fetch("https://firestore.googleapis.com/v1/projects/alabanza-d2185/databases/(default)/documents/planes_servicio");
    if (!planesResp.ok) {
      throw new Error(`Failed to fetch planes_servicio: ${planesResp.status} ${planesResp.statusText}`);
    }
    const planesData = await planesResp.json();
    console.log("\n--- PLANES SERVICIO ---");
    if (planesData.documents) {
      planesData.documents.forEach(doc => {
        console.log(`Document: ${doc.name.split('/').pop()}`);
        // print a few fields
        const fields = doc.fields;
        console.log(`  Fecha: ${fields.fecha?.stringValue}`);
      });
    } else {
      console.log("No services found.");
    }
  } catch (err) {
    console.error("Error:", err);
  }
}

run();

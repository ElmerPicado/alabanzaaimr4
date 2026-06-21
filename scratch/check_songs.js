const fs = require('fs');

async function run() {
  try {
    console.log("Fetching songs from Firestore REST API...");
    const songsResp = await fetch("https://firestore.googleapis.com/v1/projects/alabanza-d2185/databases/(default)/documents/biblioteca_canciones?pageSize=20");
    if (!songsResp.ok) {
      throw new Error(`Failed to fetch songs: ${songsResp.status} ${songsResp.statusText}`);
    }
    const songsData = await songsResp.json();
    console.log("\n--- SONGS ---");
    if (songsData.documents) {
      songsData.documents.forEach(doc => {
        const fields = doc.fields;
        console.log(`Song: ${fields.nombre?.stringValue}`);
        console.log(`  Tipo: ${fields.tipo?.stringValue}`);
      });
    } else {
      console.log("No songs found.");
    }
  } catch (err) {
    console.error("Error:", err);
  }
}

run();

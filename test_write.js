async function run() {
  try {
    const docId = "test_date_" + Date.now();
    const url = `https://firestore.googleapis.com/v1/projects/alabanza-d2185/databases/(default)/documents/planes_servicio/${docId}`;
    
    const payload = {
      fields: {
        fecha: { stringValue: docId },
        cancionesSeleccionadas: { mapValue: { fields: {} } },
        musicosAsignados: { mapValue: { fields: {} } },
        disponibilidad: { mapValue: { fields: {} } }
      }
    };

    console.log(`Attempting to write to ${url}...`);
    const resp = await fetch(url, {
      method: "PATCH", // Firestore REST API uses PATCH for creating/updating with a specific ID
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (resp.ok) {
      console.log("Write succeeded! Firestore allows unauthenticated writes.");
      // Clean up
      await fetch(url, { method: "DELETE" });
      console.log("Cleanup delete succeeded.");
    } else {
      console.log(`Write failed: ${resp.status} ${resp.statusText}`);
      const errText = await resp.text();
      console.log("Error details:", errText);
    }
  } catch (err) {
    console.error("Fetch error:", err);
  }
}

run();

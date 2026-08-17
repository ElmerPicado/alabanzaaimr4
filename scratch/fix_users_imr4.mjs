import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, collection, getDocs, doc, setDoc, updateDoc } from "firebase/firestore";

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

async function runMigration() {
  try {
    console.log("Logging in as Super Admin...");
    await signInWithEmailAndPassword(auth, "epicadomiranda@gmail.com", "Pd030819");
    console.log("Logged in!");

    console.log("Checking churches...");
    await setDoc(doc(db, "churches", "iglesia-imr4"), {
      name: "Alabanza IMR4",
      adminEmail: "iglesiametodistar4@gmail.com",
      status: "active",
      plan: "pro",
      createdAt: new Date().toISOString()
    }, { merge: true });
    console.log("Church IMR4 ensured in DB.");

    console.log("Fetching all users...");
    const snap = await getDocs(collection(db, "usuarios"));
    let count = 0;
    for (const d of snap.docs) {
      const uData = d.data();
      // Solo actualizamos si no tiene churchId o si es de imr4
      if (!uData.churchId || uData.churchId === 'iglesia-imr4') {
        await updateDoc(doc(db, "usuarios", d.id), {
          churchId: "iglesia-imr4"
        });
        count++;
      }
    }
    console.log("Successfully migrated " + count + " users to iglesia-imr4.");
    process.exit(0);
  } catch(e) {
    console.error("Migration failed:", e);
    process.exit(1);
  }
}
runMigration();

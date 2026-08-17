import { initializeApp } from "firebase/app";
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
const db = getFirestore(app);

async function check() {
  try {
    const snap = await getDocs(collection(db, "usuarios"));
    snap.forEach(doc => {
      console.log(doc.id, "=>", doc.data());
    });
    console.log("CHURCHES:");
    const cSnap = await getDocs(collection(db, "churches"));
    cSnap.forEach(doc => {
      console.log(doc.id, "=>", doc.data());
    });
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
check();

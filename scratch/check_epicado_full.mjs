import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBw-x",
  authDomain: "alabanzapp-187e1.firebaseapp.com",
  projectId: "alabanzapp-187e1",
  storageBucket: "alabanzapp-187e1.firebasestorage.app",
  messagingSenderId: "367980249870",
  appId: "1:367980249870:web:d70bb80d322ef5e414cda7"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function check() {
  const snap = await getDoc(doc(db, "usuarios", "epicado"));
  if (snap.exists()) {
    console.log(snap.data());
  } else {
    console.log("Not found");
  }
  process.exit(0);
}
check();

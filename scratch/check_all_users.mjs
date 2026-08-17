import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';

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

async function check() {
  try {
    await signInWithEmailAndPassword(auth, "epicadomiranda@gmail.com", "Pd030819");
    const snap1 = await getDocs(collection(db, "usuarios"));
    let imr4Count = 0;
    let totalCount = 0;
    snap1.forEach(doc => {
      totalCount++;
      if (doc.data().churchId === 'imr4') {
          imr4Count++;
          console.log(doc.id, "|", doc.data().nombre);
      }
    });
    console.log('Total users:', totalCount);
    console.log('imr4 users:', imr4Count);
    process.exit(0);
  } catch(e) {
    console.log(e);
    process.exit(1);
  }
}
check();

import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, getDocs, updateDoc, doc } from 'firebase/firestore';

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
    let updatedCount = 0;
    
    for (const d of snap1.docs) {
      if (d.data().churchId !== 'imr4') {
          console.log('Updating user:', d.id);
          await updateDoc(doc(db, "usuarios", d.id), { churchId: 'imr4' });
          updatedCount++;
      }
    }
    console.log('Updated users:', updatedCount);
    process.exit(0);
  } catch(e) {
    console.log(e);
    process.exit(1);
  }
}
check();

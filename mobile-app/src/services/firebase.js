import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyD0Prdhbx4CwV5Ms3K65fwBKfljUtpEr0I",
  authDomain: "sunsetmyfav.firebaseapp.com",
  projectId: "sunsetmyfav",
  storageBucket: "sunsetmyfav.firebasestorage.app",
  messagingSenderId: "429949738650",
  appId: "1:429949738650:web:9df4e79a2e6a71d2bbc923"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

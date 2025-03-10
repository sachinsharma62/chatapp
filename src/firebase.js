import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyCtvYjMLUXqTtDcbI44DOygmSn8Ku8a2VQ",
    authDomain: "chatapp-7162d.firebaseapp.com",
    projectId: "chatapp-7162d",
    storageBucket: "chatapp-7162d.firebasestorage.app",
    messagingSenderId: "618710673418",
    appId: "1:618710673418:web:98a5eadae50d5b5ca897f3"
};

// Firebase initialize karo
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
export { auth, provider, db };

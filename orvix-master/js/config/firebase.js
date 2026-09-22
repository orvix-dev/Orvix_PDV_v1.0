import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut, 
  onAuthStateChanged,
  browserLocalPersistence,
  setPersistence
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  serverTimestamp
} from 'firebase/firestore';
import { env } from './env.js';

let firebaseApp = null;
let firebaseAuth = null;
let firebaseDb = null;
let googleProvider = null;

if (env.hasFirebaseCredentials()) {
  try {
    firebaseApp = getApps().length === 0 ? initializeApp(env.firebase) : getApp();
    firebaseAuth = getAuth(firebaseApp);
    const dbName = env.firebase.databaseId || 'orvix-pdv-web';
    firebaseDb = getFirestore(firebaseApp, dbName);
    googleProvider = new GoogleAuthProvider();
    googleProvider.setCustomParameters({ prompt: 'select_account' });
    setPersistence(firebaseAuth, browserLocalPersistence).catch((err) => {
      console.warn('[Firebase Master] Persistence warning:', err);
    });
    console.info('[Firebase Master] Inicializado com sucesso conectado a orvix-pdv.');
  } catch (error) {
    console.error('[Firebase Master] Erro ao inicializar:', error);
  }
} else {
  console.warn('[Firebase Master] Credenciais não configuradas.');
}

export {
  firebaseApp,
  firebaseAuth,
  firebaseDb,
  googleProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  serverTimestamp
};

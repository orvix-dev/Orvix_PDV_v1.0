import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  updateProfile,
  signOut, 
  sendPasswordResetEmail,
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
      console.warn('Firebase persistence warning:', err);
    });
    console.info('[Firebase] Inicializado com sucesso (Auth + Firestore).');
  } catch (error) {
    console.error('[Firebase] Erro ao inicializar:', error);
  }
} else {
  console.warn('[Firebase] Credenciais não configuradas no .env. O sistema operará em Modo de Testes/Demo.');
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
  updateProfile,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  // Firestore
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

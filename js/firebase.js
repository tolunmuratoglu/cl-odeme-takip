// ============================================================
// Firebase Configuration & Initialization
// ============================================================
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  onAuthStateChanged,
  signOut
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  onSnapshot,
  setDoc
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

const firebaseConfig = {
  apiKey:            "AIzaSyCYqy0PZPUV23XIwcsS0sSRheIZpgqwn1s",
  authDomain:        "odeme-takip-b34e1.firebaseapp.com",
  projectId:         "odeme-takip-b34e1",
  storageBucket:     "odeme-takip-b34e1.firebasestorage.app",
  messagingSenderId: "985345280614",
  appId:             "1:985345280614:web:b27ab143ac17d987863ba7",
  measurementId:     "G-DBR8GPCQJ1"
};

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

// Expose to global scope so non-module scripts can access
window._auth = auth;
window._db   = db;
window._firebase = {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  onAuthStateChanged,
  signOut,
  collection, addDoc, getDocs, updateDoc, deleteDoc,
  doc, query, where, orderBy, onSnapshot, setDoc
};

// Auth state listener — switches between login and app screens
onAuthStateChanged(auth, (user) => {
  window._currentUser = user;
  if (user) {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('appScreen').style.display  = 'flex';
    if (typeof window.initApp === 'function') window.initApp(user);
  } else {
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('appScreen').style.display   = 'none';
  }
});

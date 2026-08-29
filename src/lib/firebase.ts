import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User } from "firebase/auth";
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc, onSnapshot, query, orderBy, limit, addDoc } from "firebase/firestore";
import config from "../../firebase-applet-config.json";

// Initialize Firebase App
const app = !getApps().length ? initializeApp(config) : getApp();

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app, config.firestoreDatabaseId || undefined);

export {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  addDoc,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
};
export type { User };

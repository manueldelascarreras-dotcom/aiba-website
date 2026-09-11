// Shared Firebase setup for the AI Business Association site + CMS.
// Config values below are safe to expose client-side (standard Firebase practice) —
// access is controlled by Firestore/Storage security rules and Firebase Auth, not by hiding this.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-storage.js";

const firebaseConfig = {
  projectId: "aiba-um",
  appId: "1:866111108584:web:4b5ab6da14a506224ae05d",
  storageBucket: "aiba-um.firebasestorage.app",
  apiKey: "AIzaSyDJk3jFesVR0Sxnp20Jp6_4teRDmyERqJE",
  authDomain: "aiba-um.firebaseapp.com",
  messagingSenderId: "866111108584"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

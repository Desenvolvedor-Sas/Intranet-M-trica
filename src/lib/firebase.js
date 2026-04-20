// src/lib/firebase.js
// ⚠️ Substitua pelos dados do SEU projeto Firebase
import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyCT1Qt3PHn7M--WWip6fZsCOxdudxCiCU4",
  authDomain: "gerenciamento-de-estoque-4a92b.firebaseapp.com",
  databaseURL: "https://gerenciamento-de-estoque-4a92b-default-rtdb.firebaseio.com",
  projectId: "gerenciamento-de-estoque-4a92b",
  storageBucket: "gerenciamento-de-estoque-4a92b.firebasestorage.app",
  messagingSenderId: "171388226835",
  appId: "1:171388226835:web:d85bfe66b2f68c3f2c5ee6"
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
export default app

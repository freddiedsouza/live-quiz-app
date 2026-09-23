import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY, line here
  authDomain: "live-quiz-app-b7d22.firebaseapp.com",
  databaseURL: "https://live-quiz-app-b7d22-default-rtdb.firebaseio.com",
  projectId: "live-quiz-app-b7d22",
  storageBucket: "live-quiz-app-b7d22.firebasestorage.app",
  messagingSenderId: "568352253829",
  appId: "1:568352253829:web:2b250bde98a92bfcf046ec"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
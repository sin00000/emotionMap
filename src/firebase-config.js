import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBx_O6JD2VMrl9VSPUVHEpdol3E3iqKWu0",
  authDomain: "emotion-map-9f26f.firebaseapp.com",
  projectId: "emotion-map-9f26f",
  storageBucket: "emotion-map-9f26f.firebasestorage.app",
  messagingSenderId: "907446993700",
  appId: "1:907446993700:web:e9c00c751e8a2a6be0e9b1",
  measurementId: "G-LFLEN3G802"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;

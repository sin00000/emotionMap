import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase-config.js';

// Hash the 6-digit code for security
async function hashCode(code) {
  const encoder = new TextEncoder();
  const data = encoder.encode(code);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Convert nickname to a unique email format
function nicknameToEmail(nickname) {
  // Create a unique email from nickname for Firebase Auth
  return `${nickname.toLowerCase().replace(/\s+/g, '_')}@emotionalmap.local`;
}

// Create a new account
export async function createAccount(nickname, code) {
  if (!nickname || nickname.trim().length < 2) {
    throw new Error('Nickname must be at least 2 characters long');
  }

  if (!/^\d{6}$/.test(code)) {
    throw new Error('Code must be exactly 4 digits');
  }

  const email = nicknameToEmail(nickname);
  const hashedCode = await hashCode(code);

  try {
    // Create the user with Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, code);
    const user = userCredential.user;

    // Create user document in Firestore
    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      nickname: nickname.trim(),
      codeHash: hashedCode,
      mandalaGraphicURL: '',
      createdAt: new Date().toISOString()
    });

    return {
      success: true,
      user: user,
      nickname: nickname.trim()
    };
  } catch (error) {
    if (error.code === 'auth/email-already-in-use') {
      throw new Error('This nickname is already taken');
    }
    throw error;
  }
}

// Sign in with nickname and code
export async function signIn(nickname, code) {
  if (!nickname || !code) {
    throw new Error('Nickname and code are required');
  }

  if (!/^\d{6}$/.test(code)) {
    throw new Error('Code must be exactly 4 digits');
  }

  const email = nicknameToEmail(nickname);

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, code);

    // Verify user exists in Firestore
    const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
    if (!userDoc.exists()) {
      throw new Error('User data not found');
    }

    return {
      success: true,
      user: userCredential.user,
      userData: userDoc.data()
    };
  } catch (error) {
    if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
      throw new Error('Invalid nickname or code');
    }
    throw error;
  }
}

// Sign out
export async function logout() {
  await signOut(auth);
}

// Listen to auth state changes
export function onAuthChange(callback) {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      callback({
        user: user,
        userData: userDoc.exists() ? userDoc.data() : null
      });
    } else {
      callback(null);
    }
  });
}

// Get current user data
export async function getCurrentUserData() {
  const user = auth.currentUser;
  if (!user) return null;

  const userDoc = await getDoc(doc(db, 'users', user.uid));
  return userDoc.exists() ? userDoc.data() : null;
}

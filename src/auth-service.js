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

  // 1. ⚠️ 수정: 4 digits -> 6 digits
  if (!/^\d{6}$/.test(code)) {
    throw new Error('Code must be exactly 6 digits');
  }

  const trimmedNickname = nickname.trim();
  const email = nicknameToEmail(trimmedNickname);
  const hashedCode = await hashCode(code);
  const now = new Date().toISOString();

  try {
    // 1. Create the user with Firebase Auth
    console.log('🔐 Step 1: Creating Firebase Auth user...');
    const userCredential = await createUserWithEmailAndPassword(auth, email, code);
    const user = userCredential.user;
    console.log('✅ Step 1 SUCCESS: Auth user created with UID:', user.uid);

    // 2. Create user document in Firestore (users/{uid})
    console.log('📝 Step 2: Creating Firestore user document...');
    try {
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        nickname: trimmedNickname,
        codeHash: hashedCode,
        mandalaGraphicURL: '',
        createdAt: now,
        updatedAt: now // 규칙에 맞게 updatedAt 추가 (필수 아님, 권장)
      });
      console.log('✅ Step 2 SUCCESS: User document created');
    } catch (firestoreError) {
      console.error('❌ Step 2 FAILED: Firestore user document error:', firestoreError.code, firestoreError.message);
      throw firestoreError;
    }

    // 3. ✨ 추가: Nickname document for uniqueness and security rules (nicknames/{nickname})
    console.log('📝 Step 3: Creating nickname document...');
    try {
      await setDoc(doc(db, 'nicknames', trimmedNickname), {
        uid: user.uid,
        createdAt: now,
      });
      console.log('✅ Step 3 SUCCESS: Nickname document created');
    } catch (nicknameError) {
      console.error('❌ Step 3 FAILED: Nickname document error:', nicknameError.code, nicknameError.message);
      throw nicknameError;
    }


    return {
      success: true,
      user: user,
      nickname: trimmedNickname
    };
  } catch (error) {
    // 닉네임 중복 처리: auth/email-already-in-use 에러는 곧 닉네임 중복을 의미합니다.
    if (error.code === 'auth/email-already-in-use') {
      throw new Error('This nickname is already taken');
    }
    // 다른 모든 에러는 그대로 던져서 콘솔에서 확인 가능하게 함
    console.error("Account creation failed:", error.code, error.message);
    throw error;
  }
}

// Sign in with nickname and code
export async function signIn(nickname, code) {
  if (!nickname || !code) {
    throw new Error('Nickname and code are required');
  }

  // 1. ⚠️ 수정: 4 digits -> 6 digits
  if (!/^\d{6}$/.test(code)) {
    throw new Error('Code must be exactly 6 digits');
  }

  const email = nicknameToEmail(nickname);

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, code);

    // Verify user exists in Firestore
    const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
    if (!userDoc.exists()) {
      // Auth 성공했으나 Firestore 문서가 없는 경우 (데이터 불일치)
      throw new Error('User data not found in database. Please contact support.');
    }

    return {
      success: true,
      user: userCredential.user,
      userData: userDoc.data()
    };
  } catch (error) {
    // 잘못된 자격 증명 처리
    if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
      throw new Error('Invalid nickname or code');
    }
    // 다른 모든 에러는 그대로 던져서 콘솔에서 확인 가능하게 함
    console.error("Sign in failed:", error.code, error.message);
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
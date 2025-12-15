import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot
} from 'firebase/firestore';
import { auth, db } from './firebase-config.js';

// Validate emotion keywords
const VALID_EMOTIONS = ['calm', 'affection', 'anxiety', 'avoidance', 'emptiness', 'impulse', 'tension'];

function validatePlace(placeData) {
  if (!placeData.realPlaceName || placeData.realPlaceName.trim().length === 0) {
    throw new Error('Place name is required');
  }

  if (typeof placeData.latitude !== 'number' || typeof placeData.longitude !== 'number') {
    throw new Error('Valid latitude and longitude are required');
  }

  if (placeData.intimacyScore < 0 || placeData.intimacyScore > 100) {
    throw new Error('Intimacy score must be between 0 and 100');
  }

  if (!Array.isArray(placeData.emotionKeywords) || placeData.emotionKeywords.length === 0 || placeData.emotionKeywords.length > 3) {
    throw new Error('Must select 1-3 emotion keywords');
  }

  const invalidEmotions = placeData.emotionKeywords.filter(e => !VALID_EMOTIONS.includes(e));
  if (invalidEmotions.length > 0) {
    throw new Error(`Invalid emotion keywords: ${invalidEmotions.join(', ')}`);
  }

  return true;
}

// Add a new place
export async function addPlace(placeData) {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User must be authenticated');
  }

  validatePlace(placeData);

  const newPlace = {
    realPlaceName: placeData.realPlaceName.trim(),
    latitude: placeData.latitude,
    longitude: placeData.longitude,
    intimacyScore: placeData.intimacyScore,
    emotionKeywords: placeData.emotionKeywords,
    memoryText: placeData.memoryText || '',
    themeSongURL: placeData.themeSongURL || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  // Add to user's places sub-collection
  const placesRef = collection(db, 'users', user.uid, 'places');
  const docRef = await addDoc(placesRef, newPlace);

  return {
    placeId: docRef.id,
    ...newPlace
  };
}

// Get all places for the current user
export async function getUserPlaces() {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User must be authenticated');
  }

  const placesRef = collection(db, 'users', user.uid, 'places');
  const querySnapshot = await getDocs(placesRef);

  const places = [];
  querySnapshot.forEach((doc) => {
    places.push({
      placeId: doc.id,
      ...doc.data()
    });
  });

  return places;
}

// Get a specific place by ID
export async function getPlace(placeId) {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User must be authenticated');
  }

  const placeRef = doc(db, 'users', user.uid, 'places', placeId);
  const placeDoc = await getDoc(placeRef);

  if (!placeDoc.exists()) {
    throw new Error('Place not found');
  }

  return {
    placeId: placeDoc.id,
    ...placeDoc.data()
  };
}

// Update a place
export async function updatePlace(placeId, updates) {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User must be authenticated');
  }

  // Validate updates if they include critical fields
  if (updates.intimacyScore !== undefined || updates.emotionKeywords !== undefined) {
    const currentPlace = await getPlace(placeId);
    const updatedPlace = { ...currentPlace, ...updates };
    validatePlace(updatedPlace);
  }

  const placeRef = doc(db, 'users', user.uid, 'places', placeId);
  await updateDoc(placeRef, {
    ...updates,
    updatedAt: new Date().toISOString()
  });

  return getPlace(placeId);
}

// Delete a place
export async function deletePlace(placeId) {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User must be authenticated');
  }

  const placeRef = doc(db, 'users', user.uid, 'places', placeId);
  await deleteDoc(placeRef);

  return { success: true, placeId };
}

// Listen to real-time updates for all user places
export function onPlacesChange(callback) {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User must be authenticated');
  }

  const placesRef = collection(db, 'users', user.uid, 'places');

  return onSnapshot(placesRef, (snapshot) => {
    const places = [];
    snapshot.forEach((doc) => {
      places.push({
        placeId: doc.id,
        ...doc.data()
      });
    });
    callback(places);
  });
}

// Get places by emotion keyword
export async function getPlacesByEmotion(emotion) {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User must be authenticated');
  }

  if (!VALID_EMOTIONS.includes(emotion)) {
    throw new Error('Invalid emotion keyword');
  }

  const placesRef = collection(db, 'users', user.uid, 'places');
  const q = query(placesRef, where('emotionKeywords', 'array-contains', emotion));
  const querySnapshot = await getDocs(q);

  const places = [];
  querySnapshot.forEach((doc) => {
    places.push({
      placeId: doc.id,
      ...doc.data()
    });
  });

  return places;
}

export { VALID_EMOTIONS };

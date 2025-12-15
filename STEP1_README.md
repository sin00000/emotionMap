# Emotional Map - Step 1 Complete

## ✅ What's Implemented

This is a focused implementation of **Step 1: Firebase Authentication & Data Model** for the Emotional Map project.

### Features Implemented

#### 1. **Custom Authentication System**
- Nickname + 6-digit code authentication
- SHA-256 hashing for secure password storage
- Firebase Authentication integration
- Tab-based UI (Sign In / Create Account)

#### 2. **Users Collection (Firestore)**
Each user document contains:
- `uid`: Firebase Authentication UID
- `nickname`: User's display name
- `codeHash`: SHA-256 hash of the 6-digit code
- `mandalaGraphicURL`: Placeholder for Step 2 (empty string)
- `createdAt`: ISO timestamp

#### 3. **Places Sub-collection (Firestore)**
Each place document contains all required fields:
- `realPlaceName`: Display name
- `latitude`, `longitude`: GPS coordinates
- `intimacyScore`: Number (0-100)
- `emotionKeywords`: Array of strings (e.g., ["calm", "affection"])
- `memoryText`: User's memory description
- `themeSongURL`: Path to MP3 file
- `createdAt`: ISO timestamp

#### 4. **Interactive Dashboard**
- Displays user information from Firestore
- Shows all places in a visual card layout
- Real-time updates when places are added
- "Add Sample Place" button to test the data structure
- Logout functionality

## 🚀 Quick Start

### 1. Enable Firebase Services

**Go to [Firebase Console](https://console.firebase.google.com/project/emotion-map-9f26f)**

#### Enable Authentication:
1. Click **Authentication** → **Get Started**
2. Click **Sign-in method** tab
3. Enable **Email/Password** provider
4. Click **Save**

#### Set Firestore Rules:
1. Click **Firestore Database**
2. Click **Rules** tab
3. Copy and paste:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;

      match /places/{placeId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

4. Click **Publish**

### 2. Run the Application

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

### 3. Test the Implementation

#### Create an Account
1. Click **Create Account** tab
2. Enter a nickname (e.g., "TestUser")
3. Enter a 6-digit code (e.g., "123456")
4. Confirm the code
5. Click **Create Account**

#### View Your Dashboard
You'll see:
- Your user data from Firestore
- The Firebase data structure documentation
- An "Add Sample Place" button

#### Add a Sample Place
1. Click **"Add Sample Place"**
2. The sample place will be added to Firestore
3. It will appear automatically in "Your Places" section
4. The data structure matches the specification exactly

#### Inspect the Data in Firebase Console
1. Go to [Firestore Database](https://console.firebase.google.com/project/emotion-map-9f26f/firestore)
2. Navigate to: `users/{your-uid}/places/{place-id}`
3. You'll see all the fields defined in the specification

## 📁 File Structure

```
viteFormat_ver250929/
├── index.html          # Step 1 UI (Auth + Dashboard)
├── src/
│   ├── main.js         # All Firebase logic (400+ lines, well-commented)
│   └── style.css       # Complete styling for auth and dashboard
└── package.json        # Firebase dependency
```

## 🔍 Code Highlights

### Authentication (`src/main.js`)

```javascript
// Lines 93-130: Create Account
async function createAccount(nickname, code) {
  // Validates nickname and 6-digit code
  // Hashes the code with SHA-256
  // Creates Firebase Auth user
  // Creates Firestore user document
}

// Lines 133-154: Sign In
async function signIn(nickname, code) {
  // Converts nickname to email format
  // Signs in with Firebase Auth
}
```

### Data Model (`src/main.js`)

```javascript
// Lines 168-194: Add Sample Place
async function addSamplePlace(userId) {
  const samplePlace = {
    realPlaceName: 'My Home',
    latitude: 37.5665,
    longitude: 126.9780,
    intimacyScore: 85,
    emotionKeywords: ['calm', 'affection'],
    memoryText: 'The place where I feel most comfortable...',
    themeSongURL: 'song/calm1.mp3',
    createdAt: new Date().toISOString()
  };

  // Adds to: users/{userId}/places/{auto-id}
  const placesRef = collection(db, 'users', userId, 'places');
  await addDoc(placesRef, samplePlace);
}
```

### Real-time Updates (`src/main.js`)

```javascript
// Lines 239-253: Listen to Places
function listenToPlaces(userId) {
  const placesRef = collection(db, 'users', userId, 'places');

  return onSnapshot(placesRef, (snapshot) => {
    const places = [];
    snapshot.forEach((doc) => {
      places.push({ placeId: doc.id, ...doc.data() });
    });
    displayPlaces(places); // Auto-updates UI
  });
}
```

## 🎯 What You Can Test

### ✅ Authentication
- Create multiple accounts with different nicknames
- Sign in and out
- Error handling (duplicate nicknames, wrong code, etc.)

### ✅ Data Structure
- Add sample places
- See real-time updates
- View the exact Firestore structure
- Verify all fields are present

### ✅ Security
- Codes are hashed with SHA-256
- Users can only access their own data
- Firebase Security Rules enforce authentication

## 📊 Firebase Data Structure

After creating an account and adding a place, your Firestore will look like:

```
users/
  {your-uid}/
    ├─ nickname: "TestUser"
    ├─ codeHash: "03ac674..."
    ├─ mandalaGraphicURL: ""
    └─ createdAt: "2025-12-15T..."

    places/
      {auto-generated-id}/
        ├─ realPlaceName: "My Home"
        ├─ latitude: 37.5665
        ├─ longitude: 126.9780
        ├─ intimacyScore: 85
        ├─ emotionKeywords: ["calm", "affection"]
        ├─ memoryText: "The place where..."
        ├─ themeSongURL: "song/calm1.mp3"
        └─ createdAt: "2025-12-15T..."
```

## 🔧 How It Works

### 1. Nickname to Email Conversion

Firebase Authentication requires email addresses, but your specification uses nicknames. The solution:

```javascript
function nicknameToEmail(nickname) {
  return `${nickname.toLowerCase().replace(/\s+/g, '_')}@emotionalmap.local`;
}

// "John Doe" → "john_doe@emotionalmap.local"
```

This is invisible to the user—they only see and use their nickname.

### 2. SHA-256 Code Hashing

```javascript
async function hashCode(code) {
  const encoder = new TextEncoder();
  const data = encoder.encode(code);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return hashArrayToHex(hashBuffer);
}

// "123456" → "03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4"
```

The hashed code is stored in Firestore, never the plain text.

### 3. Hierarchical Data Model

```javascript
// Users collection
users/{uid}  // Top-level user document

// Places sub-collection
users/{uid}/places/{placeId}  // Nested under user
```

This structure ensures:
- Each user's places are isolated
- Automatic security via Firestore rules
- Clean data organization

## 🐛 Troubleshooting

### "Firebase: Error (auth/email-already-in-use)"
- This nickname is already taken
- Try a different nickname or sign in with existing credentials

### "Missing or insufficient permissions"
- Make sure you published the Firestore Security Rules
- Rules must allow authenticated users to read/write their own data

### "Email/Password provider not enabled"
- Go to Firebase Console → Authentication
- Enable the Email/Password sign-in method

### Can't see places in Firestore Console
- Make sure you clicked "Add Sample Place"
- Check the correct database (should be `(default)`)
- Look under: `users → {your-uid} → places`

## 📚 Next Steps

This Step 1 implementation provides the foundation for:

- **Step 2**: Mandala Creation Interface (8-quadrant canvas, Firebase Storage)
- **Step 3**: Map Visualization (GPS tracking, intimacy-based distortion)
- **Step 4**: Glow Effects (emotion-based colors)
- **Step 5**: BGM System (audio playback, pathfinding)
- **Step 6**: UI Interactions (tap/long-press, real-time updates)

The data model is complete and ready to support all future steps!

## 📞 Support

Check the browser console (F12) for detailed logs:
- ✅ Success messages are prefixed with green checkmarks
- ❌ Errors are clearly marked

All Firebase operations are logged for easy debugging.

---

**Step 1 Status:** ✅ **COMPLETE**

All authentication and data model requirements have been implemented and tested!

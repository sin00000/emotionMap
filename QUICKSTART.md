# Quick Start Guide

Get your Emotional Map prototype running in 5 minutes!

## Prerequisites

- Node.js installed (v18 or higher)
- Firebase project already created ✅ (You have this!)
- Modern web browser (Chrome, Firefox, Safari, or Edge)

## Step 1: Enable Firebase Authentication

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **emotion-map-9f26f**
3. Click **Authentication** in the left sidebar
4. Click **Get Started** (if not already enabled)
5. Click **Sign-in method** tab
6. Enable **Email/Password** provider:
   - Click on "Email/Password"
   - Toggle the first switch to **Enable**
   - Click **Save**

## Step 2: Set Firestore Rules

1. In Firebase Console, go to **Firestore Database**
2. Click **Rules** tab
3. Replace with these rules:

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

## Step 3: Set Storage Rules

1. In Firebase Console, go to **Storage**
2. Click **Rules** tab
3. Replace with these rules:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /mandalas/{userId}/{filename} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

4. Click **Publish**

## Step 4: Install Dependencies

```bash
npm install
```

## Step 5: Run Development Server

```bash
npm run dev
```

The app will open at: `http://localhost:5173`

## Step 6: Create Your First Account

1. Click **Create Account** tab
2. Enter a nickname (e.g., "TestUser")
3. Enter a 6-digit code (e.g., "123456")
4. Confirm the code
5. Click **Create Account**

## Step 7: Create Your Mandala

1. Click on color swatches to select a color
2. Click on mandala quadrants to paint them
3. Try enabling **"Set Symmetrical"** for mirrored patterns
4. Click **Save Mandala** (or skip for now)

## Step 8: Add Your First Place

1. Click the **+** button (top right)
2. Fill in the form:
   - **Name**: "My Home"
   - **Location**: Click "Use Current" (allow location access)
   - **Intimacy Score**: Set to 90 (high intimacy)
   - **Emotions**: Select "calm" and "affection"
   - **Memory**: "Where I feel most comfortable"
3. Click **Add Place**

## Step 9: Explore the Map

- You'll see your location marked as **"나"**
- Your place appears as a **white mandala** with a **pink-cyan glow**
- **Tap** the mandala to see the memory
- **Long press** to delete it

## Optional: Add Music Files

1. Create music directory:
   ```bash
   mkdir -p public/song
   ```

2. Add MP3 files (see `public/song/README.md` for details)

3. Recommended starter set:
   ```
   calm1.mp3
   affection1.mp3
   anxiety1.mp3
   ```

## Testing Features

### Test Intimacy Distortion
1. Add two places with different intimacy scores
2. One with score 90 (high intimacy)
3. One with score 10 (low intimacy)
4. Notice how the low intimacy place appears farther away

### Test Avoidance Zones
1. Add a place with:
   - Intimacy: 15
   - Emotion: "avoidance"
2. Try to navigate there (it should warn you)

### Test Emotion Glow Blending
1. Add a place with 2-3 emotion keywords
2. Notice how the glow color blends
3. The glow intensity matches intimacy score

## Troubleshooting

### Can't sign up?
- Check that Email/Password authentication is enabled in Firebase
- Check browser console for errors

### Can't add places?
- Verify Firestore rules are published
- Allow location access when prompted

### Can't save mandala?
- Verify Storage rules are published
- Check browser console for errors

### Map not showing?
- Refresh the page
- Clear browser cache
- Check that you're signed in

## Next Steps

- Read the full [README.md](README.md) for detailed documentation
- Customize colors and emotions
- Add more places
- Experiment with different intimacy levels
- Test the audio system with music files

## Support

Check the browser console (F12) for detailed error messages if something doesn't work.

Common issues are usually:
1. Firebase rules not published
2. Location permissions denied
3. Missing dependencies (run `npm install` again)

## Production Deployment

When ready to deploy:

```bash
npm run build
```

Deploy the `dist/` folder to:
- Firebase Hosting
- Vercel
- Netlify
- Any static hosting service

Enjoy your Emotional Map! 🗺️✨

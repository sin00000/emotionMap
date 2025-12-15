# Emotional Map (Intimacy-Based Navigation System)

A high-fidelity web prototype that visualizes a map distorted by the user's emotional intimacy and memory towards specific locations, replacing standard geographical maps.

## Features

### Core Functionality

1. **Custom Authentication**
   - Sign up/Sign in using Nickname + 6-digit code
   - Secure password hashing with SHA-256
   - User data stored in Firebase Firestore

2. **Personal Mandala Creator**
   - 8-quadrant circular mandala design
   - Color palette selection
   - Symmetrical painting mode (mirrored quadrants)
   - Firebase Storage integration
   - Used as user's visual identity on the map

3. **Emotional Map Visualization**
   - Real-time GPS location tracking
   - Intimacy-based spatial distortion algorithm
   - High intimacy → places pulled closer
   - Low intimacy/avoidance → places pushed away
   - Unrecognized space rendered as blank/black

4. **Emotion-Based Place Markers**
   - White mandala icons with emotion-based glow
   - 7 emotion keywords: calm, affection, anxiety, avoidance, emptiness, impulse, tension
   - Glow color blending for multiple emotions
   - Glow intensity scales with intimacy score (0-100)

5. **BGM & Audio System**
   - Location-based theme song playback
   - Automatic volume fading based on proximity
   - Mute zones near avoidance locations
   - Smooth audio transitions

6. **Intelligent Pathfinding**
   - Avoidance zones block route generation
   - High-intimacy routes prioritized
   - Alternative destination suggestions
   - Visual path rendering on map

7. **Interactive UI**
   - Short tap: Display place name and memory
   - Long press: Delete place confirmation
   - Real-time map redraw on GPS movement

## Project Structure

```
viteFormat_ver250929/
├── index.html              # Main HTML structure
├── package.json            # Project dependencies
├── vite.config.js          # Vite configuration
└── src/
    ├── main.js             # Application entry point
    ├── style.css           # Global styles
    ├── firebase-config.js  # Firebase initialization
    ├── auth-service.js     # Authentication logic
    ├── places-service.js   # Firestore places CRUD
    ├── mandala-creator.js  # Mandala creation interface
    ├── emotional-map.js    # Core map visualization
    ├── audio-manager.js    # BGM and audio control
    └── pathfinding.js      # Avoidance-based routing
```

## Installation & Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Firebase Configuration

Your Firebase project is already configured in [src/firebase-config.js](src/firebase-config.js).

**Required Firebase Services:**
- Authentication (Email/Password provider must be enabled)
- Cloud Firestore
- Cloud Storage

**Enable Authentication:**
1. Go to Firebase Console → Authentication
2. Enable "Email/Password" provider
3. No additional configuration needed

**Firestore Database Structure:**
```
users/
  {uid}/
    - nickname: string
    - codeHash: string
    - mandalaGraphicURL: string
    - createdAt: string

    places/
      {placeId}/
        - realPlaceName: string
        - latitude: number
        - longitude: number
        - intimacyScore: number (0-100)
        - emotionKeywords: array[string]
        - memoryText: string
        - themeSongURL: string
        - createdAt: string
        - updatedAt: string
```

**Storage Structure:**
```
mandalas/
  {uid}/
    mandala_{timestamp}.png
```

### 3. Add Music Files (Optional)

For the BGM feature to work, create a `public/song/` directory and add MP3 files:

```bash
mkdir -p public/song
```

**Recommended File Structure:**
```
public/song/
├── calm1.mp3
├── calm2.mp3
├── calm3.mp3
├── affection1.mp3
├── affection2.mp3
├── affection3.mp3
├── anxiety1.mp3
├── anxiety2.mp3
├── anxiety3.mp3
├── avoidance1.mp3
├── avoidance2.mp3
├── emptiness1.mp3
├── emptiness2.mp3
├── impulse1.mp3
├── impulse2.mp3
├── tension1.mp3
├── tension2.mp3
└── tension3.mp3
```

**Note:** If you don't add music files, the app will still work but without audio playback.

### 4. Run Development Server

```bash
npm run dev
```

The app will open at `http://localhost:5173`

### 5. Build for Production

```bash
npm run build
```

The production build will be in the `dist/` folder.

## Usage Guide

### First Time Setup

1. **Create Account**
   - Enter a unique nickname
   - Create a 6-digit code (your password)
   - Confirm the code

2. **Create Your Mandala**
   - Click on colored squares to select a color
   - Click on the mandala quadrants to paint
   - Enable "Symmetrical Mode" for mirrored designs
   - Click "Save Mandala" or "Skip for now"

### Adding Places

1. Click the **+** button in the top right
2. Fill in the place information:
   - **Place Name**: Give it a meaningful name
   - **Location**: Use "Use Current" or enter coordinates
   - **Intimacy Score**: Slider from 0 (distant) to 100 (intimate)
   - **Emotions**: Select 1-3 emotion keywords
   - **Memory**: Write your personal memory of this place
3. Click "Add Place"

### Interacting with the Map

- **Your Location**: Marked as "나" (Korean for "me") at the center
- **Places**: White mandala icons with colored glows
- **Short Tap**: View place name and memory
- **Long Press**: Delete place (confirmation required)
- **Glow Colors**:
  - Cyan: Calm
  - Pink: Affection
  - Yellow: Anxiety
  - Indigo: Avoidance
  - Gray: Emptiness
  - Orange: Impulse
  - Red: Tension

### Map Distortion Rules

- **High Intimacy (>80)**: Place appears closer than actual distance
- **Low Intimacy (<20)**: Place appears farther away
- **Avoidance Keyword**: Place pushed to the edges, creates a "mute zone"
- **Unvisited Areas**: Remain black (unrecognized space)

### Audio System

- Theme songs play when you approach a place
- Volume increases with proximity
- Entering an avoidance zone mutes all audio
- Multiple songs can blend together

## Technical Details

### Emotion → Color Mapping

| Emotion   | Color Code | RGB          |
|-----------|------------|--------------|
| Calm      | #64FFDA    | (100,255,218)|
| Affection | #FF4081    | (255,64,129) |
| Anxiety   | #FFEB3B    | (255,235,59) |
| Avoidance | #512DA8    | (81,45,168)  |
| Emptiness | #B0BEC5    | (176,190,197)|
| Impulse   | #FF9800    | (255,152,0)  |
| Tension   | #F44336    | (244,67,54)  |

### Distortion Algorithm

The map applies a mathematical transformation to GPS coordinates:

1. Convert lat/lng to screen coordinates
2. Calculate intimacy factor
3. Apply push/pull transformation:
   - Low intimacy: `position *= (1 + (1 - intimacy/100) * 2)`
   - High intimacy: `position *= (1 - intimacy/100 * 0.6)`
4. Apply inter-place attraction based on mutual intimacy

### Browser Compatibility

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support (may need location permission)
- Mobile browsers: Full touch support

### Permissions Required

- **Location**: For GPS tracking and real-time map updates
- **Audio**: For BGM playback (user gesture required)

## Development Notes

### Adding New Emotion Keywords

1. Add to `EMOTION_COLORS` in [src/emotional-map.js](src/emotional-map.js)
2. Add to `VALID_EMOTIONS` in [src/places-service.js](src/places-service.js)
3. Update HTML emotion checkboxes in [index.html](index.html)
4. Add corresponding music files

### Customizing Audio Behavior

Edit [src/audio-manager.js](src/audio-manager.js):
- `proximityThreshold`: Distance (meters) to start playing
- `muteZoneRadius`: Distance (meters) for avoidance mute
- `fadeSpeed`: Audio fade speed (0.01 = slow, 0.1 = fast)
- `masterVolume`: Global volume (0-1)

### Customizing Map Distortion

Edit [src/emotional-map.js](src/emotional-map.js) → `calculateDistortedPosition()`:
- Adjust push/pull factors
- Modify intimacy thresholds
- Change spatial transformation equations

## Troubleshooting

### "User must be authenticated" errors
- Make sure Email/Password authentication is enabled in Firebase Console
- Check that you're signed in

### Map not showing places
- Ensure you've added at least one place
- Check browser console for errors
- Verify Firebase Firestore rules allow read/write

### Audio not playing
- Add music files to `public/song/` directory
- Check browser console for 404 errors
- Ensure browser allows audio autoplay (click anywhere on the page first)

### Location not updating
- Grant location permissions in browser
- Check that HTTPS is enabled (required for geolocation)
- Try refreshing the page

## Firebase Security Rules

### Firestore Rules (Recommended)

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

### Storage Rules (Recommended)

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

## Credits

Built with:
- [Vite](https://vitejs.dev/) - Frontend build tool
- [Firebase](https://firebase.google.com/) - Backend services
- Vanilla JavaScript - No frameworks required

## License

This project is for educational/prototype purposes.

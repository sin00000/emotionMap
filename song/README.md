# BGM Files Directory

This directory should contain MP3 audio files for the emotional map's location-based music system.

## Required Files

Add MP3 files following this naming convention:

```
calm1.mp3, calm2.mp3, calm3.mp3
affection1.mp3, affection2.mp3, affection3.mp3
anxiety1.mp3, anxiety2.mp3, anxiety3.mp3
avoidance1.mp3, avoidance2.mp3
emptiness1.mp3, emptiness2.mp3
impulse1.mp3, impulse2.mp3
tension1.mp3, tension2.mp3, tension3.mp3
```

## Audio Specifications

- **Format**: MP3
- **Recommended Bitrate**: 128-192 kbps (to reduce file size)
- **Duration**: 2-5 minutes (songs will loop)
- **Volume**: Normalized to prevent clipping

## Emotion → Music Mapping

Choose music that matches these emotional themes:

### Calm
- Soft ambient music
- Nature sounds
- Gentle piano/acoustic guitar
- Examples: meditation music, lo-fi calm beats

### Affection
- Warm, uplifting melodies
- Romantic instrumentals
- Positive emotional tones
- Examples: love themes, heartwarming soundtracks

### Anxiety
- Tense, uncertain atmospheres
- Minor keys
- Slightly dissonant sounds
- Examples: suspense music, anxious ambience

### Avoidance
- Dark, brooding tones
- Heavy atmospheres
- Uncomfortable soundscapes
- Examples: dark ambient, ominous drones

### Emptiness
- Minimal, sparse compositions
- Hollow, echoey sounds
- Melancholic ambience
- Examples: empty space themes, minimal ambient

### Impulse
- Energetic, fast-paced
- Driving rhythms
- Urgent feelings
- Examples: uptempo electronic, intense beats

### Tension
- High stress atmospheres
- Dramatic crescendos
- Aggressive tones
- Examples: action music, intense soundtracks

## How It Works

When a user adds a place with specific emotion keywords, the system:

1. Randomly selects ONE song from the combined pool of selected emotions
2. Stores the song path in the place's data
3. Plays that song when the user approaches the location
4. Fades volume based on proximity (closer = louder)
5. Mutes audio when entering "avoidance zones"

## Free Music Resources

You can find royalty-free music from:

- [Free Music Archive](https://freemusicarchive.org/)
- [Incompetech](https://incompetech.com/music/)
- [YouTube Audio Library](https://www.youtube.com/audiolibrary)
- [Bensound](https://www.bensound.com/)
- [Purple Planet](https://www.purple-planet.com/)

## Optional

The app will work without music files, but the BGM feature will not function. You can:

1. Leave this directory empty (no music playback)
2. Add partial files (only some emotions will have music)
3. Use placeholder silent tracks for testing

## Testing

After adding files, test by:

1. Creating a place with emotion keywords
2. Check browser console for any 404 errors
3. Walk/move to the location (or simulate GPS)
4. Verify audio plays and fades correctly

export class AudioManager {
  constructor() {
    this.mainBGM = null;
    this.themeSongs = new Map(); // placeId -> Audio object
    this.currentVolumes = new Map(); // placeId -> volume (0-1)
    this.masterVolume = 0.7;
    this.fadeSpeed = 0.02;
    this.proximityThreshold = 100; // meters (simulated)
    this.muteZoneRadius = 50; // meters (simulated)
    this.isInMuteZone = false;
    this.animationFrame = null;

    this.init();
  }

  init() {
    // Create main background music (if available)
    // You can add a default ambient track here
    this.setupMainBGM();
  }

  setupMainBGM() {
    // Optional: Load a default ambient track
    // this.mainBGM = new Audio('song/ambient.mp3');
    // this.mainBGM.loop = true;
    // this.mainBGM.volume = 0;
  }

  playMainBGM() {
    if (this.mainBGM && this.mainBGM.paused) {
      this.mainBGM.play().catch(e => console.warn('Could not play main BGM:', e));
    }
  }

  stopMainBGM() {
    if (this.mainBGM) {
      this.mainBGM.pause();
      this.mainBGM.currentTime = 0;
    }
  }

  // Load theme song for a place
  loadThemeSong(placeId, songURL) {
    if (!songURL || this.themeSongs.has(placeId)) {
      return;
    }

    try {
      const audio = new Audio(songURL);
      audio.loop = true;
      audio.volume = 0;
      audio.preload = 'auto';

      this.themeSongs.set(placeId, audio);
      this.currentVolumes.set(placeId, 0);

      // Preload the audio
      audio.load();
    } catch (error) {
      console.warn(`Could not load theme song for place ${placeId}:`, error);
    }
  }

  // Load all theme songs from places
  loadAllThemeSongs(places) {
    places.forEach(place => {
      if (place.themeSongURL) {
        this.loadThemeSong(place.placeId, place.themeSongURL);
      }
    });
  }

  // Calculate distance between two GPS coordinates (simplified)
  calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371e3; // Earth radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lng2 - lng1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }

  // Update audio based on user location
  updateAudioForLocation(userLocation, places) {
    let inMuteZone = false;
    const targetVolumes = new Map();

    places.forEach(place => {
      const distance = this.calculateDistance(
        userLocation.lat,
        userLocation.lng,
        place.latitude,
        place.longitude
      );

      // Check if in avoidance/mute zone
      const isAvoidanceZone = place.emotionKeywords.includes('avoidance') || place.intimacyScore < 20;
      if (isAvoidanceZone && distance < this.muteZoneRadius) {
        inMuteZone = true;
      }

      // Calculate target volume based on proximity
      let targetVolume = 0;

      if (distance < this.proximityThreshold) {
        // Fade in based on proximity
        const proximityFactor = 1 - (distance / this.proximityThreshold);
        targetVolume = proximityFactor * this.masterVolume;

        // Adjust volume based on intimacy score
        targetVolume *= (place.intimacyScore / 100);
      }

      targetVolumes.set(place.placeId, targetVolume);
    });

    // Apply mute zone
    if (inMuteZone) {
      this.isInMuteZone = true;
      // Fade all audio to silence
      targetVolumes.forEach((vol, placeId) => {
        targetVolumes.set(placeId, 0);
      });

      // Fade main BGM to silence
      if (this.mainBGM) {
        this.fadeAudio(this.mainBGM, 0);
      }
    } else {
      this.isInMuteZone = false;
      // Restore main BGM
      if (this.mainBGM) {
        this.fadeAudio(this.mainBGM, this.masterVolume * 0.3);
      }
    }

    // Apply smooth fade to all theme songs
    targetVolumes.forEach((targetVol, placeId) => {
      const audio = this.themeSongs.get(placeId);
      if (audio) {
        this.fadeAudio(audio, targetVol);

        // Play audio if volume > 0 and not playing
        if (targetVol > 0 && audio.paused) {
          audio.play().catch(e => console.warn(`Could not play theme song for ${placeId}:`, e));
        }

        // Pause audio if volume is 0
        if (targetVol === 0 && !audio.paused && audio.volume < 0.01) {
          audio.pause();
        }
      }
    });
  }

  // Smooth fade audio to target volume
  fadeAudio(audio, targetVolume) {
    if (!audio) return;

    const currentVolume = audio.volume;
    const volumeDiff = targetVolume - currentVolume;

    if (Math.abs(volumeDiff) < 0.01) {
      audio.volume = targetVolume;
      return;
    }

    const step = volumeDiff > 0 ? this.fadeSpeed : -this.fadeSpeed;
    const newVolume = Math.max(0, Math.min(1, currentVolume + step));
    audio.volume = newVolume;
  }

  // Start continuous audio update loop
  startAudioLoop(getUserLocation, getPlaces) {
    const updateLoop = () => {
      const userLocation = getUserLocation();
      const places = getPlaces();

      if (userLocation && places) {
        this.updateAudioForLocation(userLocation, places);
      }

      this.animationFrame = requestAnimationFrame(updateLoop);
    };

    updateLoop();
  }

  // Stop audio loop
  stopAudioLoop() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }

  // Cleanup
  cleanup() {
    this.stopAudioLoop();
    this.stopMainBGM();

    this.themeSongs.forEach(audio => {
      audio.pause();
      audio.src = '';
    });

    this.themeSongs.clear();
    this.currentVolumes.clear();
  }

  // Set master volume
  setMasterVolume(volume) {
    this.masterVolume = Math.max(0, Math.min(1, volume));
  }

  // Get current status
  getStatus() {
    return {
      isInMuteZone: this.isInMuteZone,
      activeSongs: Array.from(this.themeSongs.entries())
        .filter(([id, audio]) => !audio.paused)
        .map(([id]) => id),
      volumes: Object.fromEntries(this.currentVolumes)
    };
  }
}

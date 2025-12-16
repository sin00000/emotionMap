/**
 * AudioManager - Emotion-based BGM system
 *
 * Core principle: Routes without music DO NOT EXIST.
 * - Intimacy < 6 = 무음 지대 (silence zones, no passage)
 * - Closer to silence zone → volume decreases
 * - Multiple keywords → sequential playback (NOT mixing)
 * - Neutral state (far from all places) → drone oscillator
 */

export class AudioManager {
  constructor() {
    // Place data
    this.places = [];
    this.userNormal = null;

    // Active track state
    this.activePlaceId = null;
    this.activeKeywords = [];
    this.currentKeywordIndex = 0;
    this.currentAudio = null;

    // Neutral state (drone oscillator)
    this.isNeutral = false;
    this.droneOscillator = null;
    this.droneGain = null;
    this.audioContext = null;
    this.droneLFO = null;

    // Volume control
    this.currentVolume = 1.0;
    this.masterVolume = 1.0;

    // Song counts per emotion keyword (based on actual files in /public/song/)
    this.songCounts = {
      calm: 4,
      affection: 4,
      anxiety: 4,
      avoidance: 3,
      emptiness: 3,
      impulse: 5,
      tension: 4
    };

    console.log('🎵 AudioManager initialized');
  }

  /**
   * Pick random song for a keyword
   * @param {string} keyword - Emotion keyword (calm, affection, etc.)
   * @returns {string} - Song URL (/song/{keyword}{n}.mp3)
   */
  pickRandomSong(keyword) {
    const count = this.songCounts[keyword] || 1;
    const randomNum = Math.floor(Math.random() * count) + 1;
    // Use BASE_URL for correct path in both dev and production
    const basePath = import.meta.env.BASE_URL || '/';
    const url = `${basePath}song/${keyword}${randomNum}.mp3`.replace('//', '/');
    console.log(`🎵 Selected: ${url}`);
    return url;
  }

  /**
   * ⭐ CORE FUNCTION: Play next keyword track
   * Uses onended event to cycle through keywords sequentially
   * ❌ NO setTimeout/timers
   * ⭕ Only onended triggers next track
   */
  playNextKeywordTrack() {
    if (!this.activeKeywords || this.activeKeywords.length === 0) {
      console.log('🎵 No active keywords, stopping track');
      this.stopTrack();
      return;
    }

    const keyword = this.activeKeywords[this.currentKeywordIndex];
    const url = this.pickRandomSong(keyword);

    const audio = new Audio(url);
    audio.volume = this.currentVolume * this.masterVolume;
    audio.loop = false; // ❌ NO LOOP - use onended

    // ⭐ onended: Trigger next track when current track finishes
    audio.onended = () => {
      console.log(`🎵 Track ended: ${keyword}, moving to next`);
      this.currentKeywordIndex = (this.currentKeywordIndex + 1) % this.activeKeywords.length;
      this.playNextKeywordTrack(); // 🔥 Recursive call on track end
    };

    audio.onerror = (e) => {
      console.warn(`❌ Failed to load ${url}:`, e);
      // On error, skip to next keyword
      this.currentKeywordIndex = (this.currentKeywordIndex + 1) % this.activeKeywords.length;
      this.playNextKeywordTrack();
    };

    // Stop previous track
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.onended = null;
      this.currentAudio = null;
    }

    this.currentAudio = audio;
    audio.play().catch(e => console.warn('Could not play audio:', e));

    console.log(`🎵 Now playing: ${keyword} (${this.currentKeywordIndex + 1}/${this.activeKeywords.length})`);
  }

  /**
   * Start neutral drone oscillator
   * Specs: sine wave, 45-70Hz, LFO modulation
   * @param {number} volume - Drone volume (0-1)
   */
  startNeutralDrone(volume) {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    if (this.droneOscillator) {
      this.stopNeutralDrone();
    }

    // Main oscillator (low drone)
    this.droneOscillator = this.audioContext.createOscillator();
    this.droneOscillator.type = 'sine';
    this.droneOscillator.frequency.value = 55; // 55Hz base frequency

    // LFO for subtle frequency modulation
    this.droneLFO = this.audioContext.createOscillator();
    this.droneLFO.type = 'sine';
    this.droneLFO.frequency.value = 0.2; // 0.2Hz (slow wobble)

    const lfoGain = this.audioContext.createGain();
    lfoGain.gain.value = 5; // ±5Hz modulation

    this.droneLFO.connect(lfoGain);
    lfoGain.connect(this.droneOscillator.frequency);

    // Volume control
    this.droneGain = this.audioContext.createGain();
    this.droneGain.gain.value = volume;

    this.droneOscillator.connect(this.droneGain);
    this.droneGain.connect(this.audioContext.destination);

    this.droneOscillator.start();
    this.droneLFO.start();

    console.log(`🎵 Neutral drone started (volume: ${volume.toFixed(3)})`);
  }

  /**
   * Stop neutral drone
   */
  stopNeutralDrone() {
    if (this.droneOscillator) {
      try {
        this.droneOscillator.stop();
        this.droneOscillator.disconnect();
      } catch (e) {
        // Already stopped
      }
      this.droneOscillator = null;
    }
    if (this.droneLFO) {
      try {
        this.droneLFO.stop();
        this.droneLFO.disconnect();
      } catch (e) {
        // Already stopped
      }
      this.droneLFO = null;
    }
    if (this.droneGain) {
      this.droneGain.disconnect();
      this.droneGain = null;
    }
  }

  /**
   * Set places data
   * @param {Array} places - Array of place objects with emotionKeywords, normal, intimacy
   */
  setPlaces(places) {
    this.places = places;
    console.log(`🎵 AudioManager: ${places.length} places loaded`);
  }

  /**
   * ⭐ MAIN UPDATE FUNCTION
   * Called when user position changes
   * @param {Object} userNormal - User's position normal vector {x, y, z}
   */
  update(userNormal) {
    if (!userNormal) return;

    this.userNormal = userNormal;

    if (!this.places || this.places.length === 0) {
      this.enterNeutralState(0);
      return;
    }

    // Calculate weights for all places
    const weights = this.places.map(place => {
      if (!place.normal) return 0;
      const angle = this.calculateAngle(userNormal, place.normal);
      const R = Math.PI / 6; // ~30 degrees influence radius
      return this.smoothstep(R, 0, angle);
    });

    const wMax = Math.max(...weights);

    // Neutral state check (far from all places)
    if (wMax < 0.15) {
      this.enterNeutralState(wMax);
      return;
    }

    // Find closest place
    const maxIndex = weights.indexOf(wMax);
    const closestPlace = this.places[maxIndex];

    // ⭐ Mute zone check (intimacy < 6)
    const intimacy = closestPlace.intimacy !== undefined ? closestPlace.intimacy : closestPlace.intimacyScore;
    const isBlocked = intimacy < 6;

    if (isBlocked) {
      this.enterMuteZone(closestPlace.name);
      return;
    }

    // Update volume based on distance
    this.currentVolume = Math.min(1, Math.max(0, wMax));
    if (this.currentAudio) {
      this.currentAudio.volume = this.currentVolume * this.masterVolume;
    }

    // Fade out drone as place music fades in
    if (this.droneGain) {
      const droneVol = Math.max(0, (0.15 - wMax) / 0.15) * 0.25;
      this.droneGain.gain.value = droneVol;

      if (droneVol < 0.01) {
        this.stopNeutralDrone();
      }
    }

    // If place changed, start new track sequence
    if (this.activePlaceId !== closestPlace.placeId) {
      console.log(`🎵 Entering new place: ${closestPlace.name} (${closestPlace.placeId})`);
      this.activePlaceId = closestPlace.placeId;
      this.activeKeywords = closestPlace.emotionKeywords || [];
      this.currentKeywordIndex = 0;

      this.isNeutral = false;

      if (this.activeKeywords.length > 0) {
        this.playNextKeywordTrack();
      } else {
        console.warn(`⚠️ Place ${closestPlace.name} has no emotion keywords`);
        this.stopTrack();
      }
    }
  }

  /**
   * Enter neutral state (far from all places)
   * Play "emptiness" BGM instead of drone oscillator
   * @param {number} wMax - Maximum weight (distance to closest place)
   */
  enterNeutralState(wMax = 0) {
    if (this.isNeutral && this.activePlaceId === 'neutral_emptiness') {
      // Already playing emptiness music, just update volume
      this.currentVolume = Math.max(0.5, 1.0 - wMax * 2); // Comfortable volume in neutral
      if (this.currentAudio) {
        this.currentAudio.volume = this.currentVolume * this.masterVolume;
      }
      return;
    }

    console.log('🎵 Entering neutral state (playing emptiness BGM)');
    this.isNeutral = true;
    this.activePlaceId = 'neutral_emptiness'; // Mark as neutral emptiness
    this.activeKeywords = ['emptiness']; // Play emptiness emotion
    this.currentKeywordIndex = 0;
    this.currentVolume = 0.7; // Comfortable neutral volume

    // Stop any old drone oscillator if exists
    if (this.droneOscillator) {
      this.stopNeutralDrone();
    }

    // Play emptiness music
    this.playNextKeywordTrack();
  }

  /**
   * ⭐ Enter mute zone (avoidance/blocked place)
   * All audio → 0, navigation blocked
   * @param {string} placeName - Name of blocked place
   */
  enterMuteZone(placeName = 'unknown') {
    console.warn(`🚫 무음 지대에 접근 중입니다: "${placeName}". 이 경로는 존재하지 않습니다.`);

    this.masterVolume = 0;

    if (this.currentAudio) {
      this.currentAudio.volume = 0;
      this.currentAudio.pause();
    }

    if (this.droneGain) {
      this.droneGain.gain.value = 0;
    }

    // TODO: Block navigation UI (integrate with PathFinder)
  }

  /**
   * Calculate spherical angle between two normal vectors
   * @param {Object} v1 - Vector {x, y, z}
   * @param {Object} v2 - Vector {x, y, z}
   * @returns {number} - Angle in radians
   */
  calculateAngle(v1, v2) {
    const dot = v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
    return Math.acos(Math.min(1, Math.max(-1, dot)));
  }

  /**
   * Smoothstep function for smooth falloff
   * @param {number} edge0 - Start edge
   * @param {number} edge1 - End edge
   * @param {number} x - Input value
   * @returns {number} - Smoothed value (0-1)
   */
  smoothstep(edge0, edge1, x) {
    const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
  }

  /**
   * Stop current track
   */
  stopTrack() {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.onended = null;
      this.currentAudio = null;
    }
  }

  /**
   * Stop all audio (logout/cleanup)
   */
  stopAll() {
    console.log('🎵 Stopping all audio');
    this.stopTrack();
    this.stopNeutralDrone();

    this.activePlaceId = null;
    this.activeKeywords = [];
    this.currentKeywordIndex = 0;
    this.isNeutral = false;
    this.masterVolume = 1.0;
    this.currentVolume = 1.0;
  }

  /**
   * Set master volume
   * @param {number} volume - Volume (0-1)
   */
  setMasterVolume(volume) {
    this.masterVolume = Math.min(1, Math.max(0, volume));
    if (this.currentAudio) {
      this.currentAudio.volume = this.currentVolume * this.masterVolume;
    }
  }
}

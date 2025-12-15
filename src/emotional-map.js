import { deletePlace } from './places-service.js';
import { AudioManager } from './audio-manager.js';
import { PathFinder } from './pathfinding.js';

// Emotion to color mapping
const EMOTION_COLORS = {
  calm: '#64FFDA',
  affection: '#FF4081',
  anxiety: '#FFEB3B',
  avoidance: '#512DA8',
  emptiness: '#B0BEC5',
  impulse: '#FF9800',
  tension: '#F44336'
};

export class EmotionalMap {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.container.appendChild(this.canvas);

    this.places = [];
    this.userLocation = { lat: 0, lng: 0 };
    this.selectedPlace = null;
    this.longPressTimer = null;
    this.mandalaImage = null;

    // Map viewport settings
    this.viewWidth = 800;
    this.viewHeight = 600;
    this.scale = 1;
    this.offsetX = 0;
    this.offsetY = 0;

    // Audio and pathfinding
    this.audioManager = new AudioManager();
    this.pathFinder = new PathFinder();
    this.currentPath = null;

    this.init();
  }

  init() {
    this.resize();
    window.addEventListener('resize', () => this.resize());

    // Get user's current location
    this.getUserLocation();

    // Setup interactions
    this.setupInteractions();

    // Create mandala icon
    this.createMandalaIcon();
  }

  resize() {
    this.canvas.width = this.container.clientWidth;
    this.canvas.height = this.container.clientHeight;
    this.viewWidth = this.canvas.width;
    this.viewHeight = this.canvas.height;
    this.render();
  }

  getUserLocation() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.userLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          this.render();
        },
        () => {
          // Default to Seoul coordinates
          this.userLocation = { lat: 37.5665, lng: 126.9780 };
          this.render();
        }
      );

      // Watch position for real-time updates
      navigator.geolocation.watchPosition((position) => {
        this.userLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        this.render();
      });
    } else {
      this.userLocation = { lat: 37.5665, lng: 126.9780 };
    }
  }

  createMandalaIcon() {
    // Create a white mandala icon (8 quadrants)
    const size = 60;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    const centerX = size / 2;
    const centerY = size / 2;
    const radius = size / 2.5;

    // Draw 8 white quadrants
    for (let i = 0; i < 8; i++) {
      const startAngle = (i * Math.PI * 2) / 8;
      const endAngle = ((i + 1) * Math.PI * 2) / 8;

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Center circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.15, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();

    this.mandalaImage = canvas;
  }

  setPlaces(places) {
    this.places = places;

    // Update audio manager with new places
    this.audioManager.loadAllThemeSongs(places);

    // Update pathfinder with new places
    this.pathFinder.setPlaces(places);

    // Start audio loop if not already started
    if (!this.audioManager.animationFrame) {
      this.audioManager.startAudioLoop(
        () => this.userLocation,
        () => this.places
      );
    }
  }

  // Calculate glow color from emotion keywords
  calculateGlowColor(emotionKeywords, intimacyScore) {
    if (!emotionKeywords || emotionKeywords.length === 0) {
      return { color: '#FFFFFF', intensity: 0 };
    }

    // Get colors for each emotion
    const colors = emotionKeywords.map(emotion => EMOTION_COLORS[emotion] || '#FFFFFF');

    // Calculate average RGB
    let r = 0, g = 0, b = 0;
    colors.forEach(hexColor => {
      const rgb = this.hexToRgb(hexColor);
      r += rgb.r;
      g += rgb.g;
      b += rgb.b;
    });

    r = Math.round(r / colors.length);
    g = Math.round(g / colors.length);
    b = Math.round(b / colors.length);

    const blendedColor = `rgb(${r}, ${g}, ${b})`;

    // Intensity based on intimacy score (0-100)
    const intensity = intimacyScore / 100;

    return { color: blendedColor, intensity };
  }

  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 255, g: 255, b: 255 };
  }

  // Intimacy-based distortion algorithm
  calculateDistortedPosition(place) {
    // Original GPS coordinates
    const lat = place.latitude;
    const lng = place.longitude;

    // Convert to relative screen coordinates (simplified projection)
    let x = (lng - this.userLocation.lng) * 10000 + this.viewWidth / 2;
    let y = -(lat - this.userLocation.lat) * 10000 + this.viewHeight / 2;

    // Apply intimacy-based distortion
    const intimacy = place.intimacyScore;
    const isAvoidance = place.emotionKeywords.includes('avoidance');
    const isLowIntimacy = intimacy < 20;

    // Calculate distance from user
    const dx = x - this.viewWidth / 2;
    const dy = y - this.viewHeight / 2;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (isAvoidance || isLowIntimacy) {
      // Push away from center (user location)
      const pushFactor = 1.5 + (1 - intimacy / 100) * 2;
      x = this.viewWidth / 2 + dx * pushFactor;
      y = this.viewHeight / 2 + dy * pushFactor;
    } else {
      // Pull closer based on high intimacy
      const pullFactor = 1 - (intimacy / 100) * 0.6;
      x = this.viewWidth / 2 + dx * pullFactor;
      y = this.viewHeight / 2 + dy * pullFactor;
    }

    // Apply distortion between places based on their mutual intimacy
    this.places.forEach(otherPlace => {
      if (otherPlace.placeId !== place.placeId) {
        const otherX = (otherPlace.longitude - this.userLocation.lng) * 10000 + this.viewWidth / 2;
        const otherY = -(otherPlace.latitude - this.userLocation.lat) * 10000 + this.viewHeight / 2;

        const pdx = otherX - x;
        const pdy = otherY - y;
        const pDistance = Math.sqrt(pdx * pdx + pdy * pdy);

        if (pDistance > 0) {
          // Average intimacy affects inter-place distance
          const avgIntimacy = (intimacy + otherPlace.intimacyScore) / 2;
          const attractionFactor = (avgIntimacy / 100) * 0.1;

          x += (pdx / pDistance) * attractionFactor * 10;
          y += (pdy / pDistance) * attractionFactor * 10;
        }
      }
    });

    return { x, y };
  }

  render() {
    // Clear canvas
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw unrecognized space (black background is default)
    // Places with no intimacy score won't be rendered

    // Draw current path if exists
    if (this.currentPath && this.currentPath.valid) {
      this.pathFinder.drawPath(
        this.ctx,
        this.currentPath.path,
        this.userLocation,
        this.viewWidth,
        this.viewHeight
      );
    }

    // Draw user location ('나')
    this.ctx.fillStyle = '#64FFDA';
    this.ctx.font = 'bold 24px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('나', this.viewWidth / 2, this.viewHeight / 2);

    // Draw a circle around user
    this.ctx.beginPath();
    this.ctx.arc(this.viewWidth / 2, this.viewHeight / 2, 20, 0, Math.PI * 2);
    this.ctx.strokeStyle = '#64FFDA';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();

    // Draw places with intimacy-based distortion
    this.places.forEach(place => {
      const pos = this.calculateDistortedPosition(place);
      const { color, intensity } = this.calculateGlowColor(place.emotionKeywords, place.intimacyScore);

      // Draw glow effect
      const glowSize = 30 + intensity * 40;
      const gradient = this.ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, glowSize);
      gradient.addColorStop(0, color);
      gradient.addColorStop(0.5, color.replace('rgb', 'rgba').replace(')', `, ${intensity * 0.5})`));
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(pos.x - glowSize, pos.y - glowSize, glowSize * 2, glowSize * 2);

      // Draw white mandala icon
      if (this.mandalaImage) {
        const iconSize = 30;
        this.ctx.drawImage(
          this.mandalaImage,
          pos.x - iconSize / 2,
          pos.y - iconSize / 2,
          iconSize,
          iconSize
        );
      }

      // Store position for interaction
      place._renderX = pos.x;
      place._renderY = pos.y;
    });
  }

  // Generate a path to a destination
  generatePathTo(destinationPlace) {
    const path = this.pathFinder.generatePath(
      this.userLocation.lat,
      this.userLocation.lng,
      destinationPlace.latitude,
      destinationPlace.longitude
    );

    this.currentPath = path;

    if (!path.valid && path.warning) {
      alert(path.warning);
    }

    this.render();
    return path;
  }

  // Clear current path
  clearPath() {
    this.currentPath = null;
    this.render();
  }

  setupInteractions() {
    let touchStartTime = 0;
    let touchedPlace = null;

    const handlePointerDown = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const place = this.getPlaceAtPosition(x, y);

      if (place) {
        touchedPlace = place;
        touchStartTime = Date.now();

        // Start long press timer
        this.longPressTimer = setTimeout(() => {
          this.handleLongPress(place);
          touchedPlace = null;
        }, 800);
      }
    };

    const handlePointerUp = (e) => {
      const pressDuration = Date.now() - touchStartTime;

      if (this.longPressTimer) {
        clearTimeout(this.longPressTimer);
        this.longPressTimer = null;
      }

      if (touchedPlace && pressDuration < 800) {
        // Short tap
        this.handleTap(touchedPlace);
      }

      touchedPlace = null;
    };

    const handlePointerMove = () => {
      // Cancel long press if moved
      if (this.longPressTimer) {
        clearTimeout(this.longPressTimer);
        this.longPressTimer = null;
        touchedPlace = null;
      }
    };

    this.canvas.addEventListener('mousedown', handlePointerDown);
    this.canvas.addEventListener('mouseup', handlePointerUp);
    this.canvas.addEventListener('mousemove', handlePointerMove);

    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      handlePointerDown(touch);
    });

    this.canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      handlePointerUp(e.changedTouches[0]);
    });

    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      handlePointerMove();
    });
  }

  getPlaceAtPosition(x, y) {
    for (const place of this.places) {
      if (place._renderX && place._renderY) {
        const dx = x - place._renderX;
        const dy = y - place._renderY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 30) {
          return place;
        }
      }
    }
    return null;
  }

  handleTap(place) {
    // Show speech bubble with place info
    const bubble = document.getElementById('place-info-bubble');
    const nameEl = document.getElementById('bubble-place-name');
    const memoryEl = document.getElementById('bubble-memory');

    nameEl.textContent = place.realPlaceName;
    memoryEl.textContent = place.memoryText || 'No memory recorded';

    bubble.classList.remove('hidden');
  }

  handleLongPress(place) {
    // Show delete confirmation
    const modal = document.getElementById('delete-modal');
    modal.classList.add('active');

    const handleDelete = async () => {
      try {
        await deletePlace(place.placeId);
        modal.classList.remove('active');
        cleanup();
      } catch (error) {
        alert('Error deleting place: ' + error.message);
      }
    };

    const handleCancel = () => {
      modal.classList.remove('active');
      cleanup();
    };

    const cleanup = () => {
      document.getElementById('delete-yes').removeEventListener('click', handleDelete);
      document.getElementById('delete-no').removeEventListener('click', handleCancel);
    };

    document.getElementById('delete-yes').addEventListener('click', handleDelete);
    document.getElementById('delete-no').addEventListener('click', handleCancel);
  }
}

import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc } from 'firebase/firestore';
import { storage, db, auth } from './firebase-config.js';

export class MandalaCreator {
  constructor(canvasId, previewId) {
    this.canvas = document.getElementById(canvasId);
    this.preview = document.getElementById(previewId);
    this.ctx = this.canvas.getContext('2d');
    this.previewCtx = this.preview ? this.preview.getContext('2d') : null;

    // Set canvas size (square) - larger to prevent clipping
    this.size = 500;
    this.canvas.width = this.size;
    this.canvas.height = this.size;

    if (this.preview) {
      this.preview.width = 60;
      this.preview.height = 60;
    }

    // Mandala grid: 8 quadrants (arranged as a circle)
    this.quadrants = 8;
    this.quadrantColors = new Array(8).fill('#FFFFFF');
    this.currentColor = '#64FFDA'; // Default color
    this.symmetricalMode = false;

    // Color palette
    this.palette = [
      '#FFFFFF', // White
      '#64FFDA', // Cyan (Calm)
      '#FF4081', // Pink (Affection)
      '#FFEB3B', // Yellow (Anxiety)
      '#512DA8', // Indigo (Avoidance)
      '#B0BEC5', // Gray (Emptiness)
      '#FF9800', // Orange (Impulse)
      '#F44336', // Red (Tension)
      '#000000', // Black
      '#4CAF50', // Green
      '#2196F3', // Blue
      '#9C27B0', // Purple
    ];

    this.init();
  }

  init() {
    this.drawMandala();
    this.setupEventListeners();
  }

  // Draw the 8-quadrant mandala
  drawMandala() {
    this.ctx.clearRect(0, 0, this.size, this.size);

    const centerX = this.size / 2;
    const centerY = this.size / 2;
    const radius = this.size / 2; // Perfect circular mandala filling entire canvas

    // Draw 8 quadrants as pie slices (no borders)
    for (let i = 0; i < this.quadrants; i++) {
      const startAngle = (i * Math.PI * 2) / this.quadrants;
      const endAngle = ((i + 1) * Math.PI * 2) / this.quadrants;

      this.ctx.beginPath();
      this.ctx.moveTo(centerX, centerY);
      this.ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      this.ctx.closePath();
      this.ctx.fillStyle = this.quadrantColors[i];
      this.ctx.fill();
      // No stroke/border
    }

    // Draw center circle (no border)
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, radius * 0.15, 0, Math.PI * 2);
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.fill();
    // No stroke/border

    // Update preview if exists
    if (this.previewCtx) {
      this.updatePreview();
    }
  }

  // Update the small preview canvas
  updatePreview() {
    const scale = this.preview.width / this.size;
    this.previewCtx.clearRect(0, 0, this.preview.width, this.preview.height);
    this.previewCtx.save();
    this.previewCtx.scale(scale, scale);
    this.previewCtx.drawImage(this.canvas, 0, 0);
    this.previewCtx.restore();
  }

  // Get the quadrant index from click coordinates
  getQuadrantFromPoint(x, y) {
    const centerX = this.size / 2;
    const centerY = this.size / 2;

    // Calculate angle from center
    const dx = x - centerX;
    const dy = y - centerY;
    let angle = Math.atan2(dy, dx);

    // Convert to 0-2π range
    if (angle < 0) angle += Math.PI * 2;

    // Determine quadrant (0-7)
    const quadrant = Math.floor((angle / (Math.PI * 2)) * this.quadrants);

    // Check if click is within the mandala radius
    const distance = Math.sqrt(dx * dx + dy * dy);
    const radius = this.size / 2;

    if (distance > radius * 0.15 && distance < radius) {
      return quadrant;
    }

    return -1; // Outside mandala or in center
  }

  // Get the symmetrical/opposite quadrant
  getSymmetricalQuadrant(quadrant) {
    return (quadrant + this.quadrants / 2) % this.quadrants;
  }

  // Set color for a quadrant
  setQuadrantColor(quadrant, color) {
    if (quadrant >= 0 && quadrant < this.quadrants) {
      this.quadrantColors[quadrant] = color;

      // If symmetrical mode is enabled, color the opposite quadrant
      if (this.symmetricalMode) {
        const symmetricalQuadrant = this.getSymmetricalQuadrant(quadrant);
        this.quadrantColors[symmetricalQuadrant] = color;
      }

      this.drawMandala();
    }
  }

  // Toggle symmetrical mode
  toggleSymmetrical(enabled) {
    this.symmetricalMode = enabled;
  }

  // Setup event listeners
  setupEventListeners() {
    this.canvas.addEventListener('click', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const quadrant = this.getQuadrantFromPoint(x, y);
      if (quadrant >= 0) {
        this.setQuadrantColor(quadrant, this.currentColor);
      }
    });
  }

  // Set current color
  setColor(color) {
    this.currentColor = color;
  }

  // Export mandala as data URL
  exportAsDataURL() {
    return this.canvas.toDataURL('image/png');
  }

  // Save mandala to Firebase Storage
  async saveToFirebase() {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User must be authenticated to save mandala');
    }

    try {
      const dataURL = this.exportAsDataURL();
      const storageRef = ref(storage, `mandalas/${user.uid}/mandala_${Date.now()}.png`);

      // Upload the image
      await uploadString(storageRef, dataURL, 'data_url');

      // Get download URL
      const downloadURL = await getDownloadURL(storageRef);

      // Update user document with mandala URL
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        mandalaGraphicURL: downloadURL
      });

      return downloadURL;
    } catch (error) {
      console.error('Error saving mandala:', error);
      throw error;
    }
  }

  // Load mandala from URL
  async loadFromURL(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        this.ctx.drawImage(img, 0, 0, this.size, this.size);
        if (this.previewCtx) {
          this.updatePreview();
        }
        resolve();
      };
      img.onerror = reject;
      img.src = url;
    });
  }

  // Reset mandala to white
  reset() {
    this.quadrantColors.fill('#FFFFFF');
    this.drawMandala();
  }
}

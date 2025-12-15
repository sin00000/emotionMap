export class PathFinder {
  constructor() {
    this.forbiddenZones = [];
    this.preferredZones = [];
  }

  // Set places to identify forbidden and preferred zones
  setPlaces(places) {
    this.forbiddenZones = places.filter(p =>
      p.emotionKeywords.includes('avoidance') || p.intimacyScore < 20
    );

    this.preferredZones = places.filter(p =>
      p.intimacyScore > 80
    );
  }

  // Check if a point is in a forbidden zone
  isInForbiddenZone(lat, lng, radius = 50) {
    return this.forbiddenZones.some(zone => {
      const distance = this.calculateDistance(lat, lng, zone.latitude, zone.longitude);
      return distance < radius;
    });
  }

  // Calculate distance between two GPS coordinates
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

  // Generate a path from start to end, avoiding forbidden zones
  generatePath(startLat, startLng, endLat, endLng) {
    // Check if destination is a forbidden zone
    if (this.isInForbiddenZone(endLat, endLng)) {
      // Find alternative preferred destination
      const alternative = this.findAlternativeDestination(startLat, startLng, endLat, endLng);

      if (alternative) {
        return {
          valid: false,
          warning: `The closer destination is ${alternative.name} rather than the avoided place.`,
          alternative: alternative,
          path: []
        };
      } else {
        return {
          valid: false,
          warning: 'Cannot navigate to an avoidance zone.',
          path: []
        };
      }
    }

    // Simple pathfinding with avoidance
    const path = this.calculateAvoidancePath(startLat, startLng, endLat, endLng);

    if (path.length === 0) {
      return {
        valid: false,
        warning: 'No valid path exists that avoids forbidden zones.',
        path: []
      };
    }

    return {
      valid: true,
      path: path
    };
  }

  // Calculate path with waypoints to avoid forbidden zones
  calculateAvoidancePath(startLat, startLng, endLat, endLng) {
    const path = [{ lat: startLat, lng: startLng }];
    const steps = 20; // Number of interpolation steps

    // Generate straight line path
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const lat = startLat + (endLat - startLat) * t;
      const lng = startLng + (endLng - startLng) * t;

      // Check if this point is in a forbidden zone
      if (this.isInForbiddenZone(lat, lng)) {
        // Try to find a detour
        const detour = this.findDetour(
          path[path.length - 1].lat,
          path[path.length - 1].lng,
          lat,
          lng
        );

        if (detour) {
          path.push(...detour);
        } else {
          // No valid path
          return [];
        }
      } else {
        path.push({ lat, lng });
      }
    }

    // Optimize path to go through preferred zones if possible
    const optimizedPath = this.optimizePathThroughPreferredZones(path);

    return optimizedPath;
  }

  // Find a detour around a forbidden zone
  findDetour(fromLat, fromLng, toLat, toLng) {
    // Simple detour: try perpendicular offsets
    const midLat = (fromLat + toLat) / 2;
    const midLng = (fromLng + toLng) / 2;

    const offsets = [
      { lat: 0.001, lng: 0.001 },
      { lat: -0.001, lng: 0.001 },
      { lat: 0.001, lng: -0.001 },
      { lat: -0.001, lng: -0.001 },
      { lat: 0.002, lng: 0 },
      { lat: -0.002, lng: 0 },
      { lat: 0, lng: 0.002 },
      { lat: 0, lng: -0.002 }
    ];

    for (const offset of offsets) {
      const detourLat = midLat + offset.lat;
      const detourLng = midLng + offset.lng;

      if (!this.isInForbiddenZone(detourLat, detourLng)) {
        return [
          { lat: detourLat, lng: detourLng },
          { lat: toLat, lng: toLng }
        ];
      }
    }

    return null; // No detour found
  }

  // Optimize path to route through high-intimacy zones
  optimizePathThroughPreferredZones(path) {
    if (this.preferredZones.length === 0) {
      return path;
    }

    // Find preferred zones near the path
    const nearbyPreferred = this.preferredZones.filter(zone => {
      return path.some(point => {
        const distance = this.calculateDistance(
          point.lat,
          point.lng,
          zone.latitude,
          zone.longitude
        );
        return distance < 200; // Within 200m of path
      });
    });

    // If there are nearby preferred zones, route through them
    if (nearbyPreferred.length > 0) {
      const optimized = [];
      optimized.push(path[0]); // Start point

      // Add waypoints through preferred zones
      nearbyPreferred.forEach(zone => {
        optimized.push({ lat: zone.latitude, lng: zone.longitude });
      });

      optimized.push(path[path.length - 1]); // End point

      return optimized;
    }

    return path;
  }

  // Find an alternative destination (preferred place)
  findAlternativeDestination(startLat, startLng, avoidedLat, avoidedLng) {
    if (this.preferredZones.length === 0) {
      return null;
    }

    // Find the closest preferred zone
    let closest = null;
    let minDistance = Infinity;

    this.preferredZones.forEach(zone => {
      const distance = this.calculateDistance(startLat, startLng, zone.latitude, zone.longitude);

      if (distance < minDistance) {
        minDistance = distance;
        closest = zone;
      }
    });

    return closest ? {
      name: closest.realPlaceName,
      lat: closest.latitude,
      lng: closest.longitude,
      intimacyScore: closest.intimacyScore
    } : null;
  }

  // Visualize path on canvas
  drawPath(ctx, path, userLocation, viewWidth, viewHeight) {
    if (!path || path.length < 2) {
      return;
    }

    ctx.strokeStyle = '#64FFDA';
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 5]);

    ctx.beginPath();

    path.forEach((point, index) => {
      // Convert GPS to screen coordinates (simplified)
      const x = (point.lng - userLocation.lng) * 10000 + viewWidth / 2;
      const y = -(point.lat - userLocation.lat) * 10000 + viewHeight / 2;

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Check if path crosses forbidden zones
  isPathValid(path) {
    return !path.some(point =>
      this.isInForbiddenZone(point.lat, point.lng)
    );
  }
}

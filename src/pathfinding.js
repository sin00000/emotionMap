export class PathFinder {
  constructor() {
    this.forbiddenZones = [];
    this.preferredZones = [];
    this.places = [];
  }

  // Set places to identify forbidden and preferred zones
  setPlaces(places) {
    this.places = places;

    // 친밀도 30 이하: 금지구역 (통과 불가)
    this.forbiddenZones = places.filter(p =>
      (p.intimacy !== undefined ? p.intimacy : p.intimacyScore) <= 30
    );

    // 친밀도 70 이상: 환영하는 길 (최우선 선호)
    this.preferredZones = places.filter(p =>
      (p.intimacy !== undefined ? p.intimacy : p.intimacyScore) > 70
    );

    console.log(`🗺️ PathFinder initialized: ${this.forbiddenZones.length} forbidden, ${this.preferredZones.length} preferred zones`);
  }

  /**
   * Get emotional weight for a place (A* heuristic)
   * @returns {number} - Weight multiplier (0.1 = very preferred, Infinity = forbidden)
   */
  getEmotionalWeight(place) {
    const intimacy = place.intimacy !== undefined ? place.intimacy : place.intimacyScore;

    if (intimacy <= 30) {
      return Infinity; // 금지구역: 통과 불가
    } else if (intimacy <= 50) {
      return 10.0; // 불편한 길: 높은 가중치
    } else if (intimacy <= 70) {
      return 0.5; // 편안한 길: 낮은 가중치
    } else {
      return 0.1; // 환영하는 길: 최우선 선호
    }
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

  /**
   * A* PATHFINDING WITH EMOTIONAL WEIGHTS
   * Finds optimal path considering emotional zones
   */
  findPathAStar(startLat, startLng, endLat, endLng) {
    console.log(`🧭 A* pathfinding: (${startLat.toFixed(4)}, ${startLng.toFixed(4)}) → (${endLat.toFixed(4)}, ${endLng.toFixed(4)})`);

    // Check if destination is forbidden
    if (this.isInForbiddenZone(endLat, endLng)) {
      const alternative = this.findAlternativeDestination(startLat, startLng, endLat, endLng);
      return {
        valid: false,
        warning: alternative
          ? `"${alternative.name}"이(가) 더 가까운 목적지입니다.`
          : '금지구역으로는 갈 수 없습니다.',
        alternative: alternative,
        path: []
      };
    }

    // Create grid of waypoints (simplified A*)
    const path = this.aStarSimplified(startLat, startLng, endLat, endLng);

    if (path.length === 0) {
      return {
        valid: false,
        warning: '유효한 경로를 찾을 수 없습니다.',
        path: []
      };
    }

    return {
      valid: true,
      path: path,
      totalDistance: this.calculatePathDistance(path),
      emotionalCost: this.calculateEmotionalCost(path)
    };
  }

  /**
   * Simplified A* algorithm for GPS pathfinding
   */
  aStarSimplified(startLat, startLng, endLat, endLng) {
    const openSet = [];
    const closedSet = new Set();
    const cameFrom = new Map();
    const gScore = new Map();
    const fScore = new Map();

    const startKey = `${startLat},${startLng}`;
    const endKey = `${endLat},${endLng}`;

    openSet.push({ lat: startLat, lng: startLng, key: startKey });
    gScore.set(startKey, 0);
    fScore.set(startKey, this.calculateDistance(startLat, startLng, endLat, endLng));

    let iterations = 0;
    const maxIterations = 100;

    while (openSet.length > 0 && iterations < maxIterations) {
      iterations++;

      // Find node with lowest fScore
      openSet.sort((a, b) => fScore.get(a.key) - fScore.get(b.key));
      const current = openSet.shift();

      // Reached destination
      if (this.calculateDistance(current.lat, current.lng, endLat, endLng) < 10) {
        return this.reconstructPath(cameFrom, endKey, current.key);
      }

      closedSet.add(current.key);

      // Generate neighbors (8-directional movement)
      const neighbors = this.getNeighbors(current.lat, current.lng, endLat, endLng);

      for (const neighbor of neighbors) {
        const neighborKey = `${neighbor.lat},${neighbor.lng}`;

        if (closedSet.has(neighborKey)) continue;

        // Check if neighbor is in forbidden zone
        if (this.isInForbiddenZone(neighbor.lat, neighbor.lng)) {
          continue; // Skip forbidden zones
        }

        // Calculate tentative gScore
        const distance = this.calculateDistance(current.lat, current.lng, neighbor.lat, neighbor.lng);
        const emotionalWeight = this.getEmotionalWeightForPoint(neighbor.lat, neighbor.lng);
        const tentativeGScore = (gScore.get(current.key) || Infinity) + distance * emotionalWeight;

        if (tentativeGScore < (gScore.get(neighborKey) || Infinity)) {
          // This path is better
          cameFrom.set(neighborKey, current.key);
          gScore.set(neighborKey, tentativeGScore);
          fScore.set(neighborKey, tentativeGScore + this.calculateDistance(neighbor.lat, neighbor.lng, endLat, endLng));

          if (!openSet.find(n => n.key === neighborKey)) {
            openSet.push(neighbor);
          }
        }
      }
    }

    // No path found, return direct line (if no forbidden zones)
    return this.calculateAvoidancePath(startLat, startLng, endLat, endLng);
  }

  /**
   * Get neighbors for A* (8 directions)
   */
  getNeighbors(lat, lng, targetLat, targetLng) {
    const stepSize = 0.001; // ~111 meters
    const neighbors = [];

    // 8 directions
    const directions = [
      { lat: stepSize, lng: 0 },
      { lat: -stepSize, lng: 0 },
      { lat: 0, lng: stepSize },
      { lat: 0, lng: -stepSize },
      { lat: stepSize, lng: stepSize },
      { lat: stepSize, lng: -stepSize },
      { lat: -stepSize, lng: stepSize },
      { lat: -stepSize, lng: -stepSize }
    ];

    for (const dir of directions) {
      neighbors.push({
        lat: lat + dir.lat,
        lng: lng + dir.lng,
        key: `${lat + dir.lat},${lng + dir.lng}`
      });
    }

    return neighbors;
  }

  /**
   * Get emotional weight for a GPS point (influenced by nearby places)
   */
  getEmotionalWeightForPoint(lat, lng) {
    let minWeight = 1.0; // Default neutral weight

    for (const place of this.places) {
      const distance = this.calculateDistance(lat, lng, place.latitude, place.longitude);

      // If within influence radius (100m)
      if (distance < 100) {
        const weight = this.getEmotionalWeight(place);
        minWeight = Math.min(minWeight, weight); // Use lowest (best) weight
      }
    }

    return minWeight;
  }

  /**
   * Reconstruct path from A* cameFrom map
   */
  reconstructPath(cameFrom, endKey, currentKey) {
    const path = [];
    let current = currentKey;

    while (cameFrom.has(current)) {
      const [lat, lng] = current.split(',').map(parseFloat);
      path.unshift({ lat, lng });
      current = cameFrom.get(current);
    }

    // Add start point
    const [startLat, startLng] = current.split(',').map(parseFloat);
    path.unshift({ lat: startLat, lng: startLng });

    console.log(`✅ Path found with ${path.length} waypoints`);
    return path;
  }

  /**
   * Calculate total path distance
   */
  calculatePathDistance(path) {
    let total = 0;
    for (let i = 1; i < path.length; i++) {
      total += this.calculateDistance(path[i-1].lat, path[i-1].lng, path[i].lat, path[i].lng);
    }
    return total;
  }

  /**
   * Calculate emotional cost of path
   */
  calculateEmotionalCost(path) {
    let cost = 0;
    for (const point of path) {
      cost += this.getEmotionalWeightForPoint(point.lat, point.lng);
    }
    return cost / path.length; // Average emotional weight
  }
}

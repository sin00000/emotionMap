/**
 * PathFinder - Distorted Terrain Physics-based Navigation
 *
 * Core principle: Navigation follows distorted space physics
 * - Slope constraints (can't climb too steep)
 * - Blocked zones (intimacy < 6)
 * - Comfort cost (lower intimacy = higher cost)
 */

import * as THREE from 'three';

export class PathFinder {
  constructor() {
    this.places = [];
    this.forbiddenZones = [];
    this.preferredZones = [];

    // Terrain physics parameters - 2-stage pathfinding
    this.slopeMaxStrict = 0.25; // Stage 1: strict slope limit
    this.slopeMaxFallback = 0.45; // Stage 2: relaxed slope limit
    this.slopeWeight = 5.0; // Cost multiplier for slopes
    this.lowIntimacyThreshold = 6; // Threshold for destination replacement

    // Height field function (will be set by MapView)
    this.getHeightAt = null;

    console.log('🗺️ PathFinder initialized (physics-based, 2-stage)');
  }

  /**
   * Set places and height field function
   * @param {Array} places - Place objects with normal, intimacy, emotionKeywords
   * @param {Function} getHeightAtFunc - Function(normal) => height
   */
  setPlaces(places, getHeightAtFunc = null) {
    this.places = places;
    this.getHeightAt = getHeightAtFunc;

    // Forbidden zones: intimacy < 6
    this.forbiddenZones = places.filter(p => {
      const intimacy = p.intimacy !== undefined ? p.intimacy : p.intimacyScore;
      return intimacy !== undefined && intimacy < 6;
    });

    // Preferred zones: intimacy > 70
    this.preferredZones = places.filter(p => {
      const intimacy = p.intimacy !== undefined ? p.intimacy : p.intimacyScore;
      return intimacy !== undefined && intimacy > 70;
    });

    console.log(`🗺️ PathFinder: ${this.forbiddenZones.length} forbidden, ${this.preferredZones.length} preferred zones`);

    // Debug: Log all place intimacy values
    places.forEach(p => {
      const intimacy = p.intimacy !== undefined ? p.intimacy : p.intimacyScore;
      console.log(`  - "${p.name}": intimacy=${intimacy}, hasNormal=${!!p.normal}`);
    });
  }

  /**
   * Calculate spherical angle between two normal vectors
   */
  calculateAngle(v1, v2) {
    const dot = v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
    return Math.acos(Math.min(1, Math.max(-1, dot)));
  }

  /**
   * Check if a point is in forbidden zone (intimacy < 6)
   * @param {Object} normal - Point normal vector {x, y, z}
   * @returns {boolean}
   */
  isInForbiddenZone(normal) {
    const influenceRadius = Math.PI / 90; // ~2 degrees (very tight blocking)

    return this.forbiddenZones.some(zone => {
      if (!zone.normal) return false;
      const angle = this.calculateAngle(normal, zone.normal);
      const isBlocked = angle < influenceRadius;
      if (isBlocked) {
        console.log(`[PATHFINDER] 🚫 Blocked by "${zone.name}" (distance: ${(angle * 180 / Math.PI).toFixed(1)}°)`);
      }
      return isBlocked;
    });
  }

  /**
   * Get comfort weight for a point (influenced by nearby places)
   * @param {Object} normal - Point normal vector
   * @returns {number} - Weight (0.1 = very comfortable, 10.0 = uncomfortable, Infinity = blocked)
   */
  getComfortWeight(normal) {
    let minWeight = 1.0; // Neutral

    for (const place of this.places) {
      if (!place.normal) continue;

      const angle = this.calculateAngle(normal, place.normal);
      const influenceRadius = Math.PI / 8; // ~22.5 degrees

      if (angle < influenceRadius) {
        const intimacy = place.intimacy !== undefined ? place.intimacy : place.intimacyScore;

        if (intimacy <= 30) {
          return Infinity; // Blocked
        }

        // Comfort weight based on intimacy
        let weight;
        if (intimacy > 70) {
          weight = 0.1; // Very comfortable
        } else if (intimacy > 50) {
          weight = 0.5; // Comfortable
        } else {
          weight = 10.0; // Uncomfortable
        }

        minWeight = Math.min(minWeight, weight);
      }
    }

    return minWeight;
  }

  /**
   * Calculate slope between two points on sphere
   * @param {Object} normal1 - Start normal vector
   * @param {Object} normal2 - End normal vector
   * @returns {number} - Slope (rise/run ratio)
   */
  calculateSlope(normal1, normal2) {
    if (!this.getHeightAt) return 0;

    const h1 = this.getHeightAt(normal1);
    const h2 = this.getHeightAt(normal2);
    const angle = this.calculateAngle(normal1, normal2);

    if (angle < 0.001) return 0; // Too close

    const rise = Math.abs(h2 - h1);
    const run = angle;

    return rise / run;
  }

  /**
   * Compute path from user to destination
   * Uses 2-stage pathfinding: strict → fallback slope limits
   * Preferred zones (intimacy > 70) attract path ("new roads")
   *
   * @param {Object} userNormal - User position normal vector
   * @param {Object} destPlace - Destination place object
   * @returns {Object} - {valid, path: [normals], warning, failureReason, isFallback}
   */
  computePath(userNormal, destPlace) {
    if (!destPlace || !destPlace.normal) {
      console.warn('[PATHFINDER] Invalid destination:', destPlace);
      return {
        valid: false,
        path: [],
        warning: '목적지가 유효하지 않습니다.',
        failureReason: 'invalid_destination'
      };
    }

    const destNormal = destPlace.normal;

    // Check if destination itself has very low intimacy (< 6)
    const destIntimacy = destPlace.intimacy !== undefined ? destPlace.intimacy : destPlace.intimacyScore;
    if (destIntimacy !== undefined && destIntimacy < 6) {
      console.warn('[PATHFINDER] Destination itself is a forbidden zone (intimacy:', destIntimacy, ')');
      return {
        valid: false,
        path: [],
        warning: '친밀도가 기준치 이하입니다. 행복을 궁극적 목적으로 취급해야 합니다.',
        failureReason: 'mute_zone'
      };
    }

    // ⭐ Find preferred waypoints along path (intimacy > 70)
    const waypoints = this.findPreferredWaypoints(userNormal, destNormal);

    // Sample waypoints along path (with preferred zone attraction)
    const samples = 50;
    const path = [];

    if (waypoints.length === 0) {
      // No preferred zones - use direct path
      for (let i = 0; i <= samples; i++) {
        const t = i / samples;
        const normal = this.slerpNormal(userNormal, destNormal, t);
        path.push(normal);
      }
    } else {
      // Preferred zones found - create path through them
      console.log(`[PATHFINDER] 💚 Found ${waypoints.length} preferred waypoints, creating comfortable path`);

      // Create path segments: user → waypoint1 → waypoint2 → ... → dest
      const allPoints = [userNormal, ...waypoints, destNormal];
      const samplesPerSegment = Math.floor(samples / allPoints.length);

      for (let seg = 0; seg < allPoints.length - 1; seg++) {
        const start = allPoints[seg];
        const end = allPoints[seg + 1];

        const segmentSamples = (seg === allPoints.length - 2) ?
          (samples - path.length) : samplesPerSegment;

        for (let i = 0; i <= segmentSamples; i++) {
          const t = i / segmentSamples;
          const normal = this.slerpNormal(start, end, t);
          path.push(normal);
        }
      }
    }

    // ⭐ STAGE 1: Try strict slope limit (0.25)
    console.log('[PATHFINDER] Stage 1: Attempting strict pathfinding (slope ≤ 0.25)');
    const strictResult = this.validatePathWithSlopeLimit(path, this.slopeMaxStrict);

    if (strictResult.valid) {
      console.log('[PATHFINDER] ✅ Stage 1 SUCCESS: Path valid with strict slope');
      return {
        valid: true,
        path: path,
        totalAngle: this.calculateAngle(userNormal, destNormal),
        isFallback: false
      };
    }

    // ⭐ STAGE 2: Try fallback slope limit (0.45)
    console.log('[PATHFINDER] Stage 1 FAILED:', strictResult.failureReason);
    console.log('[PATHFINDER] Stage 2: Attempting fallback pathfinding (slope ≤ 0.45)');
    const fallbackResult = this.validatePathWithSlopeLimit(path, this.slopeMaxFallback);

    if (fallbackResult.valid) {
      console.log('[PATHFINDER] ⚠️ Stage 2 SUCCESS: Fallback path found');
      return {
        valid: true,
        path: path,
        totalAngle: this.calculateAngle(userNormal, destNormal),
        isFallback: true,
        warning: '경사가 급하지만 임시 경로를 생성했습니다.'
      };
    }

    // Both stages failed - return specific failure reason
    console.error('[PATHFINDER] ❌ Both stages FAILED:', fallbackResult.failureReason);

    // Determine specific failure message
    let warning;
    if (fallbackResult.failureReason === 'mute_zone') {
      warning = '친밀도가 기준치 이하입니다. 행복을 궁극적 목적으로 취급해야 합니다.';
    } else if (fallbackResult.failureReason === 'slope_exceeded') {
      warning = '경사가 허용치를 초과해 이동할 수 없습니다.';
    } else {
      warning = '경로 그래프가 구성되지 않았습니다(버그).';
    }

    return {
      valid: false,
      path: [],
      warning: warning,
      failureReason: fallbackResult.failureReason
    };
  }

  /**
   * Validate path with specific slope limit
   * @param {Array} path - Array of normal vectors
   * @param {number} slopeLimit - Maximum allowed slope
   * @returns {Object} - {valid: boolean, failureReason: string}
   */
  validatePathWithSlopeLimit(path, slopeLimit) {
    for (let i = 0; i < path.length - 1; i++) {
      const curr = path[i];
      const next = path[i + 1];

      // Check mute zone (intimacy < 6)
      if (this.isInForbiddenZone(curr)) {
        console.warn(`[PATHFINDER] 🚫 Path point ${i}/${path.length} is in forbidden zone`);
        console.warn(`[PATHFINDER]    Point: (${curr.x.toFixed(3)}, ${curr.y.toFixed(3)}, ${curr.z.toFixed(3)})`);
        console.warn(`[PATHFINDER]    Forbidden zones count: ${this.forbiddenZones.length}`);
        return {
          valid: false,
          failureReason: 'mute_zone'
        };
      }

      // Check slope
      const slope = this.calculateSlope(curr, next);
      if (slope > slopeLimit) {
        return {
          valid: false,
          failureReason: 'slope_exceeded'
        };
      }
    }

    return { valid: true };
  }

  /**
   * Spherical linear interpolation between two normal vectors
   */
  slerpNormal(v1, v2, t) {
    const angle = this.calculateAngle(v1, v2);

    if (angle < 0.001) {
      return { x: v1.x, y: v1.y, z: v1.z };
    }

    const sinAngle = Math.sin(angle);
    const a = Math.sin((1 - t) * angle) / sinAngle;
    const b = Math.sin(t * angle) / sinAngle;

    const result = {
      x: a * v1.x + b * v2.x,
      y: a * v1.y + b * v2.y,
      z: a * v1.z + b * v2.z
    };

    // Normalize
    const len = Math.sqrt(result.x * result.x + result.y * result.y + result.z * result.z);
    result.x /= len;
    result.y /= len;
    result.z /= len;

    return result;
  }

  /**
   * Find preferred waypoints along path (intimacy > 70)
   * "좋아하는 장소는 새로운 길을 생성함 (주변 공간 끌어들임)"
   *
   * @param {Object} userNormal - Start position
   * @param {Object} destNormal - End position
   * @returns {Array} - Array of preferred place normals to route through
   */
  findPreferredWaypoints(userNormal, destNormal) {
    const candidates = [];

    // Find preferred zones (intimacy > 70) near the direct path
    for (const place of this.preferredZones) {
      if (!place.normal) continue;

      const intimacy = place.intimacy !== undefined ? place.intimacy : place.intimacyScore;
      if (intimacy <= 70) continue; // Only highly preferred zones

      // Calculate distance from place to the direct path (user → dest)
      const pathMidpoint = this.slerpNormal(userNormal, destNormal, 0.5);
      const distanceToPath = this.calculateAngle(place.normal, pathMidpoint);

      // Only include places reasonably close to path
      const maxDistanceFromPath = Math.PI / 4; // 45 degrees
      if (distanceToPath > maxDistanceFromPath) continue;

      // Calculate position along path (0 = start, 1 = end)
      const angleToPlace = this.calculateAngle(userNormal, place.normal);
      const totalPathAngle = this.calculateAngle(userNormal, destNormal);
      const positionAlongPath = angleToPlace / totalPathAngle;

      // Only include waypoints in middle section (not too close to start/end)
      if (positionAlongPath < 0.2 || positionAlongPath > 0.8) continue;

      candidates.push({
        normal: place.normal,
        intimacy: intimacy,
        distanceToPath: distanceToPath,
        positionAlongPath: positionAlongPath,
        name: place.name
      });
    }

    if (candidates.length === 0) return [];

    // Sort by position along path, then by intimacy (higher = better)
    candidates.sort((a, b) => {
      const posDiff = a.positionAlongPath - b.positionAlongPath;
      if (Math.abs(posDiff) > 0.1) return posDiff; // Different sections
      return b.intimacy - a.intimacy; // Same section → prefer higher intimacy
    });

    // Take up to 2 waypoints to avoid overly complex paths
    const selectedWaypoints = candidates.slice(0, 2).map(c => {
      console.log(`[PATHFINDER] 💚 Waypoint: "${c.name}" (intimacy: ${c.intimacy}, pos: ${(c.positionAlongPath * 100).toFixed(0)}%)`);
      return c.normal;
    });

    return selectedWaypoints;
  }

  /**
   * Find alternative destination (higher intimacy, not blocked)
   * @param {Object} userNormal - User position
   * @param {Object} originalDest - Original destination place
   * @returns {Object|null} - Alternative place or null
   */
  findAlternativeDestination(userNormal, originalDest) {
    const originalIntimacy = originalDest.intimacy !== undefined ? originalDest.intimacy : originalDest.intimacyScore;

    // Find candidates: not blocked, higher intimacy than original
    const candidates = this.places.filter(p => {
      if (!p.normal) return false;

      const intimacy = p.intimacy !== undefined ? p.intimacy : p.intimacyScore;

      // Must be higher intimacy and not blocked
      return intimacy > originalIntimacy && intimacy > 30;
    });

    if (candidates.length === 0) {
      return null;
    }

    // Sort by intimacy (highest first)
    candidates.sort((a, b) => {
      const aInt = a.intimacy !== undefined ? a.intimacy : a.intimacyScore;
      const bInt = b.intimacy !== undefined ? b.intimacy : b.intimacyScore;
      return bInt - aInt;
    });

    return candidates[0];
  }

  /**
   * Check if destination requires replacement popup
   * @param {Object} destPlace - Destination place
   * @returns {boolean} - true if popup should show
   */
  shouldShowReplacementPopup(destPlace) {
    if (!destPlace) return false;

    const intimacy = destPlace.intimacy !== undefined ? destPlace.intimacy : destPlace.intimacyScore;

    // Show popup only if very low intimacy (< 6)
    return intimacy !== undefined && intimacy < 6;
  }
}

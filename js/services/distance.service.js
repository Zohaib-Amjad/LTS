/**
 * SMART ONLINE LUGGAGE TRANSPORTATION USING AI
 * Domestic Distance Calculation Engine & Provider Orchestrator
 */

import { ValidationError } from '../core/errorHandler.js';
import { HighwayMatrixDistanceProvider } from '../providers/distance/highwayMatrix.provider.js';
import { GeodesicDistanceProvider } from '../providers/distance/geodesic.provider.js';
import { RemoteMapApiDistanceProvider } from '../providers/distance/remoteMapApi.provider.js';
import { MockDemoDistanceProvider } from '../providers/distance/mockDemo.provider.js';
import { ENV } from '../config/env.js';

class DistanceService {
  constructor() {
    this.providers = {
      remote: new RemoteMapApiDistanceProvider(),
      highway: new HighwayMatrixDistanceProvider(),
      geodesic: new GeodesicDistanceProvider(),
      mock: new MockDemoDistanceProvider()
    };

    this.cache = new Map();
  }

  /**
   * Validate pickup and destination inputs
   */
  validateLocations(pickup, destination) {
    if (!pickup || typeof pickup !== 'object') {
      throw new ValidationError('Pickup location information is required.');
    }
    if (!destination || typeof destination !== 'object') {
      throw new ValidationError('Destination location information is required.');
    }

    const pickupCity = (pickup.city || '').trim();
    const destCity = (destination.city || '').trim();

    if (!pickupCity) {
      throw new ValidationError('Pickup city is required.');
    }
    if (!destCity) {
      throw new ValidationError('Destination city is required.');
    }

    const pickupAddr = (pickup.addressLine || '').trim().toLowerCase();
    const destAddr = (destination.addressLine || '').trim().toLowerCase();

    // Prevent identical pickup and destination
    if (pickupCity.toLowerCase() === destCity.toLowerCase() && pickupAddr && destAddr && pickupAddr === destAddr) {
      throw new ValidationError('Pickup and destination address cannot be identical.');
    }

    return { pickupCity, destCity, pickupAddr, destAddr };
  }

  /**
   * Calculate domestic route distance using the provider fallback chain
   * @param {Object} pickup { city, addressLine, latitude, longitude }
   * @param {Object} destination { city, addressLine, latitude, longitude }
   * @returns {Promise<{ distanceKm: number, distanceUnit: 'km', corridorName: string, providerUsed: string, drivingTimeHours: number }>}
   */
  async calculateRouteDistance(pickup, destination) {
    const { pickupCity, destCity } = this.validateLocations(pickup, destination);

    const cacheKey = `${pickupCity}-${destination.addressLine || ''}_to_${destCity}-${pickup.addressLine || ''}`.toLowerCase();
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    let result = null;
    const errors = [];

    // Provider 1: Remote Map API (if configured)
    if (ENV.ML_CONFIG?.SERVICE_MODE === 'remote_api') {
      try {
        result = await this.providers.remote.calculateDistance(pickup, destination);
      } catch (e) {
        errors.push(`Remote: ${e.message}`);
      }
    }

    // Provider 2: Highway Matrix Network (Primary Domestic Corridors)
    if (!result) {
      try {
        result = await this.providers.highway.calculateDistance(pickup, destination);
      } catch (e) {
        errors.push(`HighwayMatrix: ${e.message}`);
      }
    }

    // Provider 3: Geodesic Haversine with Road Curvature
    if (!result && pickup.latitude && pickup.longitude && destination.latitude && destination.longitude) {
      try {
        result = await this.providers.geodesic.calculateDistance(pickup, destination);
      } catch (e) {
        errors.push(`Geodesic: ${e.message}`);
      }
    }

    // Provider 4: Fallback Mock Provider (Guarantees system continuity)
    if (!result) {
      try {
        result = await this.providers.mock.calculateDistance(pickup, destination);
      } catch (e) {
        errors.push(`MockFallback: ${e.message}`);
      }
    }

    if (!result || !result.distanceKm || result.distanceKm <= 0) {
      throw new ValidationError(`Unable to calculate route distance: ${errors.join('; ')}`);
    }

    result.providerUsed = result.providerName || result.providerUsed || 'HighwayMatrixDistanceProvider';

    // Cache valid positive calculation
    this.cache.set(cacheKey, result);
    return result;
  }

  /**
   * Synchronous estimation helper for quick domestic city pair queries
   */
  getQuickDistanceKm(city1, city2) {
    const p = { city: city1 };
    const d = { city: city2 };
    try {
      this.validateLocations(p, d);
      const c1 = city1.toLowerCase();
      const c2 = city2.toLowerCase();
      if (c1 === c2) return 25;
      
      const matrix = {
        'islamabad-lahore': 380,
        'islamabad-karachi': 1410,
        'islamabad-peshawar': 185,
        'islamabad-multan': 535,
        'lahore-karachi': 1210,
        'lahore-peshawar': 510
      };
      return matrix[`${c1}-${c2}`] || matrix[`${c2}-${c1}`] || 350;
    } catch (e) {
      return 0;
    }
  }

  /**
   * Helper to calculate geodesic distance in km
   */
  calculateGeodesicDistance(lat1, lon1, lat2, lon2) {
    const rawKm = this.providers.geodesic.calculateHaversineKm(lat1, lon1, lat2, lon2);
    return Math.max(15, Math.round(rawKm * 1.28));
  }
}

export const distanceService = new DistanceService();

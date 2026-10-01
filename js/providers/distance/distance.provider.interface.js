/**
 * SMART ONLINE LUGGAGE TRANSPORTATION USING AI
 * Abstract Distance Provider Interface
 */

export class DistanceProvider {
  /**
   * @param {string} name - Identifier for the provider
   */
  constructor(name = 'BaseDistanceProvider') {
    this.name = name;
  }

  /**
   * Calculate distance between origin and destination
   * @param {Object} pickup - { city, addressLine, latitude, longitude }
   * @param {Object} destination - { city, addressLine, latitude, longitude }
   * @returns {Promise<{ distanceKm: number, distanceUnit: 'km', corridorName: string, providerName: string, drivingTimeHours: number }>}
   */
  async calculateDistance(pickup, destination) {
    throw new Error('calculateDistance() must be implemented by subclass.');
  }
}

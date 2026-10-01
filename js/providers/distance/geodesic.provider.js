/**
 * SMART ONLINE LUGGAGE TRANSPORTATION USING AI
 * Geodesic Haversine Distance Provider with Road Detour Scaling
 */

import { DistanceProvider } from './distance.provider.interface.js';

export class GeodesicDistanceProvider extends DistanceProvider {
  constructor() {
    super('GeodesicHaversineDistanceProvider');
  }

  calculateHaversineKm(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  async calculateDistance(pickup, destination) {
    const lat1 = Number(pickup.latitude);
    const lon1 = Number(pickup.longitude);
    const lat2 = Number(destination.latitude);
    const lon2 = Number(destination.longitude);

    if (isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) {
      throw new Error('Valid geographic coordinates (lat/lng) required for geodesic calculation.');
    }

    const straightLineKm = this.calculateHaversineKm(lat1, lon1, lat2, lon2);
    // Apply domestic highway detour factor (1.28x)
    const ROAD_CURVATURE_FACTOR = 1.28;
    const distanceKm = Math.max(15, Math.round(straightLineKm * ROAD_CURVATURE_FACTOR));
    const drivingTimeHours = Math.round((distanceKm / 65) * 10) / 10;

    return {
      distanceKm,
      distanceUnit: 'km',
      corridorName: `Direct Geodesic Road Route (${pickup.city || 'Origin'} → ${destination.city || 'Dest'})`,
      providerName: this.name,
      drivingTimeHours
    };
  }
}

/**
 * SMART ONLINE LUGGAGE TRANSPORTATION USING AI
 * Remote Mapping / Geocoding API Distance Provider
 * Ready for backend Google Maps / OpenRouteService proxy integration
 */

import { DistanceProvider } from './distance.provider.interface.js';

export class RemoteMapApiDistanceProvider extends DistanceProvider {
  constructor(endpoint = '/api/v1/routing/distance', timeoutMs = 3000) {
    super('RemoteMapApiDistanceProvider');
    this.endpoint = endpoint;
    this.timeoutMs = timeoutMs;
  }

  async calculateDistance(pickup, destination) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pickup, destination }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Remote Mapping API returned status ${response.status}`);
      }

      const data = await response.json();
      return {
        distanceKm: Number(data.distanceKm),
        distanceUnit: 'km',
        corridorName: data.corridorName || 'Remote GPS Optimized Route',
        providerName: this.name,
        drivingTimeHours: Number(data.drivingTimeHours) || Math.round((data.distanceKm / 70) * 10) / 10
      };
    } catch (err) {
      clearTimeout(timeoutId);
      throw new Error(`Remote Mapping API failed: ${err.message}`);
    }
  }
}

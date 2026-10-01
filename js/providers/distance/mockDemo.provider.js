/**
 * SMART ONLINE LUGGAGE TRANSPORTATION USING AI
 * Mock / Demo Distance Provider
 * Clearly isolated mock implementation for testing, offline demos, and deterministic routing simulations.
 */

import { DistanceProvider } from './distance.provider.interface.js';

export class MockDemoDistanceProvider extends DistanceProvider {
  constructor(options = {}) {
    super('MockDemoDistanceProvider');
    this.shouldFail = options.shouldFail || false;
    this.simulatedLatencyMs = options.simulatedLatencyMs || 0;
  }

  async calculateDistance(pickup, destination) {
    if (this.simulatedLatencyMs > 0) {
      await new Promise(res => setTimeout(res, this.simulatedLatencyMs));
    }

    if (this.shouldFail) {
      throw new Error('Simulated Mock Provider Failure for Resilience Testing.');
    }

    // Deterministic mock distance derived from city name character hashing
    const origin = (pickup.city || 'Islamabad').toLowerCase();
    const dest = (destination.city || 'Lahore').toLowerCase();
    
    let hash = 0;
    const combined = `${origin}-${dest}`;
    for (let i = 0; i < combined.length; i++) {
      hash += combined.charCodeAt(i);
    }
    const distanceKm = 100 + (hash % 1200);

    return {
      distanceKm,
      distanceUnit: 'km',
      corridorName: `Demo Simulated Domestic Corridor (${pickup.city} → ${destination.city})`,
      providerName: this.name,
      drivingTimeHours: Math.round((distanceKm / 60) * 10) / 10
    };
  }
}

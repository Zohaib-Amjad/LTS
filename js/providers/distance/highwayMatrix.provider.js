/**
 * SMART ONLINE LUGGAGE TRANSPORTATION USING AI
 * Domestic Highway Matrix Provider (Calibrated on Pakistan Motorway / N-5 Network)
 */

import { DistanceProvider } from './distance.provider.interface.js';

// Verified domestic inter-city road corridors (National Highway Authority mileage)
const DOMESTIC_CORRIDORS = {
  'islamabad-rawalpindi': { distanceKm: 25, corridor: 'Islamabad Expressway Corridor', speedKmh: 45 },
  'islamabad-lahore': { distanceKm: 380, corridor: 'Motorway M-2 North-South Corridor', speedKmh: 95 },
  'islamabad-karachi': { distanceKm: 1410, corridor: 'M-2 / M-4 / M-5 Sukkur-Multan / N-5 Grand Corridor', speedKmh: 75 },
  'islamabad-peshawar': { distanceKm: 185, corridor: 'Motorway M-1 Northern Gateway', speedKmh: 95 },
  'islamabad-multan': { distanceKm: 535, corridor: 'Motorway M-2 & M-4 Central Corridor', speedKmh: 90 },
  'islamabad-faisalabad': { distanceKm: 320, corridor: 'Motorway M-2 & M-3 Industrial Link', speedKmh: 90 },
  'islamabad-quetta': { distanceKm: 900, corridor: 'N-50 Western Route Corridor', speedKmh: 65 },

  'rawalpindi-lahore': { distanceKm: 375, corridor: 'Motorway M-2 Corridor', speedKmh: 95 },
  'rawalpindi-karachi': { distanceKm: 1400, corridor: 'M-2 / M-5 / N-5 National Highway Link', speedKmh: 75 },
  'rawalpindi-peshawar': { distanceKm: 175, corridor: 'Motorway M-1 Corridor', speedKmh: 95 },
  'rawalpindi-multan': { distanceKm: 530, corridor: 'Motorway M-2 / M-4 Link', speedKmh: 90 },
  'rawalpindi-faisalabad': { distanceKm: 315, corridor: 'Motorway M-2 / M-3 Link', speedKmh: 90 },

  'lahore-karachi': { distanceKm: 1210, corridor: 'Motorway M-3 / M-4 / M-5 / N-5 Southern Corridor', speedKmh: 80 },
  'lahore-peshawar': { distanceKm: 510, corridor: 'Motorway M-2 & M-1 Trans-Provincial Corridor', speedKmh: 95 },
  'lahore-multan': { distanceKm: 345, corridor: 'Motorway M-3 / M-4 South Punjab Link', speedKmh: 95 },
  'lahore-faisalabad': { distanceKm: 180, corridor: 'Motorway M-3 Faisalabad Arterial', speedKmh: 95 },
  'lahore-quetta': { distanceKm: 980, corridor: 'M-3 / N-70 Balochistan Corridor', speedKmh: 65 },

  'karachi-peshawar': { distanceKm: 1580, corridor: 'Indus Highway & N-5 National Spine', speedKmh: 70 },
  'karachi-multan': { distanceKm: 890, corridor: 'Motorway M-5 Sukkur-Multan Corridor', speedKmh: 85 },
  'karachi-faisalabad': { distanceKm: 1130, corridor: 'M-5 & M-4 Central Logistics Line', speedKmh: 80 },
  'karachi-quetta': { distanceKm: 690, corridor: 'RCD Highway N-25 Coastal Route', speedKmh: 65 },

  'peshawar-multan': { distanceKm: 640, corridor: 'M-1 / M-2 / M-4 Corridor', speedKmh: 90 },
  'peshawar-faisalabad': { distanceKm: 440, corridor: 'M-1 / M-2 / M-3 Logistics Link', speedKmh: 90 },

  'multan-faisalabad': { distanceKm: 240, corridor: 'Motorway M-4 Industrial Route', speedKmh: 95 },
  'multan-quetta': { distanceKm: 600, corridor: 'N-70 Fort Munro Highway Link', speedKmh: 60 }
};

export class HighwayMatrixDistanceProvider extends DistanceProvider {
  constructor() {
    super('HighwayMatrixDistanceProvider');
  }

  async calculateDistance(pickup, destination) {
    const city1 = (pickup.city || '').trim().toLowerCase();
    const city2 = (destination.city || '').trim().toLowerCase();

    if (!city1 || !city2) {
      throw new Error('City names are required for domestic highway matrix calculation.');
    }

    if (city1 === city2) {
      return {
        distanceKm: 25,
        distanceUnit: 'km',
        corridorName: `Intra-City ${pickup.city} Metropolitan Express`,
        providerName: this.name,
        drivingTimeHours: 0.8
      };
    }

    const key1 = `${city1}-${city2}`;
    const key2 = `${city2}-${city1}`;
    const match = DOMESTIC_CORRIDORS[key1] || DOMESTIC_CORRIDORS[key2];

    if (!match) {
      throw new Error(`No verified domestic highway corridor found between ${pickup.city} and ${destination.city}.`);
    }

    const drivingTimeHours = Math.round((match.distanceKm / match.speedKmh) * 10) / 10;

    return {
      distanceKm: match.distanceKm,
      distanceUnit: 'km',
      corridorName: match.corridor,
      providerName: this.name,
      drivingTimeHours
    };
  }
}

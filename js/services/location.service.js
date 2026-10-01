/**
 * SMART ONLINE LUGGAGE TRANSPORTATION USING AI
 * Domestic Logistics Location Service
 */

import { db } from '../core/database.js';
import { NotFoundError, ValidationError } from '../core/errorHandler.js';

export const DOMESTIC_CITY_COORDINATES = Object.freeze({
  islamabad: { city: 'Islamabad', lat: 33.7215, lng: 73.0566, province: 'Federal Territory', postalCode: '44000' },
  rawalpindi: { city: 'Rawalpindi', lat: 33.5651, lng: 73.0169, province: 'Punjab', postalCode: '46000' },
  lahore: { city: 'Lahore', lat: 31.5204, lng: 74.3587, province: 'Punjab', postalCode: '54000' },
  karachi: { city: 'Karachi', lat: 24.8138, lng: 67.0300, province: 'Sindh', postalCode: '75000' },
  peshawar: { city: 'Peshawar', lat: 34.0151, lng: 71.5249, province: 'Khyber Pakhtunkhwa', postalCode: '25000' },
  multan: { city: 'Multan', lat: 30.1575, lng: 71.5249, province: 'Punjab', postalCode: '60000' },
  faisalabad: { city: 'Faisalabad', lat: 31.4504, lng: 73.1350, province: 'Punjab', postalCode: '38000' },
  quetta: { city: 'Quetta', lat: 30.1798, lng: 66.9750, province: 'Balochistan', postalCode: '87300' }
});

class LocationService {
  getAllLocations() {
    return db.tables.locations.getAll();
  }

  getLocationById(id) {
    const loc = db.tables.locations.findById(id);
    if (!loc) throw new NotFoundError(`Location with ID ${id}`);
    return loc;
  }

  getCityMetadata(cityName) {
    if (!cityName) return null;
    const key = cityName.trim().toLowerCase();
    return DOMESTIC_CITY_COORDINATES[key] || {
      city: cityName,
      lat: 33.6844,
      lng: 73.0479,
      province: 'Pakistan',
      postalCode: '44000'
    };
  }

  /**
   * Validate pickup and destination locations
   */
  validateRoute(pickup, destination) {
    if (!pickup || !destination) {
      throw new ValidationError('Both pickup and destination locations are required.');
    }
    const pCity = (pickup.city || '').trim().toLowerCase();
    const dCity = (destination.city || '').trim().toLowerCase();
    const pAddr = (pickup.addressLine || pickup.address || '').trim().toLowerCase();
    const dAddr = (destination.addressLine || destination.address || '').trim().toLowerCase();

    if (pCity === dCity && pAddr === dAddr) {
      throw new ValidationError('Pickup and destination locations cannot be identical.');
    }
    return true;
  }

  createLocation({ city, addressLine, postalCode, landmark, contactPerson, contactPhone, latitude, longitude }) {
    if (!city || !city.trim()) {
      throw new ValidationError('City is required to register a location.');
    }
    if (!addressLine || !addressLine.trim()) {
      throw new ValidationError('Address line is required to register a location.');
    }

    const cityMeta = this.getCityMetadata(city);
    const lat = latitude || cityMeta.lat;
    const lng = longitude || cityMeta.lng;
    const code = postalCode || cityMeta.postalCode;

    const newLoc = db.tables.locations.insert({
      city: city.trim(),
      addressLine: addressLine.trim(),
      postalCode: code,
      landmark: landmark ? landmark.trim() : '',
      latitude: Number(lat),
      longitude: Number(lng),
      contactPerson: contactPerson ? contactPerson.trim() : '',
      contactPhone: contactPhone ? contactPhone.trim() : ''
    });

    db.persist();
    return newLoc;
  }
}

export const locationService = new LocationService();

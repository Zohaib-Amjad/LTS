/**
 * SMART ONLINE LUGGAGE TRANSPORTATION USING AI
 * Luggage Management & Volumetric Calculation Service (Phase 5 Booking Core)
 */

import { LUGGAGE_TYPES, LUGGAGE_SIZES } from '../constants/enums.js';
import { db } from '../core/database.js';
import { ValidationError, NotFoundError } from '../core/errorHandler.js';

class LuggageService {
  /**
   * Determine size category from weight and volume in liters
   * @param {number} weightKg 
   * @param {number} volumeLiters 
   * @returns {string} LuggageSize
   */
  classifySizeCategory(weightKg, volumeLiters) {
    if (weightKg > 25 || volumeLiters > 100) return LUGGAGE_SIZES.EXTRA_LARGE;
    if (weightKg >= 15 || volumeLiters >= 70) return LUGGAGE_SIZES.LARGE;
    if (weightKg >= 7 || volumeLiters >= 40) return LUGGAGE_SIZES.MEDIUM;
    return LUGGAGE_SIZES.SMALL;
  }

  /**
   * Calculate volume in Liters from cm dimensions
   * @param {number} lengthCm 
   * @param {number} widthCm 
   * @param {number} heightCm 
   * @returns {number} volume in liters
   */
  calculateVolumeLiters(lengthCm, widthCm, heightCm) {
    const l = Math.max(1, Number(lengthCm) || 30);
    const w = Math.max(1, Number(widthCm) || 20);
    const h = Math.max(1, Number(heightCm) || 15);
    return Math.round(((l * w * h) / 1000) * 10) / 10;
  }

  /**
   * Calculate IATA standard volumetric dimensional weight in kg
   * @param {number} lengthCm 
   * @param {number} widthCm 
   * @param {number} heightCm 
   * @returns {number} volumetric weight in kg
   */
  calculateVolumetricWeightKg(lengthCm, widthCm, heightCm) {
    const l = Math.max(1, Number(lengthCm) || 30);
    const w = Math.max(1, Number(widthCm) || 20);
    const h = Math.max(1, Number(heightCm) || 15);
    return Math.round(((l * w * h) / 5000) * 10) / 10;
  }

  /**
   * Validate luggage specifications
   */
  validateLuggageSpecs({ weightKg, bagCount = 1, lengthCm, widthCm, heightCm, declaredValue }) {
    const weight = Number(weightKg);
    if (isNaN(weight) || weight <= 0) {
      throw new ValidationError('Luggage weight must be a positive number greater than 0 kg.');
    }
    if (weight > 200) {
      throw new ValidationError('Maximum allowable domestic cargo weight per luggage item is 200 kg.');
    }

    const bags = Number(bagCount);
    if (isNaN(bags) || bags <= 0 || !Number.isInteger(bags)) {
      throw new ValidationError('Number of bags must be an integer greater than 0.');
    }
    if (bags > 20) {
      throw new ValidationError('A single booking can contain at most 20 baggage items.');
    }

    if (lengthCm !== undefined && (isNaN(Number(lengthCm)) || Number(lengthCm) <= 0 || Number(lengthCm) > 300)) {
      throw new ValidationError('Length must be between 1 cm and 300 cm.');
    }
    if (widthCm !== undefined && (isNaN(Number(widthCm)) || Number(widthCm) <= 0 || Number(widthCm) > 300)) {
      throw new ValidationError('Width must be between 1 cm and 300 cm.');
    }
    if (heightCm !== undefined && (isNaN(Number(heightCm)) || Number(heightCm) <= 0 || Number(heightCm) > 300)) {
      throw new ValidationError('Height must be between 1 cm and 300 cm.');
    }

    if (declaredValue !== undefined && (isNaN(Number(declaredValue)) || Number(declaredValue) < 0)) {
      throw new ValidationError('Declared value cannot be negative.');
    }

    return true;
  }

  createLuggage({
    customerId,
    bookingId = null,
    type = LUGGAGE_TYPES.SUITCASE,
    weightKg = 10,
    bagCount = 1,
    lengthCm = 50,
    widthCm = 35,
    heightCm = 25,
    isFragile = false,
    declaredValue = 10000,
    specialInstructions = ''
  }) {
    if (!customerId) {
      throw new ValidationError('Customer ID is required to register luggage.');
    }

    this.validateLuggageSpecs({ weightKg, bagCount, lengthCm, widthCm, heightCm, declaredValue });

    const volumeLiters = this.calculateVolumeLiters(lengthCm, widthCm, heightCm);
    const sizeCategory = this.classifySizeCategory(weightKg, volumeLiters);

    const record = db.tables.luggage.insert({
      customerId,
      bookingId,
      type: Object.values(LUGGAGE_TYPES).includes(type) ? type : LUGGAGE_TYPES.SUITCASE,
      weightKg: Number(weightKg),
      bagCount: Number(bagCount) || 1,
      lengthCm: Number(lengthCm) || 50,
      widthCm: Number(widthCm) || 35,
      heightCm: Number(heightCm) || 25,
      volumeLiters,
      sizeCategory,
      isFragile: Boolean(isFragile),
      declaredValue: Number(declaredValue) || 5000,
      specialInstructions: specialInstructions ? specialInstructions.trim() : ''
    });

    db.persist();
    return record;
  }

  getLuggageById(id) {
    const item = db.tables.luggage.findById(id);
    if (!item) throw new NotFoundError(`Luggage item with ID ${id}`);
    return item;
  }

  getCustomerLuggage(customerId) {
    return db.tables.luggage.filter(item => item.customerId === customerId);
  }
}

export const luggageService = new LuggageService();

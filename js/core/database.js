/**
 * SMART ONLINE LUGGAGE TRANSPORTATION USING AI
 * Relational In-Memory & LocalStorage Data Store
 * Provides relational query helpers, foreign key validation, and initial domestic seed data.
 */

import { STORAGE_KEYS, USER_ROLES, BOOKING_STATUS, LUGGAGE_TYPES, LUGGAGE_SIZES, TRANSPORT_TIERS, ML_MODELS, PREDICTION_STATUS } from '../constants/enums.js';
import { AppError, NotFoundError } from './errorHandler.js';

// Realistic domestic locations in Pakistan with genuine coordinates
const INITIAL_LOCATIONS = [
  {
    id: 'LOC-ISB-01',
    city: 'Islamabad',
    addressLine: 'Sector F-7/2, Street 14, House 22',
    postalCode: '44000',
    landmark: 'Near Safa Gold Mall',
    latitude: 33.7215,
    longitude: 73.0566,
    contactPerson: 'Ali Khan',
    contactPhone: '+92 300 1234567',
    createdAt: '2026-09-01T08:00:00Z'
  },
  {
    id: 'LOC-KHI-01',
    city: 'Karachi',
    addressLine: 'Clifton Block 4, Sea View Residency',
    postalCode: '75600',
    landmark: 'Near Bilawal House',
    latitude: 24.8138,
    longitude: 67.0300,
    contactPerson: 'Farhan Zaidi',
    contactPhone: '+92 321 9876543',
    createdAt: '2026-09-01T08:30:00Z'
  },
  {
    id: 'LOC-LHR-01',
    city: 'Lahore',
    addressLine: 'Gulberg III, Main Boulevard, Plaza 4A',
    postalCode: '54660',
    landmark: 'Opposite Pace Mall',
    latitude: 31.5204,
    longitude: 74.3587,
    contactPerson: 'Sarah Ali',
    contactPhone: '+92 333 4567890',
    createdAt: '2026-09-01T09:00:00Z'
  },
  {
    id: 'LOC-PEW-01',
    city: 'Peshawar',
    addressLine: 'University Town, Circular Road, House 8',
    postalCode: '25000',
    landmark: 'Near Dean Trade Center',
    latitude: 34.0151,
    longitude: 71.5249,
    contactPerson: 'Tariq Mehmood',
    contactPhone: '+92 345 1122334',
    createdAt: '2026-09-01T09:30:00Z'
  },
  {
    id: 'LOC-RWP-01',
    city: 'Rawalpindi',
    addressLine: 'Bahria Town Phase 4, Civic Center',
    postalCode: '46000',
    landmark: 'Near River View Commercial',
    latitude: 33.5651,
    longitude: 73.0169,
    contactPerson: 'Hassan Raza',
    contactPhone: '+92 312 9988776',
    createdAt: '2026-09-01T10:00:00Z'
  },
  {
    id: 'LOC-MUX-01',
    city: 'Multan',
    addressLine: 'Gulgasht Colony, Bosan Road, Lane 3',
    postalCode: '60000',
    landmark: 'Near Chase Up Multan',
    latitude: 30.1575,
    longitude: 71.5249,
    contactPerson: 'Usman Malik',
    contactPhone: '+92 301 5544332',
    createdAt: '2026-09-01T10:30:00Z'
  }
];

const INITIAL_USERS = [
  {
    id: 'USR-CUST-001',
    email: 'customer@smartluggage.pk',
    fullName: 'Ali Khan',
    phone: '+92 300 1234567',
    role: USER_ROLES.CUSTOMER,
    passwordHash: 'customer123', // Demo auth hash
    address: 'Sector F-7/2, Street 14, House 22',
    city: 'Islamabad',
    country: 'Pakistan',
    avatarInitials: 'AK',
    isActive: true,
    createdAt: '2026-09-01T08:00:00Z',
    updatedAt: '2026-09-15T12:00:00Z'
  },
  {
    id: 'USR-CUST-002',
    email: 'sarah.ali@smartluggage.pk',
    fullName: 'Sarah Ali',
    phone: '+92 333 4567890',
    role: USER_ROLES.CUSTOMER,
    passwordHash: 'customer123',
    address: 'Gulberg III, Main Boulevard, Plaza 4A',
    city: 'Lahore',
    country: 'Pakistan',
    avatarInitials: 'SA',
    isActive: true,
    createdAt: '2026-09-02T10:00:00Z',
    updatedAt: '2026-09-18T15:00:00Z'
  },
  {
    id: 'USR-CUST-003',
    email: 'hamza.tariq@smartluggage.pk',
    fullName: 'Hamza Tariq',
    phone: '+92 301 7788990',
    role: USER_ROLES.CUSTOMER,
    passwordHash: 'customer123',
    address: 'Clifton Block 4, Sea View Residency',
    city: 'Karachi',
    country: 'Pakistan',
    avatarInitials: 'HT',
    isActive: true,
    createdAt: '2026-09-05T09:00:00Z',
    updatedAt: '2026-09-20T11:00:00Z'
  },
  {
    id: 'USR-DRV-001',
    email: 'driver@smartluggage.pk',
    fullName: 'Bilal Tariq',
    phone: '+92 345 9876543',
    role: USER_ROLES.DRIVER,
    passwordHash: 'driver123',
    address: 'Saddar, Rawalpindi',
    city: 'Rawalpindi',
    country: 'Pakistan',
    avatarInitials: 'BT',
    isActive: true,
    createdAt: '2026-09-01T08:00:00Z',
    updatedAt: '2026-09-10T09:00:00Z'
  },
  {
    id: 'USR-DRV-002',
    email: 'kamran.shah@smartluggage.pk',
    fullName: 'Kamran Shah',
    phone: '+92 321 4455667',
    role: USER_ROLES.DRIVER,
    passwordHash: 'driver123',
    address: 'Johar Town, Lahore',
    city: 'Lahore',
    country: 'Pakistan',
    avatarInitials: 'KS',
    isActive: true,
    createdAt: '2026-09-03T11:00:00Z',
    updatedAt: '2026-09-12T14:00:00Z'
  },
  {
    id: 'USR-DRV-003',
    email: 'usman.rafique@smartluggage.pk',
    fullName: 'Usman Rafique',
    phone: '+92 302 5566778',
    role: USER_ROLES.DRIVER,
    passwordHash: 'driver123',
    address: 'University Road, Peshawar',
    city: 'Peshawar',
    country: 'Pakistan',
    avatarInitials: 'UR',
    isActive: true,
    createdAt: '2026-09-04T12:00:00Z',
    updatedAt: '2026-09-15T16:00:00Z'
  },
  {
    id: 'USR-ADM-001',
    email: 'admin@smartluggage.pk',
    fullName: 'System Administrator',
    phone: '+92 300 0000000',
    role: USER_ROLES.ADMIN,
    passwordHash: 'admin123',
    address: 'Blue Area, Islamabad',
    city: 'Islamabad',
    country: 'Pakistan',
    avatarInitials: 'SA',
    isActive: true,
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z'
  }
];

const INITIAL_DRIVERS = [
  {
    id: 'DRV-101',
    userId: 'USR-DRV-001',
    vehicleType: 'Toyota HiAce High-Roof Van (Cargo)',
    vehiclePlate: 'ICT-LE-4589',
    licenseNumber: 'LHR-2018-99238',
    rating: 4.88,
    totalTrips: 142,
    isAvailable: true,
    availabilityStatus: 'AVAILABLE',
    currentCity: 'Islamabad',
    currentLat: 33.7215,
    currentLng: 73.0566,
    createdAt: '2026-09-01T08:00:00Z',
    updatedAt: '2026-09-20T10:00:00Z'
  },
  {
    id: 'DRV-102',
    userId: 'USR-DRV-002',
    vehicleType: 'Suzuki Every Secure Carrier',
    vehiclePlate: 'LHE-KA-7712',
    licenseNumber: 'LHR-2020-55120',
    rating: 4.75,
    totalTrips: 89,
    isAvailable: true,
    availabilityStatus: 'AVAILABLE',
    currentCity: 'Lahore',
    currentLat: 31.5204,
    currentLng: 74.3587,
    createdAt: '2026-09-03T11:00:00Z',
    updatedAt: '2026-09-20T10:00:00Z'
  },
  {
    id: 'DRV-103',
    userId: 'USR-DRV-003',
    vehicleType: 'Hyundai Porter H100 Closed Deck',
    vehiclePlate: 'PEW-AB-3341',
    licenseNumber: 'PEW-2019-11409',
    rating: 4.92,
    totalTrips: 64,
    isAvailable: true,
    availabilityStatus: 'AVAILABLE',
    currentCity: 'Peshawar',
    currentLat: 34.0151,
    currentLng: 71.5249,
    createdAt: '2026-09-04T12:00:00Z',
    updatedAt: '2026-09-20T10:00:00Z'
  }
];

const INITIAL_LUGGAGE = [
  {
    id: 'LUG-10001',
    bookingId: 'BK-2026-001',
    customerId: 'USR-CUST-001',
    type: LUGGAGE_TYPES.SUITCASE,
    weightKg: 18.5,
    lengthCm: 70,
    widthCm: 45,
    heightCm: 28,
    volumeLiters: 88.2,
    sizeCategory: LUGGAGE_SIZES.LARGE,
    isFragile: false,
    declaredValue: 45000,
    specialInstructions: 'Handle with care. Lock combination on tag.',
    createdAt: '2026-09-12T10:00:00Z'
  },
  {
    id: 'LUG-10002',
    bookingId: 'BK-2026-002',
    customerId: 'USR-CUST-002',
    type: LUGGAGE_TYPES.BACKPACK,
    weightKg: 6.2,
    lengthCm: 48,
    widthCm: 32,
    heightCm: 20,
    volumeLiters: 30.7,
    sizeCategory: LUGGAGE_SIZES.SMALL,
    isFragile: false,
    declaredValue: 15000,
    specialInstructions: 'Laptop sleeve inside waterproof compartment.',
    createdAt: '2026-09-13T11:00:00Z'
  },
  {
    id: 'LUG-10003',
    bookingId: 'BK-2026-003',
    customerId: 'USR-CUST-001',
    type: LUGGAGE_TYPES.FRAGILE,
    weightKg: 9.8,
    lengthCm: 50,
    widthCm: 35,
    heightCm: 30,
    volumeLiters: 52.5,
    sizeCategory: LUGGAGE_SIZES.MEDIUM,
    isFragile: true,
    declaredValue: 80000,
    specialInstructions: 'Handmade ceramic & glass ornaments. Upright orientation required.',
    createdAt: '2026-09-15T09:00:00Z'
  },
  {
    id: 'LUG-10004',
    bookingId: 'BK-2026-004',
    customerId: 'USR-CUST-001',
    type: LUGGAGE_TYPES.BOX,
    weightKg: 12.0,
    lengthCm: 60,
    widthCm: 40,
    heightCm: 35,
    volumeLiters: 84.0,
    sizeCategory: LUGGAGE_SIZES.LARGE,
    isFragile: false,
    declaredValue: 20000,
    specialInstructions: 'Books and study material.',
    createdAt: '2026-09-06T14:00:00Z'
  },
  {
    id: 'LUG-10005',
    bookingId: 'BK-2026-005',
    customerId: 'USR-CUST-003',
    type: LUGGAGE_TYPES.TRAVEL_BAG,
    weightKg: 14.5,
    lengthCm: 65,
    widthCm: 38,
    heightCm: 32,
    volumeLiters: 79.0,
    sizeCategory: LUGGAGE_SIZES.MEDIUM,
    isFragile: false,
    declaredValue: 35000,
    specialInstructions: 'Gym and sports gear in side compartments.',
    createdAt: '2026-09-18T16:00:00Z'
  },
  {
    id: 'LUG-10006',
    bookingId: 'BK-2026-006',
    customerId: 'USR-CUST-002',
    type: LUGGAGE_TYPES.SUITCASE,
    weightKg: 22.0,
    lengthCm: 75,
    widthCm: 50,
    heightCm: 30,
    volumeLiters: 112.5,
    sizeCategory: LUGGAGE_SIZES.EXTRA_LARGE,
    isFragile: false,
    declaredValue: 60000,
    specialInstructions: 'Official presentation items and heavy garments.',
    createdAt: '2026-09-19T08:00:00Z'
  },
  {
    id: 'LUG-10007',
    bookingId: 'BK-2026-007',
    customerId: 'USR-CUST-003',
    type: LUGGAGE_TYPES.BOX,
    weightKg: 8.5,
    lengthCm: 45,
    widthCm: 35,
    heightCm: 25,
    volumeLiters: 39.4,
    sizeCategory: LUGGAGE_SIZES.MEDIUM,
    isFragile: false,
    declaredValue: 12000,
    specialInstructions: 'Customer cancelled prior to dispatch.',
    createdAt: '2026-09-10T11:00:00Z'
  }
];

const INITIAL_PREDICTIONS = [
  {
    id: 'PRED-2026-001',
    bookingId: 'BK-2026-001',
    customerId: 'USR-CUST-001',
    inputFeatures: {
      distanceKm: 1410,
      totalWeightKg: 18.5,
      bagCount: 1,
      luggageType: LUGGAGE_TYPES.SUITCASE,
      sizeCategory: LUGGAGE_SIZES.LARGE,
      transportTier: TRANSPORT_TIERS.EXPRESS,
      isFragile: false,
      timeOfDayHours: 10,
      dayOfWeek: 5
    },
    predictedCost: 4850,
    predictedTimeHours: 32.5,
    confidenceScore: 0.942,
    modelVersion: 'v1.4-rf-regressor',
    algorithmUsed: ML_MODELS.RANDOM_FOREST,
    featureImportance: {
      distance: 0.52,
      weight: 0.28,
      luggageType: 0.11,
      tier: 0.09
    },
    createdAt: '2026-09-12T10:02:00Z'
  },
  {
    id: 'PRED-2026-002',
    bookingId: 'BK-2026-002',
    customerId: 'USR-CUST-002',
    inputFeatures: {
      distanceKm: 510,
      totalWeightKg: 6.2,
      bagCount: 1,
      luggageType: LUGGAGE_TYPES.BACKPACK,
      sizeCategory: LUGGAGE_SIZES.SMALL,
      transportTier: TRANSPORT_TIERS.STANDARD,
      isFragile: false,
      timeOfDayHours: 11,
      dayOfWeek: 6
    },
    predictedCost: 1950,
    predictedTimeHours: 14.0,
    confidenceScore: 0.958,
    modelVersion: 'v1.4-rf-regressor',
    algorithmUsed: ML_MODELS.RANDOM_FOREST,
    featureImportance: {
      distance: 0.58,
      weight: 0.22,
      luggageType: 0.12,
      tier: 0.08
    },
    createdAt: '2026-09-13T11:01:30Z'
  },
  {
    id: 'PRED-2026-003',
    bookingId: 'BK-2026-003',
    customerId: 'USR-CUST-001',
    inputFeatures: {
      distanceKm: 535,
      totalWeightKg: 9.8,
      bagCount: 1,
      luggageType: LUGGAGE_TYPES.FRAGILE,
      sizeCategory: LUGGAGE_SIZES.MEDIUM,
      transportTier: TRANSPORT_TIERS.PREMIUM,
      isFragile: true,
      timeOfDayHours: 9,
      dayOfWeek: 2
    },
    predictedCost: 3100,
    predictedTimeHours: 16.5,
    confidenceScore: 0.931,
    modelVersion: 'v1.4-rf-regressor',
    algorithmUsed: ML_MODELS.RANDOM_FOREST,
    featureImportance: {
      distance: 0.46,
      weight: 0.24,
      isFragile: 0.20,
      tier: 0.10
    },
    createdAt: '2026-09-15T09:05:00Z'
  },
  {
    id: 'PRED-2026-004',
    bookingId: 'BK-2026-004',
    customerId: 'USR-CUST-001',
    inputFeatures: {
      distanceKm: 1410,
      totalWeightKg: 12.0,
      bagCount: 1,
      luggageType: LUGGAGE_TYPES.BOX,
      sizeCategory: LUGGAGE_SIZES.LARGE,
      transportTier: TRANSPORT_TIERS.STANDARD,
      isFragile: false,
      timeOfDayHours: 14,
      dayOfWeek: 0
    },
    predictedCost: 3800,
    predictedTimeHours: 36.0,
    confidenceScore: 0.965,
    modelVersion: 'v1.4-rf-regressor',
    algorithmUsed: ML_MODELS.RANDOM_FOREST,
    featureImportance: {
      distance: 0.60,
      weight: 0.25,
      luggageType: 0.08,
      tier: 0.07
    },
    createdAt: '2026-09-06T14:02:00Z'
  },
  {
    id: 'PRED-2026-005',
    bookingId: 'BK-2026-005',
    customerId: 'USR-CUST-003',
    inputFeatures: {
      distanceKm: 375,
      totalWeightKg: 14.5,
      bagCount: 1,
      luggageType: LUGGAGE_TYPES.TRAVEL_BAG,
      sizeCategory: LUGGAGE_SIZES.MEDIUM,
      transportTier: TRANSPORT_TIERS.STANDARD,
      isFragile: false,
      timeOfDayHours: 16,
      dayOfWeek: 5
    },
    predictedCost: 1750,
    predictedTimeHours: 10.5,
    confidenceScore: 0.948,
    modelVersion: 'v1.4-rf-regressor',
    algorithmUsed: ML_MODELS.RANDOM_FOREST,
    featureImportance: {
      distance: 0.55,
      weight: 0.25,
      luggageType: 0.10,
      tier: 0.10
    },
    createdAt: '2026-09-18T16:02:00Z'
  },
  {
    id: 'PRED-2026-006',
    bookingId: 'BK-2026-006',
    customerId: 'USR-CUST-002',
    inputFeatures: {
      distanceKm: 510,
      totalWeightKg: 22.0,
      bagCount: 1,
      luggageType: LUGGAGE_TYPES.SUITCASE,
      sizeCategory: LUGGAGE_SIZES.EXTRA_LARGE,
      transportTier: TRANSPORT_TIERS.EXPRESS,
      isFragile: false,
      timeOfDayHours: 8,
      dayOfWeek: 6
    },
    predictedCost: 2950,
    predictedTimeHours: 12.0,
    confidenceScore: 0.952,
    modelVersion: 'v1.4-rf-regressor',
    algorithmUsed: ML_MODELS.RANDOM_FOREST,
    featureImportance: {
      distance: 0.50,
      weight: 0.30,
      luggageType: 0.10,
      tier: 0.10
    },
    createdAt: '2026-09-19T08:02:00Z'
  },
  {
    id: 'PRED-2026-007',
    bookingId: 'BK-2026-007',
    customerId: 'USR-CUST-003',
    inputFeatures: {
      distanceKm: 160,
      totalWeightKg: 8.5,
      bagCount: 1,
      luggageType: LUGGAGE_TYPES.BOX,
      sizeCategory: LUGGAGE_SIZES.MEDIUM,
      transportTier: TRANSPORT_TIERS.STANDARD,
      isFragile: false,
      timeOfDayHours: 11,
      dayOfWeek: 4
    },
    predictedCost: 1100,
    predictedTimeHours: 5.0,
    confidenceScore: 0.970,
    modelVersion: 'v1.4-rf-regressor',
    algorithmUsed: ML_MODELS.RANDOM_FOREST,
    featureImportance: {
      distance: 0.60,
      weight: 0.20,
      luggageType: 0.10,
      tier: 0.10
    },
    createdAt: '2026-09-10T11:02:00Z'
  }
];

const INITIAL_BOOKINGS = [
  {
    id: 'BK-2026-001',
    bookingNumber: 'SL-ISB-KHI-001',
    customerId: 'USR-CUST-001',
    pickupLocationId: 'LOC-ISB-01',
    destinationLocationId: 'LOC-KHI-01',
    luggageIds: ['LUG-10001'],
    distanceKm: 1410,
    predictionId: 'PRED-2026-001',
    assignedDriverId: 'DRV-101',
    status: BOOKING_STATUS.IN_TRANSIT,
    transportTier: TRANSPORT_TIERS.EXPRESS,
    quotedCost: 4850,
    currency: 'PKR',
    estimatedDeliveryTimeHours: 32.5,
    scheduledPickupTime: '2026-09-12T14:00:00Z',
    actualPickupTime: '2026-09-12T14:20:00Z',
    actualDeliveryTime: null,
    customerNotes: 'Deliver to 3rd floor apartment.',
    createdAt: '2026-09-12T10:05:00Z',
    updatedAt: '2026-09-13T08:00:00Z'
  },
  {
    id: 'BK-2026-002',
    bookingNumber: 'SL-LHR-PEW-002',
    customerId: 'USR-CUST-002',
    pickupLocationId: 'LOC-LHR-01',
    destinationLocationId: 'LOC-PEW-01',
    luggageIds: ['LUG-10002'],
    distanceKm: 510,
    predictionId: 'PRED-2026-002',
    assignedDriverId: null,
    status: BOOKING_STATUS.PENDING,
    transportTier: TRANSPORT_TIERS.STANDARD,
    quotedCost: 1950,
    currency: 'PKR',
    estimatedDeliveryTimeHours: 14.0,
    scheduledPickupTime: '2026-09-22T09:00:00Z',
    actualPickupTime: null,
    actualDeliveryTime: null,
    customerNotes: 'Morning pickup preferred.',
    createdAt: '2026-09-13T11:05:00Z',
    updatedAt: '2026-09-13T11:05:00Z'
  },
  {
    id: 'BK-2026-003',
    bookingNumber: 'SL-RWP-MUX-003',
    customerId: 'USR-CUST-001',
    pickupLocationId: 'LOC-RWP-01',
    destinationLocationId: 'LOC-MUX-01',
    luggageIds: ['LUG-10003'],
    distanceKm: 535,
    predictionId: 'PRED-2026-003',
    assignedDriverId: 'DRV-102',
    status: BOOKING_STATUS.DRIVER_ASSIGNED,
    transportTier: TRANSPORT_TIERS.PREMIUM,
    quotedCost: 3100,
    currency: 'PKR',
    estimatedDeliveryTimeHours: 16.5,
    scheduledPickupTime: '2026-09-21T10:00:00Z',
    actualPickupTime: null,
    actualDeliveryTime: null,
    customerNotes: 'Fragile luggage - please ensure cushioned strapping.',
    createdAt: '2026-09-15T09:10:00Z',
    updatedAt: '2026-09-16T10:00:00Z'
  },
  {
    id: 'BK-2026-004',
    bookingNumber: 'SL-KHI-ISB-004',
    customerId: 'USR-CUST-001',
    pickupLocationId: 'LOC-KHI-01',
    destinationLocationId: 'LOC-ISB-01',
    luggageIds: ['LUG-10004'],
    distanceKm: 1410,
    predictionId: 'PRED-2026-004',
    assignedDriverId: 'DRV-101',
    status: BOOKING_STATUS.DELIVERED,
    transportTier: TRANSPORT_TIERS.STANDARD,
    quotedCost: 3800,
    currency: 'PKR',
    estimatedDeliveryTimeHours: 36.0,
    scheduledPickupTime: '2026-09-06T15:00:00Z',
    actualPickupTime: '2026-09-06T15:15:00Z',
    actualDeliveryTime: '2026-09-08T03:30:00Z',
    customerNotes: 'Delivered successfully at destination gate.',
    createdAt: '2026-09-06T14:05:00Z',
    updatedAt: '2026-09-08T03:35:00Z'
  },
  {
    id: 'BK-2026-005',
    bookingNumber: 'SL-LHR-ISB-005',
    customerId: 'USR-CUST-003',
    pickupLocationId: 'LOC-LHR-01',
    destinationLocationId: 'LOC-ISB-01',
    luggageIds: ['LUG-10005'],
    distanceKm: 375,
    predictionId: 'PRED-2026-005',
    assignedDriverId: null,
    status: BOOKING_STATUS.CONFIRMED,
    transportTier: TRANSPORT_TIERS.STANDARD,
    quotedCost: 1750,
    currency: 'PKR',
    estimatedDeliveryTimeHours: 10.5,
    scheduledPickupTime: '2026-09-24T10:00:00Z',
    actualPickupTime: null,
    actualDeliveryTime: null,
    customerNotes: 'Awaiting driver assignment at Lahore Hub.',
    createdAt: '2026-09-18T16:05:00Z',
    updatedAt: '2026-09-18T16:05:00Z'
  },
  {
    id: 'BK-2026-006',
    bookingNumber: 'SL-LHR-PEW-006',
    customerId: 'USR-CUST-002',
    pickupLocationId: 'LOC-LHR-01',
    destinationLocationId: 'LOC-PEW-01',
    luggageIds: ['LUG-10006'],
    distanceKm: 510,
    predictionId: 'PRED-2026-006',
    assignedDriverId: 'DRV-103',
    status: BOOKING_STATUS.PICKED_UP,
    transportTier: TRANSPORT_TIERS.EXPRESS,
    quotedCost: 2950,
    currency: 'PKR',
    estimatedDeliveryTimeHours: 12.0,
    scheduledPickupTime: '2026-09-19T09:00:00Z',
    actualPickupTime: '2026-09-19T09:15:00Z',
    actualDeliveryTime: null,
    customerNotes: 'Picked up from residence. Preparing for highway dispatch.',
    createdAt: '2026-09-19T08:05:00Z',
    updatedAt: '2026-09-19T09:20:00Z'
  },
  {
    id: 'BK-2026-007',
    bookingNumber: 'SL-KHI-HYD-007',
    customerId: 'USR-CUST-003',
    pickupLocationId: 'LOC-KHI-01',
    destinationLocationId: 'LOC-MUX-01',
    luggageIds: ['LUG-10007'],
    distanceKm: 160,
    predictionId: 'PRED-2026-007',
    assignedDriverId: null,
    status: BOOKING_STATUS.CANCELLED,
    transportTier: TRANSPORT_TIERS.STANDARD,
    quotedCost: 1100,
    currency: 'PKR',
    estimatedDeliveryTimeHours: 5.0,
    scheduledPickupTime: '2026-09-10T14:00:00Z',
    actualPickupTime: null,
    actualDeliveryTime: null,
    customerNotes: 'Flight itinerary rescheduled by customer.',
    createdAt: '2026-09-10T11:05:00Z',
    updatedAt: '2026-09-10T12:00:00Z'
  }
];

const INITIAL_STATUS_HISTORY = [
  {
    id: 'HIST-001',
    bookingId: 'BK-2026-001',
    fromStatus: null,
    toStatus: BOOKING_STATUS.PENDING,
    changedByUserId: 'USR-CUST-001',
    changedByRole: USER_ROLES.CUSTOMER,
    note: 'Booking requested by customer',
    locationStamp: 'Islamabad',
    timestamp: '2026-09-12T10:05:00Z'
  },
  {
    id: 'HIST-002',
    bookingId: 'BK-2026-001',
    fromStatus: BOOKING_STATUS.PENDING,
    toStatus: BOOKING_STATUS.CONFIRMED,
    changedByUserId: 'USR-ADM-001',
    changedByRole: USER_ROLES.ADMIN,
    note: 'System auto-confirmed booking verification',
    locationStamp: 'Islamabad Hub',
    timestamp: '2026-09-12T10:10:00Z'
  },
  {
    id: 'HIST-003',
    bookingId: 'BK-2026-001',
    fromStatus: BOOKING_STATUS.CONFIRMED,
    toStatus: BOOKING_STATUS.DRIVER_ASSIGNED,
    changedByUserId: 'USR-ADM-001',
    changedByRole: USER_ROLES.ADMIN,
    note: 'Driver Bilal Tariq (Toyota HiAce) assigned',
    locationStamp: 'Islamabad Logistics Center',
    timestamp: '2026-09-12T11:00:00Z'
  },
  {
    id: 'HIST-004',
    bookingId: 'BK-2026-001',
    fromStatus: BOOKING_STATUS.DRIVER_ASSIGNED,
    toStatus: BOOKING_STATUS.PICKED_UP,
    changedByUserId: 'USR-DRV-001',
    changedByRole: USER_ROLES.DRIVER,
    note: 'Luggage picked up from customer residence. Tag LUG-10001 verified.',
    locationStamp: 'F-7/2 Islamabad',
    timestamp: '2026-09-12T14:20:00Z'
  },
  {
    id: 'HIST-005',
    bookingId: 'BK-2026-001',
    fromStatus: BOOKING_STATUS.PICKED_UP,
    toStatus: BOOKING_STATUS.IN_TRANSIT,
    changedByUserId: 'USR-DRV-001',
    changedByRole: USER_ROLES.DRIVER,
    note: 'Departed Islamabad Hub via M-2 / National Highway towards Karachi',
    locationStamp: 'Motorway M-2 Toll Plaza',
    timestamp: '2026-09-12T16:00:00Z'
  },
  {
    id: 'HIST-006',
    bookingId: 'BK-2026-004',
    fromStatus: BOOKING_STATUS.IN_TRANSIT,
    toStatus: BOOKING_STATUS.DELIVERED,
    changedByUserId: 'USR-DRV-001',
    changedByRole: USER_ROLES.DRIVER,
    note: 'Handed over in pristine condition. Received by Ali Khan.',
    locationStamp: 'Sector F-7/2 Islamabad',
    timestamp: '2026-09-08T03:30:00Z'
  },
  {
    id: 'HIST-007',
    bookingId: 'BK-2026-005',
    fromStatus: null,
    toStatus: BOOKING_STATUS.CONFIRMED,
    changedByUserId: 'USR-CUST-003',
    changedByRole: USER_ROLES.CUSTOMER,
    note: 'Booking confirmed online by Hamza Tariq',
    locationStamp: 'Gulberg III Lahore',
    timestamp: '2026-09-18T16:05:00Z'
  },
  {
    id: 'HIST-008',
    bookingId: 'BK-2026-006',
    fromStatus: BOOKING_STATUS.DRIVER_ASSIGNED,
    toStatus: BOOKING_STATUS.PICKED_UP,
    changedByUserId: 'USR-DRV-003',
    changedByRole: USER_ROLES.DRIVER,
    note: 'Luggage picked up by driver Usman Rafique',
    locationStamp: 'Main Boulevard Lahore',
    timestamp: '2026-09-19T09:15:00Z'
  },
  {
    id: 'HIST-009',
    bookingId: 'BK-2026-007',
    fromStatus: BOOKING_STATUS.CONFIRMED,
    toStatus: BOOKING_STATUS.CANCELLED,
    changedByUserId: 'USR-CUST-003',
    changedByRole: USER_ROLES.CUSTOMER,
    note: 'Cancelled by customer due to plan change',
    locationStamp: 'Clifton Karachi',
    timestamp: '2026-09-10T12:00:00Z'
  }
];

const INITIAL_FEEDBACK = [
  {
    id: 'FDB-001',
    bookingId: 'BK-2026-004',
    customerId: 'USR-CUST-001',
    driverId: 'DRV-101',
    rating: 5,
    comment: 'Exceptional service! The AI price prediction was exact and the luggage reached Islamabad without a scratch.',
    tags: ['Punctual', 'Careful Handling', 'Accurate AI Cost'],
    createdAt: '2026-09-08T06:00:00Z'
  }
];

const INITIAL_NOTIFICATIONS = [
  {
    id: 'NOTIF-001',
    userId: 'USR-CUST-001',
    title: 'Luggage In Transit',
    message: 'Your booking BK-2026-001 is on route to Karachi.',
    type: 'INFO',
    isRead: false,
    linkAction: 'tracking',
    createdAt: '2026-09-12T16:05:00Z'
  },
  {
    id: 'NOTIF-002',
    userId: 'USR-DRV-001',
    title: 'New Trip Assigned',
    message: 'You have been assigned trip BK-2026-003 from Rawalpindi to Multan.',
    type: 'SUCCESS',
    isRead: false,
    linkAction: 'bookings',
    createdAt: '2026-09-16T10:05:00Z'
  },
  {
    id: 'NOTIF-003',
    userId: 'USR-ADM-001',
    title: 'AI Model Optimization Alert',
    message: 'Random Forest Regressor R2 score at 0.945 on 150 domestic routes.',
    type: 'INFO',
    isRead: true,
    linkAction: 'reports',
    createdAt: '2026-09-15T12:00:00Z'
  }
];

/**
 * Generic In-Memory & LocalStorage Relational Table with O(1) Hash Indexing
 */
class Table {
  constructor(tableName, defaultData = []) {
    this.tableName = tableName;
    this.defaultData = defaultData;
    this.data = [];
    this.indexMap = new Map();
  }

  _rebuildIndex() {
    this.indexMap.clear();
    for (const item of this.data) {
      if (item && item.id) {
        this.indexMap.set(item.id, item);
      }
    }
  }

  load(rawStore) {
    if (rawStore && Array.isArray(rawStore[this.tableName])) {
      this.data = rawStore[this.tableName];
    } else {
      this.data = JSON.parse(JSON.stringify(this.defaultData));
    }
    this._rebuildIndex();
  }

  getAll() {
    return [...this.data];
  }

  findMany(predicate) {
    if (!predicate) return [...this.data];
    return this.data.filter(predicate);
  }

  findById(id) {
    if (!id) return null;
    return this.indexMap.get(id) || this.data.find(item => item.id === id) || null;
  }

  find(predicate) {
    return this.data.find(predicate) || null;
  }

  filter(predicate) {
    return this.data.filter(predicate);
  }

  insert(record) {
    if (!record.id) {
      record.id = `${this.tableName.toUpperCase()}-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 4)}`;
    }
    const now = new Date().toISOString();
    if (!record.createdAt) record.createdAt = now;
    if (!record.updatedAt && record.hasOwnProperty('updatedAt')) record.updatedAt = now;

    this.data.unshift(record);
    this.indexMap.set(record.id, record);
    return record;
  }

  update(id, partialRecord) {
    const index = this.data.findIndex(item => item.id === id);
    if (index === -1) {
      throw new NotFoundError(`${this.tableName} record with ID ${id}`);
    }
    const updated = {
      ...this.data[index],
      ...partialRecord,
      updatedAt: new Date().toISOString()
    };
    this.data[index] = updated;
    this.indexMap.set(id, updated);
    return updated;
  }

  delete(id) {
    const index = this.data.findIndex(item => item.id === id);
    if (index === -1) return false;
    this.data.splice(index, 1);
    this.indexMap.delete(id);
    return true;
  }
}

/**
 * Unified Database Engine
 */
class DatabaseEngine {
  constructor() {
    this.tables = {
      users: new Table('users', INITIAL_USERS),
      drivers: new Table('drivers', INITIAL_DRIVERS),
      locations: new Table('locations', INITIAL_LOCATIONS),
      luggage: new Table('luggage', INITIAL_LUGGAGE),
      predictions: new Table('predictions', INITIAL_PREDICTIONS),
      bookings: new Table('bookings', INITIAL_BOOKINGS),
      statusHistory: new Table('statusHistory', INITIAL_STATUS_HISTORY),
      feedback: new Table('feedback', INITIAL_FEEDBACK),
      notifications: new Table('notifications', INITIAL_NOTIFICATIONS)
    };

    this.isInitialized = false;
    this.init();
  }

  init() {
    if (this.isInitialized) return;
    try {
      let raw = null;
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem(STORAGE_KEYS.DATABASE);
        if (stored) {
          raw = JSON.parse(stored);
        }
      }

      Object.keys(this.tables).forEach(key => {
        this.tables[key].load(raw);
      });

      this.isInitialized = true;
      this.persist();

      // Live multi-tab storage & broadcast bus so all open tabs sync immediately without page refresh
      if (typeof window !== 'undefined') {
        try {
          if ('BroadcastChannel' in window) {
            this.syncChannel = new BroadcastChannel('lts_sync_bus');
            this.syncChannel.onmessage = (msg) => {
              if (msg.data === 'sync') {
                this.reload();
                window.dispatchEvent(new CustomEvent('lts:db-synced'));
              }
            };
          }
        } catch (e) {}

        window.addEventListener('storage', (e) => {
          if (e.key === STORAGE_KEYS.DATABASE) {
            this.reload();
            window.dispatchEvent(new CustomEvent('lts:db-synced'));
          }
        });
      }
    } catch (e) {
      console.warn('Database initialization warning, loading fresh seed:', e);
      Object.keys(this.tables).forEach(key => {
        this.tables[key].load(null);
      });
      this.isInitialized = true;
    }
  }

  reload() {
    if (typeof localStorage === 'undefined') return;
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.DATABASE);
      if (stored) {
        const raw = JSON.parse(stored);
        Object.keys(this.tables).forEach(key => {
          this.tables[key].load(raw);
        });
      }
    } catch (e) {
      console.warn('Database reload warning:', e);
    }
  }

  persist() {
    if (typeof localStorage === 'undefined') return;
    try {
      const dump = {};
      Object.keys(this.tables).forEach(key => {
        dump[key] = this.tables[key].getAll();
      });
      localStorage.setItem(STORAGE_KEYS.DATABASE, JSON.stringify(dump));

      // Asynchronously broadcast to other open tabs and trigger live re-render locally without recursion
      if (typeof window !== 'undefined' && !this._isBroadcasting) {
        this._isBroadcasting = true;
        setTimeout(() => {
          this._isBroadcasting = false;
          window.dispatchEvent(new CustomEvent('lts:db-synced'));
          if (this.syncChannel) {
            try {
              this.syncChannel.postMessage('sync');
            } catch (e) {}
          }
        }, 50);
      }
    } catch (e) {
      console.error('Failed to persist database to localStorage:', e);
    }
  }

  reset() {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(STORAGE_KEYS.DATABASE);
    }
    Object.keys(this.tables).forEach(key => {
      this.tables[key].load(null);
    });
    this.persist();
  }

  // Relational Join Helpers
  getHydratedBooking(bookingId) {
    const booking = this.tables.bookings.findById(bookingId);
    if (!booking) return null;

    const customer = this.tables.users.findById(booking.customerId);
    const pickupLocation = this.tables.locations.findById(booking.pickupLocationId);
    const destinationLocation = this.tables.locations.findById(booking.destinationLocationId);
    const luggageItems = (booking.luggageIds || []).map(id => this.tables.luggage.findById(id)).filter(Boolean);
    const prediction = this.tables.predictions.findById(booking.predictionId);
    
    let driver = null;
    if (booking.assignedDriverId) {
      const driverRecord = this.tables.drivers.findById(booking.assignedDriverId);
      if (driverRecord) {
        const driverUser = this.tables.users.findById(driverRecord.userId);
        driver = { ...driverRecord, user: driverUser };
      }
    }

    const statusHistory = this.tables.statusHistory
      .filter(h => h.bookingId === booking.id)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    const feedback = this.tables.feedback.find(f => f.bookingId === booking.id);

    return {
      ...booking,
      customer,
      pickupLocation,
      destinationLocation,
      luggageItems,
      prediction,
      driver,
      statusHistory,
      feedback
    };
  }

  getAllHydratedBookings(filterFn = null) {
    const bookings = this.tables.bookings.getAll();
    const filtered = filterFn ? bookings.filter(filterFn) : bookings;
    return filtered.map(b => this.getHydratedBooking(b.id));
  }
}

export const db = new DatabaseEngine();

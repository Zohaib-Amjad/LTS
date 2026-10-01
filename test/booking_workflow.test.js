/**
 * SMART ONLINE LUGGAGE TRANSPORTATION USING AI
 * Phase 5 Luggage Booking System Automated Verification Suite
 */

import {
  USER_ROLES,
  BOOKING_STATUS,
  LUGGAGE_TYPES,
  LUGGAGE_SIZES,
  TRANSPORT_TIERS,
  authService,
  locationService,
  distanceService,
  luggageService,
  predictionService,
  bookingService,
  ValidationError,
  AuthorizationError,
  db
} from '../js/services/index.js';

let passed = 0;
let failed = 0;

function assert(cond, desc) {
  if (cond) {
    console.log(`  ✓ ${desc}`);
    passed++;
  } else {
    console.error(`  ✗ FAILED: ${desc}`);
    failed++;
  }
}

async function runBookingWorkflowTests() {
  console.log('===============================================================');
  console.log('PHASE 5: RUNNING LUGGAGE BOOKING WORKFLOW VERIFICATION TESTS');
  console.log('===============================================================\n');

  // Test 1: Luggage Spec Validation
  console.log('1. Testing Luggage Specifications Validation:');
  const customer = authService.login('customer@smartluggage.pk', 'customer123');

  let zeroBagsBlocked = false;
  try {
    luggageService.createLuggage({
      customerId: customer.id,
      weightKg: 15,
      bagCount: 0
    });
  } catch (e) {
    if (e instanceof ValidationError) zeroBagsBlocked = true;
  }
  assert(zeroBagsBlocked, 'Zero bag count properly throws ValidationError');

  let negWeightBlocked = false;
  try {
    luggageService.createLuggage({
      customerId: customer.id,
      weightKg: -5,
      bagCount: 1
    });
  } catch (e) {
    if (e instanceof ValidationError) negWeightBlocked = true;
  }
  assert(negWeightBlocked, 'Negative weight properly throws ValidationError');

  const validLuggage = luggageService.createLuggage({
    customerId: customer.id,
    type: LUGGAGE_TYPES.TRAVEL_BAG,
    weightKg: 22.5,
    bagCount: 2,
    lengthCm: 75,
    widthCm: 48,
    heightCm: 30,
    isFragile: true,
    specialInstructions: 'Handle with extreme care.'
  });
  assert(validLuggage.id !== undefined, 'Valid luggage registered successfully');
  assert(validLuggage.type === 'Travel Bag', 'Luggage type "Travel Bag" registered');
  assert(validLuggage.volumeLiters === 108, `Volumetric calculation accurate (Expected 108L, got ${validLuggage.volumeLiters}L)`);
  assert(validLuggage.sizeCategory === LUGGAGE_SIZES.EXTRA_LARGE, 'Luggage classified as Extra Large');

  // Test 2: Decoupled AI Prediction & Distance Preparation
  console.log('\n2. Testing Decoupled Distance & ML Prediction Pipeline:');
  const pickup = locationService.createLocation({
    city: 'Rawalpindi',
    addressLine: 'Bahria Town Phase 4, Civic Center',
    contactPerson: customer.fullName,
    contactPhone: customer.phone
  });
  const dest = locationService.createLocation({
    city: 'Multan',
    addressLine: 'Gulgasht Colony, Bosan Road',
    contactPerson: 'Recipient Contact',
    contactPhone: '+92 300 9988776'
  });

  const distanceData = await distanceService.calculateRouteDistance(pickup, dest);
  assert(distanceData.distanceKm === 530, `Calculated road distance: ${distanceData.distanceKm} km (Rawalpindi → Multan)`);

  const prediction = await predictionService.predict({
    customerId: customer.id,
    distanceKm: distanceData.distanceKm,
    totalWeightKg: validLuggage.weightKg,
    bagCount: validLuggage.bagCount,
    luggageType: validLuggage.type,
    sizeCategory: validLuggage.sizeCategory,
    transportTier: TRANSPORT_TIERS.EXPRESS,
    isFragile: validLuggage.isFragile
  });
  assert(prediction.predictedCost > 0, `AI Predicted Fare: PKR ${prediction.predictedCost}`);
  assert(prediction.predictedTimeHours > 0, `AI Predicted Time: ${prediction.predictedTimeHours} hrs`);

  // Test 3: Booking Confirmation & Reference Format (LUG-2026-XXXXXX)
  console.log('\n3. Testing Booking Creation, Reference Format & Initial Status:');
  const newBooking = bookingService.createBooking({
    customerId: customer.id,
    pickupLocationId: pickup.id,
    destinationLocationId: dest.id,
    luggageIds: [validLuggage.id],
    distanceKm: distanceData.distanceKm,
    predictionId: prediction.id,
    transportTier: TRANSPORT_TIERS.EXPRESS,
    quotedCost: prediction.predictedCost,
    estimatedDeliveryTimeHours: prediction.predictedTimeHours,
    customerNotes: 'Morning pickup requested.'
  }, customer);

  const refRegex = /^LUG-\d{4}-[A-Z0-9]{6}$/;
  assert(refRegex.test(newBooking.bookingNumber), `Booking reference matches format LUG-2026-XXXXXX (${newBooking.bookingNumber})`);
  assert(newBooking.status === BOOKING_STATUS.CONFIRMED, 'Booking created in initial status CONFIRMED');
  assert(newBooking.customer?.id === customer.id, 'Relational customer linkage verified');
  assert(newBooking.pickupLocation?.city === 'Rawalpindi', 'Relational pickup location verified');
  assert(newBooking.destinationLocation?.city === 'Multan', 'Relational destination location verified');
  assert(newBooking.luggageItems?.[0]?.type === 'Travel Bag', 'Relational luggage item verified');
  assert(newBooking.prediction?.id === prediction.id, 'Relational prediction verified');

  // Test 4: Initial Status History Entry
  console.log('\n4. Testing Initial Audit Trail Status History:');
  const history = newBooking.statusHistory;
  assert(history.length >= 1, 'Status history entry recorded');
  const initialHistory = history[0];
  assert(initialHistory.fromStatus === null, 'Initial history fromStatus is null');
  assert(initialHistory.toStatus === BOOKING_STATUS.CONFIRMED, 'Initial history toStatus is CONFIRMED');
  assert(initialHistory.changedByUserId === customer.id, 'History changedByUserId matches customer');

  // Test 5: Reference Uniqueness
  console.log('\n5. Testing Unique Reference Generation:');
  const ref1 = bookingService.generateBookingReference();
  const ref2 = bookingService.generateBookingReference();
  assert(ref1 !== ref2, `Generated unique references (${ref1} vs ${ref2})`);

  console.log('\n===============================================================');
  console.log(`PHASE 5 BOOKING WORKFLOW RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('===============================================================\n');

  if (failed > 0) process.exit(1);
}

runBookingWorkflowTests().catch(e => {
  console.error('Fatal booking workflow test error:', e);
  process.exit(1);
});

/**
 * SMART ONLINE LUGGAGE TRANSPORTATION USING AI
 * Automated Test Suite: Phase 9 Delivery Workflow & Customer Feedback Management
 */

import assert from 'assert';
import { bookingService } from '../js/services/booking.service.js';
import { driverService } from '../js/services/driver.service.js';
import { feedbackService } from '../js/services/feedback.service.js';
import { USER_ROLES, BOOKING_STATUS, DRIVER_AVAILABILITY } from '../js/constants/enums.js';
import { db } from '../js/core/database.js';
import { StateTransitionError, AuthorizationError, ValidationError, NotFoundError } from '../js/core/errorHandler.js';

let passedCount = 0;
let totalTests = 0;

function it(description, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✓ ${description}`);
    passedCount++;
  } catch (err) {
    console.error(`  ✗ ${description}`);
    console.error(`    ${err.message}`);
  }
}

console.log('\n===============================================================');
console.log('PHASE 9: RUNNING DELIVERY WORKFLOW & FEEDBACK TESTS');
console.log('===============================================================\n');

// Test Setup
const adminUser = db.tables.users.find(u => u.role === USER_ROLES.ADMIN);
const customerUser = db.tables.users.find(u => u.email === 'customer@smartluggage.pk');
const otherCustomerUser = db.tables.users.find(u => u.email === 'ayesha@example.pk') || db.tables.users.insert({
  email: 'ayesha@example.pk',
  fullName: 'Ayesha Malik',
  role: USER_ROLES.CUSTOMER,
  city: 'Lahore',
  isActive: true
});

const driverUser1 = db.tables.users.find(u => u.email === 'driver@smartluggage.pk');
const driver1 = driverService.getDriverByUserId(driverUser1.id);
const driverUser2 = db.tables.users.find(u => u.email === 'kamran.shah@smartluggage.pk');
const driver2 = driverService.getDriverByUserId(driverUser2.id);

// Reset availability for driver1
db.tables.drivers.update(driver1.id, { isAvailable: true, availabilityStatus: DRIVER_AVAILABILITY.AVAILABLE });

console.log('1. Testing Driver Delivery Verification & State Transition Constraints:');

let deliveryBooking = null;

it('Setup: Create and advance booking to IN_TRANSIT with Driver 1', () => {
  deliveryBooking = bookingService.createBooking({
    customerId: customerUser.id,
    pickupLocationId: 'LOC-ISB-01',
    destinationLocationId: 'LOC-LHR-01',
    luggageIds: ['LUG-10001'],
    distanceKm: 380,
    predictionId: 'PRED-2026-001',
    quotedCost: 2200,
    transportTier: 'Standard (Ground Transport)',
    estimatedDeliveryTimeHours: 10.0
  }, customerUser);

  // Assign Driver 1
  bookingService.assignDriver({ bookingId: deliveryBooking.id, driverId: driver1.id, adminUser });

  // Advance to PICKED_UP
  bookingService.updateBookingStatus({
    bookingId: deliveryBooking.id,
    newStatus: BOOKING_STATUS.PICKED_UP,
    user: driverUser1,
    note: 'Collected from customer residence.'
  });

  // Advance to IN_TRANSIT
  const inTransit = bookingService.updateBookingStatus({
    bookingId: deliveryBooking.id,
    newStatus: BOOKING_STATUS.IN_TRANSIT,
    user: driverUser1,
    note: 'Departed Islamabad for Lahore on Motorway M-2.'
  });

  assert.strictEqual(inTransit.status, BOOKING_STATUS.IN_TRANSIT);
});

it('Unauthorized Driver 2 is blocked from marking Driver 1\'s booking as DELIVERED', () => {
  let thrown = false;
  try {
    bookingService.updateBookingStatus({
      bookingId: deliveryBooking.id,
      newStatus: BOOKING_STATUS.DELIVERED,
      user: driverUser2,
      note: 'Attempting unauthorized delivery handover.'
    });
  } catch (err) {
    if (err instanceof AuthorizationError) thrown = true;
  }
  assert.strictEqual(thrown, true, 'Unassigned driver must throw AuthorizationError');
});

it('Driver cannot mark DELIVERED if booking is in wrong state (e.g. still in CONFIRMED)', () => {
  const confirmedBooking = bookingService.createBooking({
    customerId: customerUser.id,
    pickupLocationId: 'LOC-ISB-01',
    destinationLocationId: 'LOC-LHR-01',
    luggageIds: ['LUG-10001'],
    distanceKm: 380,
    predictionId: 'PRED-2026-001',
    quotedCost: 1900
  }, customerUser);

  db.tables.drivers.update(driver2.id, { isAvailable: true, availabilityStatus: DRIVER_AVAILABILITY.AVAILABLE });
  bookingService.assignDriver({ bookingId: confirmedBooking.id, driverId: driver2.id, adminUser });

  let thrown = false;
  try {
    bookingService.updateBookingStatus({
      bookingId: confirmedBooking.id,
      newStatus: BOOKING_STATUS.DELIVERED,
      user: driverUser2
    });
  } catch (err) {
    if (err instanceof StateTransitionError) thrown = true;
  }
  assert.strictEqual(thrown, true, 'Skipping from DRIVER_ASSIGNED to DELIVERED must throw StateTransitionError');
});

it('Assigned Driver 1 marks IN_TRANSIT booking as DELIVERED successfully', () => {
  const initialTrips = driverService.getDriverById(driver1.id).totalTrips || 0;

  const delivered = bookingService.updateBookingStatus({
    bookingId: deliveryBooking.id,
    newStatus: BOOKING_STATUS.DELIVERED,
    user: driverUser1,
    note: 'Luggage safely delivered to recipient in Gulberg III Lahore.',
    locationStamp: 'Gulberg III Lahore'
  });

  assert.strictEqual(delivered.status, BOOKING_STATUS.DELIVERED);
  assert.ok(delivered.actualDeliveryTime, 'Delivery timestamp must be saved');

  // Verify status history entry
  const history = db.tables.statusHistory.filter(h => h.bookingId === deliveryBooking.id);
  const delEntry = history.find(h => h.toStatus === BOOKING_STATUS.DELIVERED);
  assert.ok(delEntry, 'Status history entry for DELIVERED must be created');
  assert.strictEqual(delEntry.changedByUserId, driverUser1.id);

  // Verify driver availability released and trip count incremented
  const updatedDriver = driverService.getDriverById(driver1.id);
  assert.strictEqual(updatedDriver.isAvailable, true, 'Driver must be marked available');
  assert.strictEqual(updatedDriver.availabilityStatus, DRIVER_AVAILABILITY.AVAILABLE);
  assert.strictEqual(updatedDriver.totalTrips, initialTrips + 1, 'Driver total trips must increment by 1');
});

console.log('\n2. Testing Customer Feedback & Rating System:');

it('Prevent customer from submitting feedback on non-delivered booking (e.g. IN_TRANSIT / CONFIRMED)', () => {
  const undeliveredBooking = bookingService.createBooking({
    customerId: customerUser.id,
    pickupLocationId: 'LOC-ISB-01',
    destinationLocationId: 'LOC-LHR-01',
    luggageIds: ['LUG-10001'],
    distanceKm: 380,
    predictionId: 'PRED-2026-001',
    quotedCost: 1900
  }, customerUser);

  let thrown = false;
  try {
    feedbackService.submitFeedback({
      bookingId: undeliveredBooking.id,
      customerId: customerUser.id,
      rating: 5,
      comment: 'Arrived early!'
    }, customerUser);
  } catch (err) {
    if (err instanceof ValidationError) thrown = true;
  }
  assert.strictEqual(thrown, true, 'Feedback on non-delivered booking must throw ValidationError');
});

it('Prevent customer from reviewing a booking belonging to another user', () => {
  let thrown = false;
  try {
    feedbackService.submitFeedback({
      bookingId: deliveryBooking.id,
      customerId: otherCustomerUser.id,
      rating: 4,
      comment: 'Reviewing someone else shipment.'
    }, otherCustomerUser);
  } catch (err) {
    if (err instanceof AuthorizationError) thrown = true;
  }
  assert.strictEqual(thrown, true, 'Reviewing unowned booking must throw AuthorizationError');
});

it('Rating bounds validation (Rejects ratings outside 1-5 or non-integers)', () => {
  let thrownLow = false;
  let thrownHigh = false;
  let thrownString = false;

  try {
    feedbackService.submitFeedback({
      bookingId: deliveryBooking.id,
      customerId: customerUser.id,
      rating: 0
    }, customerUser);
  } catch (err) {
    if (err instanceof ValidationError) thrownLow = true;
  }

  try {
    feedbackService.submitFeedback({
      bookingId: deliveryBooking.id,
      customerId: customerUser.id,
      rating: 6
    }, customerUser);
  } catch (err) {
    if (err instanceof ValidationError) thrownHigh = true;
  }

  try {
    feedbackService.submitFeedback({
      bookingId: deliveryBooking.id,
      customerId: customerUser.id,
      rating: 'invalid'
    }, customerUser);
  } catch (err) {
    if (err instanceof ValidationError) thrownString = true;
  }

  assert.strictEqual(thrownLow, true, 'Rating 0 rejected');
  assert.strictEqual(thrownHigh, true, 'Rating 6 rejected');
  assert.strictEqual(thrownString, true, 'Invalid string rating rejected');
});

it('Customer successfully submits 5-star rating, review comment, and tags for delivered booking', () => {
  const review = feedbackService.submitFeedback({
    bookingId: deliveryBooking.id,
    customerId: customerUser.id,
    rating: 5,
    comment: 'Exceptional service! Luggage arrived in pristine condition right on the predicted schedule.',
    tags: ['Safe Handling', 'On-Time Delivery', 'Polite Courier', 'Accurate AI Fare']
  }, customerUser);

  assert.ok(review.id, 'Feedback record created with ID');
  assert.strictEqual(review.rating, 5);
  assert.strictEqual(review.bookingId, deliveryBooking.id);
  assert.strictEqual(review.customerId, customerUser.id);
  assert.strictEqual(review.driverId, driver1.id);
  assert.strictEqual(review.tags.length, 4);
  assert.strictEqual(review.customerName, customerUser.fullName);
  assert.strictEqual(review.driverName, driverUser1.fullName);
});

it('Prevent duplicate feedback submission on the same completed booking', () => {
  let thrown = false;
  try {
    feedbackService.submitFeedback({
      bookingId: deliveryBooking.id,
      customerId: customerUser.id,
      rating: 4,
      comment: 'Second attempt review.'
    }, customerUser);
  } catch (err) {
    if (err instanceof ValidationError) thrown = true;
  }
  assert.strictEqual(thrown, true, 'Duplicate review must throw ValidationError');
});

console.log('\n3. Testing Admin Feedback Statistics & Aggregations:');

it('Driver cumulative rating is automatically updated after customer feedback', () => {
  const driverRecord = driverService.getDriverById(driver1.id);
  assert.ok(driverRecord.rating >= 1 && driverRecord.rating <= 5, 'Driver rating is updated within bounds');
});

it('Admin feedback statistics calculation (Average rating, count, distribution)', () => {
  const stats = feedbackService.getFeedbackStats();

  assert.ok(stats.totalReviews >= 1, `Total reviews counted (${stats.totalReviews})`);
  assert.ok(stats.averageRating >= 1.0 && stats.averageRating <= 5.0, `Average rating in range (${stats.averageRating})`);
  assert.ok(stats.distribution[5] >= 1, '5-star review counted in distribution');
  assert.ok(typeof stats.distributionPercent[5] === 'number', 'Percentage computed');
});

it('Customer can query eligible unreviewed delivered bookings', () => {
  const unreviewed = feedbackService.getEligibleBookingsForFeedback(customerUser.id);
  // deliveryBooking was reviewed, so it should not appear in unreviewed list
  assert.strictEqual(unreviewed.some(b => b.id === deliveryBooking.id), false, 'Reviewed booking is excluded');
});

console.log('\n===============================================================');
console.log(`PHASE 9 DELIVERY & FEEDBACK RESULTS: ${passedCount} PASSED, ${totalTests - passedCount} FAILED`);
console.log('===============================================================\n');

if (passedCount !== totalTests) {
  process.exit(1);
}

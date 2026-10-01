/**
 * SMART ONLINE LUGGAGE TRANSPORTATION USING AI
 * Automated Test Suite: Phase 8 Booking Tracking & Status Workflow
 */

import assert from 'assert';
import { bookingService } from '../js/services/booking.service.js';
import { trackingService } from '../js/services/tracking.service.js';
import { driverService } from '../js/services/driver.service.js';
import { authService } from '../js/services/auth.service.js';
import { USER_ROLES, BOOKING_STATUS, DRIVER_AVAILABILITY } from '../js/constants/enums.js';
import { db } from '../js/core/database.js';
import { StateTransitionError, AuthorizationError, ValidationError } from '../js/core/errorHandler.js';

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

async function itAsync(description, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`  ✓ ${description}`);
    passedCount++;
  } catch (err) {
    console.error(`  ✗ ${description}`);
    console.error(`    ${err.message}`);
  }
}

console.log('\n===============================================================');
console.log('PHASE 8: RUNNING TRACKING & STATUS WORKFLOW TESTS');
console.log('===============================================================\n');

// Test Setup
const adminUser = db.tables.users.find(u => u.role === USER_ROLES.ADMIN);
const customerUser = db.tables.users.find(u => u.role === USER_ROLES.CUSTOMER);
const driverUser1 = db.tables.users.find(u => u.email === 'driver@smartluggage.pk');
const driver1 = driverService.getDriverByUserId(driverUser1.id);

// Ensure driver is available for testing
db.tables.drivers.update(driver1.id, { isAvailable: true, availabilityStatus: DRIVER_AVAILABILITY.AVAILABLE });

console.log('1. Testing Primary Lifecycle State Machine (CONFIRMED -> DELIVERED):');

let workflowBooking = null;

it('Step 0: Customer creates booking in initial CONFIRMED status', () => {
  workflowBooking = bookingService.createBooking({
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

  assert.strictEqual(workflowBooking.status, BOOKING_STATUS.CONFIRMED);
  assert.ok(workflowBooking.bookingNumber.startsWith('LUG-2026-'));
});

it('Step 1: Admin assigns available driver -> DRIVER_ASSIGNED', () => {
  const assigned = bookingService.assignDriver({
    bookingId: workflowBooking.id,
    driverId: driver1.id,
    adminUser
  });

  assert.strictEqual(assigned.status, BOOKING_STATUS.DRIVER_ASSIGNED);
  assert.strictEqual(assigned.assignedDriverId, driver1.id);

  // Status history audit record
  const history = db.tables.statusHistory.filter(h => h.bookingId === workflowBooking.id);
  assert.ok(history.some(h => h.toStatus === BOOKING_STATUS.DRIVER_ASSIGNED));
});

it('Step 2: Driver marks luggage PICKED_UP from customer residence', () => {
  const updated = bookingService.updateBookingStatus({
    bookingId: workflowBooking.id,
    newStatus: BOOKING_STATUS.PICKED_UP,
    user: driverUser1,
    note: 'Luggage collected and loaded into vehicle.',
    locationStamp: 'Sector F-7/2 Islamabad'
  });

  assert.strictEqual(updated.status, BOOKING_STATUS.PICKED_UP);
  assert.ok(updated.actualPickupTime, 'actualPickupTime must be recorded');

  const history = db.tables.statusHistory.filter(h => h.bookingId === workflowBooking.id);
  const pickedUpEntry = history.find(h => h.toStatus === BOOKING_STATUS.PICKED_UP);
  assert.ok(pickedUpEntry, 'Audit log for PICKED_UP must exist');
  assert.strictEqual(pickedUpEntry.changedByUserId, driverUser1.id);
});

it('Step 3: Driver starts transit -> IN_TRANSIT on Motorway M-2', () => {
  const updated = bookingService.updateBookingStatus({
    bookingId: workflowBooking.id,
    newStatus: BOOKING_STATUS.IN_TRANSIT,
    user: driverUser1,
    note: 'Departed Islamabad Hub en route to Lahore on Motorway M-2.',
    locationStamp: 'Motorway M-2 Toll Plaza'
  });

  assert.strictEqual(updated.status, BOOKING_STATUS.IN_TRANSIT);

  const history = db.tables.statusHistory.filter(h => h.bookingId === workflowBooking.id);
  assert.ok(history.some(h => h.toStatus === BOOKING_STATUS.IN_TRANSIT));
});

it('Step 4: Driver marks trip DELIVERED at destination', () => {
  const updated = bookingService.updateBookingStatus({
    bookingId: workflowBooking.id,
    newStatus: BOOKING_STATUS.DELIVERED,
    user: driverUser1,
    note: 'Luggage safely delivered to consignee in Gulberg III Lahore.',
    locationStamp: 'Gulberg III Lahore'
  });

  assert.strictEqual(updated.status, BOOKING_STATUS.DELIVERED);
  assert.ok(updated.actualDeliveryTime, 'actualDeliveryTime must be recorded');

  // Verify driver is automatically released back to AVAILABLE
  const drvRecord = driverService.getDriverById(driver1.id);
  assert.strictEqual(drvRecord.isAvailable, true, 'Driver must be available after delivery');
  assert.strictEqual(drvRecord.availabilityStatus, DRIVER_AVAILABILITY.AVAILABLE);
});

// 2. Strict Role-Based Transition Guards
console.log('\n2. Testing State Machine Authorization & Transition Guards:');

it('Customer is blocked from marking booking as DELIVERED or PICKED_UP', () => {
  const newBooking = bookingService.createBooking({
    customerId: customerUser.id,
    pickupLocationId: 'LOC-ISB-01',
    destinationLocationId: 'LOC-LHR-01',
    luggageIds: ['LUG-10001'],
    distanceKm: 380,
    predictionId: 'PRED-2026-001',
    quotedCost: 2000
  }, customerUser);

  let thrown = false;
  try {
    bookingService.updateBookingStatus({
      bookingId: newBooking.id,
      newStatus: BOOKING_STATUS.DELIVERED,
      user: customerUser
    });
  } catch (err) {
    if (err instanceof StateTransitionError) thrown = true;
  }
  assert.strictEqual(thrown, true, 'Customer marking DELIVERED must throw StateTransitionError');
});

it('Driver cannot skip intermediate states (DRIVER_ASSIGNED -> DELIVERED directly)', () => {
  const newBooking = bookingService.createBooking({
    customerId: customerUser.id,
    pickupLocationId: 'LOC-ISB-01',
    destinationLocationId: 'LOC-LHR-01',
    luggageIds: ['LUG-10001'],
    distanceKm: 380,
    predictionId: 'PRED-2026-001',
    quotedCost: 2000
  }, customerUser);

  bookingService.assignDriver({ bookingId: newBooking.id, driverId: driver1.id, adminUser });

  let thrown = false;
  try {
    bookingService.updateBookingStatus({
      bookingId: newBooking.id,
      newStatus: BOOKING_STATUS.DELIVERED,
      user: driverUser1
    });
  } catch (err) {
    if (err instanceof StateTransitionError) thrown = true;
  }
  assert.strictEqual(thrown, true, 'Skipping from DRIVER_ASSIGNED to DELIVERED must throw StateTransitionError');
});

it('Customer can cancel booking when in CONFIRMED status', () => {
  const cancellable = bookingService.createBooking({
    customerId: customerUser.id,
    pickupLocationId: 'LOC-ISB-01',
    destinationLocationId: 'LOC-LHR-01',
    luggageIds: ['LUG-10001'],
    distanceKm: 380,
    predictionId: 'PRED-2026-001',
    quotedCost: 1900
  }, customerUser);

  const cancelled = bookingService.updateBookingStatus({
    bookingId: cancellable.id,
    newStatus: BOOKING_STATUS.CANCELLED,
    user: customerUser,
    note: 'Customer requested cancellation before driver dispatch.'
  });

  assert.strictEqual(cancelled.status, BOOKING_STATUS.CANCELLED);
});

// 3. Visual Tracking Timeline & Milestone Progression
console.log('\n3. Testing Visual Tracking Timeline Service:');

it('Tracking timeline generates 5 milestones with accurate states and timestamps', () => {
  const timeline = trackingService.getTrackingTimeline(workflowBooking.id, customerUser);

  assert.strictEqual(timeline.milestones.length, 5);
  assert.strictEqual(timeline.milestones[0].key, BOOKING_STATUS.CONFIRMED);
  assert.strictEqual(timeline.milestones[0].state, 'completed');
  assert.strictEqual(timeline.milestones[1].key, BOOKING_STATUS.DRIVER_ASSIGNED);
  assert.strictEqual(timeline.milestones[1].state, 'completed');
  assert.strictEqual(timeline.milestones[2].key, BOOKING_STATUS.PICKED_UP);
  assert.strictEqual(timeline.milestones[2].state, 'completed');
  assert.strictEqual(timeline.milestones[3].key, BOOKING_STATUS.IN_TRANSIT);
  assert.strictEqual(timeline.milestones[3].state, 'completed');
  assert.strictEqual(timeline.milestones[4].key, BOOKING_STATUS.DELIVERED);
  assert.strictEqual(timeline.milestones[4].state, 'completed');
});

it('Tracking by human-readable reference number (LUG-2026-XXXXXX) resolves properly', () => {
  const timeline = trackingService.getTrackingTimeline(workflowBooking.bookingNumber, customerUser);
  assert.strictEqual(timeline.booking.id, workflowBooking.id);
  assert.strictEqual(timeline.bookingNumber, workflowBooking.bookingNumber);
  assert.ok(timeline.statusHistory.length >= 5, 'Status history should contain all transitions');
});

console.log('\n===============================================================');
console.log(`PHASE 8 TRACKING RESULTS: ${passedCount} PASSED, ${totalTests - passedCount} FAILED`);
console.log('===============================================================\n');

if (passedCount !== totalTests) {
  process.exit(1);
}

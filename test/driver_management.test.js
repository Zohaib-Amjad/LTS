/**
 * SMART ONLINE LUGGAGE TRANSPORTATION USING AI
 * Automated Test Suite: Phase 7 Driver Fleet Management & Booking Assignment
 */

import assert from 'assert';
import { driverService } from '../js/services/driver.service.js';
import { bookingService } from '../js/services/booking.service.js';
import { authService } from '../js/services/auth.service.js';
import { USER_ROLES, BOOKING_STATUS, DRIVER_AVAILABILITY } from '../js/constants/enums.js';
import { db } from '../js/core/database.js';
import { ValidationError, AuthorizationError, NotFoundError } from '../js/core/errorHandler.js';

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
console.log('PHASE 7: RUNNING DRIVER FLEET MANAGEMENT & ASSIGNMENT TESTS');
console.log('===============================================================\n');

// Set up roles
const adminUser = db.tables.users.find(u => u.role === USER_ROLES.ADMIN);
const customerUser = db.tables.users.find(u => u.role === USER_ROLES.CUSTOMER);
const driverUser = db.tables.users.find(u => u.role === USER_ROLES.DRIVER);

// 1. Driver Lifecycle (Create, Update, Status Toggle)
console.log('1. Testing Driver Registration & Profile Updates:');

let createdDriverId = null;

it('Admin can register a new courier driver into the fleet', () => {
  const newDriver = driverService.createDriver({
    fullName: 'Zubair Ahmed',
    email: `zubair.${Date.now()}@smartluggage.pk`,
    phone: '+92 333 9988776',
    city: 'Rawalpindi',
    vehicleType: 'Suzuki Every Cargo',
    vehiclePlate: `RWP-${Date.now().toString().slice(-4)}`,
    licenseNumber: 'PK-DL-99441',
    password: 'driver123'
  }, adminUser);

  assert.ok(newDriver.id, 'Driver must have generated ID');
  assert.strictEqual(newDriver.user.fullName, 'Zubair Ahmed');
  assert.strictEqual(newDriver.user.role, USER_ROLES.DRIVER);
  assert.strictEqual(newDriver.isAvailable, true);
  assert.strictEqual(newDriver.availabilityStatus, DRIVER_AVAILABILITY.AVAILABLE);
  assert.strictEqual(newDriver.rating, 5.0);

  createdDriverId = newDriver.id;
});

it('Non-admin customer is blocked from creating a driver account', () => {
  let thrown = false;
  try {
    driverService.createDriver({
      fullName: 'Illegal Driver',
      email: 'illegal@test.pk',
      vehiclePlate: 'XYZ-123'
    }, customerUser);
  } catch (err) {
    if (err instanceof AuthorizationError) thrown = true;
  }
  assert.strictEqual(thrown, true, 'Customer creating driver must throw AuthorizationError');
});

it('Admin can update driver vehicle, plate, contact, and availability', () => {
  const updated = driverService.updateDriver(createdDriverId, {
    fullName: 'Zubair Ahmed Khan',
    phone: '+92 333 1112233',
    vehicleType: 'Toyota TownAce Van',
    vehiclePlate: 'ICT-TA-4455',
    currentCity: 'Islamabad',
    availabilityStatus: DRIVER_AVAILABILITY.BUSY
  }, adminUser);

  assert.strictEqual(updated.user.fullName, 'Zubair Ahmed Khan');
  assert.strictEqual(updated.vehicleType, 'Toyota TownAce Van');
  assert.strictEqual(updated.vehiclePlate, 'ICT-TA-4455');
  assert.strictEqual(updated.availabilityStatus, DRIVER_AVAILABILITY.BUSY);
  assert.strictEqual(updated.isAvailable, false);
});

it('Admin can toggle driver account status (Deactivate -> Forces OFFLINE)', () => {
  // Deactivate
  const deactivated = driverService.toggleDriverAccountStatus(createdDriverId, adminUser);
  assert.strictEqual(deactivated.user.isActive, false, 'User account should be deactivated');
  assert.strictEqual(deactivated.availabilityStatus, DRIVER_AVAILABILITY.OFFLINE, 'Deactivated driver must be OFFLINE');
  assert.strictEqual(deactivated.isAvailable, false, 'Deactivated driver is not available');

  // Reactivate
  const reactivated = driverService.toggleDriverAccountStatus(createdDriverId, adminUser);
  assert.strictEqual(reactivated.user.isActive, true, 'User account should be active again');
});

// 2. Search & Filtering
console.log('\n2. Testing Search and Filtering Capabilities:');

it('Search drivers by name and vehicle plate matches accurately', () => {
  const byName = driverService.searchAndFilterDrivers({ query: 'Zubair' }, adminUser);
  assert.ok(byName.length >= 1, 'Should find at least 1 driver by name');
  assert.strictEqual(byName[0].id, createdDriverId);

  const byPlate = driverService.searchAndFilterDrivers({ query: 'ICT-TA-4455' }, adminUser);
  assert.ok(byPlate.length >= 1, 'Should find driver by vehicle plate');
});

it('Filter drivers by availability status (AVAILABLE vs BUSY vs OFFLINE)', () => {
  // Reset created driver to AVAILABLE
  driverService.setAvailabilityStatus(createdDriverId, DRIVER_AVAILABILITY.AVAILABLE, adminUser);

  const availList = driverService.searchAndFilterDrivers({ availability: DRIVER_AVAILABILITY.AVAILABLE }, adminUser);
  assert.ok(availList.every(d => d.availabilityStatus === DRIVER_AVAILABILITY.AVAILABLE), 'All returned must be AVAILABLE');

  const busyList = driverService.searchAndFilterDrivers({ availability: DRIVER_AVAILABILITY.BUSY }, adminUser);
  assert.ok(busyList.every(d => d.availabilityStatus === DRIVER_AVAILABILITY.BUSY), 'All returned must be BUSY');
});

it('Filter drivers by account status (ACTIVE vs INACTIVE)', () => {
  const activeList = driverService.searchAndFilterDrivers({ accountStatus: 'ACTIVE' }, adminUser);
  assert.ok(activeList.every(d => d.user.isActive === true), 'All returned must be ACTIVE');
});

// 3. Booking Assignment Workflow & State Machine
console.log('\n3. Testing Driver Booking Assignment & Constraints:');

let testBookingId = null;

// Create a confirmed booking to test assignment
const testBooking = bookingService.createBooking({
  customerId: customerUser.id,
  pickupLocationId: 'LOC-ISB-01',
  destinationLocationId: 'LOC-LHR-01',
  luggageIds: ['LUG-10001'],
  distanceKm: 380,
  predictionId: 'PRED-2026-001',
  quotedCost: 2150,
  transportTier: 'Standard (Ground Transport)',
  estimatedDeliveryTimeHours: 10.0
}, customerUser);

testBookingId = testBooking.id;

it('Initial booking is created in CONFIRMED status without assigned driver', () => {
  assert.strictEqual(testBooking.status, BOOKING_STATUS.CONFIRMED);
  assert.strictEqual(testBooking.assignedDriverId, null);
});

it('Assigning inactive driver throws ValidationError', () => {
  // Deactivate created driver
  driverService.toggleDriverAccountStatus(createdDriverId, adminUser);

  let thrown = false;
  try {
    bookingService.assignDriver({
      bookingId: testBookingId,
      driverId: createdDriverId,
      adminUser
    });
  } catch (err) {
    if (err instanceof ValidationError) thrown = true;
  }
  assert.strictEqual(thrown, true, 'Assigning inactive driver must throw ValidationError');

  // Reactivate
  driverService.toggleDriverAccountStatus(createdDriverId, adminUser);
});

it('Assigning offline or busy driver throws ValidationError', () => {
  // Set to OFFLINE
  driverService.setAvailabilityStatus(createdDriverId, DRIVER_AVAILABILITY.OFFLINE, adminUser);

  let thrown = false;
  try {
    bookingService.assignDriver({
      bookingId: testBookingId,
      driverId: createdDriverId,
      adminUser
    });
  } catch (err) {
    if (err instanceof ValidationError) thrown = true;
  }
  assert.strictEqual(thrown, true, 'Assigning offline driver must throw ValidationError');
});

it('Non-admin user cannot assign drivers (Throws AuthorizationError)', () => {
  driverService.setAvailabilityStatus(createdDriverId, DRIVER_AVAILABILITY.AVAILABLE, adminUser);

  let thrown = false;
  try {
    bookingService.assignDriver({
      bookingId: testBookingId,
      driverId: createdDriverId,
      adminUser: customerUser
    });
  } catch (err) {
    if (err instanceof AuthorizationError) thrown = true;
  }
  assert.strictEqual(thrown, true, 'Customer dispatching driver must throw AuthorizationError');
});

it('Successful assignment: Status transitions to DRIVER_ASSIGNED, Driver set to BUSY, Status history logged', () => {
  // Ensure driver is AVAILABLE
  driverService.setAvailabilityStatus(createdDriverId, DRIVER_AVAILABILITY.AVAILABLE, adminUser);

  const assigned = bookingService.assignDriver({
    bookingId: testBookingId,
    driverId: createdDriverId,
    adminUser
  });

  assert.strictEqual(assigned.status, BOOKING_STATUS.DRIVER_ASSIGNED, 'Booking status must be DRIVER_ASSIGNED');
  assert.strictEqual(assigned.assignedDriverId, createdDriverId, 'Driver ID must match');

  // Check driver status updated to BUSY
  const driverRecord = driverService.getDriverById(createdDriverId);
  assert.strictEqual(driverRecord.availabilityStatus, DRIVER_AVAILABILITY.BUSY);
  assert.strictEqual(driverRecord.isAvailable, false);

  // Check Status History entry
  const history = db.tables.statusHistory.filter(h => h.bookingId === testBookingId);
  const assignEntry = history.find(h => h.toStatus === BOOKING_STATUS.DRIVER_ASSIGNED);
  assert.ok(assignEntry, 'Audit status history entry for DRIVER_ASSIGNED must exist');
  assert.strictEqual(assignEntry.changedByUserId, adminUser.id);
});

it('Prevent duplicate assignment: Assigning same driver again throws ValidationError', () => {
  // Make driver temporarily available
  db.tables.drivers.update(createdDriverId, { isAvailable: true, availabilityStatus: DRIVER_AVAILABILITY.AVAILABLE });

  let thrown = false;
  try {
    bookingService.assignDriver({
      bookingId: testBookingId,
      driverId: createdDriverId,
      adminUser
    });
  } catch (err) {
    if (err instanceof ValidationError) thrown = true;
  }
  assert.strictEqual(thrown, true, 'Duplicate assignment must throw ValidationError');
});

it('Driver immediately sees assigned trip in driver assigned bookings list', () => {
  const driverUserObj = db.tables.users.findById(driverService.getDriverById(createdDriverId).userId);
  const assignedTrips = driverService.getDriverAssignedBookings(createdDriverId, driverUserObj);

  assert.ok(assignedTrips.length >= 1, 'Driver must see at least 1 assigned trip');
  assert.strictEqual(assignedTrips[0].id, testBookingId);
  assert.strictEqual(assignedTrips[0].status, BOOKING_STATUS.DRIVER_ASSIGNED);
});

console.log('\n===============================================================');
console.log(`PHASE 7 DRIVER RESULTS: ${passedCount} PASSED, ${totalTests - passedCount} FAILED`);
console.log('===============================================================\n');

if (passedCount !== totalTests) {
  process.exit(1);
}

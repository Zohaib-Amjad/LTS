/**
 * SMART ONLINE LUGGAGE TRANSPORTATION USING AI
 * Automated Test Suite: Phase 10 Admin Dashboard, System Metrics & Management
 */

import assert from 'assert';
import { adminService } from '../js/services/admin.service.js';
import { userService } from '../js/services/user.service.js';
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
console.log('PHASE 10: RUNNING ADMIN DASHBOARD & SYSTEM MANAGEMENT TESTS');
console.log('===============================================================\n');

// Retrieve test users
const adminUser = db.tables.users.find(u => u.role === USER_ROLES.ADMIN);
const customerUser = db.tables.users.find(u => u.role === USER_ROLES.CUSTOMER);
const driverUser = db.tables.users.find(u => u.role === USER_ROLES.DRIVER);

// 1. Admin System Overview & KPI Metrics
console.log('1. Testing System Overview & KPI Metrics Computation:');

it('Admin can retrieve complete platform system metrics', () => {
  const metrics = adminService.getSystemMetrics(adminUser);

  assert.strictEqual(typeof metrics.totalUsers, 'number');
  assert.ok(metrics.totalUsers >= 1, 'Should have at least 1 registered user');

  assert.strictEqual(typeof metrics.totalCustomers, 'number');
  assert.ok(metrics.totalCustomers >= 1, 'Should have at least 1 customer');

  assert.strictEqual(typeof metrics.totalDrivers, 'number');
  assert.ok(metrics.totalDrivers >= 1, 'Should have at least 1 driver');

  assert.strictEqual(typeof metrics.totalAdmins, 'number');
  assert.ok(metrics.totalAdmins >= 1, 'Should have at least 1 admin');

  assert.strictEqual(typeof metrics.activeDrivers, 'number');
  assert.strictEqual(typeof metrics.totalBookings, 'number');
  assert.ok(metrics.totalBookings >= 1, 'Should have at least 1 booking');

  assert.strictEqual(typeof metrics.pendingBookings, 'number');
  assert.strictEqual(typeof metrics.inTransitBookings, 'number');
  assert.strictEqual(typeof metrics.deliveredBookings, 'number');
  assert.strictEqual(typeof metrics.cancelledBookings, 'number');

  assert.strictEqual(typeof metrics.totalPredictedCost, 'number');
  assert.strictEqual(typeof metrics.averagePredictedCost, 'number');
  assert.ok(metrics.averagePredictedCost > 0, 'Average predicted cost should be positive');

  assert.strictEqual(typeof metrics.averagePredictedDeliveryTime, 'number');
  assert.ok(metrics.averagePredictedDeliveryTime > 0, 'Average predicted delivery time should be positive');

  assert.strictEqual(typeof metrics.averageCustomerRating, 'number');
  assert.ok(metrics.averageCustomerRating >= 1.0 && metrics.averageCustomerRating <= 5.0, 'Rating should be between 1 and 5');

  assert.ok(Array.isArray(metrics.topCorridors), 'Top corridors should be an array');
  assert.ok(metrics.statusCounts, 'Status counts object should be present');
});

it('Status distribution matches booking counts across states', () => {
  const metrics = adminService.getSystemMetrics(adminUser);
  const sumOfStatuses = Object.values(metrics.statusCounts).reduce((a, b) => a + b, 0);
  assert.strictEqual(sumOfStatuses, metrics.totalBookings, 'Sum of status counts must equal total bookings');
});

// 2. Authorization & RBAC Enforcement
console.log('\n2. Testing Admin RBAC Security & Role Authorization:');

it('Customer cannot access admin system overview metrics', () => {
  assert.throws(() => {
    adminService.getSystemMetrics(customerUser);
  }, AuthorizationError);
});

it('Driver cannot access admin system overview metrics', () => {
  assert.throws(() => {
    adminService.getSystemMetrics(driverUser);
  }, AuthorizationError);
});

it('Customer cannot filter or search admin bookings directory', () => {
  assert.throws(() => {
    adminService.searchAndFilterBookings({ query: 'Islamabad' }, customerUser);
  }, AuthorizationError);
});

it('Non-admin cannot update platform tariff settings', () => {
  assert.throws(() => {
    adminService.updatePlatformSettings({ basePricePerKm: 5.0 }, customerUser);
  }, AuthorizationError);
});

// 3. Admin Booking Search & Multi-Filter Console
console.log('\n3. Testing Admin Booking Search & Filtering:');

it('Admin can search bookings by reference number or ID', () => {
  const all = db.tables.bookings.getAll();
  const sample = all[0];
  const results = adminService.searchAndFilterBookings({ query: sample.bookingNumber }, adminUser);
  assert.ok(results.length >= 1, 'Should find at least 1 booking matching reference');
  assert.strictEqual(results[0].bookingNumber, sample.bookingNumber);
});

it('Admin can search bookings by destination or pickup city', () => {
  const results = adminService.searchAndFilterBookings({ query: 'Lahore' }, adminUser);
  assert.ok(Array.isArray(results));
  results.forEach(b => {
    const pCity = b.pickupLocation?.city || '';
    const dCity = b.destinationLocation?.city || '';
    assert.ok(
      pCity.toLowerCase().includes('lahore') || 
      dCity.toLowerCase().includes('lahore') || 
      b.bookingNumber.toLowerCase().includes('lahore') ||
      (b.customer?.fullName || '').toLowerCase().includes('lahore'),
      'Match should relate to query'
    );
  });
});

it('Admin can filter bookings by status', () => {
  const results = adminService.searchAndFilterBookings({ status: BOOKING_STATUS.DELIVERED }, adminUser);
  assert.ok(Array.isArray(results));
  results.forEach(b => {
    assert.strictEqual(b.status, BOOKING_STATUS.DELIVERED);
  });
});

it('Admin can filter bookings by date range', () => {
  const today = new Date().toISOString().split('T')[0];
  const results = adminService.searchAndFilterBookings({ dateFrom: '2025-01-01', dateTo: today }, adminUser);
  assert.ok(Array.isArray(results));
});

// 4. Booking Deep Inspector Details
console.log('\n4. Testing Deep Booking Inspector Details:');

it('Admin can retrieve deep details with customer, driver, route, luggage, prediction and audit trail', () => {
  const all = db.tables.bookings.getAll();
  const sample = all[0];
  const deep = adminService.getBookingDeepDetails(sample.id);

  assert.strictEqual(deep.id, sample.id);
  assert.ok(deep.customer, 'Should have hydrated customer');
  assert.ok(deep.pickupLocation, 'Should have pickup location');
  assert.ok(deep.destinationLocation, 'Should have destination location');
  assert.ok(Array.isArray(deep.statusHistory), 'Should have status history audit trail');
  assert.ok(deep.statusHistory.length >= 1, 'Should have at least 1 audit event');
  assert.ok(deep.statusHistory[0].actorName, 'Status history should include actor name');
});

it('Deep booking inspection throws NotFoundError for unknown booking ID', () => {
  assert.throws(() => {
    adminService.getBookingDeepDetails('NON_EXISTENT_ID_9999');
  }, NotFoundError);
});

// 5. User Management & Complete Relationship Inspection
console.log('\n5. Testing User Management & Complete History Inspection:');

it('Admin can inspect customer user details along with full booking history', () => {
  const custDetails = adminService.getUserDetailsWithBookings(customerUser.id);
  assert.strictEqual(custDetails.user.id, customerUser.id);
  assert.strictEqual(custDetails.user.role, USER_ROLES.CUSTOMER);
  assert.ok(Array.isArray(custDetails.customerBookings), 'Customer bookings should be an array');
  assert.ok(Array.isArray(custDetails.reviewsGiven), 'Reviews given should be an array');
});

it('Admin can inspect driver user details along with assigned trips', () => {
  const drvDetails = adminService.getUserDetailsWithBookings(driverUser.id);
  assert.strictEqual(drvDetails.user.id, driverUser.id);
  assert.strictEqual(drvDetails.user.role, USER_ROLES.DRIVER);
  assert.ok(drvDetails.driverProfile, 'Driver profile must be hydrated');
  assert.ok(Array.isArray(drvDetails.driverTrips), 'Driver trips should be an array');
});

it('User details inspection throws NotFoundError for unknown user ID', () => {
  assert.throws(() => {
    adminService.getUserDetailsWithBookings('INVALID_USER_ID_888');
  }, NotFoundError);
});

// 6. Platform Tariff Settings & AI Model Deployment Configuration
console.log('\n6. Testing Platform Settings & Tariff Configuration:');

it('Admin can retrieve default platform tariff settings', () => {
  const settings = adminService.getPlatformSettings();
  assert.strictEqual(typeof settings.basePricePerKm, 'number');
  assert.strictEqual(typeof settings.weightMultiplierPerKg, 'number');
  assert.strictEqual(typeof settings.minimumFare, 'number');
  assert.strictEqual(typeof settings.activeModelVersion, 'string');
  assert.strictEqual(settings.currency, 'PKR');
});

it('Admin can update platform tariff settings and active ML model version', () => {
  const updated = adminService.updatePlatformSettings({
    basePricePerKm: 4.2,
    minimumFare: 950,
    activeModelVersion: 'v2.1-rf-regressor-domestic',
    isMaintenanceMode: false
  }, adminUser);

  assert.strictEqual(updated.basePricePerKm, 4.2);
  assert.strictEqual(updated.minimumFare, 950);
  assert.strictEqual(updated.activeModelVersion, 'v2.1-rf-regressor-domestic');
  assert.strictEqual(updated.isMaintenanceMode, false);
  assert.ok(updated.updatedAt, 'Should include updated timestamp');
});

// Summary
console.log('\n===============================================================');
console.log(`PHASE 10 TEST RESULTS: ${passedCount} / ${totalTests} TESTS PASSED`);
console.log('===============================================================\n');

if (passedCount !== totalTests) {
  process.exit(1);
}

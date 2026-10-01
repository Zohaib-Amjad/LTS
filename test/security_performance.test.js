/**
 * SMART ONLINE LUGGAGE TRANSPORTATION USING AI
 * Phase 12 Automated Test Suite: Security, Data Privacy, Validation & Performance
 */

import { strict as assert } from 'assert';
import { db } from '../js/core/database.js';
import { SecurityUtils } from '../js/core/security.js';
import { authService } from '../js/services/auth.service.js';
import { userService } from '../js/services/user.service.js';
import { bookingService } from '../js/services/booking.service.js';
import { feedbackService } from '../js/services/feedback.service.js';
import { USER_ROLES, BOOKING_STATUS, LUGGAGE_TYPES, LUGGAGE_SIZES } from '../js/constants/enums.js';
import { AuthorizationError } from '../js/core/errorHandler.js';

let passed = 0;
let total = 0;

function it(desc, fn) {
  total++;
  try {
    fn();
    passed++;
    console.log(`  \x1b[32m✔\x1b[0m ${desc}`);
  } catch (err) {
    console.error(`  \x1b[31m✖\x1b[0m ${desc}`);
    console.error(err);
  }
}

async function runTests() {
  console.log('\n======================================================');
  console.log('  RUNNING PHASE 12 SECURITY, VALIDATION & PERF TESTS');
  console.log('======================================================\n');

  // 1. XSS Escaping & Input Sanitization
  console.log('\n--- 1. XSS Escaping & Input Sanitization ---');

  it('should escape malicious HTML and script tags', () => {
    const malicious = '<script>alert("XSS")</script><img src="x" onerror="stealCookie()">';
    const escaped = SecurityUtils.escapeHtml(malicious);
    assert.strictEqual(escaped.includes('<script>'), false);
    assert.strictEqual(escaped.includes('&lt;script&gt;'), true);
    assert.strictEqual(escaped.includes('&quot;XSS&quot;'), true);
  });

  it('should prevent prototype pollution in nested objects', () => {
    const payload = JSON.parse('{"name": "test", "__proto__": {"polluted": true}, "nested": {"constructor": "hacked", "valid": 123}}');
    const sanitized = SecurityUtils.sanitizeInput(payload);
    assert.strictEqual(sanitized.name, 'test');
    assert.strictEqual(Object.prototype.polluted, undefined);
    assert.strictEqual(sanitized.nested.valid, 123);
  });

  it('should sanitize feedback comments automatically upon submission', () => {
    const customer = db.tables.users.find(u => u.role === USER_ROLES.CUSTOMER);
    const driver = db.tables.drivers.find(d => d.availabilityStatus === 'AVAILABLE') || db.tables.drivers.getAll()[0];
    
    // Create delivered booking
    const booking = db.tables.bookings.insert({
      bookingNumber: 'LUG-2026-SEC01',
      customerId: customer.id,
      assignedDriverId: driver.id,
      status: BOOKING_STATUS.DELIVERED,
      pickupLocationId: 'LOC-LHR-001',
      destinationLocationId: 'LOC-ISB-001',
      distanceKm: 375,
      totalWeightKg: 15,
      numberOfBags: 1,
      luggageType: LUGGAGE_TYPES.SUITCASE,
      luggageSize: LUGGAGE_SIZES.MEDIUM,
      finalCost: 1500,
      actualDeliveryTime: new Date().toISOString()
    });

    const res = feedbackService.submitFeedback({
      bookingId: booking.id,
      rating: 5,
      comment: '<script>alert("hacked")</script>Great service!',
      tags: ['<img onerror=x src=1>Fast Delivery', 'Safe']
    }, customer);

    assert.strictEqual(res.bookingId, booking.id);
    assert.strictEqual(res.comment.includes('<script>'), false);
    assert.strictEqual(res.comment.includes('&lt;script&gt;'), true);
    assert.strictEqual(res.tags[0].includes('<img'), false);
  });

  console.log('\n--- 2. Mass Assignment & Profile Security ---');

  it('should filter disallowed fields during user profile update', () => {
    const customer = db.tables.users.find(u => u.role === USER_ROLES.CUSTOMER);
    const updated = userService.updateProfile(customer.id, {
      fullName: 'Updated Customer Name',
      role: USER_ROLES.ADMIN, // Attempted privilege escalation
      passwordHash: 'injected_hash', // Disallowed field
      id: 'fake-id-999',
      phone: '03001234567'
    }, customer);

    assert.strictEqual(updated.fullName, 'Updated Customer Name');
    assert.strictEqual(updated.role, USER_ROLES.CUSTOMER, 'Role should not be modified via updateProfile');
    assert.notStrictEqual(updated.passwordHash, 'injected_hash');
  });

  console.log('\n--- 3. Authorization Boundaries & Privacy ---');

  it('should deny customer access to other customers bookings', () => {
    const customers = db.tables.users.filter(u => u.role === USER_ROLES.CUSTOMER);
    assert.ok(customers.length >= 2, 'Need at least 2 customers');
    
    const b1 = db.tables.bookings.insert({
      bookingNumber: 'LUG-2026-PRIV1',
      customerId: customers[0].id,
      status: BOOKING_STATUS.CONFIRMED,
      pickupLocationId: 'LOC-LHR-001',
      destinationLocationId: 'LOC-MUX-001',
      distanceKm: 340,
      totalWeightKg: 10,
      numberOfBags: 1,
      luggageType: LUGGAGE_TYPES.BACKPACK,
      luggageSize: LUGGAGE_SIZES.MEDIUM,
      finalCost: 1200
    });

    // Customer 2 attempts to fetch Customer 1's booking
    assert.throws(() => {
      bookingService.getBookingById(b1.id, customers[1]);
    }, AuthorizationError);
  });

  it('should deny driver access to unassigned bookings', () => {
    const drivers = db.tables.drivers.getAll();
    const customer = db.tables.users.find(u => u.role === USER_ROLES.CUSTOMER);

    const b = db.tables.bookings.insert({
      bookingNumber: 'LUG-2026-PRIV2',
      customerId: customer.id,
      assignedDriverId: drivers[0].id,
      status: BOOKING_STATUS.DRIVER_ASSIGNED,
      pickupLocationId: 'LOC-KHI-001',
      destinationLocationId: 'LOC-HYD-001',
      distanceKm: 160,
      totalWeightKg: 20,
      numberOfBags: 2,
      luggageType: LUGGAGE_TYPES.SUITCASE,
      luggageSize: LUGGAGE_SIZES.LARGE,
      finalCost: 1800
    });

    if (drivers.length > 1) {
      const driver2User = db.tables.users.findById(drivers[1].userId);
      assert.throws(() => {
        bookingService.getBookingById(b.id, driver2User);
      }, AuthorizationError);
    }
  });

  it('should allow admin full access to any booking details', () => {
    const customer = db.tables.users.find(u => u.role === USER_ROLES.CUSTOMER);
    const admin = db.tables.users.find(u => u.role === USER_ROLES.ADMIN);

    const b = db.tables.bookings.insert({
      bookingNumber: 'LUG-2026-PRIV3',
      customerId: customer.id,
      status: BOOKING_STATUS.CONFIRMED,
      pickupLocationId: 'LOC-PEW-001',
      destinationLocationId: 'LOC-ISB-001',
      distanceKm: 185,
      totalWeightKg: 12,
      numberOfBags: 1,
      luggageType: LUGGAGE_TYPES.TRAVEL_BAG,
      luggageSize: LUGGAGE_SIZES.MEDIUM,
      finalCost: 1100
    });

    const result = bookingService.getBookingById(b.id, admin);
    assert.ok(result, 'Admin should retrieve booking');
    assert.strictEqual(result.bookingNumber, 'LUG-2026-PRIV3');
  });

  console.log('\n--- 4. Input & Format Validation ---');

  it('should validate RFC compliant email addresses', () => {
    assert.strictEqual(SecurityUtils.isValidEmail('customer@example.com'), true);
    assert.strictEqual(SecurityUtils.isValidEmail('user.name+tag@domain.co.uk'), true);
    assert.strictEqual(SecurityUtils.isValidEmail('invalid-email'), false);
    assert.strictEqual(SecurityUtils.isValidEmail('missing@domain'), false);
    assert.strictEqual(SecurityUtils.isValidEmail(''), false);
  });

  it('should validate domestic and international phone numbers', () => {
    assert.strictEqual(SecurityUtils.isValidPhone('03001234567'), true);
    assert.strictEqual(SecurityUtils.isValidPhone('+923001234567'), true);
    assert.strictEqual(SecurityUtils.isValidPhone('0321-9876543'), true);
    assert.strictEqual(SecurityUtils.isValidPhone('123'), false);
    assert.strictEqual(SecurityUtils.isValidPhone('abc12345678'), false);
  });

  it('should enforce password complexity and length requirements', () => {
    const valid = SecurityUtils.validatePassword('SecuRe@1234');
    assert.strictEqual(valid.isValid, true);

    const tooShort = SecurityUtils.validatePassword('123');
    assert.strictEqual(tooShort.isValid, false);

    const empty = SecurityUtils.validatePassword('');
    assert.strictEqual(empty.isValid, false);
  });

  console.log('\n--- 5. Database Performance & Index Optimization ---');

  it('should perform instant O(1) primary key lookups via indexMap', () => {
    // Populate 500 records into notifications table
    for (let i = 0; i < 500; i++) {
      db.tables.notifications.insert({
        userId: 'perf-user',
        title: `Test Notif ${i}`,
        message: 'High speed lookup test'
      });
    }

    const testId = db.tables.notifications.data[250].id;
    const lookupStart = performance.now();
    const found = db.tables.notifications.findById(testId);
    const lookupEnd = performance.now();

    assert.ok(found, 'Record should be found instantly');
    assert.strictEqual(found.id, testId);
    assert.ok((lookupEnd - lookupStart) < 5, 'Lookup time should be under 5 milliseconds');
  });

  console.log('\n--- 6. Secrets & Credentials Leak Audit ---');

  it('should verify zero exposed private API keys or hardcoded passwords in client env', async () => {
    const envModule = await import('../js/config/env.js');
    const env = envModule.ENV;
    assert.ok(env, 'ENV config should exist');
    assert.strictEqual(env.ML_PREDICTION_SERVICE_SECRET, undefined, 'No server secrets in client env');
    assert.strictEqual(env.DB_PASSWORD, undefined, 'No database passwords in client env');
  });

  // Summary
  console.log('\n======================================================');
  console.log(`  PHASE 12 RESULTS: ${passed}/${total} Passed (${Math.round((passed / total) * 100)}%)`);
  console.log('======================================================\n');

  if (passed !== total) {
    process.exit(1);
  }
}

runTests();

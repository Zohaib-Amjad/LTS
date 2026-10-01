/**
 * SMART ONLINE LUGGAGE TRANSPORTATION USING AI
 * Phase 13 End-to-End Demonstration & Comprehensive Test Scenarios
 */

import { strict as assert } from 'assert';
import { db } from '../js/core/database.js';
import { authService } from '../js/services/auth.service.js';
import { userService } from '../js/services/user.service.js';
import { driverService } from '../js/services/driver.service.js';
import { distanceService } from '../js/services/distance.service.js';
import { luggageService } from '../js/services/luggage.service.js';
import { predictionService } from '../js/services/prediction.service.js';
import { bookingService } from '../js/services/booking.service.js';
import { trackingService } from '../js/services/tracking.service.js';
import { feedbackService } from '../js/services/feedback.service.js';
import { adminService } from '../js/services/admin.service.js';
import { USER_ROLES, BOOKING_STATUS, LUGGAGE_TYPES, LUGGAGE_SIZES, TRANSPORT_TIERS } from '../js/constants/enums.js';

let passed = 0;
let total = 0;

async function it(desc, fn) {
  total++;
  try {
    await fn();
    passed++;
    console.log(`  \x1b[32m✔\x1b[0m ${desc}`);
  } catch (err) {
    console.error(`  \x1b[31m✖\x1b[0m ${desc}`);
    console.error(err);
  }
}

async function runDemoTests() {
  console.log('===============================================================');
  console.log('  PHASE 13: COMPREHENSIVE FYP DEMO SCENARIOS & END-TO-END TESTS');
  console.log('===============================================================\n');

  // Verify Seed Database State
  console.log('--- 0. Verifying Seed Demo Environment ---');

  await it('should have Admin, Multiple Customers, and Multiple Drivers in database', () => {
    const admin = db.tables.users.find(u => u.role === USER_ROLES.ADMIN);
    const customers = db.tables.users.filter(u => u.role === USER_ROLES.CUSTOMER);
    const drivers = db.tables.drivers.getAll();

    assert.ok(admin, 'Admin account exists');
    assert.ok(customers.length >= 3, `Expected >=3 customers, found ${customers.length}`);
    assert.ok(drivers.length >= 3, `Expected >=3 drivers, found ${drivers.length}`);
  });

  await it('should have seed bookings representing all 6 lifecycle states', () => {
    const bookings = db.tables.bookings.getAll();
    const statuses = new Set(bookings.map(b => b.status));

    assert.ok(statuses.has(BOOKING_STATUS.CONFIRMED), 'Has CONFIRMED booking');
    assert.ok(statuses.has(BOOKING_STATUS.DRIVER_ASSIGNED), 'Has DRIVER_ASSIGNED booking');
    assert.ok(statuses.has(BOOKING_STATUS.PICKED_UP), 'Has PICKED_UP booking');
    assert.ok(statuses.has(BOOKING_STATUS.IN_TRANSIT), 'Has IN_TRANSIT booking');
    assert.ok(statuses.has(BOOKING_STATUS.DELIVERED), 'Has DELIVERED booking');
    assert.ok(statuses.has(BOOKING_STATUS.CANCELLED), 'Has CANCELLED booking');
  });

  // 1. CUSTOMER WORKFLOW TEST SCENARIO
  console.log('\n--- 1. Customer Workflow Test Scenarios (1-10) ---');

  let newCustomer = null;
  let createdBooking = null;
  let aiEstimate = null;

  await it('Step 1: Customer registers a new account', () => {
    const regUser = authService.register({
      fullName: 'Zubair Qureshi',
      email: 'zubair.qureshi@smartluggage.pk',
      phone: '03009988776',
      password: 'CustomerSecure@123',
      city: 'Lahore'
    });

    assert.ok(regUser, 'Registration successful');
    assert.strictEqual(regUser.email, 'zubair.qureshi@smartluggage.pk');
    assert.strictEqual(regUser.role, USER_ROLES.CUSTOMER);
    newCustomer = regUser;
  });

  await it('Step 2: Customer logs in successfully with valid credentials', () => {
    const loginUser = authService.login('zubair.qureshi@smartluggage.pk', 'CustomerSecure@123');
    assert.ok(loginUser, 'Login returned active session');
    assert.strictEqual(loginUser.id, newCustomer.id);
  });

  await it('Step 3 & 4: Customer enters pickup and destination locations & verifies distance', async () => {
    const pickupLoc = db.tables.locations.find(l => l.city === 'Lahore');
    const destLoc = db.tables.locations.find(l => l.city === 'Islamabad');

    assert.ok(pickupLoc && destLoc, 'Locations found in database');
    const distanceRes = await distanceService.calculateRouteDistance(pickupLoc, destLoc);
    assert.ok(distanceRes.distanceKm > 0, 'Distance calculated');
    assert.ok(distanceRes.corridorName, 'Corridor name defined');
  });

  await it('Step 5 & 6: Customer enters luggage details and receives AI estimate', async () => {
    const pickupLoc = db.tables.locations.find(l => l.city === 'Lahore');
    const destLoc = db.tables.locations.find(l => l.city === 'Islamabad');
    const distanceRes = await distanceService.calculateRouteDistance(pickupLoc, destLoc);

    aiEstimate = await predictionService.predict({
      distanceKm: distanceRes.distanceKm,
      totalWeightKg: 18.5,
      bagCount: 1,
      luggageType: LUGGAGE_TYPES.SUITCASE,
      sizeCategory: LUGGAGE_SIZES.LARGE,
      transportTier: TRANSPORT_TIERS.EXPRESS,
      isFragile: false
    });

    assert.ok(aiEstimate, 'Prediction returned');
    assert.ok(aiEstimate.predictedCost > 0, 'Predicted cost is positive');
    assert.ok(aiEstimate.predictedTimeHours > 0, 'Estimated delivery time is positive');
    assert.ok(aiEstimate.id, 'Prediction record generated and indexed');
  });

  await it('Step 7: Customer confirms booking (enters CONFIRMED state)', () => {
    const pickupLoc = db.tables.locations.find(l => l.city === 'Lahore');
    const destLoc = db.tables.locations.find(l => l.city === 'Islamabad');

    // Create luggage item
    const lugItem = luggageService.createLuggage({
      customerId: newCustomer.id,
      type: LUGGAGE_TYPES.SUITCASE,
      weightKg: 18.5,
      bagCount: 1,
      lengthCm: 70,
      widthCm: 45,
      heightCm: 28,
      isFragile: false,
      specialInstructions: 'Fragile electronics inside front zip'
    });

    createdBooking = bookingService.createBooking({
      customerId: newCustomer.id,
      pickupLocationId: pickupLoc.id,
      destinationLocationId: destLoc.id,
      luggageIds: [lugItem.id],
      distanceKm: 375,
      predictionId: aiEstimate.id,
      transportTier: TRANSPORT_TIERS.EXPRESS,
      quotedCost: aiEstimate.predictedCost,
      estimatedDeliveryTimeHours: aiEstimate.predictedTimeHours,
      scheduledPickupTime: new Date(Date.now() + 86400000).toISOString(),
      customerNotes: 'Please ring bell upon arrival'
    }, newCustomer);

    assert.ok(createdBooking, 'Booking created');
    assert.strictEqual(createdBooking.status, BOOKING_STATUS.CONFIRMED);
    assert.ok(createdBooking.bookingNumber.startsWith('LUG-2026-'));
  });

  await it('Step 8 & 9: Customer views booking details and tracks visual status timeline', () => {
    const details = bookingService.getBookingById(createdBooking.id, newCustomer);
    assert.strictEqual(details.id, createdBooking.id);
    assert.strictEqual(details.customerId, newCustomer.id);

    const timeline = trackingService.getTrackingTimeline(createdBooking.id);
    assert.ok(timeline, 'Timeline generated');
    assert.strictEqual(timeline.currentStatus, BOOKING_STATUS.CONFIRMED);
    assert.ok(timeline.milestones.length >= 5, 'Has all 5 key logistics milestones');
  });

  // 2. ADMIN DISPATCH & MANAGEMENT TEST SCENARIO
  console.log('\n--- 2. Admin Management & Dispatch Test Scenarios (1-9) ---');

  const adminUser = db.tables.users.find(u => u.role === USER_ROLES.ADMIN);
  let availableDriver = null;

  await it('Admin Step 1 & 2: Admin logs in and views platform dashboard overview', () => {
    const metrics = adminService.getSystemMetrics(adminUser);
    assert.ok(metrics, 'System overview retrieved');
    assert.ok(metrics.totalCustomers >= 3);
    assert.ok(metrics.totalDrivers >= 3);
    assert.ok(metrics.totalBookings >= 7);
  });

  await it('Admin Step 3 & 4: Admin views & searches users and drivers fleet', () => {
    const users = userService.getAllUsers(adminUser);
    assert.ok(users.length >= 4);

    const availableDrivers = driverService.getAvailableDrivers();
    assert.ok(availableDrivers.length >= 1, 'At least 1 driver is available for dispatch');
    availableDriver = availableDrivers[0];
  });

  await it('Admin Step 5 & 6: Admin assigns available driver to Customer\'s Confirmed booking', () => {
    const assigned = bookingService.assignDriver({
      bookingId: createdBooking.id,
      driverId: availableDriver.id,
      adminUser
    });

    assert.strictEqual(assigned.status, BOOKING_STATUS.DRIVER_ASSIGNED);
    assert.strictEqual(assigned.assignedDriverId, availableDriver.id);
    createdBooking = assigned;
  });

  await it('Admin Step 7, 8 & 9: Admin inspects AI prediction, feedback stats, and system analytics', () => {
    const deepDetails = adminService.getBookingDeepDetails(createdBooking.id);
    assert.ok(deepDetails.prediction, 'Prediction details attached');
    assert.ok(deepDetails.statusHistory.length >= 2, 'Audit trail logs initial and assignment');

    const feedbackStats = feedbackService.getFeedbackStats();
    assert.ok(feedbackStats.totalReviews >= 1);
    assert.ok(feedbackStats.averageRating > 0);
  });

  // 3. DRIVER TRIP LIFECYCLE WORKFLOW TEST SCENARIO
  console.log('\n--- 3. Driver Trip Lifecycle Test Scenarios (1-6) ---');

  let driverUser = null;

  await it('Driver Step 1 & 2: Driver logs in and views assigned trips', () => {
    driverUser = db.tables.users.findById(availableDriver.userId);
    assert.ok(driverUser, 'Driver user found');

    const trips = driverService.getDriverAssignedBookings(availableDriver.id, driverUser);
    const hasAssigned = trips.some(t => t.id === createdBooking.id);
    assert.ok(hasAssigned, 'Assigned booking visible in driver portal');
  });

  await it('Driver Step 3 & 4: Driver marks booking as PICKED_UP from customer residence', () => {
    const pickedUp = bookingService.updateBookingStatus({
      bookingId: createdBooking.id,
      newStatus: BOOKING_STATUS.PICKED_UP,
      note: 'Luggage picked up and verified with customer',
      locationStamp: 'DHA Phase 5 Lahore',
      requestingUser: driverUser
    });

    assert.strictEqual(pickedUp.status, BOOKING_STATUS.PICKED_UP);
    createdBooking = pickedUp;
  });

  await it('Driver Step 5: Driver marks booking as IN_TRANSIT on highway', () => {
    const inTransit = bookingService.updateBookingStatus({
      bookingId: createdBooking.id,
      newStatus: BOOKING_STATUS.IN_TRANSIT,
      note: 'En route on Motorway M-2 towards Islamabad',
      locationStamp: 'Kala Shah Kaku M-2 Interchange',
      requestingUser: driverUser
    });

    assert.strictEqual(inTransit.status, BOOKING_STATUS.IN_TRANSIT);
    createdBooking = inTransit;
  });

  await it('Driver Step 6: Driver marks booking as DELIVERED at destination', () => {
    const delivered = bookingService.updateBookingStatus({
      bookingId: createdBooking.id,
      newStatus: BOOKING_STATUS.DELIVERED,
      note: 'Delivered securely to recipient at Islamabad',
      locationStamp: 'Sector F-7/2 Islamabad',
      requestingUser: driverUser
    });

    assert.strictEqual(delivered.status, BOOKING_STATUS.DELIVERED);
    assert.ok(delivered.actualDeliveryTime, 'Delivery timestamp recorded');
    createdBooking = delivered;
  });

  // Customer Feedback after delivery
  await it('Customer Step 10: Customer submits 5-star feedback rating for delivered booking', () => {
    const reviewRes = feedbackService.submitFeedback({
      bookingId: createdBooking.id,
      rating: 5,
      comment: 'Super fast delivery and courteous driver! AI price estimate was 100% accurate.',
      tags: ['On Time', 'Careful Handling', 'Clean Vehicle']
    }, newCustomer);

    assert.ok(reviewRes, 'Feedback submitted');
    assert.strictEqual(reviewRes.rating, 5);
    assert.strictEqual(reviewRes.bookingId, createdBooking.id);
  });

  // 4. AI PREDICTION ENGINE COMPREHENSIVE COMBINATIONS
  console.log('\n--- 4. AI Prediction Engine Multi-Scenario Tests ---');

  await it('should predict cost & time across diverse distance, weight, bag and luggage type combinations', async () => {
    const testCases = [
      {
        desc: 'Short Distance Lightweight (Rawalpindi to Islamabad 25km, 5kg Backpack)',
        features: {
          distanceKm: 25,
          totalWeightKg: 5,
          bagCount: 1,
          luggageType: LUGGAGE_TYPES.BACKPACK,
          sizeCategory: LUGGAGE_SIZES.SMALL,
          transportTier: TRANSPORT_TIERS.STANDARD
        },
        expectedMaxCost: 1500,
        expectedMaxHours: 4
      },
      {
        desc: 'Medium Distance Heavy Luggage (Lahore to Islamabad 375km, 30kg 2x Large Suitcases)',
        features: {
          distanceKm: 375,
          totalWeightKg: 30,
          bagCount: 2,
          luggageType: LUGGAGE_TYPES.SUITCASE,
          sizeCategory: LUGGAGE_SIZES.LARGE,
          transportTier: TRANSPORT_TIERS.EXPRESS
        },
        expectedMaxCost: 4500,
        expectedMaxHours: 15
      },
      {
        desc: 'Long Distance Cross-Country (Karachi to Islamabad 1410km, 45kg 3x Boxes)',
        features: {
          distanceKm: 1410,
          totalWeightKg: 45,
          bagCount: 3,
          luggageType: LUGGAGE_TYPES.BOX,
          sizeCategory: LUGGAGE_SIZES.EXTRA_LARGE,
          transportTier: TRANSPORT_TIERS.STANDARD
        },
        expectedMaxCost: 8500,
        expectedMaxHours: 48
      }
    ];

    for (const tc of testCases) {
      const pred = await predictionService.predict(tc.features);
      assert.ok(pred.predictedCost > 0, `Cost > 0 for ${tc.desc}`);
      assert.ok(pred.predictedCost <= tc.expectedMaxCost, `Cost within reasonable bounds for ${tc.desc}`);
      assert.ok(pred.predictedTimeHours <= tc.expectedMaxHours, `Time within bounds for ${tc.desc}`);
      assert.ok(pred.modelVersion, 'Model version tracked');
      assert.ok(pred.algorithmUsed, 'Algorithm metadata tracked');
    }
  });

  await it('should reject invalid AI prediction input parameters', async () => {
    // 0 bag count
    await assert.rejects(async () => {
      await predictionService.predict({
        distanceKm: 100,
        totalWeightKg: 10,
        bagCount: 0,
        luggageType: LUGGAGE_TYPES.SUITCASE
      });
    }, /bag/i);

    // Negative distance
    await assert.rejects(async () => {
      await predictionService.predict({
        distanceKm: -50,
        totalWeightKg: 10,
        bagCount: 1,
        luggageType: LUGGAGE_TYPES.SUITCASE
      });
    }, /distance/i);

    // Impossible luggage weight (> 200kg)
    await assert.rejects(async () => {
      await predictionService.predict({
        distanceKm: 100,
        totalWeightKg: 250,
        bagCount: 1,
        luggageType: LUGGAGE_TYPES.SUITCASE
      });
    }, /weight/i);
  });

  // Summary
  console.log('\n===============================================================');
  console.log(`  PHASE 13 RESULTS: ${passed}/${total} Demo Scenarios Passed (${Math.round((passed / total) * 100)}%)`);
  console.log('===============================================================\n');

  if (passed !== total) {
    process.exit(1);
  }
}

runDemoTests();

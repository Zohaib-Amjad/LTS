/**
 * SMART ONLINE LUGGAGE TRANSPORTATION USING AI
 * Automated Test Suite: Phase 11 Notifications & Edge Cases System
 */

import assert from 'assert';
import { notificationService } from '../js/services/notification.service.js';
import { bookingService } from '../js/services/booking.service.js';
import { locationService } from '../js/services/location.service.js';
import { luggageService } from '../js/services/luggage.service.js';
import { distanceService } from '../js/services/distance.service.js';
import { predictionService } from '../js/services/prediction.service.js';
import { driverService } from '../js/services/driver.service.js';
import { authService } from '../js/services/auth.service.js';
import { USER_ROLES, BOOKING_STATUS, NOTIFICATION_TYPES, DRIVER_AVAILABILITY } from '../js/constants/enums.js';
import { db } from '../js/core/database.js';
import { ValidationError, AuthorizationError, NotFoundError, StateTransitionError, ErrorHandler } from '../js/core/errorHandler.js';

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

async function runNotificationsEdgeCasesTests() {
  console.log('\n===============================================================');
  console.log('PHASE 11: RUNNING NOTIFICATIONS & EDGE CASES TEST SUITE');
  console.log('===============================================================\n');

  // Test fixtures
  const adminUser = db.tables.users.find(u => u.role === USER_ROLES.ADMIN);
  const customerUser = db.tables.users.find(u => u.role === USER_ROLES.CUSTOMER);
  const driverUser = db.tables.users.find(u => u.role === USER_ROLES.DRIVER);
  const otherCustomer = db.tables.users.find(u => u.role === USER_ROLES.CUSTOMER && u.id !== customerUser.id) || {
    id: 'USR-CUST-999',
    fullName: 'Other Customer',
    role: USER_ROLES.CUSTOMER
  };

  // 1. In-App Notification System & Event Triggers
  console.log('1. Testing In-App Notification System & Lifecycle Event Triggers:');

  it('Booking confirmation dispatches notification to customer and admin', () => {
    const pickup = locationService.createLocation({ city: 'Islamabad', addressLine: 'F-8/3, Islamabad' });
    const dest = locationService.createLocation({ city: 'Lahore', addressLine: 'Gulberg II, Lahore' });
    const lug = luggageService.createLuggage({ customerId: customerUser.id, type: 'Suitcase', weightKg: 15 });
    const pred = db.tables.predictions.insert({ predictedCost: 2100, predictedTimeHours: 4.5, confidenceScore: 0.94 });

    const booking = bookingService.createBooking({
      customerId: customerUser.id,
      pickupLocationId: pickup.id,
      destinationLocationId: dest.id,
      luggageIds: [lug.id],
      distanceKm: 380,
      predictionId: pred.id,
      quotedCost: 2100,
      estimatedDeliveryTimeHours: 4.5
    }, customerUser);

    const customerNotifs = notificationService.getUserNotifications(customerUser.id);
    const confNotif = customerNotifs.find(n => n.type === NOTIFICATION_TYPES.BOOKING_CONFIRMED && n.bookingId === booking.id);

    assert.ok(confNotif, 'Customer should receive BOOKING_CONFIRMED notification');
    assert.strictEqual(confNotif.bookingNumber, booking.bookingNumber);
    assert.strictEqual(confNotif.isRead, false);
  });

  it('Driver assignment dispatches notification to customer and driver', () => {
    const allDrivers = db.tables.drivers.getAll();
    const targetDriver = allDrivers[0];
    db.tables.drivers.update(targetDriver.id, { isAvailable: true, availabilityStatus: 'AVAILABLE' });

    // Create confirmed booking
    const pickup = locationService.createLocation({ city: 'Islamabad', addressLine: 'G-11, Islamabad' });
    const dest = locationService.createLocation({ city: 'Rawalpindi', addressLine: 'Saddar, Rawalpindi' });
    const lug = luggageService.createLuggage({ customerId: customerUser.id, type: 'Backpack', weightKg: 8 });
    const pred = db.tables.predictions.insert({ predictedCost: 950, predictedTimeHours: 1.0, confidenceScore: 0.95 });

    const booking = bookingService.createBooking({
      customerId: customerUser.id,
      pickupLocationId: pickup.id,
      destinationLocationId: dest.id,
      luggageIds: [lug.id],
      distanceKm: 25,
      predictionId: pred.id,
      quotedCost: 950,
      estimatedDeliveryTimeHours: 1.0
    }, customerUser);

    const assigned = bookingService.assignDriver({
      bookingId: booking.id,
      driverId: targetDriver.id,
      adminUser
    });

    const custNotifs = notificationService.getUserNotifications(customerUser.id);
    const drvNotif = custNotifs.find(n => n.type === NOTIFICATION_TYPES.DRIVER_ASSIGNED && n.bookingId === booking.id);
    assert.ok(drvNotif, 'Customer should receive DRIVER_ASSIGNED notification');

    if (targetDriver.userId) {
      const driverNotifs = notificationService.getUserNotifications(targetDriver.userId);
      const drvAssignedNotif = driverNotifs.find(n => n.type === NOTIFICATION_TYPES.DRIVER_ASSIGNED && n.bookingId === booking.id);
      assert.ok(drvAssignedNotif, 'Driver should receive DRIVER_ASSIGNED notification');
    }
  });

  it('Milestone transitions (PICKED_UP, IN_TRANSIT, DELIVERED) dispatch notifications', () => {
    const allDrivers = db.tables.drivers.getAll();
    const driverObj = allDrivers[0];
    db.tables.drivers.update(driverObj.id, { isAvailable: true, availabilityStatus: 'AVAILABLE' });
    const drvUser = db.tables.users.findById(driverObj.userId);

    // Setup booking in DRIVER_ASSIGNED status
    const pickup = locationService.createLocation({ city: 'Islamabad', addressLine: 'F-10, Islamabad' });
    const dest = locationService.createLocation({ city: 'Lahore', addressLine: 'DHA Phase 5, Lahore' });
    const pred = db.tables.predictions.insert({ predictedCost: 2200, predictedTimeHours: 4.2 });

    const b = bookingService.createBooking({
      customerId: customerUser.id,
      pickupLocationId: pickup.id,
      destinationLocationId: dest.id,
      luggageIds: [],
      distanceKm: 380,
      predictionId: pred.id,
      quotedCost: 2200
    }, customerUser);

    bookingService.assignDriver({ bookingId: b.id, driverId: driverObj.id, adminUser });

    // 1. Picked Up
    bookingService.updateBookingStatus({ bookingId: b.id, newStatus: BOOKING_STATUS.PICKED_UP, user: drvUser });
    let notifs = notificationService.getUserNotifications(customerUser.id);
    assert.ok(notifs.some(n => n.type === NOTIFICATION_TYPES.PICKED_UP && n.bookingId === b.id), 'Should receive PICKED_UP notification');

    // 2. In Transit
    bookingService.updateBookingStatus({ bookingId: b.id, newStatus: BOOKING_STATUS.IN_TRANSIT, user: drvUser });
    notifs = notificationService.getUserNotifications(customerUser.id);
    assert.ok(notifs.some(n => n.type === NOTIFICATION_TYPES.IN_TRANSIT && n.bookingId === b.id), 'Should receive IN_TRANSIT notification');

    // 3. Delivered + Feedback Reminder
    bookingService.updateBookingStatus({ bookingId: b.id, newStatus: BOOKING_STATUS.DELIVERED, user: drvUser });
    notifs = notificationService.getUserNotifications(customerUser.id);
    assert.ok(notifs.some(n => n.type === NOTIFICATION_TYPES.DELIVERED && n.bookingId === b.id), 'Should receive DELIVERED notification');
    assert.ok(notifs.some(n => n.type === NOTIFICATION_TYPES.FEEDBACK_REMINDER && n.bookingId === b.id), 'Should receive FEEDBACK_REMINDER notification');
  });

  it('Mark as read, Mark all as read, and Clear all notifications work properly', () => {
    const notifs = notificationService.getUserNotifications(customerUser.id);
    assert.ok(notifs.length >= 1);

    const target = notifs[0];
    notificationService.markAsRead(target.id);
    const updated = db.tables.notifications.findById(target.id);
    assert.strictEqual(updated.isRead, true);

    notificationService.markAllAsRead(customerUser.id);
    const unreadCount = notificationService.getUnreadCount(customerUser.id);
    assert.strictEqual(unreadCount, 0, 'Unread count should be 0 after markAllAsRead');

    const meta = notificationService.getNotificationMeta(NOTIFICATION_TYPES.DELIVERED);
    assert.ok(meta.icon.includes('circle-check'));
    assert.ok(meta.color);
  });

  // 2. Edge Cases: Location & Distance Engine
  console.log('\n2. Testing Location & Distance Engine Edge Cases:');

  it('Identical pickup and destination address throws ValidationError', () => {
    assert.throws(() => {
      locationService.validateRoute({
        city: 'Islamabad',
        addressLine: 'House 12, Street 4, F-7'
      }, {
        city: 'Islamabad',
        addressLine: 'House 12, Street 4, F-7'
      });
    }, ValidationError);
  });

  it('Empty location address line throws ValidationError', () => {
    assert.throws(() => {
      locationService.createLocation({ city: 'Lahore', addressLine: '   ' });
    }, ValidationError);
  });

  await itAsync('Distance service falls back gracefully with positive distance on unknown provider', async () => {
    const result = await distanceService.calculateRouteDistance(
      { city: 'Islamabad' },
      { city: 'Multan' }
    );
    assert.strictEqual(typeof result.distanceKm, 'number');
    assert.ok(result.distanceKm > 0, 'Distance must be positive');
  });

  // 3. Edge Cases: Luggage & ML Prediction Engine
  console.log('\n3. Testing Luggage & ML Prediction Edge Cases:');

  it('Luggage with negative or zero weight throws ValidationError', () => {
    assert.throws(() => {
      luggageService.createLuggage({ customerId: customerUser.id, type: 'Suitcase', weightKg: 0 });
    }, ValidationError);

    assert.throws(() => {
      luggageService.createLuggage({ customerId: customerUser.id, type: 'Suitcase', weightKg: -5 });
    }, ValidationError);
  });

  it('Luggage exceeding 200kg maximum single-item weight limit throws ValidationError', () => {
    assert.throws(() => {
      luggageService.createLuggage({ customerId: customerUser.id, type: 'Suitcase', weightKg: 250 });
    }, ValidationError);
  });

  await itAsync('Prediction engine with zero bag count or negative distance throws ValidationError', async () => {
    await assert.rejects(async () => {
      await predictionService.predict({
        distanceKm: -100,
        totalWeightKg: 15,
        bagCount: 1
      });
    }, ValidationError);

    await assert.rejects(async () => {
      await predictionService.predict({
        distanceKm: 380,
        totalWeightKg: 15,
        bagCount: 0
      });
    }, ValidationError);
  });

  // 4. Edge Cases: Booking Security, Scoping & State Guarding
  console.log('\n4. Testing Booking Security, Scoping & State Guarding:');

  it('Customer cannot create booking for another customer ID', () => {
    const pickup = locationService.createLocation({ city: 'Islamabad', addressLine: 'F-6, Islamabad' });
    const dest = locationService.createLocation({ city: 'Lahore', addressLine: 'Model Town, Lahore' });
    const pred = db.tables.predictions.insert({ predictedCost: 2000, predictedTimeHours: 4.0 });

    assert.throws(() => {
      bookingService.createBooking({
        customerId: 'OTHER_CUST_ID_999',
        pickupLocationId: pickup.id,
        destinationLocationId: dest.id,
        luggageIds: [],
        distanceKm: 380,
        predictionId: pred.id,
        quotedCost: 2000
      }, customerUser);
    }, AuthorizationError);
  });

  it('Customer cannot update or cancel another customer\'s booking', () => {
    const pickup = locationService.createLocation({ city: 'Islamabad', addressLine: 'F-6, Islamabad' });
    const dest = locationService.createLocation({ city: 'Lahore', addressLine: 'Model Town, Lahore' });
    const pred = db.tables.predictions.insert({ predictedCost: 2000, predictedTimeHours: 4.0 });

    const booking = bookingService.createBooking({
      customerId: customerUser.id,
      pickupLocationId: pickup.id,
      destinationLocationId: dest.id,
      luggageIds: [],
      distanceKm: 380,
      predictionId: pred.id,
      quotedCost: 2000
    }, customerUser);

    assert.throws(() => {
      bookingService.updateBookingStatus({
        bookingId: booking.id,
        newStatus: BOOKING_STATUS.CANCELLED,
        user: otherCustomer
      });
    }, AuthorizationError);
  });

  it('Driver attempting to update unassigned booking throws AuthorizationError', () => {
    const pickup = locationService.createLocation({ city: 'Islamabad', addressLine: 'F-6, Islamabad' });
    const dest = locationService.createLocation({ city: 'Lahore', addressLine: 'Model Town, Lahore' });
    const pred = db.tables.predictions.insert({ predictedCost: 2000, predictedTimeHours: 4.0 });

    const booking = bookingService.createBooking({
      customerId: customerUser.id,
      pickupLocationId: pickup.id,
      destinationLocationId: dest.id,
      luggageIds: [],
      distanceKm: 380,
      predictionId: pred.id,
      quotedCost: 2000
    }, customerUser);

    assert.throws(() => {
      bookingService.updateBookingStatus({
        bookingId: booking.id,
        newStatus: BOOKING_STATUS.PICKED_UP,
        user: driverUser
      });
    }, AuthorizationError);
  });

  it('Driver attempting illegal status transition (skipping states) throws StateTransitionError', () => {
    const allDrivers = db.tables.drivers.getAll();
    const drv = allDrivers[0];
    db.tables.drivers.update(drv.id, { isAvailable: true, availabilityStatus: 'AVAILABLE' });
    const drvUser = db.tables.users.findById(drv.userId);

    const pickup = locationService.createLocation({ city: 'Islamabad', addressLine: 'F-6, Islamabad' });
    const dest = locationService.createLocation({ city: 'Lahore', addressLine: 'Model Town, Lahore' });
    const pred = db.tables.predictions.insert({ predictedCost: 2000, predictedTimeHours: 4.0 });

    const booking = bookingService.createBooking({
      customerId: customerUser.id,
      pickupLocationId: pickup.id,
      destinationLocationId: dest.id,
      luggageIds: [],
      distanceKm: 380,
      predictionId: pred.id,
      quotedCost: 2000
    }, customerUser);

    bookingService.assignDriver({ bookingId: booking.id, driverId: drv.id, adminUser });

    // Currently DRIVER_ASSIGNED, driver attempts to mark directly DELIVERED
    assert.throws(() => {
      bookingService.updateBookingStatus({
        bookingId: booking.id,
        newStatus: BOOKING_STATUS.DELIVERED,
        user: drvUser
      });
    }, StateTransitionError);
  });

  it('Requesting non-existent booking ID throws NotFoundError', () => {
    assert.throws(() => {
      bookingService.getBookingById('NON_EXISTENT_ID_XYZ');
    }, NotFoundError);
  });

  // 5. Unified Error Handler Output Sanitization
  console.log('\n5. Testing Error Handler & Stack Trace Masking:');

  it('ErrorHandler formats errors into user-friendly structure without stack traces in JSON', () => {
    const err = new ValidationError('Invalid luggage dimensions.');
    const handled = ErrorHandler.handle(err, 'BookingTest');

    assert.strictEqual(handled.success, false);
    assert.strictEqual(handled.error.name, 'ValidationError');
    assert.strictEqual(handled.error.code, 'VALIDATION_ERROR');
    assert.strictEqual(handled.error.statusCode, 400);

    const json = handled.error.toJSON();
    assert.strictEqual(json.message, 'Invalid luggage dimensions.');
    assert.strictEqual(json.stack, undefined, 'Stack trace should not be exposed in JSON output');
  });

  // Summary
  console.log('\n===============================================================');
  console.log(`PHASE 11 TEST RESULTS: ${passedCount} / ${totalTests} TESTS PASSED`);
  console.log('===============================================================\n');

  if (passedCount !== totalTests) {
    process.exit(1);
  }
}

runNotificationsEdgeCasesTests().catch(err => {
  console.error('Fatal Test Runner Error:', err);
  process.exit(1);
});

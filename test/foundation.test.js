/**
 * SMART ONLINE LUGGAGE TRANSPORTATION USING AI
 * Phase 1 Foundation & Architecture Automated Verification Suite
 */

import {
  USER_ROLES,
  BOOKING_STATUS,
  LUGGAGE_TYPES,
  LUGGAGE_SIZES,
  TRANSPORT_TIERS,
  ML_MODELS,
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  StateTransitionError,
  ErrorHandler,
  db,
  authService,
  userService,
  driverService,
  locationService,
  distanceService,
  luggageService,
  predictionService,
  bookingService,
  trackingService,
  feedbackService,
  adminService,
  notificationService
} from '../js/services/index.js';

let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passedTests++;
  } else {
    console.error(`  ✗ FAILED: ${message}`);
    failedTests++;
  }
}

async function runTests() {
  console.log('===============================================================');
  console.log('PHASE 1: RUNNING FOUNDATION & ARCHITECTURE VERIFICATION TESTS');
  console.log('===============================================================\n');

  // Test 1: Constants and Enums
  console.log('1. Checking Domain Constants & Roles:');
  assert(USER_ROLES.CUSTOMER === 'CUSTOMER', 'USER_ROLES.CUSTOMER defined');
  assert(USER_ROLES.DRIVER === 'DRIVER', 'USER_ROLES.DRIVER defined');
  assert(USER_ROLES.ADMIN === 'ADMIN', 'USER_ROLES.ADMIN defined');
  assert(BOOKING_STATUS.PENDING === 'PENDING', 'BOOKING_STATUS.PENDING defined');
  assert(BOOKING_STATUS.DELIVERED === 'DELIVERED', 'BOOKING_STATUS.DELIVERED defined');

  // Test 2: Database Initialization & Relational Queries
  console.log('\n2. Testing Relational Database Store:');
  const allUsers = db.tables.users.getAll();
  assert(allUsers.length >= 5, `Database initialized with users (Found: ${allUsers.length})`);
  const allDrivers = db.tables.drivers.getAll();
  assert(allDrivers.length >= 2, `Database initialized with drivers (Found: ${allDrivers.length})`);
  const allLocations = db.tables.locations.getAll();
  assert(allLocations.length >= 6, `Database initialized with domestic locations (Found: ${allLocations.length})`);

  const hydrated = db.getHydratedBooking('BK-2026-001');
  assert(hydrated !== null, 'Hydrated booking BK-2026-001 retrieved');
  assert(hydrated.customer?.fullName === 'Ali Khan', 'Hydrated booking customer relation resolved');
  assert(hydrated.pickupLocation?.city === 'Islamabad', 'Hydrated booking pickup location relation resolved');
  assert(hydrated.destinationLocation?.city === 'Karachi', 'Hydrated booking destination relation resolved');
  assert(hydrated.luggageItems?.length > 0, 'Hydrated booking luggage items resolved');
  assert(hydrated.prediction?.predictedCost > 0, 'Hydrated booking ML prediction resolved');

  // Test 3: Authentication & RBAC Service
  console.log('\n3. Testing Authentication & RBAC:');
  const customerUser = authService.login('customer@smartluggage.pk', 'customer123');
  assert(customerUser.role === USER_ROLES.CUSTOMER, 'Customer login successful');
  assert(authService.hasRole(USER_ROLES.CUSTOMER), 'Role check hasRole(CUSTOMER) returns true');
  assert(!authService.hasRole(USER_ROLES.ADMIN), 'Role check hasRole(ADMIN) returns false for customer');

  let authFailed = false;
  try {
    authService.login('customer@smartluggage.pk', 'wrongpassword');
  } catch (e) {
    if (e instanceof AuthenticationError) authFailed = true;
  }
  assert(authFailed, 'Invalid password correctly throws AuthenticationError');

  // Test 4: Location & Distance Calculation Engine
  console.log('\n4. Testing Distance Calculation Engine:');
  const locIsb = locationService.getLocationById('LOC-ISB-01');
  const locLhr = locationService.getLocationById('LOC-LHR-01');
  const routeDist = await distanceService.calculateRouteDistance(locIsb, locLhr);
  assert(routeDist.distanceKm === 380, `Islamabad to Lahore highway distance exact (380 km vs ${routeDist.distanceKm} km)`);
  
  const geodesicDist = distanceService.calculateGeodesicDistance(locIsb.latitude, locIsb.longitude, locLhr.latitude, locLhr.longitude);
  assert(geodesicDist > 200 && geodesicDist < 500, `Haversine road-scaled distance reasonable (${geodesicDist} km)`);

  // Test 5: Luggage Volumetric & Categorization Service
  console.log('\n5. Testing Luggage Service:');
  const volume = luggageService.calculateVolumeLiters(70, 45, 28);
  assert(volume === 88.2, `Volumetric calculation accurate (Expected 88.2L, got ${volume}L)`);
  const sizeCat = luggageService.classifySizeCategory(18.5, volume);
  assert(sizeCat === LUGGAGE_SIZES.LARGE, `Luggage category classified correctly as LARGE (${sizeCat})`);

  // Test 6: Supervised ML Regression Engine
  console.log('\n6. Testing Supervised ML Regression Service:');
  const mlResult = await predictionService.predict({
    customerId: customerUser.id,
    distanceKm: 380,
    totalWeightKg: 15,
    bagCount: 1,
    luggageType: LUGGAGE_TYPES.SUITCASE,
    sizeCategory: LUGGAGE_SIZES.LARGE,
    transportTier: TRANSPORT_TIERS.STANDARD,
    isFragile: false
  });
  assert(mlResult.predictedCost > 0, `ML predicted cost positive: PKR ${mlResult.predictedCost}`);
  assert(mlResult.predictedTimeHours > 0, `ML predicted time positive: ${mlResult.predictedTimeHours} hrs`);
  assert(mlResult.confidenceScore >= 0.90, `ML confidence score verified: ${mlResult.confidenceScore}`);
  assert(mlResult.featureImportance?.distance > 0, 'ML feature importance weights present');

  // Test 7: Booking Service & State Machine Transitions
  console.log('\n7. Testing Booking State Machine & RBAC Transitions:');
  const newBooking = bookingService.createBooking({
    customerId: customerUser.id,
    pickupLocationId: 'LOC-ISB-01',
    destinationLocationId: 'LOC-LHR-01',
    luggageIds: ['LUG-10001'],
    distanceKm: 380,
    predictionId: mlResult.id,
    transportTier: TRANSPORT_TIERS.STANDARD,
    quotedCost: mlResult.predictedCost,
    estimatedDeliveryTimeHours: mlResult.predictedTimeHours
  });
  assert(newBooking.status === BOOKING_STATUS.CONFIRMED, 'New booking created in initial status CONFIRMED');

  const adminUser = authService.login('admin@smartluggage.pk', 'admin123');
  const assigned = bookingService.assignDriver({
    bookingId: newBooking.id,
    driverId: 'DRV-101',
    adminUser
  });
  assert(assigned.status === BOOKING_STATUS.DRIVER_ASSIGNED, 'Admin assigned driver -> DRIVER_ASSIGNED');

  const driverUser = authService.login('driver@smartluggage.pk', 'driver123');
  const pickedUp = bookingService.updateBookingStatus({
    bookingId: newBooking.id,
    newStatus: BOOKING_STATUS.PICKED_UP,
    user: driverUser,
    note: 'Luggage collected'
  });
  assert(pickedUp.status === BOOKING_STATUS.PICKED_UP, 'Driver marked PICKED_UP');

  // Test Illegal Transition blocked by state machine
  let transitionBlocked = false;
  try {
    // Attempt illegal transition: Customer trying to mark picked up as Delivered
    bookingService.updateBookingStatus({
      bookingId: newBooking.id,
      newStatus: BOOKING_STATUS.DELIVERED,
      user: customerUser
    });
  } catch (e) {
    if (e instanceof StateTransitionError) transitionBlocked = true;
  }
  assert(transitionBlocked, 'Illegal state transition by customer successfully blocked by State Machine');

  // Advance valid state to DELIVERED
  bookingService.updateBookingStatus({
    bookingId: newBooking.id,
    newStatus: BOOKING_STATUS.IN_TRANSIT,
    user: driverUser
  });
  const delivered = bookingService.updateBookingStatus({
    bookingId: newBooking.id,
    newStatus: BOOKING_STATUS.DELIVERED,
    user: driverUser
  });
  assert(delivered.status === BOOKING_STATUS.DELIVERED, 'Trip completed and marked DELIVERED');

  // Test 8: Tracking Service
  console.log('\n8. Testing Tracking Timeline:');
  const tracking = trackingService.getTrackingTimeline(newBooking.id);
  assert(tracking.milestones.length === 5, 'Tracking timeline contains 5 primary milestone checkpoints');
  assert(tracking.milestones[4].key === BOOKING_STATUS.DELIVERED, 'Final milestone is DELIVERED');
  assert(tracking.milestones[4].state === 'completed' || tracking.milestones[4].state === 'active', 'Final milestone is completed or active');

  // Test 9: Feedback Service
  console.log('\n9. Testing Feedback Service:');
  const feedback = feedbackService.submitFeedback({
    bookingId: newBooking.id,
    customerId: customerUser.id,
    rating: 5,
    comment: 'Super fast delivery and flawless luggage safety!',
    tags: ['Safe', 'Punctual']
  });
  assert(feedback.rating === 5, 'Feedback created with 5-star rating');

  // Test 10: Admin Metrics & Notifications
  console.log('\n10. Testing Admin Analytics & Notification Dispatcher:');
  const adminTestUser = db.tables.users.find(u => u.role === USER_ROLES.ADMIN);
  const metrics = adminService.getSystemMetrics(adminTestUser);
  assert(metrics.totalBookings >= 4, `Admin total bookings calculated (${metrics.totalBookings})`);
  assert(metrics.totalRevenue > 0, `Admin total revenue aggregated (PKR ${metrics.totalRevenue})`);

  const notif = notificationService.sendNotification({
    userId: customerUser.id,
    title: 'Welcome to SmartLuggage AI',
    message: 'Your account is ready for booking.'
  });
  assert(notif.isRead === false, 'Notification created in unread state');
  const unreadCount = notificationService.getUnreadCount(customerUser.id);
  assert(unreadCount >= 1, `Unread count accurate (${unreadCount})`);

  console.log('\n===============================================================');
  console.log(`TEST RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('===============================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});

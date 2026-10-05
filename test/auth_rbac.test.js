/**
 * SMART ONLINE LUGGAGE TRANSPORTATION USING AI
 * Phase 3 Authentication, RBAC & Data Scoping Verification Suite
 */

import {
  USER_ROLES,
  BOOKING_STATUS,
  authService,
  userService,
  driverService,
  bookingService,
  AuthenticationError,
  AuthorizationError,
  ValidationError,
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

async function runAuthTests() {
  console.log('===============================================================');
  console.log('PHASE 3: RUNNING AUTHENTICATION & RBAC VERIFICATION TESTS');
  console.log('===============================================================\n');

  // Test 1: Self-Registration
  console.log('1. Customer Registration & Sanitization:');
  const uniqueEmail = `test.customer.${Date.now()}@example.pk`;
  const registered = authService.register({
    fullName: 'Zainab Abbas',
    email: uniqueEmail,
    password: 'password123',
    confirmPassword: 'password123',
    phone: '+92 301 7788990',
    city: 'Lahore'
  });
  assert(registered.id !== undefined, 'User registered with unique ID');
  assert(registered.role === USER_ROLES.CUSTOMER, 'Self-registration with default assigns CUSTOMER role');
  assert(registered.passwordHash === undefined, 'passwordHash is SANITIZED and not returned');

  // Driver Registration with role
  const driverEmail = `test.driver.${Date.now()}@example.pk`;
  const driverReg = authService.register({
    fullName: 'Kashif Driver',
    email: driverEmail,
    password: 'password123',
    confirmPassword: 'password123',
    phone: '+92 301 9998877',
    city: 'Rawalpindi',
    role: USER_ROLES.DRIVER
  });
  assert(driverReg.role === USER_ROLES.DRIVER, 'Driver registration assigns DRIVER role');

  // Admin Registration with role
  const adminEmail = `test.admin.${Date.now()}@example.pk`;
  const adminReg = authService.register({
    fullName: 'Sara Admin',
    email: adminEmail,
    password: 'password123',
    confirmPassword: 'password123',
    phone: '+92 301 1122334',
    city: 'Islamabad',
    role: USER_ROLES.ADMIN
  });
  assert(adminReg.role === USER_ROLES.ADMIN, 'Admin registration assigns ADMIN role');

  // Test 2: Password Mismatch on Registration
  let mismatchCaught = false;
  try {
    authService.register({
      fullName: 'Fail User',
      email: 'fail@example.pk',
      password: 'password123',
      confirmPassword: 'differentPassword'
    });
  } catch (e) {
    if (e instanceof ValidationError) mismatchCaught = true;
  }
  assert(mismatchCaught, 'Password confirmation mismatch properly throws ValidationError');

  // Test 3: Login for all 3 roles
  console.log('\n2. Testing Multi-Role Authentication:');
  const custLogin = authService.login('customer@smartluggage.pk', 'customer123');
  assert(custLogin.role === USER_ROLES.CUSTOMER, 'Customer login validated (Ali Khan)');
  assert(custLogin.passwordHash === undefined, 'Customer passwordHash sanitized');

  const drvLogin = authService.login('driver@smartluggage.pk', 'driver123');
  assert(drvLogin.role === USER_ROLES.DRIVER, 'Driver login validated (Bilal Tariq)');

  const admLogin = authService.login('admin@smartluggage.pk', 'admin123');
  assert(admLogin.role === USER_ROLES.ADMIN, 'Admin login validated (System Administrator)');

  // Test 4: Route Guard Permissions
  console.log('\n3. Testing Route Guard Permission Matrix:');
  // Logged in as Admin
  assert(authService.canAccessView('view-admin-dashboard') === true, 'Admin can access view-admin-dashboard');
  assert(authService.canAccessView('view-admin-users') === true, 'Admin can access view-admin-users');

  // Switch session to Customer
  authService.login('customer@smartluggage.pk', 'customer123');
  assert(authService.canAccessView('view-customer-dashboard') === true, 'Customer can access view-customer-dashboard');
  assert(authService.canAccessView('view-create-booking') === true, 'Customer can access view-create-booking');
  assert(authService.canAccessView('view-admin-dashboard') === false, 'Customer CANNOT access view-admin-dashboard (Blocked)');
  assert(authService.canAccessView('view-admin-users') === false, 'Customer CANNOT access view-admin-users (Blocked)');
  assert(authService.canAccessView('view-driver-dashboard') === false, 'Customer CANNOT access view-driver-dashboard (Blocked)');

  // Switch session to Driver
  authService.login('driver@smartluggage.pk', 'driver123');
  assert(authService.canAccessView('view-driver-dashboard') === true, 'Driver can access view-driver-dashboard');
  assert(authService.canAccessView('view-admin-dashboard') === false, 'Driver CANNOT access view-admin-dashboard (Blocked)');
  assert(authService.canAccessView('view-create-booking') === false, 'Driver CANNOT access view-create-booking (Blocked)');

  // Test 5: Strict Data Scoping (Customers cannot access others' bookings)
  console.log('\n4. Testing Data Scoping & Cross-Customer Isolation:');
  const custAli = authService.login('customer@smartluggage.pk', 'customer123');
  const custSarah = authService.login('sarah.ali@smartluggage.pk', 'customer123');

  // Customer Sarah tries to view Customer Ali's bookings
  let sarahBlockedFromAli = false;
  try {
    bookingService.getCustomerBookings('USR-CUST-001', custSarah);
  } catch (e) {
    if (e instanceof AuthorizationError) sarahBlockedFromAli = true;
  }
  assert(sarahBlockedFromAli, 'Customer Sarah blocked from reading Customer Ali\'s bookings');

  // Customer Sarah tries to view single booking BK-2026-001 belonging to Ali
  let sarahBlockedFromAliBooking = false;
  try {
    bookingService.getBookingById('BK-2026-001', custSarah);
  } catch (e) {
    if (e instanceof AuthorizationError) sarahBlockedFromAliBooking = true;
  }
  assert(sarahBlockedFromAliBooking, 'Customer Sarah blocked from accessing single booking BK-2026-001');

  // Customer Ali CAN access their own bookings
  const aliBookings = bookingService.getCustomerBookings('USR-CUST-001', custAli);
  assert(aliBookings.length > 0, `Customer Ali successfully reads own bookings (${aliBookings.length} found)`);

  // Test 6: Driver Data Scoping
  console.log('\n5. Testing Driver Trip Scoping:');
  const driverBilal = authService.login('driver@smartluggage.pk', 'driver123'); // DRV-101
  const driverKamran = authService.login('kamran.shah@smartluggage.pk', 'driver123'); // DRV-102

  // Driver Kamran tries to access Driver Bilal's assigned trip
  let kamranBlocked = false;
  try {
    bookingService.getBookingById('BK-2026-001', driverKamran); // Assigned to DRV-101 (Bilal)
  } catch (e) {
    if (e instanceof AuthorizationError) kamranBlocked = true;
  }
  assert(kamranBlocked, 'Driver Kamran blocked from accessing trip assigned to Driver Bilal');

  // Driver Bilal CAN access their own trip
  const bilalTrip = bookingService.getBookingById('BK-2026-001', driverBilal);
  assert(bilalTrip !== null, 'Driver Bilal successfully accesses own assigned trip');

  // Test 7: Admin Privileges & Scoping Override
  console.log('\n6. Testing Admin System-Wide Access:');
  const adminUser = authService.login('admin@smartluggage.pk', 'admin123');
  const allUsers = userService.getAllUsers(adminUser);
  assert(allUsers.length >= 5, `Admin reads full user directory (${allUsers.length} users)`);
  assert(allUsers[0].passwordHash === undefined, 'Admin user directory results are sanitized');

  const allBookings = bookingService.getAllBookings(adminUser);
  assert(allBookings.length >= 4, `Admin reads all bookings across all customers (${allBookings.length} bookings)`);

  // Customer blocked from user directory
  let custBlockedFromUsers = false;
  try {
    userService.getAllUsers(custAli);
  } catch (e) {
    if (e instanceof AuthorizationError) custBlockedFromUsers = true;
  }
  assert(custBlockedFromUsers, 'Customer blocked from reading user directory');

  // Test 8: Password Change
  console.log('\n7. Testing Secure Password Change:');
  authService.login(uniqueEmail, 'password123');
  const userToChange = authService.getCurrentUser();
  const pwdChanged = authService.changePassword(userToChange.id, 'password123', 'newSecret456');
  assert(pwdChanged === true, 'Password changed successfully');

  // Verify login with new password
  const newLogin = authService.login(uniqueEmail, 'newSecret456');
  assert(newLogin.id === userToChange.id, 'Login with new password succeeded');

  console.log('\n===============================================================');
  console.log(`PHASE 3 AUTH & RBAC RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('===============================================================\n');

  if (failed > 0) process.exit(1);
}

runAuthTests().catch(e => {
  console.error('Fatal auth test error:', e);
  process.exit(1);
});

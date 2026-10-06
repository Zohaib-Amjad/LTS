/**
 * SMART ONLINE LUGGAGE TRANSPORTATION USING AI
 * Authentication & Role-Based Session Service (Phase 3 Enterprise Security)
 */

import { STORAGE_KEYS, USER_ROLES, DRIVER_AVAILABILITY } from '../constants/enums.js';
import { db } from '../core/database.js';
import { AuthenticationError, AuthorizationError, ValidationError } from '../core/errorHandler.js';

// Route Permission Matrix: Maps route IDs to allowed roles
export const ROUTE_PERMISSIONS = Object.freeze({
  'view-customer-dashboard': [USER_ROLES.CUSTOMER],
  'view-create-booking': [USER_ROLES.CUSTOMER],
  'view-my-bookings': [USER_ROLES.CUSTOMER],
  'view-booking-tracking': [USER_ROLES.CUSTOMER, USER_ROLES.DRIVER, USER_ROLES.ADMIN],
  'view-my-luggage': [USER_ROLES.CUSTOMER],
  'view-feedback': [USER_ROLES.CUSTOMER],
  'view-customer-profile': [USER_ROLES.CUSTOMER, USER_ROLES.DRIVER, USER_ROLES.ADMIN],
  
  'view-driver-dashboard': [USER_ROLES.DRIVER],
  'view-driver-bookings': [USER_ROLES.DRIVER],
  'view-driver-profile': [USER_ROLES.DRIVER],

  'view-admin-dashboard': [USER_ROLES.ADMIN],
  'view-admin-users': [USER_ROLES.ADMIN],
  'view-admin-drivers': [USER_ROLES.ADMIN],
  'view-admin-bookings': [USER_ROLES.ADMIN],
  'view-admin-predictions': [USER_ROLES.ADMIN],
  'view-admin-feedback': [USER_ROLES.ADMIN],
  'view-admin-reports': [USER_ROLES.ADMIN],
  'view-admin-settings': [USER_ROLES.ADMIN]
});

class AuthService {
  constructor() {
    this.currentSessionUser = null;
    this.sessionToken = null;
    this.loadSession();
  }

  /**
   * Secure Hash Simulation with Salt
   * @param {string} password 
   * @returns {string} Salted Hash
   */
  hashPassword(password) {
    if (!password) return '';
    let hash = 0;
    const salted = `sl_salt_2026_${password}_secure`;
    for (let i = 0; i < salted.length; i++) {
      const char = salted.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return `sha256_sim_${Math.abs(hash).toString(16)}`;
  }

  /**
   * Verify password against stored hash or plaintext fallback
   */
  verifyPassword(plainPassword, storedHash) {
    if (!plainPassword || !storedHash) return false;
    // Check hashed match or legacy demo plain hash
    return this.hashPassword(plainPassword) === storedHash || storedHash === plainPassword;
  }

  /**
   * Strip sensitive fields from user object before returning to client/views
   * @param {Object} user 
   * @returns {Object} Sanitized User
   */
  sanitizeUser(user) {
    if (!user) return null;
    const sanitized = { ...user };
    delete sanitized.passwordHash;
    return sanitized;
  }

  loadSession() {
    try {
      if (typeof sessionStorage !== 'undefined') {
        const raw = sessionStorage.getItem(STORAGE_KEYS.ACTIVE_SESSION);
        if (raw) {
          const session = JSON.parse(raw);
          const user = db.tables.users.findById(session.userId);
          if (user && user.isActive) {
            this.currentSessionUser = this.sanitizeUser(user);
            this.sessionToken = session.token;
          } else {
            this.clearSession();
          }
        }
      }
    } catch (e) {
      this.clearSession();
    }
  }

  saveSession(user) {
    this.currentSessionUser = this.sanitizeUser(user);
    this.sessionToken = `jwt-sim-${user.id}-${Date.now()}`;

    // Store in tab-specific sessionStorage so different browser tabs can operate concurrently with different roles/accounts
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(
        STORAGE_KEYS.ACTIVE_SESSION,
        JSON.stringify({
          userId: user.id,
          role: user.role,
          email: user.email,
          token: this.sessionToken,
          expiresAt: Date.now() + 24 * 60 * 60 * 1000 // 24hr expiry
        })
      );
    }
  }

  clearSession() {
    this.currentSessionUser = null;
    this.sessionToken = null;
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(STORAGE_KEYS.ACTIVE_SESSION);
    }
  }

  getCurrentUser() {
    return this.currentSessionUser;
  }

  isAuthenticated() {
    return !!this.currentSessionUser;
  }

  hasRole(...roles) {
    if (!this.currentSessionUser) return false;
    return roles.includes(this.currentSessionUser.role);
  }

  requireRole(...roles) {
    if (!this.isAuthenticated()) {
      throw new AuthenticationError('Please log in to continue.');
    }
    if (!this.hasRole(...roles)) {
      throw new AuthorizationError(`Access denied: Requires one of [${roles.join(', ')}], current role is "${this.currentSessionUser.role}".`);
    }
    return this.currentSessionUser;
  }

  /**
   * Verify whether current authenticated user has permission to navigate to a target view
   * @param {string} viewId 
   * @returns {boolean}
   */
  canAccessView(viewId) {
    if (!this.isAuthenticated()) return false;
    const allowedRoles = ROUTE_PERMISSIONS[viewId];
    if (!allowedRoles) return true; // Unrestricted public view
    return allowedRoles.includes(this.currentSessionUser.role);
  }

  /**
   * Enforce route guard on target view
   * @param {string} viewId 
   * @throws {AuthenticationError|AuthorizationError}
   */
  guardRoute(viewId) {
    if (!this.isAuthenticated()) {
      throw new AuthenticationError('Session expired or login required.');
    }
    const allowedRoles = ROUTE_PERMISSIONS[viewId];
    if (allowedRoles && !allowedRoles.includes(this.currentSessionUser.role)) {
      throw new AuthorizationError(`Role "${this.currentSessionUser.role}" is not authorized to access "${viewId}".`);
    }
    return true;
  }

  login(email, password, expectedRole = null) {
    if (!email || !password) {
      throw new ValidationError('Email and password are required.');
    }

    const trimmedEmail = email.trim().toLowerCase();
    const user = db.tables.users.find(u => u.email.toLowerCase() === trimmedEmail);

    if (!user) {
      throw new AuthenticationError('Invalid email or password.');
    }

    if (!this.verifyPassword(password, user.passwordHash)) {
      throw new AuthenticationError('Invalid email or password.');
    }

    if (!user.isActive) {
      throw new AuthenticationError('This account is deactivated. Please contact the administrator.');
    }

    // Role mismatch check if a specific role was selected on login
    if (expectedRole && user.role !== expectedRole && user.role !== USER_ROLES.ADMIN) {
      throw new AuthorizationError(`Account mismatch: This email is registered as "${user.role}", not "${expectedRole}". Please select the correct role.`);
    }

    this.saveSession(user);
    return this.getCurrentUser();
  }

  register({ fullName, email, password, confirmPassword, phone, city = 'Islamabad', role = USER_ROLES.CUSTOMER }) {
    if (!fullName || !fullName.trim()) {
      throw new ValidationError('Full name is required.');
    }
    if (!email || !email.trim()) {
      throw new ValidationError('Email address is required.');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      throw new ValidationError('Please provide a valid email address.');
    }

    if (!password || password.length < 6) {
      throw new ValidationError('Password must be at least 6 characters long.');
    }

    if (confirmPassword && password !== confirmPassword) {
      throw new ValidationError('Passwords do not match.');
    }

    const trimmedEmail = email.trim().toLowerCase();
    const existing = db.tables.users.find(u => u.email.toLowerCase() === trimmedEmail);
    if (existing) {
      throw new ValidationError('An account with this email address already exists.');
    }

    const initials = fullName
      .trim()
      .split(' ')
      .map(n => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();

    const hashedPassword = this.hashPassword(password);
    const assignedRole = (role === USER_ROLES.DRIVER || role === USER_ROLES.ADMIN) ? role : USER_ROLES.CUSTOMER;

    const newUser = db.tables.users.insert({
      email: trimmedEmail,
      fullName: fullName.trim(),
      phone: phone ? phone.trim() : '+92 300 0000000',
      role: assignedRole,
      passwordHash: hashedPassword,
      city: city || 'Islamabad',
      country: 'Pakistan',
      avatarInitials: initials || 'SL',
      isActive: true
    });

    if (assignedRole === USER_ROLES.DRIVER) {
      db.tables.drivers.insert({
        userId: newUser.id,
        licenseNumber: `PK-LIC-${Math.floor(100000 + Math.random() * 900000)}`,
        vehicleType: 'Van',
        vehiclePlate: `ICT-${Math.floor(100 + Math.random() * 900)}`,
        vehicleCapacityKg: 800,
        vehicleCapacityLiters: 2500,
        currentCity: city || 'Islamabad',
        isAvailable: true,
        availabilityStatus: DRIVER_AVAILABILITY.AVAILABLE,
        rating: 5.0,
        totalTrips: 0
      });
    }

    db.persist();
    return this.sanitizeUser(newUser);
  }

  changePassword(userId, oldPassword, newPassword) {
    if (!this.isAuthenticated()) throw new AuthenticationError();
    if (this.currentSessionUser.id !== userId && this.currentSessionUser.role !== USER_ROLES.ADMIN) {
      throw new AuthorizationError('You can only change your own password.');
    }

    const user = db.tables.users.findById(userId);
    if (!user) throw new ValidationError('User not found.');

    if (this.currentSessionUser.role !== USER_ROLES.ADMIN) {
      if (!this.verifyPassword(oldPassword, user.passwordHash)) {
        throw new ValidationError('Current password entered is incorrect.');
      }
    }

    if (!newPassword || newPassword.length < 6) {
      throw new ValidationError('New password must be at least 6 characters.');
    }

    db.tables.users.update(userId, {
      passwordHash: this.hashPassword(newPassword)
    });
    db.persist();
    return true;
  }

  logout() {
    this.clearSession();
  }
}

export const authService = new AuthService();

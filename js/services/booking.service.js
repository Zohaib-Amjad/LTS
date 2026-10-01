/**
 * SMART ONLINE LUGGAGE TRANSPORTATION USING AI
 * Booking Domain Service with Strict Data Scoping, LUG-2026-XXXXXX References, and Initial CONFIRMED Status
 */

import { BOOKING_STATUS, ALLOWED_STATUS_TRANSITIONS, USER_ROLES } from '../constants/enums.js';
import { db } from '../core/database.js';
import { ValidationError, StateTransitionError, NotFoundError, AuthorizationError } from '../core/errorHandler.js';
import { authService } from './auth.service.js';
import { notificationService } from './notification.service.js';

class BookingService {
  /**
   * Generate unique human-readable booking reference formatted as LUG-2026-XXXXXX
   * @returns {string} Unique Booking Reference
   */
  generateBookingReference() {
    const year = new Date().getFullYear();
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let token = '';
    for (let i = 0; i < 6; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const candidate = `LUG-${year}-${token}`;

    // Verify absolute uniqueness
    const exists = db.tables.bookings.find(b => b.bookingNumber === candidate);
    if (exists) return this.generateBookingReference();
    return candidate;
  }

  /**
   * Validate whether a state transition is legal for the current actor role
   */
  validateStateTransition(currentStatus, targetStatus, role) {
    const allowed = ALLOWED_STATUS_TRANSITIONS[currentStatus]?.[role] || [];
    if (!allowed.includes(targetStatus)) {
      throw new StateTransitionError(currentStatus, targetStatus, role);
    }
    return true;
  }

  /**
   * Create a new confirmed booking
   */
  createBooking({
    customerId,
    pickupLocationId,
    destinationLocationId,
    luggageIds = [],
    distanceKm,
    predictionId,
    transportTier,
    quotedCost,
    currency = 'PKR',
    estimatedDeliveryTimeHours,
    scheduledPickupTime,
    customerNotes = ''
  }, requestingUser = null) {
    const requester = requestingUser || authService.getCurrentUser();
    if (requester && requester.role === USER_ROLES.CUSTOMER && requester.id !== customerId) {
      throw new AuthorizationError('You cannot create bookings on behalf of another customer.');
    }

    if (!customerId || !pickupLocationId || !destinationLocationId || !predictionId) {
      throw new ValidationError('Customer, locations, and AI prediction estimate are required to create a booking.');
    }

    const dist = Number(distanceKm);
    if (isNaN(dist) || dist <= 0) {
      throw new ValidationError('Valid positive route distance is required.');
    }

    const cost = Number(quotedCost);
    if (isNaN(cost) || cost <= 0) {
      throw new ValidationError('Valid positive AI quoted fare is required.');
    }

    const bookingNumber = this.generateBookingReference();
    const initialStatus = BOOKING_STATUS.CONFIRMED;

    const newBooking = db.tables.bookings.insert({
      bookingNumber,
      customerId,
      pickupLocationId,
      destinationLocationId,
      luggageIds,
      distanceKm: dist,
      predictionId,
      assignedDriverId: null,
      status: initialStatus,
      transportTier: transportTier || 'Standard (Ground Transport)',
      quotedCost: cost,
      currency: currency || 'PKR',
      estimatedDeliveryTimeHours: Number(estimatedDeliveryTimeHours) || 12.0,
      scheduledPickupTime: scheduledPickupTime || new Date().toISOString(),
      actualPickupTime: null,
      actualDeliveryTime: null,
      customerNotes: customerNotes ? customerNotes.trim() : ''
    });

    // Connect luggage items to this booking
    luggageIds.forEach(lugId => {
      try {
        db.tables.luggage.update(lugId, { bookingId: newBooking.id });
      } catch (e) {
        // Continue if luggage item not found
      }
    });

    // Record initial status history entry
    db.tables.statusHistory.insert({
      bookingId: newBooking.id,
      fromStatus: null,
      toStatus: initialStatus,
      changedByUserId: customerId,
      changedByRole: USER_ROLES.CUSTOMER,
      note: 'Luggage transportation booking confirmed by customer. Ready for fleet driver assignment.',
      timestamp: new Date().toISOString()
    });

    db.persist();
    const hydrated = db.getHydratedBooking(newBooking.id);
    notificationService.notifyBookingConfirmed(hydrated);
    return hydrated;
  }

  /**
   * Transition a booking to a new status with role-based checks, ownership verification, and audit log
   */
  updateBookingStatus({ bookingId, newStatus, user = null, requestingUser = null, note = '', locationStamp = '' }) {
    const actor = user || requestingUser || authService.getCurrentUser();
    if (!actor) throw new AuthorizationError('Authentication required.');

    const booking = db.tables.bookings.findById(bookingId);
    if (!booking) {
      throw new NotFoundError(`Booking with ID ${bookingId}`);
    }

    // Role-based authorization & data scoping check
    if (actor.role === USER_ROLES.CUSTOMER) {
      if (booking.customerId !== actor.id) {
        throw new AuthorizationError('You are not authorized to modify another customer\'s booking.');
      }
    } else if (actor.role === USER_ROLES.DRIVER) {
      const driver = db.tables.drivers.find(d => d.userId === actor.id);
      if (!driver || booking.assignedDriverId !== driver.id) {
        throw new AuthorizationError('You can only update bookings assigned to your driver vehicle.');
      }
    }

    this.validateStateTransition(booking.status, newStatus, actor.role);

    const updatePayload = { status: newStatus };
    const now = new Date().toISOString();

    if (newStatus === BOOKING_STATUS.PICKED_UP) {
      updatePayload.actualPickupTime = now;
    } else if (newStatus === BOOKING_STATUS.DELIVERED) {
      updatePayload.actualDeliveryTime = now;
      if (booking.assignedDriverId) {
        const drv = db.tables.drivers.findById(booking.assignedDriverId);
        if (drv) {
          db.tables.drivers.update(booking.assignedDriverId, {
            isAvailable: true,
            availabilityStatus: 'AVAILABLE',
            totalTrips: (drv.totalTrips || 0) + 1
          });
        }
      }
    }

    const updated = db.tables.bookings.update(bookingId, updatePayload);

    // Audit trail log
    db.tables.statusHistory.insert({
      bookingId,
      fromStatus: booking.status,
      toStatus: newStatus,
      changedByUserId: actor.id,
      changedByRole: actor.role,
      note: note || `Status updated to ${newStatus.replace('_', ' ')} by ${actor.fullName}`,
      locationStamp: locationStamp || actor.city || '',
      timestamp: now
    });

    db.persist();
    const hydrated = db.getHydratedBooking(bookingId);

    // Phase 11: Dispatch real-time lifecycle notifications
    if (newStatus === BOOKING_STATUS.PICKED_UP) {
      notificationService.notifyPickedUp(hydrated);
    } else if (newStatus === BOOKING_STATUS.IN_TRANSIT) {
      notificationService.notifyInTransit(hydrated);
    } else if (newStatus === BOOKING_STATUS.DELIVERED) {
      notificationService.notifyDelivered(hydrated);
      notificationService.notifyFeedbackReminder(hydrated);
    } else if (newStatus === BOOKING_STATUS.CANCELLED) {
      notificationService.notifyCancelled(hydrated, note);
    }

    return hydrated;
  }

  /**
   * Assign a driver to a confirmed booking (Admin / Dispatcher action only)
   */
  assignDriver({ bookingId, driverId, adminUser = null }) {
    const actor = adminUser || authService.getCurrentUser();
    if (!actor || actor.role !== USER_ROLES.ADMIN) {
      throw new AuthorizationError('Only system administrators can dispatch drivers.');
    }

    const booking = db.tables.bookings.findById(bookingId);
    if (!booking) throw new NotFoundError(`Booking with ID ${bookingId}`);

    const driver = db.tables.drivers.findById(driverId);
    if (!driver) throw new NotFoundError(`Driver with ID ${driverId}`);

    // Phase 7 Validation Checks:
    // 1. Check if driver account is active
    const driverUser = db.tables.users.findById(driver.userId);
    if (driverUser && !driverUser.isActive) {
      throw new ValidationError('Cannot assign an inactive driver account. Activate driver first.');
    }

    // 2. Check if driver is available
    const isAvail = driver.isAvailable && driver.availabilityStatus !== 'OFFLINE' && driver.availabilityStatus !== 'BUSY';
    if (!isAvail) {
      throw new ValidationError(`Driver ${driver.vehiclePlate} is currently ${driver.availabilityStatus || 'unavailable'} and cannot accept new assignments.`);
    }

    // 3. Prevent duplicate assignment
    if (booking.assignedDriverId === driverId) {
      throw new ValidationError('This driver is already assigned to this booking.');
    }

    // 4. Validate State Transition
    this.validateStateTransition(booking.status, BOOKING_STATUS.DRIVER_ASSIGNED, actor.role);

    // Update booking
    const updated = db.tables.bookings.update(bookingId, {
      assignedDriverId: driverId,
      status: BOOKING_STATUS.DRIVER_ASSIGNED
    });

    // Update driver status to BUSY
    db.tables.drivers.update(driverId, {
      isAvailable: false,
      availabilityStatus: 'BUSY'
    });

    // Record audit status history
    db.tables.statusHistory.insert({
      bookingId,
      fromStatus: booking.status,
      toStatus: BOOKING_STATUS.DRIVER_ASSIGNED,
      changedByUserId: actor.id,
      changedByRole: actor.role,
      note: `Driver ${driverUser?.fullName || 'Courier'} (${driver.vehicleType} - ${driver.vehiclePlate}) assigned by Admin dispatch.`,
      timestamp: new Date().toISOString()
    });

    db.persist();
    const hydrated = db.getHydratedBooking(bookingId);

    // Phase 11: Dispatch notification to customer & assigned driver
    notificationService.notifyDriverAssigned(hydrated, { ...driver, user: driverUser });

    return hydrated;
  }

  getBookingById(id, requestingUser = null) {
    const requester = requestingUser || authService.getCurrentUser();
    const hydrated = db.getHydratedBooking(id);
    if (!hydrated) {
      throw new NotFoundError(`Booking with ID ${id}`);
    }

    if (requester) {
      if (requester.role === USER_ROLES.CUSTOMER && hydrated.customerId !== requester.id) {
        throw new AuthorizationError('Access denied: You cannot view other customers\' bookings.');
      }
      if (requester.role === USER_ROLES.DRIVER) {
        const driver = db.tables.drivers.find(d => d.userId === requester.id);
        if (!driver || hydrated.assignedDriverId !== driver.id) {
          throw new AuthorizationError('Access denied: You cannot view trips not assigned to you.');
        }
      }
    }

    return hydrated;
  }

  getAllBookings(requestingUser = null) {
    const requester = requestingUser || authService.getCurrentUser();
    if (requester && requester.role !== USER_ROLES.ADMIN) {
      throw new AuthorizationError('Admin privileges required to view all system bookings.');
    }
    return db.getAllHydratedBookings();
  }

  getCustomerBookings(customerId, requestingUser = null) {
    const requester = requestingUser || authService.getCurrentUser();
    if (requester && requester.role !== USER_ROLES.ADMIN && requester.id !== customerId) {
      throw new AuthorizationError('You can only access your own customer bookings.');
    }
    return db.getAllHydratedBookings(b => b.customerId === customerId);
  }

  getDriverBookings(driverId, requestingUser = null) {
    const requester = requestingUser || authService.getCurrentUser();
    if (requester && requester.role !== USER_ROLES.ADMIN) {
      const driver = db.tables.drivers.find(d => d.userId === requester.id);
      if (!driver || driver.id !== driverId) {
        throw new AuthorizationError('You can only access trips assigned to your driver vehicle.');
      }
    }
    return db.getAllHydratedBookings(b => b.assignedDriverId === driverId);
  }
}

export const bookingService = new BookingService();

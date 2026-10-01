/**
 * SMART ONLINE LUGGAGE TRANSPORTATION USING AI
 * Driver Fleet Management Service (Phase 7 Driver Lifecycle & Assignments)
 */

import { USER_ROLES, DRIVER_AVAILABILITY } from '../constants/enums.js';
import { db } from '../core/database.js';
import { NotFoundError, AuthorizationError, ValidationError } from '../core/errorHandler.js';
import { authService } from './auth.service.js';

class DriverService {
  /**
   * Get all registered drivers with hydrated sanitized user accounts
   */
  getAllDrivers(requestingUser = null) {
    const requester = requestingUser || authService.getCurrentUser();
    if (requester && requester.role !== USER_ROLES.ADMIN) {
      throw new AuthorizationError('Admin privileges required to view full driver fleet.');
    }

    return db.tables.drivers.getAll().map(driver => {
      const user = db.tables.users.findById(driver.userId);
      const assignedBookings = db.tables.bookings.filter(b => b.assignedDriverId === driver.id);
      const activeBookings = assignedBookings.filter(b => b.status !== 'DELIVERED' && b.status !== 'CANCELLED');

      return {
        ...driver,
        availabilityStatus: driver.availabilityStatus || (driver.isAvailable ? DRIVER_AVAILABILITY.AVAILABLE : DRIVER_AVAILABILITY.BUSY),
        user: authService.sanitizeUser(user),
        totalTrips: driver.totalTrips || assignedBookings.filter(b => b.status === 'DELIVERED').length,
        activeTripsCount: activeBookings.length
      };
    });
  }

  /**
   * Get only eligible, active and available drivers ready for dispatch
   */
  getAvailableDrivers() {
    return db.tables.drivers.getAll()
      .map(driver => {
        const user = db.tables.users.findById(driver.userId);
        return {
          ...driver,
          availabilityStatus: driver.availabilityStatus || (driver.isAvailable ? DRIVER_AVAILABILITY.AVAILABLE : DRIVER_AVAILABILITY.BUSY),
          user: authService.sanitizeUser(user)
        };
      })
      .filter(d => d.user && d.user.isActive && d.isAvailable && d.availabilityStatus === DRIVER_AVAILABILITY.AVAILABLE);
  }

  getDriverById(id) {
    const driver = db.tables.drivers.findById(id);
    if (!driver) throw new NotFoundError(`Driver with ID ${id}`);
    const user = db.tables.users.findById(driver.userId);
    const assignedBookings = db.tables.bookings.filter(b => b.assignedDriverId === driver.id);
    return {
      ...driver,
      availabilityStatus: driver.availabilityStatus || (driver.isAvailable ? DRIVER_AVAILABILITY.AVAILABLE : DRIVER_AVAILABILITY.BUSY),
      user: authService.sanitizeUser(user),
      activeTripsCount: assignedBookings.filter(b => b.status !== 'DELIVERED' && b.status !== 'CANCELLED').length
    };
  }

  getDriverByUserId(userId) {
    const driver = db.tables.drivers.find(d => d.userId === userId);
    if (!driver) return null;
    const user = db.tables.users.findById(driver.userId);
    return {
      ...driver,
      availabilityStatus: driver.availabilityStatus || (driver.isAvailable ? DRIVER_AVAILABILITY.AVAILABLE : DRIVER_AVAILABILITY.BUSY),
      user: authService.sanitizeUser(user)
    };
  }

  /**
   * Register a new courier driver into the fleet (Admin only)
   */
  createDriver({
    fullName,
    email,
    phone,
    city = 'Islamabad',
    vehicleType = 'Toyota HiAce Cargo Van',
    vehiclePlate,
    licenseNumber,
    currentCity = null,
    password = 'driver123'
  }, requestingUser = null) {
    const requester = requestingUser || authService.getCurrentUser();
    if (requester && requester.role !== USER_ROLES.ADMIN) {
      throw new AuthorizationError('Only system administrators can register new fleet drivers.');
    }

    if (!fullName || !fullName.trim()) {
      throw new ValidationError('Driver full name is required.');
    }
    if (!email || !email.includes('@')) {
      throw new ValidationError('A valid driver email address is required.');
    }
    if (!vehiclePlate || !vehiclePlate.trim()) {
      throw new ValidationError('Vehicle registration plate number is required.');
    }

    // Check duplicate email
    const existingUser = db.tables.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existingUser) {
      throw new ValidationError(`A user with email ${email} already exists.`);
    }

    // Check duplicate vehicle plate
    const existingPlate = db.tables.drivers.find(d => d.vehiclePlate.toLowerCase() === vehiclePlate.trim().toLowerCase());
    if (existingPlate) {
      throw new ValidationError(`A vehicle with plate ${vehiclePlate} is already registered in the fleet.`);
    }

    const initials = fullName
      .split(' ')
      .map(n => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();

    // 1. Create User account with role DRIVER
    const newUser = db.tables.users.insert({
      email: email.trim().toLowerCase(),
      passwordHash: authService.hashPassword(password),
      fullName: fullName.trim(),
      role: USER_ROLES.DRIVER,
      phone: phone ? phone.trim() : '+92 300 0000000',
      city: city || 'Islamabad',
      avatarInitials: initials || 'DR',
      isActive: true
    });

    // 2. Create Driver Profile
    const driverId = `DRV-${Date.now().toString().slice(-4)}`;
    const newDriver = db.tables.drivers.insert({
      id: driverId,
      userId: newUser.id,
      licenseNumber: licenseNumber ? licenseNumber.trim() : `PK-DL-${Date.now().toString().slice(-5)}`,
      vehicleType: vehicleType.trim(),
      vehiclePlate: vehiclePlate.trim().toUpperCase(),
      currentCity: currentCity || city || 'Islamabad',
      isAvailable: true,
      availabilityStatus: DRIVER_AVAILABILITY.AVAILABLE,
      rating: 5.0,
      totalTrips: 0
    });

    db.persist();
    return this.getDriverById(newDriver.id);
  }

  /**
   * Update existing driver profile & contact information (Admin only)
   */
  updateDriver(driverId, {
    fullName,
    phone,
    vehicleType,
    vehiclePlate,
    licenseNumber,
    currentCity,
    availabilityStatus
  }, requestingUser = null) {
    const requester = requestingUser || authService.getCurrentUser();
    if (requester && requester.role !== USER_ROLES.ADMIN) {
      throw new AuthorizationError('Admin privileges required to update driver profile.');
    }

    const driver = db.tables.drivers.findById(driverId);
    if (!driver) throw new NotFoundError(`Driver with ID ${driverId}`);

    const driverUpdate = {};
    if (vehicleType) driverUpdate.vehicleType = vehicleType.trim();
    if (vehiclePlate) driverUpdate.vehiclePlate = vehiclePlate.trim().toUpperCase();
    if (licenseNumber) driverUpdate.licenseNumber = licenseNumber.trim();
    if (currentCity) driverUpdate.currentCity = currentCity.trim();
    if (availabilityStatus) {
      driverUpdate.availabilityStatus = availabilityStatus;
      driverUpdate.isAvailable = availabilityStatus === DRIVER_AVAILABILITY.AVAILABLE;
    }

    if (Object.keys(driverUpdate).length > 0) {
      db.tables.drivers.update(driverId, driverUpdate);
    }

    // Update underlying User record if fullName or phone provided
    if (fullName || phone) {
      const userUpdate = {};
      if (fullName) userUpdate.fullName = fullName.trim();
      if (phone) userUpdate.phone = phone.trim();
      db.tables.users.update(driver.userId, userUpdate);
    }

    db.persist();
    return this.getDriverById(driverId);
  }

  /**
   * Activate or Deactivate driver account status (Admin only)
   */
  toggleDriverAccountStatus(driverId, requestingUser = null) {
    const requester = requestingUser || authService.getCurrentUser();
    if (requester && requester.role !== USER_ROLES.ADMIN) {
      throw new AuthorizationError('Admin privileges required to change driver account status.');
    }

    const driver = db.tables.drivers.findById(driverId);
    if (!driver) throw new NotFoundError(`Driver with ID ${driverId}`);

    const user = db.tables.users.findById(driver.userId);
    if (!user) throw new NotFoundError(`User account for driver ${driverId}`);

    const newActiveState = !user.isActive;
    db.tables.users.update(user.id, { isActive: newActiveState });

    // If deactivated, force driver availability to OFFLINE
    if (!newActiveState) {
      db.tables.drivers.update(driverId, {
        isAvailable: false,
        availabilityStatus: DRIVER_AVAILABILITY.OFFLINE
      });
    }

    db.persist();
    return this.getDriverById(driverId);
  }

  /**
   * Set driver availability status (AVAILABLE, BUSY, OFFLINE)
   */
  setAvailabilityStatus(driverId, status, requestingUser = null) {
    const requester = requestingUser || authService.getCurrentUser();
    const driver = db.tables.drivers.findById(driverId);
    if (!driver) throw new NotFoundError(`Driver with ID ${driverId}`);

    if (requester && requester.role !== USER_ROLES.ADMIN && requester.id !== driver.userId) {
      throw new AuthorizationError('You can only update your own driver availability status.');
    }

    const validStatuses = Object.values(DRIVER_AVAILABILITY);
    if (!validStatuses.includes(status)) {
      throw new ValidationError(`Invalid availability status. Must be one of: ${validStatuses.join(', ')}`);
    }

    const user = db.tables.users.findById(driver.userId);
    if (user && !user.isActive && status === DRIVER_AVAILABILITY.AVAILABLE) {
      throw new ValidationError('Inactive driver accounts cannot be set to AVAILABLE.');
    }

    const isAvailable = status === DRIVER_AVAILABILITY.AVAILABLE;
    db.tables.drivers.update(driverId, {
      availabilityStatus: status,
      isAvailable
    });

    db.persist();
    return this.getDriverById(driverId);
  }

  /**
   * Legacy method support for boolean availability update
   */
  updateAvailability(driverId, isAvailable, requestingUser = null) {
    const status = isAvailable ? DRIVER_AVAILABILITY.AVAILABLE : DRIVER_AVAILABILITY.BUSY;
    return this.setAvailabilityStatus(driverId, status, requestingUser);
  }

  /**
   * Get all active and completed bookings assigned to this driver
   */
  getDriverAssignedBookings(driverId, requestingUser = null) {
    const requester = requestingUser || authService.getCurrentUser();
    const driver = db.tables.drivers.findById(driverId);
    if (!driver) throw new NotFoundError(`Driver with ID ${driverId}`);

    if (requester && requester.role !== USER_ROLES.ADMIN && requester.id !== driver.userId) {
      throw new AuthorizationError('You can only access your own assigned trips.');
    }

    return db.getAllHydratedBookings(b => b.assignedDriverId === driverId);
  }

  /**
   * Multifaceted search & filtering for admin driver management
   */
  searchAndFilterDrivers({
    query = '',
    availability = 'ALL',
    accountStatus = 'ALL',
    city = 'ALL'
  } = {}, requestingUser = null) {
    const all = this.getAllDrivers(requestingUser);

    return all.filter(d => {
      // 1. Text Search Filter
      if (query && query.trim()) {
        const q = query.trim().toLowerCase();
        const nameMatch = d.user?.fullName?.toLowerCase().includes(q);
        const emailMatch = d.user?.email?.toLowerCase().includes(q);
        const phoneMatch = d.user?.phone?.toLowerCase().includes(q);
        const plateMatch = d.vehiclePlate?.toLowerCase().includes(q);
        const vehicleMatch = d.vehicleType?.toLowerCase().includes(q);
        const cityMatch = d.currentCity?.toLowerCase().includes(q);
        const idMatch = d.id?.toLowerCase().includes(q);

        if (!nameMatch && !emailMatch && !phoneMatch && !plateMatch && !vehicleMatch && !cityMatch && !idMatch) {
          return false;
        }
      }

      // 2. Availability Filter
      if (availability !== 'ALL') {
        if (d.availabilityStatus !== availability) return false;
      }

      // 3. Account Status Filter
      if (accountStatus !== 'ALL') {
        if (accountStatus === 'ACTIVE' && !d.user?.isActive) return false;
        if (accountStatus === 'INACTIVE' && d.user?.isActive) return false;
      }

      // 4. City Filter
      if (city !== 'ALL') {
        if (d.currentCity?.toLowerCase() !== city.toLowerCase()) return false;
      }

      return true;
    });
  }
}

export const driverService = new DriverService();

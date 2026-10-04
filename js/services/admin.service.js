/**
 * SMART ONLINE LUGGAGE TRANSPORTATION USING AI
 * System Administration, Fleet Analytics, Reports & ML Model Metrics Service (Phase 10 Admin Dashboard)
 */

import { BOOKING_STATUS, USER_ROLES, DRIVER_AVAILABILITY } from '../constants/enums.js';
import { db } from '../core/database.js';
import { AuthorizationError, NotFoundError, ValidationError } from '../core/errorHandler.js';
import { authService } from './auth.service.js';

class AdminService {
  /**
   * System-wide comprehensive metrics and status distribution for Admin Dashboard
   * @param {Object} requestingUser 
   */
  getSystemMetrics(requestingUser = null) {
    const requester = requestingUser || authService.getCurrentUser();
    if (requester && requester.role !== USER_ROLES.ADMIN) {
      throw new AuthorizationError('Admin privileges required to access system metrics.');
    }

    const allBookings = db.tables.bookings.getAll();
    const allUsers = db.tables.users.getAll();
    const allDrivers = db.tables.drivers.getAll();
    const allPredictions = db.tables.predictions.getAll();
    const allFeedback = db.tables.feedback.getAll();

    // Registered accounts metrics by role
    const totalUsers = allUsers.length;
    const totalCustomers = allUsers.filter(u => u.role === USER_ROLES.CUSTOMER).length;
    const totalDrivers = allUsers.filter(u => u.role === USER_ROLES.DRIVER).length;
    const totalAdmins = allUsers.filter(u => u.role === USER_ROLES.ADMIN).length;
    const activeDrivers = allDrivers.filter(d => {
      const u = db.tables.users.findById(d.userId);
      return u?.isActive !== false && d.availabilityStatus !== DRIVER_AVAILABILITY.OFFLINE;
    }).length;
    const availableDrivers = allDrivers.filter(d => d.isAvailable && d.availabilityStatus === DRIVER_AVAILABILITY.AVAILABLE).length;

    // Booking status counts
    const statusCounts = {
      [BOOKING_STATUS.PENDING]: 0,
      [BOOKING_STATUS.CONFIRMED]: 0,
      [BOOKING_STATUS.DRIVER_ASSIGNED]: 0,
      [BOOKING_STATUS.PICKED_UP]: 0,
      [BOOKING_STATUS.IN_TRANSIT]: 0,
      [BOOKING_STATUS.DELIVERED]: 0,
      [BOOKING_STATUS.CANCELLED]: 0,
      [BOOKING_STATUS.FAILED]: 0
    };

    let totalPredictedCost = 0;
    let totalPredictedTime = 0;
    let totalRevenue = 0;

    allBookings.forEach(b => {
      if (statusCounts[b.status] !== undefined) {
        statusCounts[b.status]++;
      }
      const cost = Number(b.quotedCost) || 0;
      const time = Number(b.estimatedDeliveryTimeHours) || 0;
      totalPredictedCost += cost;
      totalPredictedTime += time;

      if (b.status === BOOKING_STATUS.DELIVERED || b.status === BOOKING_STATUS.IN_TRANSIT || b.status === BOOKING_STATUS.PICKED_UP || b.status === BOOKING_STATUS.DRIVER_ASSIGNED) {
        totalRevenue += cost;
      }
    });

    const totalBookings = allBookings.length;
    const averagePredictedCost = totalBookings > 0 ? Math.round(totalPredictedCost / totalBookings) : 0;
    const averagePredictedDeliveryTime = totalBookings > 0 ? Number((totalPredictedTime / totalBookings).toFixed(1)) : 0.0;

    // Customer satisfaction average rating
    const averageRating = allFeedback.length > 0
      ? Number((allFeedback.reduce((sum, f) => sum + (Number(f.rating) || 0), 0) / allFeedback.length).toFixed(1))
      : 5.0;

    // ML Inferences Confidence
    const averageConfidence = allPredictions.length > 0
      ? Number((allPredictions.reduce((sum, p) => sum + (p.confidenceScore || 0.94), 0) / allPredictions.length).toFixed(3))
      : 0.945;

    // Domestic Corridor Breakdown
    const corridorMap = {};
    allBookings.forEach(b => {
      const pickup = db.tables.locations.findById(b.pickupLocationId);
      const dest = db.tables.locations.findById(b.destinationLocationId);
      const corridorName = (pickup && dest) ? `${pickup.city} → ${dest.city}` : 'Domestic Corridor';
      if (!corridorMap[corridorName]) {
        corridorMap[corridorName] = { corridor: corridorName, count: 0, revenue: 0, distanceKm: b.distanceKm || 380 };
      }
      corridorMap[corridorName].count++;
      corridorMap[corridorName].revenue += (Number(b.quotedCost) || 0);
    });

    const topCorridors = Object.values(corridorMap).sort((a, b) => b.count - a.count);

    return {
      totalUsers,
      totalCustomers,
      totalDrivers,
      totalAdmins,
      activeDrivers,
      availableDrivers,
      totalBookings,
      pendingBookings: statusCounts[BOOKING_STATUS.PENDING] || 0,
      confirmedBookings: (statusCounts[BOOKING_STATUS.CONFIRMED] || 0) + (statusCounts[BOOKING_STATUS.DRIVER_ASSIGNED] || 0) + (statusCounts[BOOKING_STATUS.PICKED_UP] || 0),
      inTransitBookings: statusCounts[BOOKING_STATUS.IN_TRANSIT] || 0,
      deliveredBookings: statusCounts[BOOKING_STATUS.DELIVERED] || 0,
      cancelledBookings: statusCounts[BOOKING_STATUS.CANCELLED] || 0,
      statusCounts,
      totalRevenue,
      totalPredictedCost,
      averagePredictedCost,
      averagePredictedDeliveryTime,
      averageCustomerRating: averageRating,
      totalReviewsCount: allFeedback.length,
      mlPredictionsCount: allPredictions.length,
      mlAverageConfidence: averageConfidence,
      topCorridors
    };
  }

  /**
   * Search and Filter Bookings for Admin Bookings Console
   * @param {Object} filters { query, status, dateFrom, dateTo }
   * @param {Object} requestingUser 
   */
  searchAndFilterBookings({ query = '', status = 'ALL', dateFrom = '', dateTo = '' }, requestingUser = null) {
    const requester = requestingUser || authService.getCurrentUser();
    if (requester && requester.role !== USER_ROLES.ADMIN) {
      throw new AuthorizationError('Admin privileges required to filter bookings.');
    }

    let bookings = db.getAllHydratedBookings();

    // Status filter
    if (status && status !== 'ALL') {
      bookings = bookings.filter(b => b.status === status);
    }

    // Date range filter
    if (dateFrom) {
      const fromTime = new Date(dateFrom).getTime();
      bookings = bookings.filter(b => new Date(b.createdAt).getTime() >= fromTime);
    }
    if (dateTo) {
      const toTime = new Date(dateTo).getTime() + 86400000; // end of day
      bookings = bookings.filter(b => new Date(b.createdAt).getTime() <= toTime);
    }

    // Query search
    if (query) {
      const q = query.toLowerCase().trim();
      bookings = bookings.filter(b => {
        const num = (b.bookingNumber || '').toLowerCase();
        const id = (b.id || '').toLowerCase();
        const custName = (b.customer?.fullName || '').toLowerCase();
        const custEmail = (b.customer?.email || '').toLowerCase();
        const drvName = (b.driver?.user?.fullName || '').toLowerCase();
        const drvPlate = (b.driver?.vehiclePlate || '').toLowerCase();
        const pCity = (b.pickupLocation?.city || '').toLowerCase();
        const dCity = (b.destinationLocation?.city || '').toLowerCase();

        return num.includes(q) || id.includes(q) || custName.includes(q) || 
               custEmail.includes(q) || drvName.includes(q) || drvPlate.includes(q) || 
               pCity.includes(q) || dCity.includes(q);
      });
    }

    return bookings;
  }

  /**
   * Get Deep Details of a specific Booking for Admin Modal Drawer
   * @param {string} bookingIdOrNumber 
   */
  getBookingDeepDetails(bookingIdOrNumber) {
    let booking = db.getHydratedBooking(bookingIdOrNumber);
    if (!booking) {
      const match = db.tables.bookings.find(b => b.bookingNumber === bookingIdOrNumber);
      if (match) booking = db.getHydratedBooking(match.id);
    }

    if (!booking) {
      throw new NotFoundError(`Booking "${bookingIdOrNumber}" not found.`);
    }

    // Hydrate full status history audit records
    const statusHistory = db.tables.statusHistory
      .filter(h => h.bookingId === booking.id)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .map(h => {
        const actor = db.tables.users.findById(h.changedByUserId);
        return {
          ...h,
          actorName: actor ? `${actor.fullName} (${h.changedByRole || actor.role})` : (h.changedByRole || 'System')
        };
      });

    // Feedback if submitted
    const feedback = db.tables.feedback.find(f => f.bookingId === booking.id);

    return {
      ...booking,
      statusHistory,
      feedback: feedback || null
    };
  }

  /**
   * Get complete user profile and relational history for Admin User Details Modal
   * @param {string} userId 
   */
  getUserDetailsWithBookings(userId) {
    const user = db.tables.users.findById(userId);
    if (!user) {
      throw new NotFoundError(`User with ID ${userId} not found.`);
    }

    let customerBookings = [];
    let driverProfile = null;
    let driverTrips = [];

    if (user.role === USER_ROLES.CUSTOMER) {
      customerBookings = db.getAllHydratedBookings(b => b.customerId === user.id);
    } else if (user.role === USER_ROLES.DRIVER) {
      driverProfile = db.tables.drivers.find(d => d.userId === user.id);
      if (driverProfile) {
        driverTrips = db.getAllHydratedBookings(b => b.assignedDriverId === driverProfile.id);
      }
    }

    const reviewsGiven = db.tables.feedback.filter(f => f.customerId === user.id);

    return {
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        city: user.city,
        address: user.address,
        role: user.role,
        isActive: user.isActive !== false,
        createdAt: user.createdAt,
        avatarInitials: user.avatarInitials
      },
      customerBookings,
      driverProfile,
      driverTrips,
      reviewsGiven
    };
  }

  /**
   * Admin Platform Settings Configuration (Base Pricing, Tier Markups, Model Engine)
   */
  getPlatformSettings() {
    return {
      basePricePerKm: 3.5, // PKR per km
      weightMultiplierPerKg: 15.0, // PKR per kg
      minimumFare: 800, // PKR
      activeModelVersion: 'v2.1-rf-regressor-domestic',
      expressTierMarkupPercent: 35,
      premiumTierMarkupPercent: 70,
      fragileRiskHandlingPercent: 12,
      isMaintenanceMode: false,
      systemTimezone: 'Asia/Karachi (PKT, UTC+5)',
      currency: 'PKR'
    };
  }

  /**
   * Save updated platform settings
   */
  updatePlatformSettings(newSettings, requestingUser = null) {
    const requester = requestingUser || authService.getCurrentUser();
    if (requester && requester.role !== USER_ROLES.ADMIN) {
      throw new AuthorizationError('Admin privileges required to update platform settings.');
    }
    // Persist settings simulation
    return {
      ...this.getPlatformSettings(),
      ...newSettings,
      updatedAt: new Date().toISOString()
    };
  }
}

export const adminService = new AdminService();

/**
 * SMART ONLINE LUGGAGE TRANSPORTATION USING AI
 * Customer Rating & Feedback Service (Phase 9 Delivery + Feedback System)
 */

import { BOOKING_STATUS, USER_ROLES } from '../constants/enums.js';
import { db } from '../core/database.js';
import { ValidationError, NotFoundError, AuthorizationError } from '../core/errorHandler.js';
import { authService } from './auth.service.js';
import { SecurityUtils } from '../core/security.js';

class FeedbackService {
  /**
   * Submit customer feedback for a delivered luggage booking
   * @param {Object} params { bookingId, customerId, rating, comment, tags }
   * @param {Object} requestingUser Optional auth session user
   */
  submitFeedback({ bookingId, customerId, rating, comment = '', tags = [] }, requestingUser = null) {
    const actor = requestingUser || authService.getCurrentUser();

    const booking = db.tables.bookings.findById(bookingId);
    if (!booking) {
      throw new NotFoundError(`Booking with ID ${bookingId}`);
    }

    // Role-based customer ownership checks
    const targetCustomerId = customerId || (actor && actor.role === USER_ROLES.CUSTOMER ? actor.id : booking.customerId);
    
    if (actor && actor.role === USER_ROLES.CUSTOMER) {
      if (booking.customerId !== actor.id || targetCustomerId !== actor.id) {
        throw new AuthorizationError('You cannot submit feedback for a shipment that does not belong to you.');
      }
    }

    // Guard: Feedback allowed ONLY for DELIVERED bookings
    if (booking.status !== BOOKING_STATUS.DELIVERED) {
      throw new ValidationError(`Feedback can only be submitted after luggage delivery is completed. Current status: ${booking.status}.`);
    }

    // Guard: Prevent duplicate reviews for the same booking
    const existing = db.tables.feedback.find(f => f.bookingId === bookingId);
    if (existing) {
      throw new ValidationError('Feedback has already been submitted for this booking.');
    }

    // Rating validation (1 to 5 stars)
    const numRating = Number(rating);
    if (isNaN(numRating) || !Number.isInteger(numRating) || numRating < 1 || numRating > 5) {
      throw new ValidationError('Rating must be an integer between 1 and 5 stars.');
    }

    const safeComment = SecurityUtils.escapeHtml(comment ? comment.trim() : '');
    const safeTags = Array.isArray(tags) ? tags.map(t => SecurityUtils.escapeHtml(String(t).trim())) : [];

    const feedbackRecord = db.tables.feedback.insert({
      bookingId,
      customerId: targetCustomerId,
      driverId: booking.assignedDriverId || null,
      rating: numRating,
      comment: safeComment,
      tags: safeTags,
      createdAt: new Date().toISOString()
    });

    // Update driver's cumulative average rating
    if (booking.assignedDriverId) {
      this.recalculateDriverRating(booking.assignedDriverId);
    }

    // Dispatch notification to driver & admin
    if (booking.assignedDriverId) {
      const driver = db.tables.drivers.findById(booking.assignedDriverId);
      if (driver && driver.userId) {
        db.tables.notifications.insert({
          userId: driver.userId,
          title: 'New Customer Review Received',
          message: `You received a ${numRating}-star rating for shipment ${booking.bookingNumber}.`,
          type: 'INFO',
          isRead: false,
          linkAction: 'feedback',
          createdAt: new Date().toISOString()
        });
      }
    }

    db.persist();
    return this.getHydratedFeedbackById(feedbackRecord.id);
  }

  /**
   * Recalculates and stores a driver's average rating in drivers table
   * @param {string} driverId 
   */
  recalculateDriverRating(driverId) {
    const driverReviews = db.tables.feedback.filter(f => f.driverId === driverId);
    if (driverReviews.length === 0) return;

    const totalStars = driverReviews.reduce((sum, r) => sum + (Number(r.rating) || 0), 0);
    const avgRating = Number((totalStars / driverReviews.length).toFixed(1));

    db.tables.drivers.update(driverId, {
      rating: avgRating,
      reviewCount: driverReviews.length
    });
  }

  /**
   * Get single feedback for a booking
   * @param {string} bookingId 
   */
  getBookingFeedback(bookingId) {
    const item = db.tables.feedback.find(f => f.bookingId === bookingId);
    if (!item) return null;
    return this.hydrateFeedbackRecord(item);
  }

  /**
   * Get feedback by ID
   * @param {string} feedbackId 
   */
  getHydratedFeedbackById(feedbackId) {
    const item = db.tables.feedback.findById(feedbackId);
    if (!item) return null;
    return this.hydrateFeedbackRecord(item);
  }

  /**
   * Get all feedback across the platform (Hydrated with Customer, Driver, Route details)
   */
  getAllFeedback(requestingUser = null) {
    const requester = requestingUser || authService.getCurrentUser();
    if (requester && requester.role !== USER_ROLES.ADMIN) {
      throw new AuthorizationError('Admin privileges required to view all platform feedback records.');
    }
    const all = db.tables.feedback.getAll();
    return all.map(f => this.hydrateFeedbackRecord(f));
  }

  /**
   * Get all feedback for a specific customer
   * @param {string} customerId 
   * @param {Object} requestingUser 
   */
  getCustomerFeedback(customerId, requestingUser = null) {
    const requester = requestingUser || authService.getCurrentUser();
    if (requester && requester.role !== USER_ROLES.ADMIN && requester.id !== customerId) {
      throw new AuthorizationError('You can only access your own feedback history.');
    }
    const list = db.tables.feedback.filter(f => f.customerId === customerId);
    return list.map(f => this.hydrateFeedbackRecord(f));
  }

  /**
   * Get all feedback for a specific driver
   * @param {string} driverId 
   */
  getDriverFeedback(driverId) {
    const list = db.tables.feedback.filter(f => f.driverId === driverId);
    return list.map(f => this.hydrateFeedbackRecord(f));
  }

  /**
   * Find completed bookings eligible for feedback submission (Delivered but not reviewed yet)
   * @param {string} customerId 
   */
  getEligibleBookingsForFeedback(customerId) {
    const customerBookings = db.tables.bookings.filter(b => b.customerId === customerId && b.status === BOOKING_STATUS.DELIVERED);
    const existingFeedbackBookingIds = new Set(
      db.tables.feedback.filter(f => f.customerId === customerId).map(f => f.bookingId)
    );

    const unreviewed = customerBookings.filter(b => !existingFeedbackBookingIds.has(b.id));
    return unreviewed.map(b => db.getHydratedBooking(b.id));
  }

  /**
   * Calculate feedback statistics (Average rating, total reviews, rating distribution)
   * @param {string|null} driverId Optional filter by driver
   */
  getFeedbackStats(driverId = null) {
    const reviews = driverId 
      ? db.tables.feedback.filter(f => f.driverId === driverId)
      : db.tables.feedback.getAll();

    const totalReviews = reviews.length;
    
    // Distribution counters for 5, 4, 3, 2, 1 stars
    const distribution = {
      5: 0,
      4: 0,
      3: 0,
      2: 0,
      1: 0
    };

    let totalScore = 0;

    reviews.forEach(r => {
      const star = Math.round(r.rating);
      if (distribution[star] !== undefined) {
        distribution[star]++;
      }
      totalScore += (Number(r.rating) || 0);
    });

    const averageRating = totalReviews > 0 ? Number((totalScore / totalReviews).toFixed(1)) : 0.0;

    // Distribution percentages
    const distributionPercent = {
      5: totalReviews > 0 ? Math.round((distribution[5] / totalReviews) * 100) : 0,
      4: totalReviews > 0 ? Math.round((distribution[4] / totalReviews) * 100) : 0,
      3: totalReviews > 0 ? Math.round((distribution[3] / totalReviews) * 100) : 0,
      2: totalReviews > 0 ? Math.round((distribution[2] / totalReviews) * 100) : 0,
      1: totalReviews > 0 ? Math.round((distribution[1] / totalReviews) * 100) : 0
    };

    // Aggregate tags
    const tagCounts = {};
    reviews.forEach(r => {
      (r.tags || []).forEach(t => {
        tagCounts[t] = (tagCounts[t] || 0) + 1;
      });
    });

    return {
      totalReviews,
      averageRating,
      distribution,
      distributionPercent,
      topTags: Object.entries(tagCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([tag, count]) => ({ tag, count }))
    };
  }

  /**
   * Helper: Hydrate feedback entity with relational models
   * @param {Object} feedback 
   */
  hydrateFeedbackRecord(feedback) {
    if (!feedback) return null;

    const customer = db.tables.users.findById(feedback.customerId);
    const booking = db.tables.bookings.findById(feedback.bookingId);
    let driver = null;
    let driverUser = null;

    if (feedback.driverId) {
      driver = db.tables.drivers.findById(feedback.driverId);
      if (driver && driver.userId) {
        driverUser = db.tables.users.findById(driver.userId);
      }
    }

    let routeLabel = 'Domestic Corridor';
    if (booking) {
      const pickup = db.tables.locations.findById(booking.pickupLocationId);
      const dest = db.tables.locations.findById(booking.destinationLocationId);
      if (pickup && dest) {
        routeLabel = `${pickup.city} → ${dest.city}`;
      }
    }

    return {
      ...feedback,
      customerName: customer ? customer.fullName : 'Customer',
      customerEmail: customer ? customer.email : '',
      customerCity: customer ? customer.city : '',
      bookingNumber: booking ? booking.bookingNumber : feedback.bookingId,
      routeLabel,
      driverName: driverUser ? driverUser.fullName : (driver ? driver.vehiclePlate : 'Assigned Courier'),
      driverVehicle: driver ? `${driver.vehicleType} (${driver.vehiclePlate})` : null
    };
  }
}

export const feedbackService = new FeedbackService();

/**
 * SMART ONLINE LUGGAGE TRANSPORTATION USING AI
 * Milestone Tracking & Journey Progression Service (Phase 8 Booking Status Workflow)
 */

import { BOOKING_STATUS, USER_ROLES } from '../constants/enums.js';
import { db } from '../core/database.js';
import { NotFoundError, AuthorizationError } from '../core/errorHandler.js';
import { authService } from './auth.service.js';

class TrackingService {
  /**
   * Returns complete lifecycle milestones and audit history for a booking
   * @param {string} bookingIdOrNumber (e.g. 'BK-2026-001' or 'LUG-2026-XXXXXX')
   * @param {Object} requestingUser 
   */
  getTrackingTimeline(bookingIdOrNumber, requestingUser = null) {
    const requester = requestingUser || authService.getCurrentUser();
    
    // Find by ID or Booking Reference Number
    let booking = db.getHydratedBooking(bookingIdOrNumber);
    if (!booking) {
      const match = db.tables.bookings.find(b => b.bookingNumber === bookingIdOrNumber);
      if (match) {
        booking = db.getHydratedBooking(match.id);
      }
    }

    if (!booking) {
      throw new NotFoundError(`Booking reference "${bookingIdOrNumber}" not found in system.`);
    }

    // Role-based data access verification
    if (requester) {
      if (requester.role === USER_ROLES.CUSTOMER && booking.customerId !== requester.id) {
        throw new AuthorizationError('You do not have permission to view other customers\' shipments.');
      }
      if (requester.role === USER_ROLES.DRIVER) {
        const driver = db.tables.drivers.find(d => d.userId === requester.id);
        if (!driver || booking.assignedDriverId !== driver.id) {
          throw new AuthorizationError('You can only view shipments assigned to your driver vehicle.');
        }
      }
    }

    // Primary Milestone Workflow Checkpoints (5-Step Visual Timeline)
    const statusOrder = [
      {
        key: BOOKING_STATUS.CONFIRMED,
        label: 'Confirmed',
        desc: 'Booking verified and scheduled for fleet dispatch',
        icon: 'fa-clipboard-check'
      },
      {
        key: BOOKING_STATUS.DRIVER_ASSIGNED,
        label: 'Driver Assigned',
        desc: 'Courier vehicle allocated for pickup',
        icon: 'fa-truck-ramp-box'
      },
      {
        key: BOOKING_STATUS.PICKED_UP,
        label: 'Picked Up',
        desc: 'Luggage collected and loaded onto carrier',
        icon: 'fa-box-archive'
      },
      {
        key: BOOKING_STATUS.IN_TRANSIT,
        label: 'In Transit',
        desc: 'En route along domestic highway corridor',
        icon: 'fa-truck-fast'
      },
      {
        key: BOOKING_STATUS.DELIVERED,
        label: 'Delivered',
        desc: 'Safely handed over at final destination',
        icon: 'fa-circle-check'
      }
    ];

    const historyMap = new Map();
    (booking.statusHistory || []).forEach(h => {
      historyMap.set(h.toStatus, h);
    });

    const isCancelled = booking.status === BOOKING_STATUS.CANCELLED;
    const isFailed = booking.status === BOOKING_STATUS.FAILED;

    const currentStatusIndex = statusOrder.findIndex(s => s.key === booking.status);

    const milestones = statusOrder.map((step, idx) => {
      const historyEntry = historyMap.get(step.key);
      let stepState = 'pending'; // 'completed' | 'active' | 'pending' | 'cancelled'

      if (isCancelled || isFailed) {
        stepState = historyEntry ? 'completed' : 'cancelled';
      } else if (currentStatusIndex !== -1) {
        if (idx < currentStatusIndex) {
          stepState = 'completed';
        } else if (idx === currentStatusIndex) {
          stepState = booking.status === BOOKING_STATUS.DELIVERED ? 'completed' : 'active';
        }
      }

      return {
        ...step,
        state: stepState,
        timestamp: historyEntry ? historyEntry.timestamp : null,
        note: historyEntry ? historyEntry.note : null,
        locationStamp: historyEntry ? historyEntry.locationStamp : null
      };
    });

    // Chronologically sorted status history list
    const sortedHistory = [...(booking.statusHistory || [])].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return {
      booking,
      bookingNumber: booking.bookingNumber,
      currentStatus: booking.status,
      milestones,
      statusHistory: sortedHistory,
      isCancelled,
      isFailed
    };
  }
}

export const trackingService = new TrackingService();

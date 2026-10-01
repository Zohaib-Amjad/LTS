/**
 * SMART ONLINE LUGGAGE TRANSPORTATION USING AI
 * Role-Based Notification Service (Phase 11: Real-Time Event Dispatch & In-App Alerts)
 */

import { db } from '../core/database.js';
import { NOTIFICATION_TYPES, USER_ROLES } from '../constants/enums.js';

class NotificationService {
  /**
   * Retrieve all notifications for a specific user, sorted newest first
   * @param {string} userId 
   */
  getUserNotifications(userId) {
    if (!userId) return [];
    return db.tables.notifications
      .filter(n => n.userId === userId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  /**
   * Get unread notification count for badge display
   * @param {string} userId 
   */
  getUnreadCount(userId) {
    if (!userId) return 0;
    return db.tables.notifications.filter(n => n.userId === userId && !n.isRead).length;
  }

  /**
   * Mark a single notification as read
   * @param {string} notificationId 
   */
  markAsRead(notificationId) {
    const updated = db.tables.notifications.update(notificationId, { isRead: true });
    db.persist();
    return updated;
  }

  /**
   * Mark all notifications for a user as read
   * @param {string} userId 
   */
  markAllAsRead(userId) {
    if (!userId) return false;
    const userNotifs = db.tables.notifications.filter(n => n.userId === userId && !n.isRead);
    userNotifs.forEach(n => {
      db.tables.notifications.update(n.id, { isRead: true });
    });
    db.persist();
    return true;
  }

  /**
   * Delete a single notification
   * @param {string} notificationId 
   */
  deleteNotification(notificationId) {
    db.tables.notifications.delete(notificationId);
    db.persist();
    return true;
  }

  /**
   * Clear all notifications for a user
   * @param {string} userId 
   */
  clearAll(userId) {
    if (!userId) return false;
    const userNotifs = db.tables.notifications.filter(n => n.userId === userId);
    userNotifs.forEach(n => db.tables.notifications.delete(n.id));
    db.persist();
    return true;
  }

  /**
   * Core notification dispatcher
   */
  sendNotification({
    userId,
    type = NOTIFICATION_TYPES.SYSTEM_ALERT,
    title,
    message,
    bookingId = null,
    bookingNumber = null,
    linkAction = ''
  }) {
    if (!userId) return null;

    const notif = db.tables.notifications.insert({
      userId,
      type,
      title: title || 'System Notification',
      message: message || '',
      bookingId: bookingId || null,
      bookingNumber: bookingNumber || null,
      isRead: false,
      linkAction: linkAction || ''
    });

    db.persist();
    return notif;
  }

  /* =========================================================================
     Domain Event Handlers (Phase 11 Relevant Lifecycle Events)
     ========================================================================= */

  /**
   * 1. Booking Confirmed Event
   */
  notifyBookingConfirmed(booking) {
    if (!booking) return;

    // Notify Customer
    this.sendNotification({
      userId: booking.customerId,
      type: NOTIFICATION_TYPES.BOOKING_CONFIRMED,
      title: 'Booking Confirmed',
      message: `Your shipment ${booking.bookingNumber} (${booking.pickupLocation?.city || 'Origin'} → ${booking.destinationLocation?.city || 'Dest'}) is confirmed. A driver will be assigned shortly.`,
      bookingId: booking.id,
      bookingNumber: booking.bookingNumber,
      linkAction: `track:${booking.bookingNumber}`
    });

    // Notify System Administrators of pending dispatch
    const admins = db.tables.users.filter(u => u.role === USER_ROLES.ADMIN);
    admins.forEach(admin => {
      this.sendNotification({
        userId: admin.id,
        type: NOTIFICATION_TYPES.BOOKING_CONFIRMED,
        title: 'New Confirmed Booking',
        message: `Booking ${booking.bookingNumber} (${booking.distanceKm} km) requires fleet courier assignment.`,
        bookingId: booking.id,
        bookingNumber: booking.bookingNumber,
        linkAction: `admin:booking:${booking.id}`
      });
    });
  }

  /**
   * 2. Driver Assigned Event
   */
  notifyDriverAssigned(booking, driver) {
    if (!booking) return;
    const driverName = driver?.user?.fullName || 'Verified Courier';
    const vehiclePlate = driver?.vehiclePlate || 'Van';

    // Notify Customer
    this.sendNotification({
      userId: booking.customerId,
      type: NOTIFICATION_TYPES.DRIVER_ASSIGNED,
      title: 'Courier Driver Assigned',
      message: `${driverName} (${vehiclePlate}) has been assigned to your shipment ${booking.bookingNumber}. Pickup scheduled soon.`,
      bookingId: booking.id,
      bookingNumber: booking.bookingNumber,
      linkAction: `track:${booking.bookingNumber}`
    });

    // Notify Driver if driver user exists
    if (driver?.userId) {
      this.sendNotification({
        userId: driver.userId,
        type: NOTIFICATION_TYPES.DRIVER_ASSIGNED,
        title: 'New Shipment Assigned',
        message: `You have been assigned trip ${booking.bookingNumber}: ${booking.pickupLocation?.city || 'Origin'} → ${booking.destinationLocation?.city || 'Dest'} (${booking.distanceKm} km).`,
        bookingId: booking.id,
        bookingNumber: booking.bookingNumber,
        linkAction: `driver:dashboard`
      });
    }
  }

  /**
   * 3. Luggage Picked Up Event
   */
  notifyPickedUp(booking) {
    if (!booking) return;

    this.sendNotification({
      userId: booking.customerId,
      type: NOTIFICATION_TYPES.PICKED_UP,
      title: 'Luggage Picked Up',
      message: `Your luggage for booking ${booking.bookingNumber} has been safely picked up from ${booking.pickupLocation?.address || 'pickup address'}.`,
      bookingId: booking.id,
      bookingNumber: booking.bookingNumber,
      linkAction: `track:${booking.bookingNumber}`
    });
  }

  /**
   * 4. Booking In Transit Event
   */
  notifyInTransit(booking) {
    if (!booking) return;

    this.sendNotification({
      userId: booking.customerId,
      type: NOTIFICATION_TYPES.IN_TRANSIT,
      title: 'Shipment In Transit',
      message: `Shipment ${booking.bookingNumber} is now in transit along highway network heading to ${booking.destinationLocation?.city || 'destination'}.`,
      bookingId: booking.id,
      bookingNumber: booking.bookingNumber,
      linkAction: `track:${booking.bookingNumber}`
    });
  }

  /**
   * 5. Booking Delivered Event
   */
  notifyDelivered(booking) {
    if (!booking) return;

    this.sendNotification({
      userId: booking.customerId,
      type: NOTIFICATION_TYPES.DELIVERED,
      title: 'Luggage Delivered Successfully',
      message: `Your luggage for ${booking.bookingNumber} has been safely delivered to ${booking.destinationLocation?.city || 'destination'}!`,
      bookingId: booking.id,
      bookingNumber: booking.bookingNumber,
      linkAction: `track:${booking.bookingNumber}`
    });
  }

  /**
   * 6. Feedback Reminder Event
   */
  notifyFeedbackReminder(booking) {
    if (!booking) return;

    this.sendNotification({
      userId: booking.customerId,
      type: NOTIFICATION_TYPES.FEEDBACK_REMINDER,
      title: 'Rate Your Delivery Experience',
      message: `How was your courier service for ${booking.bookingNumber}? Leave a quick review to support verified drivers.`,
      bookingId: booking.id,
      bookingNumber: booking.bookingNumber,
      linkAction: `feedback:${booking.id}`
    });
  }

  /**
   * 7. Booking Cancelled Event
   */
  notifyCancelled(booking, reason = '') {
    if (!booking) return;

    this.sendNotification({
      userId: booking.customerId,
      type: NOTIFICATION_TYPES.CANCELLED,
      title: 'Booking Cancelled',
      message: `Shipment ${booking.bookingNumber} has been cancelled. ${reason ? `Reason: ${reason}` : ''}`,
      bookingId: booking.id,
      bookingNumber: booking.bookingNumber,
      linkAction: `track:${booking.bookingNumber}`
    });

    // Also notify assigned driver if one was attached
    if (booking.driver?.userId) {
      this.sendNotification({
        userId: booking.driver.userId,
        type: NOTIFICATION_TYPES.CANCELLED,
        title: 'Assigned Booking Cancelled',
        message: `Booking ${booking.bookingNumber} was cancelled. Vehicle is released back to available pool.`,
        bookingId: booking.id,
        bookingNumber: booking.bookingNumber,
        linkAction: `driver:dashboard`
      });
    }
  }

  /**
   * Get notification visual styling metadata (icon, color)
   */
  getNotificationMeta(type) {
    switch (type) {
      case NOTIFICATION_TYPES.BOOKING_CONFIRMED:
        return { icon: 'fa-solid fa-circle-check', color: 'var(--brand-primary)', badgeCls: 'badge-confirmed' };
      case NOTIFICATION_TYPES.DRIVER_ASSIGNED:
        return { icon: 'fa-solid fa-truck-ramp-box', color: '#06b6d4', badgeCls: 'badge-driver-assigned' };
      case NOTIFICATION_TYPES.PICKED_UP:
        return { icon: 'fa-solid fa-box', color: '#8b5cf6', badgeCls: 'badge-picked-up' };
      case NOTIFICATION_TYPES.IN_TRANSIT:
        return { icon: 'fa-solid fa-route', color: '#f59e0b', badgeCls: 'badge-in-transit' };
      case NOTIFICATION_TYPES.DELIVERED:
        return { icon: 'fa-solid fa-circle-check', color: '#10b981', badgeCls: 'badge-delivered' };
      case NOTIFICATION_TYPES.CANCELLED:
        return { icon: 'fa-solid fa-ban', color: '#ef4444', badgeCls: 'badge-cancelled' };
      case NOTIFICATION_TYPES.FEEDBACK_REMINDER:
        return { icon: 'fa-solid fa-star', color: '#f59e0b', badgeCls: 'badge-confirmed' };
      default:
        return { icon: 'fa-solid fa-bell', color: 'var(--brand-primary)', badgeCls: 'badge-confirmed' };
    }
  }
}

export const notificationService = new NotificationService();

/**
 * SMART ONLINE LUGGAGE TRANSPORTATION USING AI
 * User & Profile Management Service with RBAC Checks
 */

import { USER_ROLES } from '../constants/enums.js';
import { db } from '../core/database.js';
import { NotFoundError, AuthorizationError, ValidationError } from '../core/errorHandler.js';
import { authService } from './auth.service.js';

class UserService {
  getUserById(id, requestingUser = null) {
    const requester = requestingUser || authService.getCurrentUser();
    if (requester && requester.role !== USER_ROLES.ADMIN && requester.id !== id) {
      throw new AuthorizationError('You do not have permission to view other user profiles.');
    }

    const user = db.tables.users.findById(id);
    if (!user) throw new NotFoundError(`User with ID ${id}`);
    return authService.sanitizeUser(user);
  }

  getAllUsers(requestingUser = null) {
    const requester = requestingUser || authService.getCurrentUser();
    if (!requester || requester.role !== USER_ROLES.ADMIN) {
      throw new AuthorizationError('Admin privileges required to view user directory.');
    }
    return db.tables.users.getAll().map(u => authService.sanitizeUser(u));
  }

  updateProfile(id, updates, requestingUser = null) {
    const requester = requestingUser || authService.getCurrentUser();
    if (!requester || (requester.id !== id && requester.role !== USER_ROLES.ADMIN)) {
      throw new AuthorizationError('You are only authorized to update your own profile.');
    }

    const user = db.tables.users.findById(id);
    if (!user) throw new NotFoundError(`User with ID ${id}`);

    const safeUpdates = {
      fullName: updates.fullName ? updates.fullName.trim() : user.fullName,
      phone: updates.phone ? updates.phone.trim() : user.phone,
      address: updates.address ? updates.address.trim() : user.address,
      city: updates.city ? updates.city.trim() : user.city
    };

    if (safeUpdates.fullName) {
      safeUpdates.avatarInitials = safeUpdates.fullName
        .split(' ')
        .map(n => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase();
    }

    const updated = db.tables.users.update(id, safeUpdates);
    db.persist();
    return authService.sanitizeUser(updated);
  }

  toggleUserStatus(userId, requestingUser = null) {
    const requester = requestingUser || authService.getCurrentUser();
    if (!requester || requester.role !== USER_ROLES.ADMIN) {
      throw new AuthorizationError('Only system administrators can toggle user account status.');
    }

    if (requester.id === userId) {
      throw new ValidationError('Administrators cannot deactivate their own active session account.');
    }

    const targetUser = db.tables.users.findById(userId);
    if (!targetUser) throw new NotFoundError(`User with ID ${userId}`);

    const updated = db.tables.users.update(userId, {
      isActive: !targetUser.isActive
    });

    db.persist();
    return authService.sanitizeUser(updated);
  }

  changeUserRole(userId, newRole, requestingUser = null) {
    const requester = requestingUser || authService.getCurrentUser();
    if (!requester || requester.role !== USER_ROLES.ADMIN) {
      throw new AuthorizationError('Only system administrators can assign user roles.');
    }

    if (!Object.values(USER_ROLES).includes(newRole)) {
      throw new ValidationError(`Invalid role "${newRole}".`);
    }

    const targetUser = db.tables.users.findById(userId);
    if (!targetUser) throw new NotFoundError(`User with ID ${userId}`);

    const updated = db.tables.users.update(userId, { role: newRole });
    db.persist();
    return authService.sanitizeUser(updated);
  }

  deleteUser(userId, requestingUser = null) {
    const requester = requestingUser || authService.getCurrentUser();
    if (!requester || requester.role !== USER_ROLES.ADMIN) {
      throw new AuthorizationError('Only system administrators can delete users.');
    }

    if (requester.id === userId) {
      throw new ValidationError('Administrators cannot delete their own active session account.');
    }

    const targetUser = db.tables.users.findById(userId);
    if (!targetUser) throw new NotFoundError(`User with ID ${userId}`);

    // If target user is linked to driver record, clean up drivers table
    const linkedDrivers = db.tables.drivers.filter(d => d.userId === userId);
    linkedDrivers.forEach(d => {
      db.tables.drivers.delete(d.id);
    });

    db.tables.users.delete(userId);
    db.persist();
    return { success: true, deletedUserId: userId, fullName: targetUser.fullName, role: targetUser.role };
  }
}

export const userService = new UserService();

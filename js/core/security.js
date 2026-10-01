/**
 * SMART ONLINE LUGGAGE TRANSPORTATION USING AI
 * Core Security, Input Sanitization & Payload Protection Utilities (Phase 12)
 */

import { ValidationError } from './errorHandler.js';

export const SecurityUtils = {
  /**
   * Escape HTML special characters to prevent Cross-Site Scripting (XSS) attacks
   * @param {string} str 
   * @returns {string} Sanitized string
   */
  escapeHtml(str) {
    if (typeof str !== 'string') return str;
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  /**
   * Deeply sanitize an object or string by trimming and escaping strings
   * @param {any} input 
   * @returns {any}
   */
  sanitizeInput(input) {
    if (typeof input === 'string') {
      return this.escapeHtml(input.trim());
    }
    if (Array.isArray(input)) {
      return input.map(item => this.sanitizeInput(item));
    }
    if (input !== null && typeof input === 'object') {
      const sanitized = {};
      for (const [key, val] of Object.entries(input)) {
        // Prevent Prototype Pollution
        if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
          continue;
        }
        sanitized[key] = this.sanitizeInput(val);
      }
      return sanitized;
    }
    return input;
  },

  /**
   * Prevent Mass Assignment by stripping unapproved keys from request payloads
   * @param {Object} payload 
   * @param {string[]} allowedFields 
   * @returns {Object} Filtered object containing only whitelisted keys
   */
  filterAllowedFields(payload, allowedFields = []) {
    if (!payload || typeof payload !== 'object') return {};
    const sanitized = {};
    for (const field of allowedFields) {
      if (payload.hasOwnProperty(field)) {
        sanitized[field] = this.sanitizeInput(payload[field]);
      }
    }
    return sanitized;
  },

  /**
   * Validate Email Address format
   * @param {string} email 
   * @returns {boolean}
   */
  isValidEmail(email) {
    if (!email || typeof email !== 'string') return false;
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email.trim());
  },

  /**
   * Validate Phone Number format (e.g. +92 300 1234567, 03001234567, or standard E.164)
   * @param {string} phone 
   * @returns {boolean}
   */
  isValidPhone(phone) {
    if (!phone || typeof phone !== 'string') return false;
    const clean = phone.replace(/[\s\-()]/g, '');
    const phoneRegex = /^(\+92|0|92)?[3][0-9]{9}$/;
    const internationalRegex = /^\+?[1-9]\d{7,14}$/;
    return phoneRegex.test(clean) || internationalRegex.test(clean);
  },

  /**
   * Validate password security constraints
   * @param {string} password 
   * @returns {{ isValid: boolean, message: string }}
   */
  validatePassword(password) {
    if (!password || typeof password !== 'string') {
      return { isValid: false, message: 'Password cannot be empty.' };
    }
    if (password.length < 6) {
      return { isValid: false, message: 'Password must be at least 6 characters long.' };
    }
    if (password.length > 128) {
      return { isValid: false, message: 'Password cannot exceed 128 characters.' };
    }
    return { isValid: true, message: 'Password is secure.' };
  }
};

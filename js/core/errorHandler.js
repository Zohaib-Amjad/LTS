/**
 * SMART ONLINE LUGGAGE TRANSPORTATION USING AI
 * Project-Level Unified Error Handling & Diagnostics Strategy
 */

export class AppError extends Error {
  /**
   * @param {string} message - User-friendly error message
   * @param {string} [code='UNKNOWN_ERROR'] - Machine-readable error code
   * @param {number} [statusCode=500] - HTTP-equivalent status code
   * @param {any} [details=null] - Additional error context
   */
  constructor(message, code = 'UNKNOWN_ERROR', statusCode = 500, details = null) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      details: this.details,
      timestamp: this.timestamp
    };
  }
}

export class ValidationError extends AppError {
  constructor(message, fieldErrors = []) {
    super(message, 'VALIDATION_ERROR', 400, fieldErrors);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication required.') {
    super(message, 'AUTHENTICATION_REQUIRED', 401);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'Access forbidden: Insufficient permissions.') {
    super(message, 'FORBIDDEN', 403);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} was not found.`, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
  }
}

export class StateTransitionError extends AppError {
  constructor(fromStatus, toStatus, role) {
    super(
      `Invalid booking status transition from "${fromStatus}" to "${toStatus}" for role "${role}".`,
      'INVALID_STATE_TRANSITION',
      422,
      { fromStatus, toStatus, role }
    );
    this.name = 'StateTransitionError';
  }
}

export class MLPredictionError extends AppError {
  constructor(message, featureData = null) {
    super(
      `AI Prediction Engine Error: ${message}`,
      'ML_PREDICTION_FAILED',
      502,
      featureData
    );
    this.name = 'MLPredictionError';
  }
}

/**
 * Global Error Logger & UI Notification Dispatcher
 */
export const ErrorHandler = {
  /**
   * Log error and return formatted safe message
   * @param {Error|AppError|any} error
   * @param {string} [context='General']
   * @returns {{ success: false, error: AppError }}
   */
  handle(error, context = 'General') {
    const appError = error instanceof AppError
      ? error
      : new AppError(error?.message || 'An unexpected error occurred.', 'INTERNAL_ERROR', 500, error);

    console.error(`[${context}] Error [${appError.code}]:`, appError.message, appError.details || '');

    // Dispatch global custom event for UI toast/banner listeners
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      try {
        window.dispatchEvent(
          new CustomEvent('app:error', {
            detail: {
              context,
              error: appError.toJSON()
            }
          })
        );
      } catch (e) {
        // Fallback for non-browser runtime tests
      }
    }

    return {
      success: false,
      error: appError
    };
  },

  /**
   * Execute an async function with standard error wrapping
   * @template T
   * @param {() => Promise<T>} fn
   * @param {string} context
   * @returns {Promise<{ success: true, data: T } | { success: false, error: AppError }>}
   */
  async tryAsync(fn, context = 'AsyncOperation') {
    try {
      const data = await fn();
      return { success: true, data };
    } catch (err) {
      return this.handle(err, context);
    }
  },

  /**
   * Execute a sync function with standard error wrapping
   * @template T
   * @param {() => T} fn
   * @param {string} context
   * @returns {{ success: true, data: T } | { success: false, error: AppError }}
   */
  trySync(fn, context = 'SyncOperation') {
    try {
      const data = fn();
      return { success: true, data };
    } catch (err) {
      return this.handle(err, context);
    }
  }
};

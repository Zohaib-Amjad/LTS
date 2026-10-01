/**
 * SMART ONLINE LUGGAGE TRANSPORTATION USING AI
 * Client-Safe Environment Configuration Reader
 * Ensures no sensitive credentials or server secrets leak into the client runtime.
 */

export const ENV = Object.freeze({
  APP_NAME: 'SmartLuggage AI',
  APP_VERSION: '1.0.0',
  DEFAULT_CURRENCY: 'PKR',
  DEFAULT_COUNTRY: 'Pakistan',
  DEFAULT_HUB_CITY: 'Islamabad',
  DEBUG_MODE: false,
  ML_CONFIG: {
    SERVICE_MODE: 'local_embedded', // 'local_embedded' | 'remote_api'
    REMOTE_ENDPOINT: 'http://localhost:5000/api/v1/predict',
    TIMEOUT_MS: 5000,
    FALLBACK_TO_LOCAL: true
  }
});

/**
 * Application Configuration
 * Central configuration file for Service Manager backend
 */

export const CONFIG = {
  /**
   * Cache configuration
   */
  CACHE: {
    /** Time-to-live for service list cache in milliseconds */
    TTL_MS: 500,
    /** Maximum cache size (number of entries) - reduced for RAM optimization */
    MAX_SIZE: 10,
    /** Enable/disable caching */
    ENABLED: true,
  },

  /**
   * Rate limiting configuration
   */
  RATE_LIMIT: {
    /** Cooldown period for service control operations in milliseconds */
    CONTROL_COOLDOWN_MS: 200,
    /** Maximum requests per time window */
    MAX_REQUESTS: 10,
    /** Time window for rate limiting in milliseconds */
    WINDOW_MS: 1000,
  },

  /**
   * Validation limits
   */
  VALIDATION: {
    /** Maximum length for search queries */
    MAX_SEARCH_LENGTH: 1000,
    /** Maximum length for service IDs */
    MAX_SERVICE_ID_LENGTH: 256,
  },

  /**
   * Performance settings
   */
  PERFORMANCE: {
    /** Timeout for service operations in milliseconds */
    OPERATION_TIMEOUT_MS: 30000,
    /** Maximum concurrent operations */
    MAX_CONCURRENT_OPS: 5,
  },

  /**
   * Window configuration
   */
  WINDOW: {
    DEFAULT_WIDTH: 1200,
    DEFAULT_HEIGHT: 780,
    MIN_WIDTH: 960,
    MIN_HEIGHT: 600,
    BACKGROUND_COLOR: '#000000',
  },

  /**
   * Security settings
   */
  SECURITY: {
    /** Enable audit logging */
    AUDIT_ENABLED: true,
    /** Validate all inputs */
    STRICT_VALIDATION: true,
  },
} as const;


/**
 * Security validation utilities for service manager
 * Prevents command injection and validates user inputs
 */

/**
 * Validates a service ID to ensure it doesn't contain malicious characters
 * @param serviceId - The service identifier to validate
 * @returns true if valid, false otherwise
 */
export function isValidServiceId(serviceId: string): boolean {
  if (!serviceId || typeof serviceId !== 'string') {
    return false;
  }

  // Service IDs should be reasonable length
  if (serviceId.length === 0 || serviceId.length > 256) {
    return false;
  }

  // Reject service IDs with dangerous characters or patterns
  const dangerousPatterns = [
    /[;&|`$(){}[\]<>]/,  // Shell metacharacters
    /\.\./,              // Directory traversal
    /^-/,                // Starts with dash (command flag)
    /[\x00-\x1f]/,       // Control characters
    /\s{2,}/,            // Multiple consecutive spaces
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(serviceId)) {
      return false;
    }
  }

  return true;
}

/**
 * Validates a file path to prevent directory traversal and unauthorized access
 * @param filePath - The file path to validate
 * @returns true if valid, false otherwise
 */
export function isValidFilePath(filePath: string): boolean {
  if (!filePath || typeof filePath !== 'string') {
    return false;
  }

  // Basic length check
  if (filePath.length === 0 || filePath.length > 4096) {
    return false;
  }

  // Reject paths with dangerous patterns
  const dangerousPatterns = [
    /\.\./,              // Directory traversal
    /[;&|`$(){}[\]<>]/,  // Shell metacharacters
    /[\x00-\x1f]/,       // Control characters
    /^[~]/,              // Tilde expansion (on Unix)
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(filePath)) {
      return false;
    }
  }

  return true;
}

/**
 * Sanitizes a search query by escaping special regex characters
 * @param query - The search query to sanitize
 * @returns Sanitized query string
 */
export function sanitizeSearchQuery(query: string): string {
  if (!query || typeof query !== 'string') {
    return '';
  }

  // Limit query length
  const truncated = query.slice(0, 1000);

  // Escape special regex characters
  return truncated.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Validates service action to ensure it's one of the allowed actions
 * @param action - The action to validate
 * @returns true if valid, false otherwise
 */
export function isValidServiceAction(action: string): boolean {
  const allowedActions = ['start', 'stop', 'restart', 'enable', 'disable'];
  return allowedActions.includes(action);
}

/**
 * Sanitizes error messages to remove sensitive information
 * @param error - The error to sanitize
 * @returns Sanitized error message
 */
export function sanitizeErrorMessage(error: unknown): string {
  if (!error) {
    return 'An unknown error occurred';
  }

  let message: string;
  if (error instanceof Error) {
    message = error.message;
  } else if (typeof error === 'string') {
    message = error;
  } else {
    message = 'An unexpected error occurred';
  }

  // Remove absolute paths (both Windows and Unix style)
  message = message.replace(/[A-Za-z]:[\\\/][^\s"'<>|]+/g, '[path]');
  message = message.replace(/\/[^\s"'<>|]+/g, '[path]');

  // Remove potential usernames
  message = message.replace(/\/home\/[^\/\s]+/g, '/home/[user]');
  message = message.replace(/\/Users\/[^\/\s]+/g, '/Users/[user]');
  message = message.replace(/C:\\Users\\[^\\]+/g, 'C:\\Users\\[user]');

  return message;
}

/**
 * Rate limiter to prevent abuse of operations
 */
export class RateLimiter {
  private lastCallTime: Map<string, number> = new Map();
  private readonly cooldownMs: number;

  constructor(cooldownMs: number = 200) {
    this.cooldownMs = cooldownMs;
  }

  /**
   * Checks if an operation is allowed based on rate limiting
   * @param key - Unique identifier for the operation
   * @returns true if allowed, false if rate limited
   */
  isAllowed(key: string): boolean {
    const now = Date.now();
    const lastCall = this.lastCallTime.get(key);

    if (!lastCall || now - lastCall >= this.cooldownMs) {
      this.lastCallTime.set(key, now);
      return true;
    }

    return false;
  }

  /**
   * Resets the rate limiter for a specific key
   * @param key - Unique identifier for the operation
   */
  reset(key: string): void {
    this.lastCallTime.delete(key);
  }

  /**
   * Clears all rate limiting state
   */
  clear(): void {
    this.lastCallTime.clear();
  }
}


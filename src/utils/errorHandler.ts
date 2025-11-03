/**
 * Enhanced Error Handling Utilities
 * Provides retry logic, timeout handling, and error categorization
 */

import type { SerializedError } from '../types/service';

/**
 * Error categories for better error handling
 */
export enum ErrorCategory {
  NETWORK = 'NETWORK',
  PERMISSION = 'PERMISSION',
  VALIDATION = 'VALIDATION',
  TIMEOUT = 'TIMEOUT',
  NOT_FOUND = 'NOT_FOUND',
  RATE_LIMIT = 'RATE_LIMIT',
  UNKNOWN = 'UNKNOWN',
}

/**
 * Categorize error based on error message or type
 */
export function categorizeError(error: unknown): ErrorCategory {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    
    if (message.includes('permission') || message.includes('access denied') || message.includes('forbidden')) {
      return ErrorCategory.PERMISSION;
    }
    if (message.includes('timeout') || message.includes('timed out')) {
      return ErrorCategory.TIMEOUT;
    }
    if (message.includes('not found') || message.includes('does not exist')) {
      return ErrorCategory.NOT_FOUND;
    }
    if (message.includes('rate limit')) {
      return ErrorCategory.RATE_LIMIT;
    }
    if (message.includes('invalid') || message.includes('validation')) {
      return ErrorCategory.VALIDATION;
    }
    if (message.includes('network') || message.includes('connection')) {
      return ErrorCategory.NETWORK;
    }
  }
  
  return ErrorCategory.UNKNOWN;
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxAttempts: number;
  delayMs: number;
  backoff: boolean;
  retryableErrors: ErrorCategory[];
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  delayMs: 1000,
  backoff: true,
  retryableErrors: [ErrorCategory.NETWORK, ErrorCategory.TIMEOUT],
};

/**
 * Execute an async operation with retry logic
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: unknown;

  for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const category = categorizeError(error);

      // Don't retry if error is not retryable
      if (!finalConfig.retryableErrors.includes(category)) {
        throw error;
      }

      // Don't retry on last attempt
      if (attempt === finalConfig.maxAttempts) {
        break;
      }

      // Calculate delay with exponential backoff if enabled
      const delay = finalConfig.backoff
        ? finalConfig.delayMs * Math.pow(2, attempt - 1)
        : finalConfig.delayMs;

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Execute an async operation with timeout
 */
export async function withTimeout<T>(
  operation: () => Promise<T>,
  timeoutMs: number,
  timeoutMessage = 'Operation timed out'
): Promise<T> {
  return Promise.race([
    operation(),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs)
    ),
  ]);
}

/**
 * Sanitize error for client-side display
 */
export function sanitizeError(error: unknown): SerializedError {
  if (error instanceof Error) {
    const category = categorizeError(error);
    
    // Remove sensitive file paths from error messages
    // Windows paths: C:\..., D:\..., etc.
    let message = error.message
      .replace(/[A-Z]:\\(?:[^\s"'<>|]+\\?)+/gi, '[PATH]')
      // Unix absolute paths starting with / but not matching single forward slashes
      .replace(/\/(?:[a-zA-Z0-9_.-]+\/)+[a-zA-Z0-9_.-]*/g, '[PATH]');

    // Add user-friendly messages based on category
    switch (category) {
      case ErrorCategory.PERMISSION:
        message = `Permission denied. ${message}`;
        break;
      case ErrorCategory.TIMEOUT:
        message = `Operation timed out. ${message}`;
        break;
      case ErrorCategory.NOT_FOUND:
        message = `Resource not found. ${message}`;
        break;
      case ErrorCategory.RATE_LIMIT:
        message = `Too many requests. ${message}`;
        break;
    }

    return {
      message,
      category,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    };
  }

  return {
    message: 'An unknown error occurred',
    category: ErrorCategory.UNKNOWN,
  };
}

/**
 * Circuit breaker for failing operations
 */
export class CircuitBreaker {
  private failureCount = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(
    private readonly threshold: number = 5,
    private readonly timeout: number = 60000, // 1 minute
    private readonly halfOpenAttempts: number = 1
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.threshold) {
      this.state = 'OPEN';
    }
  }

  getState(): string {
    return this.state;
  }

  reset(): void {
    this.failureCount = 0;
    this.lastFailureTime = 0;
    this.state = 'CLOSED';
  }
}

/**
 * Convert technical errors into user-friendly messages
 * Enhanced in v2.1.0
 */
export function getUserFriendlyErrorMessage(error: unknown, context: string): string {
  if (!(error instanceof Error)) {
    return `Unable to ${context}. Please try again.`;
  }

  const message = error.message.toLowerCase();
  
  // Permission errors
  if (message.includes('permission') || message.includes('access denied') || message.includes('forbidden') || message.includes('eacces')) {
    return `⚠️ Permission denied. You may need administrator privileges to ${context}.`;
  }
  
  // Timeout errors
  if (message.includes('timeout') || message.includes('timed out')) {
    return `⏱️ Operation timed out while trying to ${context}. The service may be unresponsive.`;
  }
  
  // Not found errors
  if (message.includes('not found') || message.includes('does not exist') || message.includes('enoent')) {
    return `🔍 Service not found. It may have been removed or ${context} is unavailable.`;
  }
  
  // Service-specific errors
  if (message.includes('already running') || message.includes('already active')) {
    return `ℹ️ Service is already running. No action needed.`;
  }
  
  if (message.includes('already stopped') || message.includes('not running')) {
    return `ℹ️ Service is already stopped. No action needed.`;
  }
  
  if (message.includes('failed to start')) {
    return `❌ Failed to start service. Check service configuration and logs for details.`;
  }
  
  if (message.includes('connection') || message.includes('network')) {
    return `🌐 Connection error while trying to ${context}. Check your network connection.`;
  }
  
  // Rate limiting
  if (message.includes('rate limit') || message.includes('too many requests')) {
    return `⏸️ Too many requests. Please wait a moment before trying to ${context} again.`;
  }
  
  // Generic fallback with original message if it's short enough
  if (error.message.length < 100) {
    return `❌ Failed to ${context}: ${error.message}`;
  }
  
  return `❌ Failed to ${context}. Check the console for details.`;
}


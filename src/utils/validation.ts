export function isValidServiceId(serviceId: string): boolean {
  if (!serviceId || typeof serviceId !== 'string') {
    return false;
  }

  if (serviceId.length === 0 || serviceId.length > 256) {
    return false;
  }

  const dangerousPatterns = [
    /[;&|`$(){}[\]<>]/,
    /\.\./,
    /^-/,
    /[\x00-\x1f]/,
    /\s{2,}/,
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(serviceId)) {
      return false;
    }
  }

  return true;
}

export function isValidFilePath(filePath: string): boolean {
  if (!filePath || typeof filePath !== 'string') {
    return false;
  }

  if (filePath.length === 0 || filePath.length > 4096) {
    return false;
  }

  const dangerousPatterns = [
    /\.\./,
    /[;&|`$(){}[\]<>]/,
    /[\x00-\x1f]/,
    /^[~]/,
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(filePath)) {
      return false;
    }
  }

  return true;
}

export function sanitizeSearchQuery(query: string): string {
  if (!query || typeof query !== 'string') {
    return '';
  }

  const truncated = query.slice(0, 1000);

  return truncated.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function isValidServiceAction(action: string): boolean {
  const allowedActions = ['start', 'stop', 'restart', 'enable', 'disable'];
  return allowedActions.includes(action);
}

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

  message = message.replace(/[A-Za-z]:[\\\/][^\s"'<>|]+/g, '[path]');
  message = message.replace(/\/[^\s"'<>|]+/g, '[path]');

  message = message.replace(/\/home\/[^\/\s]+/g, '/home/[user]');
  message = message.replace(/\/Users\/[^\/\s]+/g, '/Users/[user]');
  message = message.replace(/C:\\Users\\[^\\]+/g, 'C:\\Users\\[user]');

  return message;
}

export class RateLimiter {
  private lastCallTime: Map<string, number> = new Map();
  private readonly cooldownMs: number;

  constructor(cooldownMs: number = 200) {
    this.cooldownMs = cooldownMs;
  }

  isAllowed(key: string): boolean {
    const now = Date.now();
    const lastCall = this.lastCallTime.get(key);

    if (!lastCall || now - lastCall >= this.cooldownMs) {
      this.lastCallTime.set(key, now);
      return true;
    }

    return false;
  }

  reset(key: string): void {
    this.lastCallTime.delete(key);
  }

  clear(): void {
    this.lastCallTime.clear();
  }
}

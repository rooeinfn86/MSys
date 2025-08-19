/**
 * Secure Logging Utility
 * Prevents sensitive data from being logged to console
 */

// List of sensitive keywords that should not be logged
const SENSITIVE_KEYWORDS = [
  'token', 'password', 'secret', 'key', 'auth', 'credential',
  'jwt', 'access_token', 'refresh_token', 'api_key', 'private_key',
  'user_id', 'company_id', 'email', 'phone', 'address', 'ssn',
  'credit_card', 'bank_account', 'social_security'
];

// List of sensitive patterns to check
const SENSITIVE_PATTERNS = [
  /Bearer\s+[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+/g, // JWT tokens
  /[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+/g, // JWT-like strings
  /[0-9]{4}-[0-9]{4}-[0-9]{4}-[0-9]{4}/g, // Credit card patterns
  /[0-9]{3}-[0-9]{2}-[0-9]{4}/g, // SSN patterns
];

/**
 * Sanitize data to remove sensitive information
 */
function sanitizeData(data) {
  if (typeof data === 'string') {
    let sanitized = data;
    
    // Remove JWT tokens
    sanitized = sanitized.replace(/Bearer\s+[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+/g, 'Bearer [REDACTED]');
    sanitized = sanitized.replace(/[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+/g, '[JWT_TOKEN]');
    
    // Remove other sensitive patterns
    sanitized = sanitized.replace(/[0-9]{4}-[0-9]{4}-[0-9]{4}-[0-9]{4}/g, '[CREDIT_CARD]');
    sanitized = sanitized.replace(/[0-9]{3}-[0-9]{2}-[0-9]{4}/g, '[SSN]');
    
    return sanitized;
  }
  
  if (typeof data === 'object' && data !== null) {
    const sanitized = {};
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      const isSensitive = SENSITIVE_KEYWORDS.some(keyword => lowerKey.includes(keyword));
      
      if (isSensitive) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = sanitizeData(value);
      }
    }
    return sanitized;
  }
  
  return data;
}

// Store original console methods to avoid infinite recursion
const originalConsole = {
  log: console.log,
  error: console.error,
  warn: console.warn,
  info: console.info
};

/**
 * Secure console.log that sanitizes sensitive data
 */
export function secureLog(...args) {
  const sanitizedArgs = args.map(arg => sanitizeData(arg));
  originalConsole.log(...sanitizedArgs);
}

/**
 * Secure console.error that sanitizes sensitive data
 */
export function secureError(...args) {
  const sanitizedArgs = args.map(arg => sanitizeData(arg));
  originalConsole.error(...sanitizedArgs);
}

/**
 * Secure console.warn that sanitizes sensitive data
 */
export function secureWarn(...args) {
  const sanitizedArgs = args.map(arg => sanitizeData(arg));
  originalConsole.warn(...sanitizedArgs);
}

/**
 * Secure console.info that sanitizes sensitive data
 */
export function secureInfo(...args) {
  const sanitizedArgs = args.map(arg => sanitizeData(arg));
  originalConsole.info(...sanitizedArgs);
}

/**
 * Check if a string contains sensitive data
 */
export function containsSensitiveData(str) {
  if (typeof str !== 'string') return false;
  
  const lowerStr = str.toLowerCase();
  return SENSITIVE_KEYWORDS.some(keyword => lowerStr.includes(keyword)) ||
         SENSITIVE_PATTERNS.some(pattern => pattern.test(str));
}

/**
 * Replace console methods with secure versions in development
 */
export function enableSecureLogging() {
  if (process.env.NODE_ENV === 'development') {
    // Store original methods
    const originalLog = originalConsole.log;
    const originalError = originalConsole.error;
    const originalWarn = originalConsole.warn;
    const originalInfo = originalConsole.info;
    
    // Replace with secure versions
    console.log = secureLog;
    console.error = secureError;
    console.warn = secureWarn;
    console.info = secureInfo;
    
    // Return function to restore original methods
    return () => {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
      console.info = originalInfo;
    };
  }
  
  return () => {};
}

export default {
  secureLog,
  secureError,
  secureWarn,
  secureInfo,
  containsSensitiveData,
  enableSecureLogging
}; 
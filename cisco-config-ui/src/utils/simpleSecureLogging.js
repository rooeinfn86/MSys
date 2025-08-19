/**
 * Simple Secure Logging Utility
 * Prevents sensitive data from being logged to console without infinite recursion
 */

// List of sensitive keywords that should not be logged
const SENSITIVE_KEYWORDS = [
  'token', 'password', 'secret', 'key', 'auth', 'credential',
  'jwt', 'access_token', 'refresh_token', 'api_key', 'private_key',
  'user_id', 'company_id', 'email', 'phone', 'address', 'ssn',
  'credit_card', 'bank_account', 'social_security'
];

/**
 * Simple sanitization function
 */
function simpleSanitize(data) {
  if (typeof data === 'string') {
    // Remove JWT tokens
    let sanitized = data.replace(/Bearer\s+[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+/g, 'Bearer [REDACTED]');
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
        sanitized[key] = simpleSanitize(value);
      }
    }
    return sanitized;
  }
  
  return data;
}

/**
 * Secure console methods that use original console to avoid recursion
 */
const originalConsole = {
  log: console.log.bind(console),
  error: console.error.bind(console),
  warn: console.warn.bind(console),
  info: console.info.bind(console)
};

export function secureLog(...args) {
  const sanitizedArgs = args.map(arg => simpleSanitize(arg));
  originalConsole.log(...sanitizedArgs);
}

export function secureError(...args) {
  const sanitizedArgs = args.map(arg => simpleSanitize(arg));
  originalConsole.error(...sanitizedArgs);
}

export function secureWarn(...args) {
  const sanitizedArgs = args.map(arg => simpleSanitize(arg));
  originalConsole.warn(...sanitizedArgs);
}

export function secureInfo(...args) {
  const sanitizedArgs = args.map(arg => simpleSanitize(arg));
  originalConsole.info(...sanitizedArgs);
}

/**
 * Enable secure logging (simplified version)
 */
export function enableSimpleSecureLogging() {
  if (process.env.NODE_ENV === 'development') {
    // Store original methods
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;
    const originalInfo = console.info;
    
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
  enableSimpleSecureLogging
}; 
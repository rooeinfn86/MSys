/**
 * Robust Secure Logging Utility
 * Prevents sensitive data from being logged to console with proper error handling
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
 * Safely sanitize data to remove sensitive information
 */
function sanitizeData(data, depth = 0) {
  // Prevent infinite recursion
  if (depth > 10) {
    return '[MAX_DEPTH_EXCEEDED]';
  }

  try {
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
      // Handle arrays
      if (Array.isArray(data)) {
        return data.map(item => sanitizeData(item, depth + 1));
      }
      
      // Handle objects
      const sanitized = {};
      for (const [key, value] of Object.entries(data)) {
        const lowerKey = key.toLowerCase();
        const isSensitive = SENSITIVE_KEYWORDS.some(keyword => lowerKey.includes(keyword));
        
        if (isSensitive) {
          sanitized[key] = '[REDACTED]';
        } else {
          sanitized[key] = sanitizeData(value, depth + 1);
        }
      }
      return sanitized;
    }
    
    return data;
  } catch (error) {
    return '[SANITIZATION_ERROR]';
  }
}

/**
 * Check if a string contains sensitive data
 */
function containsSensitiveData(str) {
  if (typeof str !== 'string') return false;
  
  const lowerStr = str.toLowerCase();
  return SENSITIVE_KEYWORDS.some(keyword => lowerStr.includes(keyword)) ||
         SENSITIVE_PATTERNS.some(pattern => pattern.test(str));
}

// Store original console methods to avoid infinite recursion
const originalConsole = {
  log: console.log.bind(console),
  error: console.error.bind(console),
  warn: console.warn.bind(console),
  info: console.info.bind(console)
};

/**
 * Secure console methods
 */
export function secureLog(...args) {
  try {
    const sanitizedArgs = args.map(arg => sanitizeData(arg));
    originalConsole.log(...sanitizedArgs);
  } catch (error) {
    // Fallback to original console if sanitization fails
    originalConsole.log('[SECURE_LOGGING_ERROR]', ...args);
  }
}

export function secureError(...args) {
  try {
    const sanitizedArgs = args.map(arg => sanitizeData(arg));
    originalConsole.error(...sanitizedArgs);
  } catch (error) {
    originalConsole.error('[SECURE_LOGGING_ERROR]', ...args);
  }
}

export function secureWarn(...args) {
  try {
    const sanitizedArgs = args.map(arg => sanitizeData(arg));
    originalConsole.warn(...sanitizedArgs);
  } catch (error) {
    originalConsole.warn('[SECURE_LOGGING_ERROR]', ...args);
  }
}

export function secureInfo(...args) {
  try {
    const sanitizedArgs = args.map(arg => sanitizeData(arg));
    originalConsole.info(...sanitizedArgs);
  } catch (error) {
    originalConsole.info('[SECURE_LOGGING_ERROR]', ...args);
  }
}

/**
 * Enable secure logging with proper error handling
 */
export function enableRobustSecureLogging() {
  if (process.env.NODE_ENV === 'development') {
    try {
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
      
      // Log that secure logging is enabled
      originalConsole.log('🔒 Secure logging enabled - sensitive data will be redacted');
      
      // Return function to restore original methods
      return () => {
        try {
          console.log = originalLog;
          console.error = originalError;
          console.warn = originalWarn;
          console.info = originalInfo;
          originalConsole.log('🔓 Secure logging disabled');
        } catch (error) {
          originalConsole.error('Error disabling secure logging:', error);
        }
      };
    } catch (error) {
      originalConsole.error('Error enabling secure logging:', error);
      return () => {};
    }
  }
  
  return () => {};
}

/**
 * Test secure logging functionality
 */
export function testSecureLogging() {
  const testData = {
    user: {
      email: 'admin@company.com',
      phone: '555-123-4567',
      token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      password: 'secret123'
    },
    api_key: 'sk_live_1234567890',
    credit_card: '1234-5678-9012-3456'
  };
  
  console.log('Testing secure logging with sensitive data:', testData);
  console.warn('Warning with sensitive data:', testData);
  console.error('Error with sensitive data:', testData);
}

export default {
  secureLog,
  secureError,
  secureWarn,
  secureInfo,
  enableRobustSecureLogging,
  testSecureLogging,
  containsSensitiveData
}; 
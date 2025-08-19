/**
 * Secure Storage Utility
 * Provides encrypted storage for sensitive data and secure token management
 */

// Generate a consistent encryption key
function generateEncryptionKey() {
  try {
    // Use a combination of browser fingerprinting for consistency
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('Cisco AI Security Key', 2, 2);
    
    const canvasData = canvas.toDataURL();
    const userAgent = navigator.userAgent;
    const screenSize = `${window.screen.width}x${window.screen.height}`;
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    // Create a consistent seed
    const seed = `${canvasData}${userAgent}${screenSize}${timezone}cisco-ai-2024`;
    
    // Simple but effective key derivation
    let key = '';
    for (let i = 0; i < 32; i++) {
      const charCode = seed.charCodeAt(i % seed.length);
      key += String.fromCharCode((charCode * 7 + i * 13) % 94 + 33); // Printable ASCII
    }
    
    return key;
  } catch (error) {
    // Fallback for browsers that don't support canvas or have restrictions
    console.warn('Canvas fingerprinting failed, using fallback key');
    const fallbackSeed = `${navigator.userAgent}${window.screen.width}x${window.screen.height}cisco-ai-2024`;
    let key = '';
    for (let i = 0; i < 32; i++) {
      const charCode = fallbackSeed.charCodeAt(i % fallbackSeed.length);
      key += String.fromCharCode((charCode * 7 + i * 13) % 94 + 33);
    }
    return key;
  }
}

// Initialize encryption key
const ENCRYPTION_KEY = generateEncryptionKey();

/**
 * Secure XOR encryption with improved error handling
 */
function encrypt(data) {
  try {
    if (!data) return null;
    
    const stringData = typeof data === 'string' ? data : JSON.stringify(data);
    const timestamp = Date.now().toString();
    const payload = `${timestamp}|${stringData}`;
    
    let encrypted = '';
    
    // XOR encryption with key rotation
    for (let i = 0; i < payload.length; i++) {
      const keyIndex = i % ENCRYPTION_KEY.length;
      const dataChar = payload.charCodeAt(i);
      const keyChar = ENCRYPTION_KEY.charCodeAt(keyIndex);
      const encryptedChar = dataChar ^ keyChar ^ (i % 256);
      encrypted += String.fromCharCode(encryptedChar);
    }
    
    // Base64 encode for safe storage
    return btoa(encrypted);
  } catch (error) {
    console.error('Encryption error:', error);
    return null;
  }
}

/**
 * Secure XOR decryption with improved error handling
 */
function decrypt(encryptedData) {
  try {
    if (!encryptedData) return null;
    
    // Base64 decode
    const encrypted = atob(encryptedData);
    let decrypted = '';
    
    // XOR decryption with key rotation
    for (let i = 0; i < encrypted.length; i++) {
      const keyIndex = i % ENCRYPTION_KEY.length;
      const encryptedChar = encrypted.charCodeAt(i);
      const keyChar = ENCRYPTION_KEY.charCodeAt(keyIndex);
      const decryptedChar = encryptedChar ^ keyChar ^ (i % 256);
      decrypted += String.fromCharCode(decryptedChar);
    }
    
    // Split timestamp and data
    const parts = decrypted.split('|', 2);
    if (parts.length !== 2) {
      throw new Error('Invalid encrypted data format');
    }
    
    const timestamp = parseInt(parts[0]);
    const data = parts[1];
    
    // Check if data is too old (24 hours)
    const age = Date.now() - timestamp;
    if (age > 24 * 60 * 60 * 1000) {
      throw new Error('Encrypted data has expired');
    }
    
    return data;
  } catch (error) {
    console.error('Decryption error:', error);
    return null;
  }
}

/**
 * Secure Storage Class
 * Handles encrypted localStorage operations
 */
class SecureStorage {
  constructor() {
    this.prefix = 'cisco_secure_';
  }

  /**
   * Store data securely with encryption
   */
  setItem(key, value) {
    try {
      const encryptedValue = encrypt(value);
      if (!encryptedValue) {
        throw new Error('Failed to encrypt data');
      }
      
      localStorage.setItem(this.prefix + key, encryptedValue);
      return true;
    } catch (error) {
      console.error('Secure storage setItem error:', error);
      return false;
    }
  }

  /**
   * Retrieve and decrypt data
   */
  getItem(key) {
    try {
      const encryptedValue = localStorage.getItem(this.prefix + key);
      if (!encryptedValue) {
        return null;
      }
      
      const decryptedValue = decrypt(encryptedValue);
      return decryptedValue;
    } catch (error) {
      console.error('Secure storage getItem error:', error);
      // If decryption fails, remove the corrupted item
      this.removeItem(key);
      return null;
    }
  }

  /**
   * Remove item from storage
   */
  removeItem(key) {
    try {
      localStorage.removeItem(this.prefix + key);
      return true;
    } catch (error) {
      console.error('Secure storage removeItem error:', error);
      return false;
    }
  }

  /**
   * Check if item exists
   */
  hasItem(key) {
    try {
      return localStorage.getItem(this.prefix + key) !== null;
    } catch (error) {
      return false;
    }
  }

  /**
   * Clear all secure storage items
   */
  clear() {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(this.prefix)) {
          localStorage.removeItem(key);
        }
      });
      return true;
    } catch (error) {
      console.error('Secure storage clear error:', error);
      return false;
    }
  }
}

/**
 * Token Manager Class
 * Handles JWT token storage and validation
 */
class TokenManager {
  constructor() {
    this.storage = new SecureStorage();
    this.tokenKey = 'access_token';
    this.userDataKey = 'user_data';
  }

  /**
   * Store JWT token securely
   */
  setToken(token) {
    try {
      if (!token) {
        throw new Error('Token is required');
      }
      
      // Try secure storage first
      let success = this.storage.setItem(this.tokenKey, token);
      
      // Chrome fallback: if secure storage fails, try localStorage
      if (!success) {
        console.warn('Secure storage failed, trying localStorage fallback for Chrome');
        try {
          localStorage.setItem(this.tokenKey, token);
          success = true;
        } catch (localError) {
          console.error('LocalStorage fallback also failed:', localError);
        }
      }
      
      if (!success) {
        throw new Error('Failed to store token in any storage method');
      }
      
      return true;
    } catch (error) {
      console.error('Token storage error:', error);
      return false;
    }
  }

  /**
   * Get JWT token
   */
  getToken() {
    try {
      // Try secure storage first
      let token = this.storage.getItem(this.tokenKey);
      
      // Chrome fallback: if secure storage fails, try localStorage
      if (!token) {
        console.warn('Secure storage retrieval failed, trying localStorage fallback for Chrome');
        try {
          token = localStorage.getItem(this.tokenKey);
        } catch (localError) {
          console.error('LocalStorage fallback retrieval failed:', localError);
        }
      }
      
      return token;
    } catch (error) {
      console.error('Token retrieval error:', error);
      return null;
    }
  }

  /**
   * Remove JWT token
   */
  removeToken() {
    try {
      return this.storage.removeItem(this.tokenKey);
    } catch (error) {
      console.error('Token removal error:', error);
      return false;
    }
  }

  /**
   * Check if token exists
   */
  hasToken() {
    return this.storage.hasItem(this.tokenKey);
  }

  /**
   * Store user data securely
   */
  setUserData(userData) {
    try {
      if (!userData) {
        throw new Error('User data is required');
      }
      
      // Try secure storage first
      let success = this.storage.setItem(this.userDataKey, JSON.stringify(userData));
      
      // Chrome fallback: if secure storage fails, try localStorage
      if (!success) {
        console.warn('Secure storage failed, trying localStorage fallback for Chrome');
        try {
          localStorage.setItem(this.userDataKey, JSON.stringify(userData));
          success = true;
        } catch (localError) {
          console.error('LocalStorage fallback also failed:', localError);
        }
      }
      
      if (!success) {
        throw new Error('Failed to store user data in any storage method');
      }
      
      return true;
    } catch (error) {
      console.error('User data storage error:', error);
      return false;
    }
  }

  /**
   * Get user data
   */
  getUserData() {
    try {
      // Try secure storage first
      let data = this.storage.getItem(this.userDataKey);
      
      // Chrome fallback: if secure storage fails, try localStorage
      if (!data) {
        console.warn('Secure storage retrieval failed, trying localStorage fallback for Chrome');
        try {
          data = localStorage.getItem(this.userDataKey);
        } catch (localError) {
          console.error('LocalStorage fallback retrieval failed:', localError);
        }
      }
      
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('User data retrieval error:', error);
      return null;
    }
  }

  /**
   * Remove user data
   */
  removeUserData() {
    try {
      return this.storage.removeItem(this.userDataKey);
    } catch (error) {
      console.error('User data removal error:', error);
      return false;
    }
  }

  /**
   * Clear all secure data
   */
  clearAll() {
    try {
      this.removeToken();
      this.removeUserData();
      return true;
    } catch (error) {
      console.error('Clear all error:', error);
      return false;
    }
  }

  /**
   * Validate token format and expiration
   */
  isValidToken(token) {
    try {
      if (!token || typeof token !== 'string') {
        return false;
      }
      
      // Basic JWT format validation
      const parts = token.split('.');
      if (parts.length !== 3) {
        return false;
      }
      
      // Decode and validate payload
      const payload = JSON.parse(atob(parts[1]));
      const now = Math.floor(Date.now() / 1000);
      
      // Check expiration
      if (payload.exp && payload.exp < now) {
        return false;
      }
      
      // Check issued at (not too old)
      if (payload.iat && (now - payload.iat) > 86400) { // 24 hours
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Token validation error:', error);
      return false;
    }
  }
}

// Create singleton instances
export const secureStorage = new SecureStorage();
export const tokenManager = new TokenManager();

// Export individual functions for convenience
export const secureSetItem = (key, value) => secureStorage.setItem(key, value);
export const secureGetItem = (key) => secureStorage.getItem(key);
export const secureRemoveItem = (key) => secureStorage.removeItem(key);
export const secureClear = () => secureStorage.clear();

// eslint-disable-next-line import/no-anonymous-default-export
export default {
  secureStorage,
  tokenManager,
  secureSetItem,
  secureGetItem,
  secureRemoveItem,
  secureClear
}; 
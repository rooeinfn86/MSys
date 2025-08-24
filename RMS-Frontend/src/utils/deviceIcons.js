// Device icon management utilities

/**
 * Get the appropriate icon URL for a device type
 * @param {string} iconType - Device icon type
 * @returns {string} Icon URL
 */
export const getIconUrl = (iconType) => {
  const basePath = process.env.PUBLIC_URL || '';
  
  if (iconType === 'router') {
    return `${basePath}/images/network-icons/router-cisco.png`;
  } else if (iconType === 'switch') {
    return `${basePath}/images/network-icons/switch-cisco.png`;
  }
  return `${basePath}/images/network-icons/switch-cisco.png`; // default
};

/**
 * Get device icon based on device type
 * @param {string} deviceType - Device type string
 * @returns {string} Icon URL
 */
export const getDeviceIcon = (deviceType) => {
  if (!deviceType) return getIconUrl('switch');
  
  const type = deviceType.toLowerCase();
  
  if (type.includes('router')) return getIconUrl('router');
  if (type.includes('switch')) return getIconUrl('switch');
  if (type.includes('firewall')) return getIconUrl('switch'); // Use switch icon for firewall
  if (type.includes('ap')) return getIconUrl('switch'); // Use switch icon for access points
  if (type.includes('server')) return getIconUrl('switch'); // Use switch icon for servers
  if (type.includes('appliance')) return getIconUrl('switch'); // Use switch icon for appliances
  
  return getIconUrl('switch'); // default
};

/**
 * Get icon dimensions for device type
 * @param {string} deviceType - Device type string
 * @returns {Object} Icon dimensions {width, height}
 */
export const getIconDimensions = (deviceType) => {
  if (!deviceType) return { width: 64, height: 64 };
  
  const type = deviceType.toLowerCase();
  
  if (type.includes('router')) return { width: 64, height: 64 };
  if (type.includes('switch')) return { width: 64, height: 64 };
  if (type.includes('firewall')) return { width: 64, height: 64 };
  if (type.includes('ap')) return { width: 48, height: 48 };
  if (type.includes('server')) return { width: 56, height: 56 };
  if (type.includes('appliance')) return { width: 64, height: 64 };
  
  return { width: 64, height: 64 }; // default
};

/**
 * Check if device type supports custom icons
 * @param {string} deviceType - Device type string
 * @returns {boolean} True if custom icon is available
 */
export const hasCustomIcon = (deviceType) => {
  if (!deviceType) return false;
  
  const type = deviceType.toLowerCase();
  
  return type.includes('router') || type.includes('switch');
};

/**
 * Get fallback icon for unsupported device types
 * @returns {string} Fallback icon URL
 */
export const getFallbackIcon = () => {
  const basePath = process.env.PUBLIC_URL || '';
  return `${basePath}/images/network-icons/switch-cisco.png`;
};

/**
 * Validate icon URL and return fallback if invalid
 * @param {string} iconUrl - Icon URL to validate
 * @returns {string} Valid icon URL or fallback
 */
export const validateIconUrl = (iconUrl) => {
  if (!iconUrl) return getFallbackIcon();
  
  // Check if URL is valid
  try {
    new URL(iconUrl);
    return iconUrl;
  } catch (error) {
    console.warn('Invalid icon URL, using fallback:', iconUrl);
    return getFallbackIcon();
  }
}; 
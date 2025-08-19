// Utility functions for network topology management

/**
 * Calculate device status color based on ping and SNMP status
 * @param {Object} device - Device object with status properties
 * @returns {string} Status color: 'green', 'orange', or 'red'
 */
export const getDeviceStatusColor = (device) => {
  console.log('getDeviceStatusColor called with device:', device);
  
  if (!device.is_active) {
    console.log('Device is not active, returning red');
    return 'red';
  }
  
  const pingStatus = device.ping_status ?? false;
  const snmpStatus = device.snmp_status ?? true;  // Default to true if not set
  
  console.log('Status values:', { pingStatus, snmpStatus });
  
  // Green: Both ping and SNMP are working
  // Orange: Ping is working but SNMP is not working (or not configured)
  // Red: Ping is not working
  if (pingStatus && snmpStatus) {
    console.log('Both ping and SNMP working, returning green');
    return 'green';
  } else if (pingStatus) {
    console.log('Only ping working, returning orange');
    return 'orange';
  } else {
    console.log('Neither ping nor SNMP working, returning red');
    return 'red';
  }
};

/**
 * Get device category based on device type
 * @param {string} deviceType - Device type string
 * @returns {string} Device category
 */
export const getDeviceCategory = (deviceType) => {
  if (!deviceType) return 'unknown';
  
  const type = deviceType.toLowerCase();
  
  if (type.includes('router')) return 'router';
  if (type.includes('switch')) return 'switch';
  if (type.includes('firewall')) return 'firewall';
  if (type.includes('ap')) return 'access point';
  if (type.includes('server')) return 'server';
  if (type.includes('appliance')) return 'appliance';
  
  return 'unknown';
};

/**
 * Format interface names for display
 * @param {string} interfaceName - Raw interface name
 * @returns {string} Formatted interface name
 */
export const formatInterfaceName = (interfaceName) => {
  if (!interfaceName) return 'Unknown';
  
  let formatted = interfaceName;
  
  // Replace long interface names with abbreviations
  formatted = formatted.replace("GigabitEthernet", "Gi");
  formatted = formatted.replace("FastEthernet", "Fa");
  formatted = formatted.replace("TenGigabitEthernet", "Te");
  formatted = formatted.replace("Ethernet", "Eth");
  formatted = formatted.replace("Loopback", "Lo");
  formatted = formatted.replace("Vlan", "Vl");
  formatted = formatted.replace("Port-channel", "Po");
  
  return formatted;
};

/**
 * Clean string by removing null bytes and other invalid characters
 * @param {string} value - String to clean
 * @returns {string} Cleaned string
 */
export const cleanString = (value) => {
  if (!value) return "";
  // Remove null bytes and other control characters
  return value.toString().replace(/[\u0000-\u001F\u007F]/g, '');
};

/**
 * Safely convert SNMP values to integers
 * @param {any} value - Value to convert
 * @param {number} defaultValue - Default value if conversion fails
 * @returns {number} Converted integer
 */
export const safeIntConvert = (value, defaultValue = 0) => {
  try {
    if (typeof value === 'string') {
      // Remove any non-numeric characters except decimal points
      const cleaned = value.replace(/[^\d.]/g, '');
      if (cleaned) {
        return parseInt(parseFloat(cleaned));
      }
      return defaultValue;
    } else if (typeof value === 'number') {
      return parseInt(value);
    } else {
      return defaultValue;
    }
  } catch (error) {
    console.error('Error converting value to integer:', error);
    return defaultValue;
  }
};

/**
 * Extract numeric value from string (e.g., "25%" -> 25)
 * @param {string} value - String containing numeric value
 * @returns {number} Extracted number or 0
 */
export const extractNumericValue = (value) => {
  if (!value) return 0;
  
  try {
    const match = value.toString().match(/(\d+(?:\.\d+)?)/);
    return match ? parseFloat(match[1]) : 0;
  } catch (error) {
    console.error('Error extracting numeric value:', error);
    return 0;
  }
};

/**
 * Calculate memory usage percentage
 * @param {number} used - Used memory in GB
 * @param {number} total - Total memory in GB
 * @returns {number} Memory usage percentage
 */
export const calculateMemoryUsage = (used, total) => {
  if (!used || !total || total === 0) return 0;
  return Math.round((used / total) * 100);
};

/**
 * Get status from numeric value based on thresholds
 * @param {number} value - Current value
 * @param {number} warningThreshold - Warning threshold
 * @param {number} criticalThreshold - Critical threshold
 * @returns {string} Status: 'normal', 'warning', or 'critical'
 */
export const getStatusFromThreshold = (value, warningThreshold = 80, criticalThreshold = 95) => {
  if (value >= criticalThreshold) return 'critical';
  if (value >= warningThreshold) return 'warning';
  return 'normal';
};

/**
 * Get temperature status based on temperature value
 * @param {number} temperature - Temperature in Celsius
 * @returns {string} Status: 'normal', 'warning', or 'critical'
 */
export const getTemperatureStatus = (temperature) => {
  if (temperature >= 80) return 'critical';
  if (temperature >= 60) return 'warning';
  return 'normal';
};

/**
 * Get power status from status string
 * @param {string} status - Power status string
 * @returns {string} Normalized status
 */
export const getPowerStatus = (status) => {
  if (!status) return 'unknown';
  
  const normalizedStatus = status.toString().trim().toUpperCase();
  return ['OK', 'GOOD', 'NORMAL'].includes(normalizedStatus) ? 'normal' : 'critical';
}; 
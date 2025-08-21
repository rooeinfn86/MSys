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
  // eslint-disable-next-line no-control-regex
  return value.toString().replace(/[\x00-\x1F\x7F]/g, '');
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

/**
 * Format uptime string from centiseconds to human readable format
 * @param {string} uptimeString - Uptime in centiseconds as string
 * @returns {string} Formatted uptime string (e.g., "2d 5h 30m 15s")
 */
export const formatUptime = (uptimeString) => {
  if (!uptimeString || uptimeString === 'Not available') return 'Not available';
  
  try {
    // Parse uptime string like "1234567890" (hundredths of seconds / centiseconds)
    const uptimeCentiseconds = parseInt(uptimeString);
    
    if (isNaN(uptimeCentiseconds)) {
      console.error('Invalid uptime value - not a number:', uptimeString);
      return uptimeString;
    }
    
    const uptimeSeconds = Math.floor(uptimeCentiseconds / 100);
    
    const days = Math.floor(uptimeSeconds / 86400);
    const hours = Math.floor((uptimeSeconds % 86400) / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);
    const seconds = uptimeSeconds % 60;
    
    // Build the formatted string
    let result = '';
    if (days > 0) {
      result += `${days}d `;
    }
    if (hours > 0 || days > 0) {
      result += `${hours}h `;
    }
    if (minutes > 0 || hours > 0 || days > 0) {
      result += `${minutes}m `;
    }
    result += `${seconds}s`;
    
    return result;
    
  } catch (error) {
    console.error('Error parsing uptime:', error, 'Original value:', uptimeString);
    return uptimeString;
  }
};

/**
 * Transform topology data to Cytoscape elements format
 * @param {Array} nodes - Array of topology nodes
 * @param {Array} links - Array of topology links
 * @returns {Array} Cytoscape elements array
 */
export const transformTopologyToCytoscape = (nodes, links) => {
  if (!nodes || !links) return [];
  
  const cytoscapeElements = [
    ...nodes.map(node => {
      console.log('Processing node:', node);
      console.log('Node data:', node.data);
      console.log('Device status data:', {
        ping_status: node.data?.ping_status,
        snmp_status: node.data?.snmp_status,
        is_active: node.data?.is_active
      });
      
      // Calculate device status for display (but don't override visual styling)
      const statusColor = getDeviceStatusColor(node.data);
      console.log('Calculated status color:', statusColor, 'for device:', node.data?.label);
      
      const transformedNode = {
        data: {
          id: node.id,
          label: node.label,
          type: node.data?.type || node.type, // Use device type (e.g., 'Switch') instead of 'device'
          deviceType: node.data?.type,
          platform: node.data?.platform,
          ...node.data,
          // Add status information for display purposes only
          statusColor: statusColor,
          pingStatus: node.data?.ping_status ?? false,
          snmpStatus: node.data?.snmp_status ?? true,
          isActive: node.data?.is_active ?? true,
          // Add simple device category for styling (without forcing shapes)
          deviceCategory: getDeviceCategory(node.data?.type)
        }
      };
      
      // Debug: Log the transformed node data
      console.log('🎯 Transformed node data:', transformedNode.data);
      console.log('🎯 Final type field:', transformedNode.data.type);
      
      return transformedNode;
    }),
    ...links.map(link => ({
      data: {
        source: link.source,
        target: link.target,
        type: link.type,
        ...link.data
      }
    }))
  ];

  return cytoscapeElements;
};

/**
 * Extract device ID from node ID
 * @param {string} nodeId - Node ID (format: "device_123")
 * @returns {string} Device ID
 */
export const extractDeviceId = (nodeId) => {
  if (!nodeId) return '';
  return nodeId.replace('device_', '');
};

/**
 * Get device status text based on status color
 * @param {string} statusColor - Status color ('green', 'orange', 'red')
 * @returns {string} Human readable status text
 */
export const getDeviceStatusText = (statusColor) => {
  switch (statusColor) {
    case 'green':
      return 'Online (Ping + SNMP)';
    case 'orange':
      return 'Partial (Ping only)';
    case 'red':
      return 'Offline';
    default:
      return 'Unknown';
  }
}; 
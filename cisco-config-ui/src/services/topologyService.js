import api from '../utils/axios';

/**
 * Topology Service - Handles all topology-related API operations
 */
export const topologyService = {
  /**
   * Fetch topology data for a network
   * @param {string} networkId - Network ID
   * @param {boolean} forceRefresh - Whether to force refresh and bypass cache
   * @returns {Promise<Object>} Topology data with nodes and links
   */
  async fetchTopology(networkId, forceRefresh = false) {
    try {
      // Use device inventory data instead of separate topology data
      // This ensures we get the same real-time status as the device inventory
      const devicesResponse = await api.get(`/api/v1/devices/?network_id=${networkId}`);
      const devices = devicesResponse.data;
      
      if (!devices || devices.length === 0) {
        throw new Error('No devices found in network');
      }
      
      // Convert devices to topology nodes format
      const nodes = devices.map(device => ({
        id: `device_${device.id}`,
        label: device.name,
        type: 'device',
        data: {
          ...device,
          // Ensure status fields are properly set
          ping_status: device.ping_status || false,
          snmp_status: device.snmp_status || false,
          is_active: device.is_active || false
        }
      }));
      
      // For now, return empty links (can be enhanced later)
      const links = [];
      
      console.log('🔄 Topology using device inventory data:', {
        networkId,
        deviceCount: devices.length,
        devices: devices.map(d => ({ id: d.id, name: d.name, status: { ping: d.ping_status, snmp: d.snmp_status, active: d.is_active } }))
      });
      
      return { nodes, links };
    } catch (error) {
      console.error('Error fetching topology:', error);
      throw new Error('Failed to load network topology');
    }
  },

  /**
   * Trigger topology discovery for a network
   * @param {string} networkId - Network ID
   * @returns {Promise<Object>} Discovery response
   */
  async triggerTopologyDiscovery(networkId) {
    try {
      const response = await api.post(`/api/v1/topology/${networkId}/discover`);
      return response.data;
    } catch (error) {
      console.error('Error triggering topology discovery:', error);
      throw new Error('Failed to trigger topology discovery');
    }
  },

  /**
   * Clear topology cache for a network
   * @param {string} networkId - Network ID
   * @returns {Promise<Object>} Cache clear response
   */
  async clearTopologyCache(networkId) {
    try {
      const response = await api.delete(`/api/v1/topology/${networkId}/cache`);
      console.log('Topology cache cleared');
      return response.data;
    } catch (error) {
      console.log('Could not clear cache (this is okay):', error);
      // This is not a critical error, so we don't throw
      return null;
    }
  },

  /**
   * Refresh topology with discovery
   * @param {string} networkId - Network ID
   * @returns {Promise<Object>} Refreshed topology data
   */
  async refreshTopology(networkId) {
    try {
      // First, clear the topology cache to ensure fresh data
      await this.clearTopologyCache(networkId);
      
      // Then, trigger topology discovery
      await this.triggerTopologyDiscovery(networkId);
      
      // Then fetch the updated topology data
      return await this.fetchTopology(networkId, false);
    } catch (error) {
      console.error('Error refreshing topology:', error);
      throw new Error('Failed to refresh network topology');
    }
  },

  /**
   * Get device information from topology
   * @param {string} networkId - Network ID
   * @param {string} deviceId - Device ID
   * @returns {Promise<Object>} Device information
   */
  async getDeviceInfo(networkId, deviceId) {
    try {
      const response = await api.get(`/api/v1/topology/${networkId}/device/${deviceId}/info`);
      return response.data;
    } catch (error) {
      console.error('Error fetching device info:', error);
      throw new Error('Failed to fetch device information');
    }
  },

  /**
   * Get device interface information
   * @param {string} networkId - Network ID
   * @param {string} deviceId - Device ID
   * @returns {Promise<Object>} Interface information
   */
  async getDeviceInterfaces(networkId, deviceId) {
    try {
      const response = await api.get(`/api/v1/topology/${networkId}/device/${deviceId}/interfaces`);
      return response.data;
    } catch (error) {
      console.error('Error fetching interface info:', error);
      throw new Error('Failed to load interface information');
    }
  },

  /**
   * Get device system health information
   * @param {string} networkId - Network ID
   * @param {string} deviceId - Device ID
   * @returns {Promise<Object>} System health information
   */
  async getDeviceHealth(networkId, deviceId) {
    try {
      const response = await api.get(`/api/v1/topology/${networkId}/device/${deviceId}/health`);
      return response.data;
    } catch (error) {
      console.error('Error fetching system health:', error);
      throw new Error('Failed to load system health information');
    }
  },

  /**
   * Discover neighbors for a specific device
   * @param {string} networkId - Network ID
   * @param {string} deviceId - Device ID
   * @returns {Promise<Object>} Discovery response
   */
  async discoverDeviceNeighbors(networkId, deviceId) {
    try {
      const response = await api.post(`/api/v1/topology/${networkId}/device/${deviceId}/discover`);
      return response.data;
    } catch (error) {
      console.error('Error discovering neighbors:', error);
      throw new Error('Failed to discover device neighbors');
    }
  },

  /**
   * Get topology statistics for a network
   * @param {string} networkId - Network ID
   * @returns {Promise<Object>} Topology statistics
   */
  async getTopologyStats(networkId) {
    try {
      const response = await api.get(`/api/v1/topology/${networkId}/stats`);
      return response.data;
    } catch (error) {
      console.error('Error fetching topology stats:', error);
      throw new Error('Failed to load topology statistics');
    }
  },

  /**
   * Export topology data in various formats
   * @param {string} networkId - Network ID
   * @param {string} format - Export format (json, xml, csv)
   * @returns {Promise<Object>} Export response
   */
  async exportTopology(networkId, format = 'json') {
    try {
      const response = await api.get(`/api/v1/topology/${networkId}/export?format=${format}`);
      return response.data;
    } catch (error) {
      console.error('Error exporting topology:', error);
      throw new Error('Failed to export topology data');
    }
  },

  /**
   * Import topology data
   * @param {string} networkId - Network ID
   * @param {Object} topologyData - Topology data to import
   * @returns {Promise<Object>} Import response
   */
  async importTopology(networkId, topologyData) {
    try {
      const response = await api.post(`/api/v1/topology/${networkId}/import`, topologyData);
      return response.data;
    } catch (error) {
      console.error('Error importing topology:', error);
      throw new Error('Failed to import topology data');
    }
  }
};

/**
 * Topology status monitoring service
 */
export const topologyMonitoringService = {
  /**
   * Start monitoring topology changes
   * @param {string} networkId - Network ID
   * @param {Function} onUpdate - Callback for topology updates
   * @returns {Function} Stop monitoring function
   */
  startMonitoring(networkId, onUpdate) {
    let isMonitoring = true;
    
    const pollTopology = async () => {
      if (!isMonitoring) return;
      
      try {
        const topology = await topologyService.fetchTopology(networkId, false);
        onUpdate(topology);
      } catch (error) {
        console.error('Error during topology monitoring:', error);
      }
      
      // Continue monitoring
      if (isMonitoring) {
        setTimeout(pollTopology, 30000); // Poll every 30 seconds
      }
    };
    
    // Start polling
    pollTopology();
    
    // Return stop function
    return () => {
      isMonitoring = false;
    };
  },

  /**
   * Get topology change history
   * @param {string} networkId - Network ID
   * @param {number} limit - Number of history entries to fetch
   * @returns {Promise<Array>} Change history
   */
  async getChangeHistory(networkId, limit = 100) {
    try {
      const response = await api.get(`/api/v1/topology/${networkId}/history?limit=${limit}`);
      return response.data || [];
    } catch (error) {
      console.error('Error fetching topology history:', error);
      return [];
    }
  }
}; 
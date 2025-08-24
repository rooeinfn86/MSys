import api from '../utils/axios';

// Discovery Operations
export const discoveryService = {
  // Start device discovery
  async startDeviceDiscovery(discoveryData) {
    try {
      const response = await api.post("/api/v1/devices/discovery/discover", discoveryData);
      
      if (!response.data) {
        throw new Error('Invalid response from discovery service');
      }

      return response.data;
    } catch (error) {
      console.error("❌ Failed to start device discovery:", error);
      throw error;
    }
  },

  // Check discovery status
  async checkDiscoveryStatus(scanId) {
    try {
      const response = await api.get(`/api/v1/devices/discovery/status/${scanId}`);
      
      if (!response.data) {
        throw new Error('Failed to check discovery status');
      }

      return response.data;
    } catch (error) {
      console.error("❌ Failed to check discovery status:", error);
      throw error;
    }
  },

  // Wait for discovery to complete
  async waitForDiscoveryCompletion(scanId, maxAttempts = 10) {
    try {
      let attempts = 0;

      while (attempts < maxAttempts) {
        const statusData = await this.checkDiscoveryStatus(scanId);
        
        if (statusData.status === 'completed') {
          return statusData;
        } else if (statusData.status === 'failed') {
          throw new Error('Device discovery failed');
        }

        // Wait before next attempt
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      }

      throw new Error('Discovery timeout - maximum attempts reached');
    } catch (error) {
      console.error("❌ Error waiting for discovery completion:", error);
      throw error;
    }
  },

  // Get discovered devices
  async getDiscoveredDevices(networkId, targetIp = null) {
    try {
      const response = await api.get(`/api/v1/devices/devices/?network_id=${networkId}`);
      
      if (!response.data) {
        throw new Error('Failed to fetch discovered devices');
      }

      const devices = response.data;
      
      // If looking for a specific IP, filter the results
      if (targetIp) {
        return devices.find(d => d.ip === targetIp);
      }

      return devices;
    } catch (error) {
      console.error("❌ Failed to get discovered devices:", error);
      throw error;
    }
  },

  // Start network discovery
  async startNetworkDiscovery(discoveryConfig) {
    try {
      const {
        network_id,
        start_ip,
        end_ip,
        discovery_method,
        credentials,
        snmp_config,
        agent_ids
      } = discoveryConfig;

      const response = await api.post("/api/v1/discovery/network", {
        network_id,
        start_ip,
        end_ip,
        discovery_method,
        credentials,
        snmp_config,
        agent_ids
      });

      if (!response.data) {
        throw new Error('Failed to start network discovery');
      }

      return response.data;
    } catch (error) {
      console.error("❌ Failed to start network discovery:", error);
      throw error;
    }
  },

  // Get discovery history
  async getDiscoveryHistory(networkId, limit = 50) {
    try {
      const response = await api.get(`/api/v1/discovery/history?network_id=${networkId}&limit=${limit}`);
      return response.data || [];
    } catch (error) {
      console.error("❌ Failed to get discovery history:", error);
      throw error;
    }
  },

  // Cancel ongoing discovery
  async cancelDiscovery(scanId) {
    try {
      const response = await api.post(`/api/v1/devices/discovery/cancel/${scanId}`);
      return response.data;
    } catch (error) {
      console.error("❌ Failed to cancel discovery:", error);
      throw error;
    }
  },

  // Topology discovery operations
  async startTopologyDiscovery(networkId) {
    try {
      const response = await api.post(`/api/v1/topology/${networkId}/discover`);
      return response.data;
    } catch (error) {
      console.error("❌ Failed to start topology discovery:", error);
      throw new Error('Failed to start topology discovery');
    }
  },

  async getTopologyDiscoveryStatus(networkId) {
    try {
      const response = await api.get(`/api/v1/topology/${networkId}/discovery/status`);
      return response.data;
    } catch (error) {
      console.error("❌ Failed to get topology discovery status:", error);
      throw new Error('Failed to get topology discovery status');
    }
  },

  async waitForTopologyDiscovery(networkId, maxAttempts = 30) {
    try {
      let attempts = 0;
      
      while (attempts < maxAttempts) {
        const status = await this.getTopologyDiscoveryStatus(networkId);
        
        if (status.status === 'completed') {
          return status;
        } else if (status.status === 'failed') {
          throw new Error('Topology discovery failed');
        }
        
        // Wait before next attempt
        await new Promise(resolve => setTimeout(resolve, 2000));
        attempts++;
      }
      
      throw new Error('Topology discovery timeout - maximum attempts reached');
    } catch (error) {
      console.error("❌ Error waiting for topology discovery:", error);
      throw error;
    }
  },

  async discoverDeviceNeighbors(networkId, deviceId) {
    try {
      const response = await api.post(`/api/v1/topology/${networkId}/device/${deviceId}/discover`);
      return response.data;
    } catch (error) {
      console.error("❌ Failed to discover device neighbors:", error);
      throw new Error('Failed to discover device neighbors');
    }
  },

  async getDiscoveryProgress(networkId) {
    try {
      const response = await api.get(`/api/v1/topology/${networkId}/discovery/progress`);
      return response.data;
    } catch (error) {
      console.error("❌ Failed to get discovery progress:", error);
      return { progress: 0, status: 'unknown' };
    }
  }
}; 
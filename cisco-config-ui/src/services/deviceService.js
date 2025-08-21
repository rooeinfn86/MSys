import api from '../utils/axios';

// Device CRUD Operations
export const deviceService = {
  // Fetch all devices for a network
  async fetchDevices(networkId) {
    try {
      console.log("Fetching devices for network:", networkId);
      const res = await api.get(`/api/v1/devices/?network_id=${networkId}`);
      const data = res.data;
      console.log("Raw device data from backend:", data);
      return data;
    } catch (err) {
      console.error("❌ Failed to fetch devices:", err);
      throw err;
    }
  },

  // Refresh a single device using agent discovery
  async refreshDevice(deviceId, networkId) {
    try {
      console.log("🔄 Refreshing device:", deviceId, "in network:", networkId);
      
      // First, get the device to find its agent
      const deviceResponse = await api.get(`/api/v1/devices/${deviceId}`);
      const device = deviceResponse.data;
      
      if (!device) {
        throw new Error('Device not found');
      }
      
      // Get the agent for this device's network
      const agentsResponse = await api.get('/api/v1/agents/all');
      const agents = agentsResponse.data;
      
      // Find an agent that can handle this network
      const agent = agents.find(a => a.organization_id === device.organization_id);
      
      if (!agent) {
        throw new Error('No agent available for this device');
      }
      
      // Trigger device refresh through the agent
      const refreshResponse = await api.post(`/api/v1/agents/${agent.id}/device/${deviceId}/refresh`, {
        network_id: networkId,
        device_id: deviceId
      });
      
      console.log("✅ Device refresh initiated:", refreshResponse.data);
      return refreshResponse.data;
    } catch (err) {
      console.error("❌ Failed to refresh device:", err);
      throw err;
    }
  },

  // Get detailed device information
  async getDeviceInfo(deviceId, networkId) {
    try {
      console.log("📋 Fetching device info:", deviceId, "in network:", networkId);
      
      // Get the device details
      const deviceResponse = await api.get(`/api/v1/devices/${deviceId}`);
      const device = deviceResponse.data;
      
      if (!device) {
        throw new Error('Device not found');
      }
      
      // Get device topology information if available
      let topologyInfo = null;
      try {
        const topologyResponse = await api.get(`/api/v1/topology/${networkId}/device/${deviceId}/info`);
        topologyInfo = topologyResponse.data;
      } catch (topoErr) {
        console.log("Topology info not available:", topoErr);
        // This is not critical, so we continue
      }
      
      // Combine device and topology information
      const deviceInfo = {
        ...device,
        agent_discovered_info: topologyInfo || {},
        last_updated: device.updated_at || device.created_at
      };
      
      console.log("✅ Device info fetched:", deviceInfo);
      return deviceInfo;
    } catch (err) {
      console.error("❌ Failed to fetch device info:", err);
      throw err;
    }
  },

  // Add/Edit device with discovery
  async addEditDevice(deviceData, editingDeviceId = null) {
    try {
      // First, check device connectivity and fetch information using discovery
      const discoveryResponse = await api.post("/api/v1/devices/discover", {
        network_id: deviceData.network_id,
        start_ip: deviceData.ip,
        end_ip: deviceData.ip,
        username: deviceData.username,
        password: deviceData.password,
        snmp_version: deviceData.snmp_version,
        community: deviceData.community,
        snmp_username: deviceData.snmp_username,
        auth_protocol: deviceData.auth_protocol,
        auth_password: deviceData.auth_password,
        priv_protocol: deviceData.priv_protocol,
        priv_password: deviceData.priv_password,
        snmp_port: parseInt(deviceData.snmp_port) || 161,
        discovery_method: 'manual'
      });

      if (!discoveryResponse.data.scan_id) {
        throw new Error('Invalid response from discovery service');
      }

      // Wait for discovery to complete
      let deviceInfo = null;
      let attempts = 0;
      const maxAttempts = 10;

      while (attempts < maxAttempts) {
        const statusResponse = await api.get(`/api/v1/devices/discover/status/${discoveryResponse.data.scan_id}`);

        if (!statusResponse.data) {
          throw new Error('Failed to check discovery status');
        }

        const statusData = statusResponse.data;
        
        if (statusData.status === 'completed') {
          // Get the discovered device information
          const devicesResponse = await api.get(`/api/v1/devices/?network_id=${deviceData.network_id}`);

          if (!devicesResponse.data) {
            throw new Error('Failed to fetch discovered device');
          }

          const devicesData = devicesResponse.data;
          deviceInfo = devicesData.find(d => d.ip === deviceData.ip);
          break;
        } else if (statusData.status === 'failed') {
          throw new Error('Device discovery failed');
        }

        // Wait before next attempt
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      }

      if (!deviceInfo) {
        throw new Error('Failed to discover device information');
      }

      // If we're editing, update the existing device
      if (editingDeviceId) {
        const response = await api.put(`/api/v1/devices/${editingDeviceId}`, {
          ...deviceInfo,
          name: deviceData.name || deviceInfo.name,
          location: deviceData.location || deviceInfo.location,
          type: deviceData.type || deviceInfo.type,
          username: deviceData.username,
          password: deviceData.password,
          network_id: parseInt(deviceData.network_id, 10),
          snmp_version: deviceData.snmp_version,
          community: deviceData.community,
          snmp_username: deviceData.snmp_username,
          auth_protocol: deviceData.auth_protocol,
          auth_password: deviceData.auth_password,
          priv_protocol: deviceData.priv_protocol,
          priv_password: deviceData.priv_password,
          snmp_port: parseInt(deviceData.snmp_port) || 161
        });

        if (!response.data) {
          throw new Error('Failed to update device');
        }

        return response.data;
      }

      // For new devices, discovery should have created them
      return deviceInfo;
    } catch (err) {
      console.error("❌ Failed to save device:", err);
      throw err;
    }
  },

  // Delete device
  async deleteDevice(deviceId) {
    try {
      console.log("Making DELETE request to:", `/api/v1/devices/${deviceId}`);
      const response = await api.delete(`/api/v1/devices/${deviceId}`);
      console.log("Delete response:", response);
      return response.data;
    } catch (error) {
      console.error("Delete failed:", error);
      throw error;
    }
  },

  // Toggle device service status
  async toggleServiceStatus(deviceId, currentStatus) {
    try {
      const response = await api.put(`/api/v1/devices/${deviceId}/toggle-service`, { 
        is_active: !currentStatus 
      });

      if (!response.data) {
        const errorData = response.data;
        throw new Error(errorData.detail || 'Failed to toggle service status');
      }

      return response.data;
    } catch (error) {
      console.error('Error toggling service status:', error);
      throw error;
    }
  },

  // Refresh individual device status
  async refreshDeviceStatus(deviceId, networkId) {
    try {
      console.log(`🔄 Refreshing status for device ID: ${deviceId}`);
      
      // Use the agent-based individual device refresh endpoint
      const response = await api.post(`/api/v1/devices/status/${deviceId}/refresh-agent`);
      
      if (response.data) {
        console.log("✅ Agent status refresh requested:", response.data);
        
        // Wait for agent to process the request (give it time to poll and process)
        console.log("⏳ Waiting for agent to process status test...");
        await new Promise(resolve => setTimeout(resolve, 30000)); // Wait 30 seconds
        
        // Re-fetch the specific device to get updated status
        const devicesResponse = await api.get(`/api/v1/devices/?network_id=${networkId}`);
        const updatedDevices = devicesResponse.data;
        const updatedDevice = updatedDevices.find(d => d.id === deviceId);
        
        if (updatedDevice) {
          return updatedDevice;
        }
      }
      
      throw new Error('Failed to refresh device status');
    } catch (error) {
      console.error('❌ Error refreshing device status:', error);
      throw error;
    }
  },

  // Refresh all device statuses
  async refreshAllDeviceStatuses(networkId) {
    try {
      console.log("🔄 Refreshing all device statuses...");
      
      // Use the new bulk refresh endpoint
      const refreshResponse = await api.post(`/api/v1/devices/status/refresh-all?network_id=${networkId}`);
      
      if (refreshResponse.data) {
        console.log("Bulk refresh result:", refreshResponse.data);
        
        // Wait for agent to process the request (give it time to poll and process)
        console.log("⏳ Waiting for agent to process status tests...");
        await new Promise(resolve => setTimeout(resolve, 30000)); // Wait 30 seconds
        
        console.log("✅ All device statuses refreshed successfully!");
        return refreshResponse.data;
      }
      
      throw new Error('Failed to refresh all device statuses');
    } catch (err) {
      console.error("❌ Failed to refresh devices:", err);
      throw err;
    }
  },

  // Topology-related device operations
  async getDeviceFromTopology(networkId, deviceId) {
    try {
      const response = await api.get(`/api/v1/topology/${networkId}/device/${deviceId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching device from topology:', error);
      throw new Error('Failed to fetch device from topology');
    }
  },

  async getDeviceMetrics(networkId, deviceId) {
    try {
      const response = await api.get(`/api/v1/topology/${networkId}/device/${deviceId}/metrics`);
      return response.data;
    } catch (error) {
      console.error('Error fetching device metrics:', error);
      throw new Error('Failed to fetch device metrics');
    }
  },

  async getDeviceConfiguration(networkId, deviceId) {
    try {
      const response = await api.get(`/api/v1/topology/${networkId}/device/${deviceId}/config`);
      return response.data;
    } catch (error) {
      console.error('Error fetching device configuration:', error);
      throw new Error('Failed to fetch device configuration');
    }
  },

  async backupDeviceConfiguration(networkId, deviceId) {
    try {
      const response = await api.post(`/api/v1/topology/${networkId}/device/${deviceId}/backup`);
      return response.data;
    } catch (error) {
      console.error('Error backing up device configuration:', error);
      throw new Error('Failed to backup device configuration');
    }
  },

  async restoreDeviceConfiguration(networkId, deviceId, configData) {
    try {
      const response = await api.post(`/api/v1/topology/${networkId}/device/${deviceId}/restore`, configData);
      return response.data;
    } catch (error) {
      console.error('Error restoring device configuration:', error);
      throw new Error('Failed to restore device configuration');
    }
  }
}; 
import api from '../utils/axios';

// Agent Management Operations
export const agentService = {
  // Fetch available agents for a network
  async fetchAvailableAgents(networkId) {
    try {
      if (!networkId) {
        throw new Error('Network ID is required');
      }
      
      const response = await api.get(`/api/v1/agents/network/${networkId}/available-agents`);
      return response.data.available_agents || [];
    } catch (error) {
      console.error("Error fetching available agents:", error);
      throw new Error("Failed to fetch available agents. Please ensure you have deployed agents for this network.");
    }
  },

  // Start discovery on agents
  async startDiscovery(discoveryData) {
    try {
      const {
        agentId,
        network_id,
        agent_ids,
        start_ip,
        end_ip,
        discovery_method,
        snmp_version,
        snmp_community,
        snmp_port,
        snmp_config,
        credentials,
        location,
        device_type,
        is_auto_discovery
      } = discoveryData;

      const response = await api.post(`/api/v1/agents/${agentId}/start-discovery`, {
        network_id,
        agent_ids,
        start_ip,
        end_ip,
        discovery_method: {
          method: discovery_method,
          snmp_version,
          snmp_community,
          snmp_port: parseInt(snmp_port),
          snmp_config: snmp_version === 'v3' ? snmp_config : null
        },
        credentials,
        location,
        device_type,
        is_auto_discovery
      });

      if (!response.data) {
        throw new Error("Failed to start discovery");
      }

      return response.data;
    } catch (error) {
      console.error("Error starting agent discovery:", error);
      throw error;
    }
  },

  // Check discovery progress
  async checkDiscoveryProgress(sessionId) {
    try {
      const response = await api.get(`/api/v1/agents/discovery/${sessionId}/status`);
      
      if (!response.data) {
        throw new Error('Failed to check discovery status');
      }

      return response.data;
    } catch (error) {
      console.error("❌ Error checking discovery progress:", error);
      throw error;
    }
  },

  // Get agent status
  async getAgentStatus(agentId) {
    try {
      const response = await api.get(`/api/v1/agents/${agentId}/status`);
      return response.data;
    } catch (error) {
      console.error("Error getting agent status:", error);
      throw error;
    }
  },

  // Update agent configuration
  async updateAgentConfig(agentId, config) {
    try {
      const response = await api.put(`/api/v1/agents/${agentId}/config`, config);
      return response.data;
    } catch (error) {
      console.error("Error updating agent config:", error);
      throw error;
    }
  },

  // Test agent connectivity
  async testAgentConnectivity(agentId) {
    try {
      const response = await api.post(`/api/v1/agents/${agentId}/test-connectivity`);
      return response.data;
    } catch (error) {
      console.error("Error testing agent connectivity:", error);
      throw error;
    }
  }
}; 
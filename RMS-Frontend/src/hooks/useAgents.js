import { useState, useEffect, useCallback } from "react";
import { agentService } from '../services/agentService';

export const useAgents = (selectedNetworkId) => {
  const [availableAgents, setAvailableAgents] = useState([]);
  const [selectedAgents, setSelectedAgents] = useState([]);
  const [isLoadingAgents, setIsLoadingAgents] = useState(false);
  const [agentError, setAgentError] = useState("");

  const fetchAvailableAgents = useCallback(async (networkId) => {
    if (!networkId) return;
    
    setIsLoadingAgents(true);
    setAgentError("");
    
    try {
      const agents = await agentService.fetchAvailableAgents(networkId);
      setAvailableAgents(agents);
      setSelectedAgents([]); // Reset selection
    } catch (error) {
      console.error("Error fetching available agents:", error);
      setAgentError(error.message);
      setAvailableAgents([]);
    } finally {
      setIsLoadingAgents(false);
    }
  }, []);

  // Fetch agents when network changes
  useEffect(() => {
    if (selectedNetworkId) {
      fetchAvailableAgents(selectedNetworkId);
    }
  }, [selectedNetworkId, fetchAvailableAgents]);

  const handleAgentSelection = (agentId) => {
    console.log("Agent selection clicked:", agentId);
    setSelectedAgents(prev => {
      const newSelection = prev.includes(agentId) 
        ? prev.filter(id => id !== agentId)
        : [...prev, agentId];
      console.log("Updated agent selection:", newSelection);
      return newSelection;
    });
  };

  const selectAllAgents = () => {
    const allAgentIds = availableAgents.map(a => a.id);
    console.log('Select All clicked, setting agents:', allAgentIds);
    setSelectedAgents(allAgentIds);
  };

  const clearAllAgents = () => {
    console.log('Clear All clicked, clearing agents');
    setSelectedAgents([]);
  };

  const refreshAgents = useCallback(() => {
    if (selectedNetworkId) {
      fetchAvailableAgents(selectedNetworkId);
    }
  }, [selectedNetworkId, fetchAvailableAgents]);

  return {
    availableAgents,
    selectedAgents,
    isLoadingAgents,
    agentError,
    fetchAvailableAgents,
    handleAgentSelection,
    selectAllAgents,
    clearAllAgents,
    refreshAgents,
    setSelectedAgents
  };
}; 
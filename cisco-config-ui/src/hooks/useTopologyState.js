import { useState, useCallback, useEffect } from 'react';
import { topologyService } from '../services';
import { transformTopologyToCytoscape } from '../utils/topologyIndex';

/**
 * useTopologyState Hook
 * Consolidated state management for all topology-related data and operations
 * 
 * @param {string} networkId - Network identifier
 * @returns {Object} Topology state and operations
 */
const useTopologyState = (networkId) => {
  // Core topology data state
  const [elements, setElements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  
  // Topology metadata state
  const [topologyStats, setTopologyStats] = useState({
    totalDevices: 0,
    onlineDevices: 0,
    offlineDevices: 0,
    totalConnections: 0
  });
  
  // Discovery state
  const [discoveryStatus, setDiscoveryStatus] = useState({
    isRunning: false,
    progress: 0,
    discoveredDevices: 0,
    totalDevices: 0
  });

  // Fetch topology data
  const fetchTopology = useCallback(async () => {
    if (!networkId) return;
    
    console.log('🔍 useTopologyState: fetchTopology called with networkId:', networkId);
    
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔍 useTopologyState: Calling topologyService.fetchTopology...');
      const data = await topologyService.fetchTopology(networkId);
      console.log('🔍 useTopologyState: Received data:', data);
      
      // Transform nodes and links to Cytoscape elements
      const cytoscapeElements = transformTopologyToCytoscape(data.nodes || [], data.links || []);
      console.log('🔍 useTopologyState: Transformed to Cytoscape elements:', cytoscapeElements);
      
      setElements(cytoscapeElements);
      setLastUpdated(new Date());
      
      // Update topology stats
      if (data.stats) {
        setTopologyStats(data.stats);
      }
      
      console.log('🔍 useTopologyState: Elements set to:', cytoscapeElements);
      
    } catch (err) {
      console.error('❌ useTopologyState: Error fetching topology:', err);
      setError(err.message || 'Failed to fetch topology data');
    } finally {
      setLoading(false);
    }
  }, [networkId]);

  // Refresh topology with discovery
  const refreshTopology = useCallback(async () => {
    if (!networkId) return;
    
    try {
      setRefreshing(true);
      setError(null);
      
      // Start topology discovery
      const discoveryResult = await topologyService.triggerTopologyDiscovery(networkId);
      
      if (discoveryResult.success) {
        // Wait for discovery to complete
        await topologyService.waitForTopologyDiscovery(networkId);
        
        // Fetch updated topology
        const data = await topologyService.fetchTopology(networkId);
        setElements(data.elements || []);
        setLastUpdated(new Date());
        
        // Update topology stats
        if (data.stats) {
          setTopologyStats(data.stats);
        }
      }
      
    } catch (err) {
      console.error('Error refreshing topology:', err);
      setError(err.message || 'Failed to refresh topology');
    } finally {
      setRefreshing(false);
    }
  }, [networkId]);

  // Clear topology cache
  const clearTopologyCache = useCallback(async () => {
    if (!networkId) return;
    
    try {
      await topologyService.clearTopologyCache(networkId);
      setElements([]);
      setLastUpdated(null);
      setTopologyStats({
        totalDevices: 0,
        onlineDevices: 0,
        offlineDevices: 0,
        totalConnections: 0
      });
    } catch (err) {
      console.error('Error clearing topology cache:', err);
    }
  }, [networkId]);

  // Get topology statistics
  const getTopologyStats = useCallback(async () => {
    if (!networkId) return null;
    
    try {
      const stats = await topologyService.getTopologyStats(networkId);
      setTopologyStats(stats);
      return stats;
    } catch (err) {
      console.error('Error getting topology stats:', err);
      return null;
    }
  }, [networkId]);

  // Export topology data
  const exportTopology = useCallback(async (format = 'json') => {
    if (!networkId) return null;
    
    try {
      return await topologyService.exportTopology(networkId, format);
    } catch (err) {
      console.error('Error exporting topology:', err);
      throw err;
    }
  }, [networkId]);

  // Import topology data
  const importTopology = useCallback(async (data, format = 'json') => {
    if (!networkId) return false;
    
    try {
      const result = await topologyService.importTopology(networkId, data, format);
      if (result.success) {
        // Refresh topology after import
        await fetchTopology();
      }
      return result;
    } catch (err) {
      console.error('Error importing topology:', err);
      throw err;
    }
  }, [networkId, fetchTopology]);

  // Clear error state
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Reset topology state
  const resetTopology = useCallback(() => {
    setElements([]);
    setLoading(false);
    setError(null);
    setRefreshing(false);
    setLastUpdated(null);
    setTopologyStats({
      totalDevices: 0,
      onlineDevices: 0,
      offlineDevices: 0,
      totalConnections: 0
    });
    setDiscoveryStatus({
      isRunning: false,
      progress: 0,
      discoveredDevices: 0,
      totalDevices: 0
    });
  }, []);

  // Initialize topology on mount
  useEffect(() => {
    if (networkId) {
      fetchTopology();
    }
  }, [networkId, fetchTopology]);

  return {
    // State
    elements,
    loading,
    error,
    refreshing,
    lastUpdated,
    topologyStats,
    discoveryStatus,
    
    // Actions
    fetchTopology,
    refreshTopology,
    clearTopologyCache,
    getTopologyStats,
    exportTopology,
    importTopology,
    clearError,
    resetTopology,
    
    // Setters for internal state management
    setElements,
    setLoading,
    setError,
    setRefreshing,
    setLastUpdated,
    setTopologyStats,
    setDiscoveryStatus
  };
};

export default useTopologyState; 
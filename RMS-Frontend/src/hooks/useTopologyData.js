import { useState, useCallback, useEffect } from 'react';
import { topologyService } from '../services';
import { transformTopologyToCytoscape } from '../utils/topologyIndex';

/**
 * Custom hook for managing topology data
 * @param {string} networkId - Network ID
 * @returns {Object} Topology data and management functions
 */
export const useTopologyData = (networkId) => {
  const [elements, setElements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Function to fetch topology data (without discovery)
  const fetchTopology = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      
      // Use topology service to fetch data
      const { nodes, links } = await topologyService.fetchTopology(networkId, true);
      
      // Convert nodes and links to Cytoscape elements with device-specific styling
      const cytoscapeElements = transformTopologyToCytoscape(nodes, links);

      setElements(cytoscapeElements);
      setError(null);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching topology:', err);
      setError('Failed to load network topology');
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, [networkId]);

  // Function to refresh topology (with discovery)
  const refreshTopology = useCallback(async () => {
    try {
      setRefreshing(true);
      
      // Use topology service to refresh topology
      await topologyService.refreshTopology(networkId);
      
      // Then fetch the updated topology data
      await fetchTopology(false);
      
    } catch (err) {
      console.error('Error refreshing topology:', err);
      setError('Failed to refresh network topology');
    } finally {
      setRefreshing(false);
    }
  }, [networkId, fetchTopology]);

  // Function to clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Function to reset topology data
  const resetTopology = useCallback(() => {
    setElements([]);
    setError(null);
    setLastUpdated(null);
    setLoading(false);
  }, []);

  // Auto-fetch topology when networkId changes
  useEffect(() => {
    if (networkId) {
      fetchTopology();
    } else {
      resetTopology();
    }
  }, [networkId, fetchTopology, resetTopology]);

  return {
    // State
    elements,
    loading,
    error,
    refreshing,
    lastUpdated,
    
    // Actions
    fetchTopology,
    refreshTopology,
    clearError,
    resetTopology,
    
    // Computed values
    hasElements: elements.length > 0,
    nodeCount: elements.filter(el => el.data && el.data.type === 'device').length,
    linkCount: elements.filter(el => el.data && el.data.source).length
  };
}; 
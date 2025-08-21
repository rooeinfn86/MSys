import { useCallback } from 'react';
import useTopologyState from './useTopologyState';
import useModalState from './useModalState';
import { useTopologyVisualization } from './useTopologyVisualization';
import { useContainerSize } from './useContainerSize';

/**
 * useNetworkDiagramState Hook
 * Master hook that consolidates all state management for NetworkDiagram
 * This provides a single interface for all state operations
 * 
 * @param {string} networkId - Network identifier
 * @returns {Object} Consolidated state and operations
 */
const useNetworkDiagramState = (networkId) => {
  // Debug logging - REMOVED TO PREVENT INFINITE LOOP
  
  // Initialize all state hooks
  const topologyState = useTopologyState(networkId);
  const modalState = useModalState(networkId);
  const visualizationState = useTopologyVisualization();
  const containerSizeState = useContainerSize();

  // Consolidated refresh function
  const handleRefresh = useCallback(async () => {
    try {
      await topologyState.refreshTopology();
    } catch (err) {
      console.error('Error refreshing topology:', err);
    }
  }, [topologyState]);

  // Consolidated error handling
  const handleError = useCallback((error, context = 'Unknown') => {
    console.error(`Error in ${context}:`, error);
    topologyState.setError(error.message || `An error occurred in ${context}`);
  }, [topologyState]);

  // Consolidated cleanup
  const cleanup = useCallback(() => {
    // Reset all states
    topologyState.resetTopology();
    modalState.resetModalStates();
    visualizationState.resetVisualizationState();
    
    // Clear any ongoing operations
    if (topologyState.refreshing) {
      // Cancel any ongoing refresh
      topologyState.setRefreshing(false);
    }
  }, [topologyState, modalState, visualizationState]);

  // Consolidated initialization
  const initialize = useCallback(async () => {
    try {
      // Initialize topology
      await topologyState.fetchTopology();
      
      // Initialize container size tracking
      containerSizeState.updateSize();
      
    } catch (error) {
      handleError(error, 'initialization');
    }
  }, [topologyState, containerSizeState, handleError]);

  // Get consolidated state summary
  const getStateSummary = useCallback(() => {
    return {
      topology: {
        loading: topologyState.loading,
        error: topologyState.error,
        refreshing: topologyState.refreshing,
        elementCount: topologyState.elements.length,
        lastUpdated: topologyState.lastUpdated
      },
      modals: {
        deviceInfoOpen: modalState.deviceInfoModal.open,
        interfaceInfoOpen: modalState.interfaceInfoModal.open,
        systemHealthOpen: modalState.systemHealthModal.open,
        contextMenuOpen: modalState.contextMenu.mouseY !== null
      },
      visualization: {
        layout: visualizationState.layout,
        zoom: visualizationState.zoom,
        selectedNodes: visualizationState.selectedNodes.length,
        selectedEdges: visualizationState.selectedEdges.length
      },
      container: {
        width: containerSizeState.containerSize.width,
        height: containerSizeState.containerSize.height
      }
    };
  }, [topologyState, modalState, visualizationState, containerSizeState]);

  // Export all state for debugging - SIMPLIFIED TO PREVENT INFINITE LOOP
  const exportState = useCallback(() => {
    return {
      timestamp: new Date().toISOString(),
      networkId,
      summary: getStateSummary()
    };
  }, [networkId, getStateSummary]);

  return {
    // Consolidated actions
    handleRefresh,
    handleError,
    cleanup,
    initialize,
    getStateSummary,
    exportState,
    
    // State access (read-only)
    topology: topologyState,
    modals: modalState,
    visualization: visualizationState,
    container: containerSizeState,
    
    // Direct state access for components that need it
    elements: topologyState.elements,
    loading: topologyState.loading,
    error: topologyState.error,
    refreshing: topologyState.refreshing,
    lastUpdated: topologyState.lastUpdated,
    
    // Modal states
    deviceInfoModal: modalState.deviceInfoModal,
    interfaceInfoModal: modalState.interfaceInfoModal,
    systemHealthModal: modalState.systemHealthModal,
    contextMenu: visualizationState.contextMenu, // Use context menu state from visualization hook
    
    // Visualization states
    layout: visualizationState.layout,
    style: visualizationState.style,
    getCytoscapeEventHandlers: visualizationState.getCytoscapeEventHandlers,
    
    // Container states
    containerRef: containerSizeState.containerRef,
    
    // Actions (delegated to appropriate hooks)
    refreshTopology: topologyState.refreshTopology,
    handleDeviceInfo: modalState.handleDeviceInfo,
    handleRefreshDeviceInfo: modalState.handleRefreshDeviceInfo,
    handleInterfaceInfo: modalState.handleInterfaceInfo,
    handleSystemHealth: modalState.handleSystemHealth,
    handleDiscoverNeighbors: modalState.handleDiscoverNeighbors,
    closeDeviceInfoModal: modalState.closeDeviceInfoModal,
    closeInterfaceInfoModal: modalState.closeInterfaceInfoModal,
    closeSystemHealthModal: modalState.closeSystemHealthModal,
    handleCloseContextMenu: visualizationState.handleCloseContextMenu,
    handleClickOutside: modalState.handleClickOutside,
    setContextMenuDiscovering: visualizationState.setContextMenuDiscovering
  };
};

export default useNetworkDiagramState; 
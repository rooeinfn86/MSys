import { useState, useCallback } from 'react';
import { topologyService } from '../services';
import { deviceService } from '../services/deviceService';

/**
 * useModalState Hook
 * Consolidated state management for all modal-related operations
 * 
 * @param {string} networkId - Network identifier
 * @returns {Object} Modal state and operations
 */
const useModalState = (networkId) => {
  // Device Info Modal State
  const [deviceInfoModal, setDeviceInfoModal] = useState({
    open: false,
    data: null,
    loading: false,
    error: null
  });

  // Interface Info Modal State
  const [interfaceInfoModal, setInterfaceInfoModal] = useState({
    open: false,
    data: null,
    loading: false,
    error: null
  });

  // System Health Modal State
  const [systemHealthModal, setSystemHealthModal] = useState({
    open: false,
    data: null,
    loading: false,
    error: null
  });

  // Context Menu State
  const [contextMenu, setContextMenu] = useState({
    mouseX: null,
    mouseY: null,
    nodeData: null,
    discovering: false
  });

  // Handle device information modal
  const handleDeviceInfo = useCallback(async (nodeData) => {
    if (!nodeData || !nodeData.id) return;
    
    try {
      setDeviceInfoModal(prev => ({
        ...prev,
        open: true,
        loading: true,
        error: null,
        data: { ...nodeData }
      }));

      // Extract device ID safely
      let deviceId;
      if (nodeData.id) {
        // If it's in format "device_123", extract the number
        if (typeof nodeData.id === 'string' && nodeData.id.startsWith('device_')) {
          deviceId = nodeData.id.replace('device_', '');
        } else {
          // If it's already a number or different format, use as is
          deviceId = nodeData.id;
        }
      } else {
        throw new Error('Could not determine device ID from node data');
      }
      
      console.log('🔄 handleDeviceInfo: Device ID extraction:', {
        originalId: nodeData.id,
        extractedId: deviceId,
        networkId: networkId,
        dataType: typeof deviceId
      });
      
      // Validate device ID
      if (!deviceId || isNaN(deviceId)) {
        throw new Error(`Invalid device ID: ${deviceId}`);
      }
      
      // Fetch detailed device information
      const deviceInfo = await deviceService.getDeviceInfo(deviceId, networkId);
      
      setDeviceInfoModal(prev => ({
        ...prev,
        loading: false,
        data: { ...nodeData, ...deviceInfo }
      }));

    } catch (err) {
      console.error('❌ Error fetching device info:', err);
      setDeviceInfoModal(prev => ({
        ...prev,
        loading: false,
        error: err.message || 'Failed to fetch device information'
      }));
    }
  }, [networkId]);

  // Refresh device information
  const handleRefreshDeviceInfo = useCallback(async () => {
    if (!deviceInfoModal.data || !deviceInfoModal.data.id) return;
    
    try {
      setDeviceInfoModal(prev => ({
        ...prev,
        loading: true,
        error: null
      }));

      // Extract device ID safely
      let deviceId;
      if (deviceInfoModal.data.id) {
        // If it's in format "device_123", extract the number
        if (typeof deviceInfoModal.data.id === 'string' && deviceInfoModal.data.id.startsWith('device_')) {
          deviceId = deviceInfoModal.data.id.replace('device_', '');
        } else {
          // If it's already a number or different format, use as is
          deviceId = deviceInfoModal.data.id;
        }
      } else if (deviceInfoModal.data.device_id) {
        // Fallback to device_id field
        deviceId = deviceInfoModal.data.device_id;
      } else {
        throw new Error('Could not determine device ID from modal data');
      }
      
      console.log('🔄 Device ID extraction:', {
        originalId: deviceInfoModal.data.id,
        device_id: deviceInfoModal.data.device_id,
        extractedId: deviceId,
        networkId: networkId,
        dataType: typeof deviceId
      });
      
      // Validate device ID
      if (!deviceId || isNaN(deviceId)) {
        throw new Error(`Invalid device ID: ${deviceId}`);
      }
      
      // First, trigger the device refresh through the agent
      console.log('🔄 Triggering device refresh for device:', deviceId);
      await deviceService.refreshDevice(deviceId, networkId);
      
      // Wait a moment for the agent to process the refresh
      console.log('⏳ Waiting for agent to process refresh...');
      await new Promise(resolve => setTimeout(resolve, 5000)); // Increased from 2000ms to 5000ms
      
      // Now fetch the updated device information with force refresh
      console.log('📋 Fetching updated device info...');
      const updatedDeviceInfo = await deviceService.getDeviceInfo(deviceId, networkId);
      
      setDeviceInfoModal(prev => ({
        ...prev,
        loading: false,
        data: { ...prev.data, ...updatedDeviceInfo }
      }));
      
      console.log('✅ Device refresh completed successfully');
    } catch (err) {
      console.error('❌ Error refreshing device info:', {
        error: err,
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        statusText: err.response?.statusText
      });
      setDeviceInfoModal(prev => ({
        ...prev,
        loading: false,
        error: err.message || err.response?.data?.detail || 'Failed to refresh device information'
      }));
    }
  }, [deviceInfoModal.data, networkId]);

  // Handle interface information modal
  const handleInterfaceInfo = useCallback(async (nodeData) => {
    if (!nodeData || !nodeData.id) return;
    
    try {
      setInterfaceInfoModal(prev => ({
        ...prev,
        open: true,
        loading: true,
        error: null,
        data: { ...nodeData }
      }));

      // Fetch detailed interface information
      const deviceId = nodeData.id.replace('device_', '');
      const interfaces = await topologyService.getDeviceInterfaces(networkId, deviceId);
      
      setInterfaceInfoModal(prev => ({
        ...prev,
        loading: false,
        data: { ...nodeData, interfaces }
      }));

    } catch (err) {
      console.error('Error fetching interface info:', err);
      setInterfaceInfoModal(prev => ({
        ...prev,
        loading: false,
        error: err.message || 'Failed to fetch interface information'
      }));
    }
  }, [networkId]);

  // Handle system health modal
  const handleSystemHealth = useCallback(async (nodeData) => {
    if (!nodeData || !nodeData.id) return;
    
    try {
      setSystemHealthModal(prev => ({
        ...prev,
        open: true,
        loading: true,
        error: null,
        data: { ...nodeData }
      }));

      // Fetch system health information
      const deviceId = nodeData.id.replace('device_', '');
      const healthData = await topologyService.getDeviceHealth(networkId, deviceId);
      
      setSystemHealthModal(prev => ({
        ...prev,
        loading: false,
        data: { ...nodeData, ...healthData }
      }));

    } catch (err) {
      console.error('Error fetching system health:', err);
      setSystemHealthModal(prev => ({
        ...prev,
        loading: false,
        error: err.message || 'Failed to fetch system health information'
      }));
    }
  }, [networkId]);

  // Handle neighbor discovery
  const handleDiscoverNeighbors = useCallback(async (nodeData, refreshTopology, setContextMenuDiscovering) => {
    if (!nodeData || !nodeData.id) return;
    
    try {
      setContextMenuDiscovering(true);
      
      const deviceId = nodeData.id.replace('device_', '');
      const result = await topologyService.discoverDeviceNeighbors(networkId, deviceId);
      
      if (result.success) {
        // Refresh topology to show new discoveries
        await refreshTopology();
      }
      
    } catch (err) {
      console.error('Error discovering neighbors:', err);
    } finally {
      setContextMenuDiscovering(false);
    }
  }, [networkId]);

  // Close device info modal
  const closeDeviceInfoModal = useCallback(() => {
    setDeviceInfoModal(prev => ({
      ...prev,
      open: false,
      data: null,
      error: null
    }));
  }, []);

  // Close interface info modal
  const closeInterfaceInfoModal = useCallback(() => {
    setInterfaceInfoModal(prev => ({
      ...prev,
      open: false,
      data: null,
      error: null
    }));
  }, []);

  // Close system health modal
  const closeSystemHealthModal = useCallback(() => {
    setSystemHealthModal(prev => ({
      ...prev,
      open: false,
      data: null,
      error: null
    }));
  }, []);

  // Close context menu
  const handleCloseContextMenu = useCallback(() => {
    setContextMenu({
      mouseX: null,
      mouseY: null,
      nodeData: null,
      discovering: false
    });
  }, []);

  // Handle container context menu
  const handleContainerContextMenu = useCallback((event) => {
    event.preventDefault();
    setContextMenu({
      mouseX: event.clientX,
      mouseY: event.clientY,
      nodeData: null,
      discovering: false
    });
  }, []);

  // Set context menu discovering state
  const setContextMenuDiscovering = useCallback((discovering) => {
    setContextMenu(prev => ({
      ...prev,
      discovering
    }));
  }, []);

  // Update context menu position
  const updateContextMenuPosition = useCallback((mouseX, mouseY, nodeData = null) => {
    setContextMenu({
      mouseX,
      mouseY,
      nodeData,
      discovering: false
    });
  }, []);

  // Handle click outside to close context menu
  const handleClickOutside = useCallback(() => {
    setContextMenu({
      mouseX: null,
      mouseY: null,
      nodeData: null,
      discovering: false
    });
  }, []);

  // Reset all modal states
  const resetModalStates = useCallback(() => {
    setDeviceInfoModal({
      open: false,
      data: null,
      loading: false,
      error: null
    });
    
    setInterfaceInfoModal({
      open: false,
      data: null,
      loading: false,
      error: null
    });
    
    setSystemHealthModal({
      open: false,
      data: null,
      loading: false,
      error: null
    });
    
    setContextMenu({
      mouseX: null,
      mouseY: null,
      nodeData: null,
      discovering: false
    });
  }, []);

  return {
    // Modal States
    deviceInfoModal,
    interfaceInfoModal,
    systemHealthModal,
    contextMenu,
    
    // Modal Actions
    handleDeviceInfo,
    handleRefreshDeviceInfo,
    handleInterfaceInfo,
    handleSystemHealth,
    handleDiscoverNeighbors,
    
    // Modal Close Actions
    closeDeviceInfoModal,
    closeInterfaceInfoModal,
    closeSystemHealthModal,
    
    // Context Menu Actions
    handleCloseContextMenu,
    handleClickOutside,
    handleContainerContextMenu,
    setContextMenuDiscovering,
    updateContextMenuPosition,
    
    // Utility Actions
    resetModalStates,
    
    // Setters for internal state management
    setDeviceInfoModal,
    setInterfaceInfoModal,
    setSystemHealthModal,
    setContextMenu
  };
};

export default useModalState; 
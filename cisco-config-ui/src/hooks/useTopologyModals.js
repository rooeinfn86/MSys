import { useState, useCallback, useEffect } from 'react';
import { topologyService } from '../services/topologyService';
import { deviceService } from '../services/deviceService';
import { extractDeviceId } from '../utils/topologyIndex';

/**
 * Custom hook for topology modal state management
 * @param {string} networkId - Network ID
 * @returns {Object} Modal states and handlers
 */
export const useTopologyModals = (networkId) => {
  // Device information modal state
  const [deviceInfoModal, setDeviceInfoModal] = useState({
    open: false,
    loading: false,
    data: null,
    error: null
  });
  
  // Interface information modal state
  const [interfaceInfoModal, setInterfaceInfoModal] = useState({
    open: false,
    loading: false,
    data: null,
    error: null
  });

  // System health modal state
  const [systemHealthModal, setSystemHealthModal] = useState({
    open: false,
    loading: false,
    data: null,
    error: null
  });

  // Handle device information
  const handleDeviceInfo = useCallback(async (nodeData) => {
    if (!nodeData) return;
    
    setDeviceInfoModal(prev => ({ ...prev, open: true, loading: true, error: null }));
    
    try {
      // Extract device ID from the node ID (format: "device_123")
      const deviceId = extractDeviceId(nodeData.id);
      
      const deviceInfo = await deviceService.getDeviceInfo(deviceId, networkId);
      
      setDeviceInfoModal(prev => ({
        ...prev,
        loading: false,
        data: deviceInfo
      }));
    } catch (error) {
      console.error('❌ Error fetching device info:', error);
      setDeviceInfoModal(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Failed to fetch device information'
      }));
    }
  }, [networkId]);

  // Handle refresh device information
  const handleRefreshDeviceInfo = useCallback(async () => {
    if (!deviceInfoModal.data) return;
    
    try {
      setDeviceInfoModal(prev => ({ ...prev, loading: true, error: null }));
      
      // Extract device ID from the current device data
      const deviceId = deviceInfoModal.data.device_id || deviceInfoModal.data.id;
      
      // First, trigger the device refresh through the agent
      console.log('🔄 Triggering device refresh for device:', deviceId);
      await deviceService.refreshDevice(deviceId, networkId);
      
      // Wait a moment for the agent to process the refresh
      console.log('⏳ Waiting for agent to process refresh...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Now fetch the updated device information
      console.log('📋 Fetching updated device info...');
      const updatedDeviceInfo = await deviceService.getDeviceInfo(deviceId, networkId);
      
      setDeviceInfoModal(prev => ({ 
        ...prev, 
        loading: false, 
        data: updatedDeviceInfo 
      }));
      
      console.log('✅ Device refresh completed successfully');
    } catch (err) {
      console.error('❌ Error refreshing device info:', err);
      setDeviceInfoModal(prev => ({ 
        ...prev, 
        loading: false, 
        error: err.message || 'Failed to refresh device information' 
      }));
    }
  }, [deviceInfoModal.data, networkId]);

  // Handle interface information
  const handleInterfaceInfo = useCallback(async (nodeData) => {
    if (!nodeData) return;
    
    try {
      setInterfaceInfoModal(prev => ({ ...prev, open: true, loading: true, error: null }));
      
      // Extract device ID from node ID (format: "device_123")
      const deviceId = extractDeviceId(nodeData.id);
      
      const interfaceInfo = await topologyService.getDeviceInterfaces(networkId, deviceId);
      setInterfaceInfoModal(prev => ({ 
        ...prev, 
        loading: false, 
        data: interfaceInfo 
      }));
    } catch (err) {
      console.error('Error fetching interface info:', err);
      setInterfaceInfoModal(prev => ({ 
        ...prev, 
        loading: false, 
        error: 'Failed to load interface information' 
      }));
    }
  }, [networkId]);

  // Handle system health information
  const handleSystemHealth = useCallback(async (nodeData) => {
    if (!nodeData) return;
    
    try {
      setSystemHealthModal(prev => ({ ...prev, open: true, loading: true, error: null }));
      
      // Extract device ID from node ID (format: "device_123")
      const deviceId = extractDeviceId(nodeData.id);
      
      const healthInfo = await topologyService.getDeviceHealth(networkId, deviceId);
      setSystemHealthModal(prev => ({ 
        ...prev, 
        loading: false, 
        data: healthInfo 
      }));
    } catch (err) {
      console.error('Error fetching system health:', err);
      setSystemHealthModal(prev => ({ 
        ...prev, 
        loading: false, 
        error: 'Failed to load system health information' 
      }));
    }
  }, [networkId]);

  // Handle discover neighbors
  const handleDiscoverNeighbors = useCallback(async (nodeData, onTopologyRefresh, setContextMenuDiscovering) => {
    if (!nodeData) return;
    
    try {
      // Extract device ID from node ID (format: "device_123")
      const deviceId = extractDeviceId(nodeData.id);
      
      // Show loading state
      setContextMenuDiscovering(true);
      
      // Trigger neighbor discovery for this device
      await topologyService.discoverDeviceNeighbors(networkId, deviceId);
      
      // Wait a moment for the background task to start
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Refresh the topology to show new connections
      if (onTopologyRefresh) {
        await onTopologyRefresh(false);
      }
      
    } catch (err) {
      console.error('Error discovering neighbors:', err);
      setContextMenuDiscovering(false);
      throw err;
    }
  }, [networkId]);

  // Close modal handlers
  const closeDeviceInfoModal = useCallback(() => {
    setDeviceInfoModal({
      open: false,
      loading: false,
      data: null,
      error: null
    });
  }, []);

  const closeInterfaceInfoModal = useCallback(() => {
    setInterfaceInfoModal({
      open: false,
      loading: false,
      data: null,
      error: null
    });
  }, []);

  const closeSystemHealthModal = useCallback(() => {
    setSystemHealthModal({
      open: false,
      loading: false,
      data: null,
      error: null
    });
  }, []);

  return {
    // Modal states
    deviceInfoModal,
    interfaceInfoModal,
    systemHealthModal,
    
    // Modal handlers
    handleDeviceInfo,
    handleRefreshDeviceInfo,
    handleInterfaceInfo,
    handleSystemHealth,
    handleDiscoverNeighbors,
    
    // Close handlers
    closeDeviceInfoModal,
    closeInterfaceInfoModal,
    closeSystemHealthModal
  };
}; 
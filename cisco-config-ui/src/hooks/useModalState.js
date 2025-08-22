import { useState, useCallback } from 'react';
import { topologyService } from '../services';

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

      // Fetch detailed device information
      const deviceId = nodeData.id.replace('device_', '');
      const deviceInfo = await topologyService.getDeviceInfo(networkId, deviceId);
      
      setDeviceInfoModal(prev => ({
        ...prev,
        loading: false,
        data: { ...nodeData, ...deviceInfo }
      }));

    } catch (err) {
      console.error('Error fetching device info:', err);
      setDeviceInfoModal(prev => ({
        ...prev,
        loading: false,
        error: err.message || 'Failed to fetch device information'
      }));
    }
  }, [networkId]);

  // Refresh device information using agent-based discovery
  const handleRefreshDeviceInfo = useCallback(async () => {
    if (!deviceInfoModal.data || !deviceInfoModal.data.id) return;
    
    try {
      setDeviceInfoModal(prev => ({
        ...prev,
        loading: true,
        error: null
      }));

      const deviceId = deviceInfoModal.data.id.replace('device_', '');
      
      // Import deviceService to use the new refresh function
      const { deviceService } = await import('../services/deviceService');
      
      // Start full agent-based device discovery refresh
      console.log("🔄 Starting full agent-based device discovery refresh for device:", deviceId);
      console.log("🔍 This will perform complete SNMP/SSH discovery and update both database tables");
      const refreshResult = await deviceService.refreshDevice(deviceId);
      
      if (refreshResult) {
        console.log("✅ Full device discovery refresh completed:", refreshResult);
        
        // After full discovery refresh, fetch the completely updated device info
        // This will include all the latest data from the agent discovery
        console.log("🔄 Fetching completely updated device data from database...");
        
        try {
          // Use the deviceService to fetch updated devices
          const updatedDevices = await deviceService.fetchDevices(networkId);
          const updatedDevice = updatedDevices.find(d => d.id === parseInt(deviceId));
          
          if (updatedDevice) {
            console.log("✅ Found completely updated device data:", updatedDevice);
            
            // The agent has performed full discovery and updated both tables
            // Create complete modal data with all refreshed information
            const modalData = {
              ...deviceInfoModal.data, // Keep existing modal structure
              ...updatedDevice, // Update with all new device data
              // Update the agent_discovered_info with complete refreshed data
              agent_discovered_info: {
                ...deviceInfoModal.data?.agent_discovered_info, // Keep existing structure
                // Update with fresh discovery data
                ping_status: updatedDevice.ping_status,
                snmp_status: updatedDevice.snmp_status,
                is_active: updatedDevice.is_active,
                last_checked: updatedDevice.last_status_check,
                // These fields should now be updated from full discovery
                hostname: updatedDevice.hostname || updatedDevice.agent_discovered_info?.hostname,
                description: updatedDevice.description || updatedDevice.agent_discovered_info?.description,
                vendor: updatedDevice.vendor || updatedDevice.agent_discovered_info?.vendor,
                model: updatedDevice.model || updatedDevice.agent_discovered_info?.model,
                uptime: updatedDevice.uptime || updatedDevice.agent_discovered_info?.uptime,
                platform: updatedDevice.platform || updatedDevice.agent_discovered_info?.platform,
                os_version: updatedDevice.os_version || updatedDevice.agent_discovered_info?.os_version
              }
            };
            
            console.log("🔄 Current modal data:", deviceInfoModal.data);
            console.log("🔄 Updated device data:", updatedDevice);
            console.log("🔄 Merged modal data:", modalData);
            
            console.log("🔄 Updating modal with completely refreshed discovery data:", modalData);
            
            setDeviceInfoModal(prev => ({
              ...prev,
              loading: false,
              data: modalData
            }));
            
            console.log("✅ Modal updated with complete discovery data successfully!");
          } else {
            throw new Error('Could not find updated device data after discovery');
          }
        } catch (fetchError) {
          console.error("Error fetching updated device data:", fetchError);
          throw new Error('Failed to fetch updated device data after discovery');
        }
      } else {
        throw new Error('Device discovery refresh failed');
      }

    } catch (err) {
      console.error('Error refreshing device info:', err);
      setDeviceInfoModal(prev => ({
        ...prev,
        loading: false,
        error: err.message || 'Failed to refresh device information'
      }));
    }
  }, [networkId, deviceInfoModal.data]);

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
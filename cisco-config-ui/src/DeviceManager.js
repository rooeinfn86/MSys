import { useState, useEffect, useRef } from "react";
import './styles/DeviceInventory.css';

// Import custom hooks
import { useTooltip } from './hooks/useTooltip';
import { useDevices } from './hooks/useDevices';
import { useDeviceActions } from './hooks/useDeviceActions';
import { useAgents } from './hooks/useAgents';

// Import services
import { agentService } from './services/agentService';
import { deviceService } from './services/deviceService';

// Import components
import { DeviceTable, DeviceInventoryHeader } from './components/DeviceTable';
import { 
  AddEditDeviceModal, 
  AutoDiscoveryModal, 
  DiscoveryProgressModal,
  DiscoverySummaryModal,
  DeleteConfirmationModal 
} from './components/modals';

// Helper function to calculate IP range
const calculateIPRange = (startIP, endIP) => {
  const start = startIP.split('.').map(Number);
  const end = endIP.split('.').map(Number);
  
  console.log(`calculateIPRange: start=${startIP}, end=${endIP}`);
  console.log(`Start parts: [${start.join(', ')}], End parts: [${end.join(', ')}]`);
  
  // For simple ranges where only the last octet differs
  if (start[0] === end[0] && start[1] === end[1] && start[2] === end[2]) {
    let count = 0;
    for (let i = start[3]; i <= end[3]; i++) {
      count++;
    }
    console.log(`Simple range calculation: ${start[3]} to ${end[3]} = ${count} IPs`);
    return count;
  }
  
  // For more complex ranges, calculate the full range
  // Convert IPs to 32-bit integers for proper calculation
  const startInt = (start[0] << 24) + (start[1] << 16) + (start[2] << 8) + start[3];
  const endInt = (end[0] << 24) + (end[1] << 16) + (end[2] << 8) + end[3];
  
  // Return the difference + 1 (inclusive range)
  const result = Math.abs(endInt - startInt) + 1;
  console.log(`Complex range calculation: ${startInt} to ${endInt} = ${result} IPs`);
  return result;
};

// Helper function to initialize form state
const getInitialFormState = (selectedNetworkId) => ({
  name: "", 
  ip: "", 
  location: "", 
  type: "", 
  username: "", 
  password: "", 
  network_id: selectedNetworkId?.toString() || "",
  is_active: true,
  selected_agent_ids: [],
  snmp_version: 'v2c',
  community: 'public',
  snmp_community: 'public',
  snmp_username: '',
  auth_protocol: 'SHA',
  auth_password: '',
  priv_protocol: 'AES',
  priv_password: '',
  snmp_port: '161'
});

export default function DeviceManager({ selectedOrgId, selectedNetworkId }) {
  console.log("DeviceManager component rendered with:", { selectedOrgId, selectedNetworkId });
  
  // Use custom hooks
  const { tooltip, tooltipRef } = useTooltip();
  const { devices, userRole, userTier, fetchDevices, fixDiscoveryMethodsForNewDevices } = useDevices(selectedNetworkId);
  const { 
    showForm, setShowForm, editingDeviceId, setEditingDeviceId,
    showConfirmModal, setShowConfirmModal, deviceToDelete, setDeviceToDelete,
    setShowErrorModal, setErrorMessage,
    refreshingDevices,
    handleChange, handleSubmit, confirmDelete, handleConfirmDelete,
    handleServiceToggle, handleIndividualRefresh
  } = useDeviceActions(selectedNetworkId, fetchDevices);
  const {
    availableAgents, selectedAgents, isLoadingAgents, agentError,
    refreshAgents, setSelectedAgents
  } = useAgents(selectedNetworkId);
  
  // Local state that's not yet extracted
  const [form, setForm] = useState(getInitialFormState(selectedNetworkId));
  
  const [showAutoDiscoveryModal, setShowAutoDiscoveryModal] = useState(false);
  const [showDiscoverySummaryModal, setShowDiscoverySummaryModal] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [discoverySummary, setDiscoverySummary] = useState({
    total_ips: 0,
    discovered_devices: 0,
    failed_devices: 0
  });
  
  // Ref to store the initial total IPs for discovery
  const initialTotalIPsRef = useRef(0);
  
  const [discoveryForm, setDiscoveryForm] = useState({
    ipRange: '',
    username: '',
    password: '',
    snmp_version: 'v2c',
    community: 'public',
    snmp_username: '',
    auth_protocol: 'SHA',
    auth_password: '',
    priv_protocol: 'AES',
    priv_password: '',
    snmp_port: '161',
    ssh_port: '22',
    discovery_method: 'auto' // auto, snmp_only, ssh_only, ping_only
  });
  const [discoveryProgress, setDiscoveryProgress] = useState({
    isScanning: false,
    progress: 0,
    status: 'idle',
    message: '',
    discoveredDevices: 0,
    processedIPs: 0,
    totalIPs: 0,
    currentIP: '',
    estimatedTime: '',
    failed: 0,
    errors: []
  });

  // Background monitoring state
  const [backgroundMonitoring, setBackgroundMonitoring] = useState({
    isActive: false,
    lastChecked: null,
    nextCheck: null,
    interval: 180000 // 3 minutes in milliseconds
  });

  // Add useEffect to fetch agents when modal opens
  useEffect(() => {
    if (showAutoDiscoveryModal && selectedNetworkId) {
      refreshAgents();
    }
  }, [showAutoDiscoveryModal, selectedNetworkId, refreshAgents]); // refreshAgents is now memoized

  // Background device status monitoring
  useEffect(() => {
    if (!selectedNetworkId) return;
    
    console.log("🔄 Setting up background device monitoring for network:", selectedNetworkId);
    
    // Initial fetch
    fetchDevices(selectedNetworkId);
    
    // Set up background polling every 3 minutes
    const interval = setInterval(async () => {
      try {
        console.log("🔄 Auto-refreshing device statuses...");
        setBackgroundMonitoring(prev => ({
          ...prev,
          isActive: true,
          lastChecked: new Date()
        }));
        
        // Use the device service to refresh all device statuses
        await deviceService.refreshAllDeviceStatuses(selectedNetworkId);
        
        // Fetch updated devices
        await fetchDevices(selectedNetworkId);
        
        // Calculate next check time
        const nextCheck = new Date(Date.now() + backgroundMonitoring.interval);
        setBackgroundMonitoring(prev => ({
          ...prev,
          isActive: false,
          nextCheck: nextCheck
        }));
        
        console.log("✅ Auto-refresh completed successfully");
      } catch (err) {
        console.log("❌ Auto-refresh failed:", err);
        setBackgroundMonitoring(prev => ({
          ...prev,
          isActive: false
        }));
      }
    }, backgroundMonitoring.interval);
    
    // Cleanup interval on unmount or network change
    return () => {
      console.log("🛑 Clearing background monitoring interval");
      clearInterval(interval);
    };
  }, [selectedNetworkId, backgroundMonitoring.interval]);

  // Discovery functions
  const handleStartDiscovery = async (e) => {
    e.preventDefault();
    
    console.log("Starting discovery with:", {
      selectedNetworkId,
      selectedAgents,
      ipRange: discoveryForm.ipRange
    });
    
    if (!selectedNetworkId) {
      setErrorMessage("Please select a network");
      setShowErrorModal(true);
      return;
    }

    if (selectedAgents.length === 0) {
      setErrorMessage("Please select at least one agent for discovery");
      setShowErrorModal(true);
      return;
    }

    if (!discoveryForm.ipRange) {
      setErrorMessage("Please enter an IP range");
      setShowErrorModal(true);
      return;
    }

    // Parse IP range format (e.g., "192.168.56.10-192.168.56.14")
    let start_ip, end_ip;
    if (discoveryForm.ipRange.includes('-')) {
      [start_ip, end_ip] = discoveryForm.ipRange.split('-').map(ip => ip.trim());
    } else {
      // Single IP
      start_ip = discoveryForm.ipRange.trim();
      end_ip = start_ip;
    }

    // Calculate total IPs before starting discovery
    const totalIPs = calculateIPRange(start_ip, end_ip);
    
    // Store the total IPs in ref for persistence
    initialTotalIPsRef.current = totalIPs;
    
    console.log(`IP Range parsing: "${discoveryForm.ipRange}" -> start: ${start_ip}, end: ${end_ip}`);
    console.log(`Calculated total IPs: ${totalIPs}`);
    console.log(`Starting discovery for ${totalIPs} IP(s): ${start_ip} to ${end_ip}`);
    
    // Initialize discovery progress with correct total IPs
    setDiscoveryProgress({
      isScanning: true,
      progress: 0,
      status: "starting",
      message: totalIPs === 1 ? "Starting single IP scan..." : `Starting discovery of ${totalIPs} IPs...`,
      totalIPs: totalIPs,
      processedIPs: 0,
      discoveredDevices: 0,
      currentIP: start_ip,
      estimatedTime: '',
      failed: 0,
      agentProgress: [],
      errors: []
    });

    // Initialize discovery summary with total IPs
    setDiscoverySummary({
      total_ips: totalIPs,
      discovered_devices: 0,
      failed_devices: 0
    });

    console.log(`Initial discovery progress state set with totalIPs: ${totalIPs}`);
    console.log(`Full initial state:`, {
      isScanning: true,
      progress: 0,
      status: "starting",
      totalIPs: totalIPs,
      processedIPs: 0,
      currentIP: start_ip
    });

    // Show the progress modal
    setShowProgressModal(true);

    try {
      // Start discovery on the first selected agent (for now, single agent)
      const agentId = selectedAgents[0];
      
      console.log("Starting discovery with payload:", {
        agentId,
        network_id: selectedNetworkId,
        agent_ids: selectedAgents,
        start_ip: start_ip,
        end_ip: end_ip,
        discovery_method: discoveryForm.discovery_method,
        snmp_version: discoveryForm.snmp_version,
        snmp_community: discoveryForm.community,
        snmp_port: discoveryForm.snmp_port,
        snmp_config: discoveryForm.snmp_version === 'v3' ? {
          security_level: discoveryForm.auth_password && discoveryForm.priv_password ? 'authPriv' : 
                         discoveryForm.auth_password ? 'authNoPriv' : 'noAuthNoPriv',
          username: discoveryForm.snmp_username,
          auth_protocol: discoveryForm.auth_protocol,
          auth_password: discoveryForm.auth_password,
          priv_protocol: discoveryForm.priv_protocol,
          priv_password: discoveryForm.priv_password
        } : null,
        credentials: {
          username: discoveryForm.username,
          password: discoveryForm.password
        },
        location: "",
        device_type: "auto",
        is_auto_discovery: true
      });
      
      const discoveryData = {
        agentId,
        network_id: selectedNetworkId,
        agent_ids: selectedAgents,
        start_ip: start_ip,
        end_ip: end_ip,
        discovery_method: discoveryForm.discovery_method,
        snmp_version: discoveryForm.snmp_version,
        snmp_community: discoveryForm.community,
        snmp_port: discoveryForm.snmp_port,
        snmp_config: discoveryForm.snmp_version === 'v3' ? {
          security_level: discoveryForm.auth_password && discoveryForm.priv_password ? 'authPriv' : 
                         discoveryForm.auth_password ? 'authNoPriv' : 'noAuthNoPriv',
          username: discoveryForm.snmp_username,
          auth_protocol: discoveryForm.auth_protocol,
          auth_password: discoveryForm.auth_password,
          priv_protocol: discoveryForm.priv_protocol,
          priv_password: discoveryForm.priv_password
        } : null,
        credentials: {
          username: discoveryForm.username,
          password: discoveryForm.password
        },
        location: "",
        device_type: "auto",
        is_auto_discovery: true
      };

      const data = await agentService.startDiscovery(discoveryData);

      if (!data) {
        throw new Error("Failed to start discovery");
      }

      console.log("Agent discovery started:", data);

      // Start polling for status
      pollDiscoveryProgress(data.session_id);
    } catch (error) {
      console.error("Error starting agent discovery:", error);
      console.error("Error response:", error.response);
      console.error("Error message:", error.message);
      setErrorMessage("Failed to start discovery: " + (error.response?.data?.detail || error.message));
      setShowErrorModal(true);
      setDiscoveryProgress(prev => ({ ...prev, isScanning: false }));
    }
  };

  const handleCloseDiscoverySummary = () => {
    setShowDiscoverySummaryModal(false);
    // Also close the discovery modal
    setShowAutoDiscoveryModal(false);
    // Refresh the device list with the current network ID
    if (selectedNetworkId) {
      fetchDevices(selectedNetworkId);
    }
  };

  const pollDiscoveryProgress = async (sessionId) => {
    try {
      console.log(`Polling discovery progress for session: ${sessionId}`);
      
      // Add timeout to the API call
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Progress check timeout')), 10000)
      );
      
      const progressPromise = agentService.checkDiscoveryProgress(sessionId);
      const progressData = await Promise.race([progressPromise, timeoutPromise]);
      
      console.log("Discovery progress data:", progressData);
      console.log("Raw progress data keys:", Object.keys(progressData));
      console.log("Progress data values:", {
        status: progressData.status,
        progress: progressData.progress,
        processed_ips: progressData.processed_ips,
        total_ips: progressData.total_ips,
        current_ip: progressData.current_ip,
        discovered_devices: progressData.discovered_devices,
        failed: progressData.failed
      });

      // Helper function to calculate progress percentage
      const calculateProgress = (processed, total) => {
        if (total <= 1) return processed > 0 ? 100 : 0; // Single IP case
        return Math.min(100, Math.round((processed / total) * 100));
      };
      
      // Helper function to get current IP being scanned
      const getCurrentIP = (data) => {
        return data.current_ip || data.current_ip_address || data.scanning_ip || '';
      };

      if (progressData.status === 'completed') {
        console.log("✅ Discovery completed:", progressData);
        
        const finalProgress = 100;
        const processed = (typeof progressData.processed_ips === 'number')
          ? progressData.processed_ips
          : (typeof progressData.scanned_ips === 'number' ? progressData.scanned_ips : (discoveryProgress.processedIPs || 0));
        const knownTotal = (typeof progressData.total_ips === 'number' && progressData.total_ips > 0)
          ? progressData.total_ips
          : ((discoveryProgress.totalIPs && discoveryProgress.totalIPs > 0) ? discoveryProgress.totalIPs : (initialTotalIPsRef.current && initialTotalIPsRef.current > 0 ? initialTotalIPsRef.current : undefined));
        
        setDiscoveryProgress({
          isScanning: false,
          status: 'completed',
          progress: finalProgress,
          discoveredDevices: progressData.discovered_devices || progressData.devices_found || 0,
          processedIPs: processed,
          totalIPs: knownTotal ?? discoveryProgress.totalIPs ?? initialTotalIPsRef.current ?? 0,
          currentIP: progressData.current_ip || 'Scan completed',
          estimatedTime: '',
          failed: progressData.failed_devices || progressData.failed || 0,
          agentProgress: progressData.agent_progress || [],
          errors: progressData.errors || [],
          message: `Discovery completed! Found ${progressData.discovered_devices || 0} devices.`
        });
        
        // Update discovery summary with actual results
        setDiscoverySummary({
          total_ips: knownTotal ?? initialTotalIPsRef.current ?? 0,
          discovered_devices: Array.isArray(progressData.discovered_devices)
            ? progressData.discovered_devices.length
            : (typeof progressData.discovered_devices === 'number'
                ? progressData.discovered_devices
                : (progressData.discovered_devices && typeof progressData.discovered_devices === 'object'
                    ? 1
                    : (typeof progressData.devices_found === 'number' ? progressData.devices_found : 0))),
          failed_devices: Array.isArray(progressData.failed_devices)
            ? progressData.failed_devices.length
            : (typeof progressData.failed_devices === 'number'
                ? progressData.failed_devices
                : (progressData.failed_devices && typeof progressData.failed_devices === 'object'
                    ? 1
                    : (typeof progressData.failed === 'number' ? progressData.failed : 0)))
        });
        
        // Refresh device list after completion
        setTimeout(async () => {
          console.log("Discovery completed, refreshing devices and fixing discovery methods...");
          await fetchDevices(selectedNetworkId);
          // Immediately fix discovery methods for newly discovered devices
          await fixDiscoveryMethodsForNewDevices(selectedNetworkId);
          setShowDiscoverySummaryModal(true);
        }, 1000);
        
        return true;
        
      } else if (progressData.status === 'failed') {
        console.log("❌ Discovery failed:", progressData);
        
        setDiscoveryProgress({
          isScanning: false,
          status: 'failed',
          progress: 0,
          discoveredDevices: 0,
          processedIPs: 0,
          totalIPs: discoveryProgress.totalIPs ?? initialTotalIPsRef.current ?? 0,
          currentIP: 'Discovery failed',
          estimatedTime: '',
          failed: 1,
          agentProgress: [],
          errors: progressData.errors || ['Discovery process failed'],
          message: 'Discovery failed. Please check your settings and try again.'
        });
        
        // Update discovery summary with failed results
        setDiscoverySummary({
          total_ips: discoveryProgress.totalIPs ?? initialTotalIPsRef.current ?? 0,
          discovered_devices: 0,
          failed_devices: 1
        });

        setTimeout(() => {
          setShowDiscoverySummaryModal(true);
        }, 1000);
        
        return true;
        
      } else if (progressData.status === 'in_progress') {
        console.log("🔄 Discovery in progress:", progressData);
        
        const processed = (typeof progressData.processed_ips === 'number')
          ? progressData.processed_ips
          : (typeof progressData.scanned_ips === 'number' ? progressData.scanned_ips : (discoveryProgress.processedIPs || 0));
        const knownTotal = (typeof progressData.total_ips === 'number' && progressData.total_ips > 0)
          ? progressData.total_ips
          : ((discoveryProgress.totalIPs && discoveryProgress.totalIPs > 0) ? discoveryProgress.totalIPs : (initialTotalIPsRef.current && initialTotalIPsRef.current > 0 ? initialTotalIPsRef.current : undefined));
        const currentIP = getCurrentIP(progressData);
        const backendPercent = (typeof progressData.progress === 'number') ? progressData.progress : undefined;
        const progress = (knownTotal && knownTotal > 0)
          ? calculateProgress(processed, knownTotal)
          : (backendPercent ?? discoveryProgress.progress ?? 0);
        
        console.log(`Progress calculation: ${processed}/${knownTotal ?? 'unknown'} = ${progress}%`);
        console.log(`Current IP from backend: ${currentIP}`);
        console.log(`Backend total_ips: ${progressData.total_ips}, Using total: ${knownTotal ?? '(none)'}`);
        console.log(`Previous totalIPs from state: ${discoveryProgress.totalIPs}, Ref: ${initialTotalIPsRef.current}`);
        
        let finalProgress = progress;
        let finalMessage = `Scanning network... ${progress}% complete`;
        
        // Preserve existing progress data and only update what's new
        setDiscoveryProgress(prev => ({
          ...prev,
          isScanning: true,
          status: 'in_progress',
          progress: finalProgress,
          discoveredDevices: progressData.discovered_devices || progressData.devices_found || prev.discoveredDevices || 0,
          processedIPs: processed,
          totalIPs: knownTotal ?? prev.totalIPs ?? initialTotalIPsRef.current ?? 0,
          currentIP: currentIP || prev.currentIP || 'Scanning...',
          estimatedTime: progressData.estimated_time || progressData.eta || prev.estimatedTime || '',
          failed: progressData.failed_devices || progressData.failed || prev.failed || 0,
          agentProgress: progressData.agent_progress || prev.agentProgress || [],
          errors: progressData.errors || prev.errors || [],
          message: finalMessage
        }));
        
        // Continue polling
        setTimeout(() => pollDiscoveryProgress(sessionId), 2000);
        return false;
        
      } else if (progressData.status === 'started') {
        console.log("🚀 Discovery started:", progressData);
        
        const backendProgress = (typeof progressData.progress === 'number') ? progressData.progress : undefined;
        const currentProgress = discoveryProgress.progress || 0;
        const nextProgress = backendProgress ?? Math.min(currentProgress + 10, 90);
        
        // Get the total IPs from our stored calculation
        const totalIPs = discoveryProgress.totalIPs || initialTotalIPsRef.current || 0;
        
        // Simulate processed IPs based on progress percentage
        let simulatedProcessedIPs = 0;
        if (backendProgress !== undefined && totalIPs > 0) {
          simulatedProcessedIPs = Math.max(0, Math.floor((backendProgress / 100) * totalIPs));
        } else {
          // Use previous processed IPs if no backend progress
          simulatedProcessedIPs = discoveryProgress.processedIPs || 0;
        }
        
        // Simulate current IP progression based on processed count
        let simulatedCurrentIP = discoveryProgress.currentIP || '';
        let parsedStartIP = '';
        if (discoveryForm.ipRange) {
          const ipRange = discoveryForm.ipRange;
          if (ipRange.includes('-')) {
            const [startIP, endIP] = ipRange.split('-').map(ip => ip.trim());
            parsedStartIP = startIP;
          } else {
            parsedStartIP = ipRange.trim();
          }
        }
        if (totalIPs > 0) {
          // Parse the actual IP range from the form to simulate progression when we can
          const ipRange = discoveryForm.ipRange;
          if (ipRange && ipRange.includes('-') && simulatedProcessedIPs > 0) {
            const [startIP, endIP] = ipRange.split('-').map(ip => ip.trim());
            const startParts = startIP.split('.').map(Number);
            const endParts = endIP.split('.').map(Number);
            
            const startOctet = startParts[3];
            const endOctet = endParts[3];
            const currentIndex = Math.min(simulatedProcessedIPs - 1, totalIPs - 1);
            const currentOctet = Math.min(startOctet + currentIndex, endOctet);
            simulatedCurrentIP = `${startParts[0]}.${startParts[1]}.${startParts[2]}.${currentOctet}`;
          }
        }
        
        // Try to extract processed IPs from backend data
        const processedIPs = (typeof progressData.processed_ips === 'number')
          ? progressData.processed_ips
          : (typeof progressData.scanned_ips === 'number' ? progressData.scanned_ips : simulatedProcessedIPs);
        
        // Try to extract discovered devices count
        const discoveredDevices = Array.isArray(progressData.discovered_devices) 
          ? progressData.discovered_devices.length 
          : (typeof progressData.discovered_devices === 'number' ? progressData.discovered_devices : discoveryProgress.discoveredDevices);
        
        // Try to extract failed count
        const failedCount = (typeof progressData.failed === 'number')
          ? progressData.failed
          : (typeof progressData.failed_devices === 'number' ? progressData.failed_devices : discoveryProgress.failed);
        
        console.log(`Simulated progress: ${simulatedProcessedIPs}/${totalIPs} IPs, Current IP: ${simulatedCurrentIP || parsedStartIP}`);
        
        // Determine the best current IP to use
        let bestCurrentIP = simulatedCurrentIP || discoveryProgress.currentIP || parsedStartIP;
        
        // If we have a valid current IP from previous state, preserve it
        if (discoveryProgress.currentIP && discoveryProgress.currentIP !== 'Scan completed' && discoveryProgress.currentIP !== 'Starting scan...') {
          bestCurrentIP = discoveryProgress.currentIP;
        }
        
        setDiscoveryProgress(prev => ({
          ...prev,
          isScanning: true,
          status: 'started',
          progress: nextProgress,
          discoveredDevices: discoveredDevices ?? prev.discoveredDevices ?? 0,
          processedIPs: processedIPs,
          totalIPs: totalIPs,
          currentIP: bestCurrentIP,
          estimatedTime: progressData.estimated_completion || prev.estimatedTime || '',
          failed: failedCount ?? prev.failed ?? 0,
          agentProgress: prev.agentProgress || [],
          errors: progressData.errors || prev.errors || [],
          message: backendProgress !== undefined ? `Discovery in progress... ${backendProgress}% complete` : 'Initializing discovery...'
        }));
        
        // Continue polling
        setTimeout(() => pollDiscoveryProgress(sessionId), 2000);
        return false;
        
      } else {
        console.log("⏳ Discovery starting...");
        
        // If we don't have detailed progress data, show a basic progress
        const currentProgress = discoveryProgress.progress || 0;
        const nextProgress = Math.min(currentProgress + 10, 90); // Increment progress gradually
        
        // Preserve existing progress data and only update what's new
        setDiscoveryProgress(prev => ({
          ...prev,
          isScanning: true,
          status: 'starting',
          progress: nextProgress,
          discoveredDevices: prev.discoveredDevices || 0,
          processedIPs: prev.processedIPs || 0,
          totalIPs: prev.totalIPs || 1,
          currentIP: prev.currentIP || 'Starting scan...',
          estimatedTime: prev.estimatedTime || '',
          failed: prev.failed || 0,
          agentProgress: prev.agentProgress || [],
          errors: prev.errors || [],
          message: nextProgress < 90 ? 'Initializing discovery...' : 'Discovery in progress...'
        }));
        
        // Continue polling
        setTimeout(() => pollDiscoveryProgress(sessionId), 2000);
        return false;
      }
      
    } catch (error) {
      console.error("❌ Error polling discovery progress:", error);
      setDiscoveryProgress({
        isScanning: false,
        status: 'error',
        progress: 0,
        discoveredDevices: discoveryProgress.discoveredDevices || 0,
        processedIPs: discoveryProgress.processedIPs || 0,
        totalIPs: discoveryProgress.totalIPs || 0,
        currentIP: discoveryProgress.currentIP || '',
        estimatedTime: '',
        failed: discoveryProgress.failed || 0,
        agentProgress: discoveryProgress.agentProgress || [],
        errors: [error.message || 'Failed to get discovery progress'],
        message: 'Error checking discovery progress.'
      });
      
      // Update discovery summary with failed results
      setDiscoverySummary({
        total_ips: discoveryProgress.totalIPs || 0,
        discovered_devices: 0,
        failed_devices: 1
      });

      setTimeout(() => {
        setShowDiscoverySummaryModal(true);
      }, 1000);
      
      return true; // Stop polling on error
    }
  };

  // Functions now handled by useDeviceActions hook

  // handleDiscoveryFormChange function removed - not being used

  return (
          <div className="device-inventory-container">
        <DeviceInventoryHeader
          onAutoDiscovery={() => setShowAutoDiscoveryModal(true)}
        />

        {/* Device Table - Now using extracted components */}
        <DeviceTable
          devices={devices}
          isLoading={false}
          onRefresh={handleIndividualRefresh}
          onDelete={confirmDelete}
          onServiceToggle={handleServiceToggle}
          onAddDevice={() => {
            setEditingDeviceId(null);
            setForm(getInitialFormState(selectedNetworkId));
            setShowForm(true);
          }}
          onAutoDiscovery={() => setShowAutoDiscoveryModal(true)}
          userRole={userRole}
          userTier={userTier}
          refreshingDevices={refreshingDevices}
          selectedOrgId={selectedOrgId}
          selectedNetworkId={selectedNetworkId}
          backgroundMonitoring={backgroundMonitoring}
        />

            {/* Edit/Add Modal */}
      <AddEditDeviceModal
        showForm={showForm}
        setShowForm={setShowForm}
        editingDeviceId={editingDeviceId}
        setEditingDeviceId={setEditingDeviceId}
        form={form}
        setForm={setForm}
        handleChange={handleChange}
        handleSubmit={handleSubmit}
        availableAgents={availableAgents}
        isLoadingAgents={isLoadingAgents}
        agentError={agentError}
        refreshAgents={refreshAgents}
      />

      {/* Auto Discovery Modal */}
      <AutoDiscoveryModal
        showAutoDiscoveryModal={showAutoDiscoveryModal}
        setShowAutoDiscoveryModal={setShowAutoDiscoveryModal}
        discoveryForm={discoveryForm}
        setDiscoveryForm={setDiscoveryForm}
        selectedAgents={selectedAgents}
        setSelectedAgents={setSelectedAgents}
        availableAgents={availableAgents}
        discoveryProgress={discoveryProgress}
        handleStartDiscovery={handleStartDiscovery}
        onShowProgress={() => setShowProgressModal(true)}
      />

      {/* Discovery Progress Modal */}
      <DiscoveryProgressModal
        showProgressModal={showProgressModal}
        setShowProgressModal={setShowProgressModal}
        discoveryProgress={discoveryProgress}
        onClose={() => {
          setShowProgressModal(false);
          setShowAutoDiscoveryModal(false);
        }}
      />

      {/* Discovery Summary Modal */}
      <DiscoverySummaryModal
        showDiscoverySummaryModal={showDiscoverySummaryModal}
        setShowDiscoverySummaryModal={setShowDiscoverySummaryModal}
        discoverySummary={discoverySummary}
        handleCloseDiscoverySummary={handleCloseDiscoverySummary}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        showConfirmModal={showConfirmModal}
        setShowConfirmModal={setShowConfirmModal}
        deviceToDelete={deviceToDelete}
        setDeviceToDelete={setDeviceToDelete}
        handleConfirmDelete={handleConfirmDelete}
      />

      {/* Custom Tooltip */}
      {tooltip.show && (
        <div
          ref={tooltipRef}
          className={`custom-tooltip show ${tooltip.type}`}
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: 'translateX(-50%)'
          }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
}

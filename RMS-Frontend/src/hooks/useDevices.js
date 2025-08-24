import { useState, useEffect, useCallback } from "react";
import { deviceService } from '../services/deviceService';

export const useDevices = (selectedNetworkId) => {
  const [devices, setDevices] = useState([]);
  const [userRole, setUserRole] = useState('');
  const [userTier, setUserTier] = useState(null);

  useEffect(() => {
    // Get user data from localStorage
    try {
      const userData = JSON.parse(localStorage.getItem("user_data"));
      if (userData) {
        console.log("DeviceManager loaded user data:", {
          role: userData.role,
          tier: userData.engineer_tier
        });
        setUserRole(userData.role);
        setUserTier(userData.engineer_tier ? Number(userData.engineer_tier) : null);
      }
    } catch (err) {
      console.error("Failed to parse user data:", err);
    }
  }, []);

  // Memoize fetchDevices to prevent infinite loops - MOVED BEFORE useEffect
  const fetchDevices = useCallback(async (networkId) => {
    try {
      console.log("Fetching devices for network:", networkId);
      const data = await deviceService.fetchDevices(networkId);
      
      if (Array.isArray(data)) {
        // Ensure each device has the correct status properties and discovery method
        const devicesWithStatus = data.map(device => {
          console.log(`🔍 Processing device ${device.name}:`, {
            ping_status: device.ping_status,
            snmp_status: device.snmp_status,
            is_active: device.is_active,
            discovery_method: device.discovery_method,
            os_version: device.os_version,
            serial_number: device.serial_number,
            type: device.type,
            location: device.location
          });
          
          // Enhanced discovery method detection logic
          let discoveryMethod = device.discovery_method;
          if (!discoveryMethod) {
            // More sophisticated detection based on device characteristics
            const hasComprehensiveData = device.os_version && device.serial_number && device.type;
            const hasDetailedInfo = device.location && device.contact;
            const hasNetworkDiscovery = device.network_id && device.network_id.toString() === networkId.toString();
            
            // If device has comprehensive data and appears to be network-discovered, it's likely auto-discovered
            if (hasComprehensiveData && hasNetworkDiscovery) {
              discoveryMethod = 'auto';
              console.log(`Device ${device.name} appears to be auto-discovered (comprehensive data + network discovery), setting discovery_method to 'auto'`);
            } else if (hasComprehensiveData && hasDetailedInfo) {
              discoveryMethod = 'auto';
              console.log(`Device ${device.name} appears to be auto-discovered (comprehensive data + detailed info), setting discovery_method to 'auto'`);
            } else if (device.os_version && device.serial_number) {
              // Devices with OS version and serial number are very likely auto-discovered
              discoveryMethod = 'auto';
              console.log(`Device ${device.name} appears to be auto-discovered (OS + serial), setting discovery_method to 'auto'`);
            } else {
              discoveryMethod = 'manual';
              console.log(`Device ${device.name} appears to be manually added (limited data), setting discovery_method to 'manual'`);
            }
          }
          
          return {
            ...device,
            ping_status: device.ping_status ?? false,
            snmp_status: device.snmp_status ?? false,  // Default to false if not set - assume SNMP is not working
            is_active: device.is_active,
            discovery_method: discoveryMethod
          };
        });
        
        console.log("Final processed devices:", devicesWithStatus);
        
        // Immediately fix discovery methods for devices that appear to be auto-discovered
        const devicesWithFixedDiscovery = devicesWithStatus.map(device => {
          console.log(`🔍 Checking device ${device.name} for discovery method correction:`, {
            current_method: device.discovery_method,
            has_os: device.os_version && device.os_version !== 'N/A',
            has_serial: device.serial_number && device.serial_number !== 'N/A',
            has_type: device.type && device.type !== 'N/A',
            os_value: device.os_version,
            serial_value: device.serial_number,
            type_value: device.type
          });
          
          // Check if device appears to be auto-discovered (including 'enhanced' which is backend's auto discovery)
          if (!device.discovery_method || device.discovery_method === 'manual' || device.discovery_method === 'enhanced') {
            const hasOSVersion = device.os_version && device.os_version !== 'N/A';
            const hasSerialNumber = device.serial_number && device.serial_number !== 'N/A';
            const hasType = device.type && device.type !== 'N/A';
            
            if (hasOSVersion && hasSerialNumber && hasType) {
              console.log(`✅ Device ${device.name} appears to be auto-discovered but shows '${device.discovery_method || 'undefined'}'. Fixing to 'auto'`);
              return { ...device, discovery_method: 'auto' };
            } else {
              console.log(`❌ Device ${device.name} doesn't meet auto-discovery criteria:`, {
                hasOSVersion,
                hasSerialNumber,
                hasType
              });
            }
          } else {
            console.log(`⏭️ Device ${device.name} already has discovery method: ${device.discovery_method}`);
          }
          return device;
        });
        
        console.log("Devices with corrected discovery methods:", devicesWithFixedDiscovery);
        
        setDevices(devicesWithFixedDiscovery);
      }
    } catch (err) {
      console.error("❌ Failed to fetch devices:", err);
    }
  }, []);

  useEffect(() => {
    console.log("🔍 DEBUG: useDevices useEffect triggered with selectedNetworkId:", selectedNetworkId);
    
    if (selectedNetworkId) {
      console.log("DeviceManager fetching devices for network:", selectedNetworkId);
      fetchDevices(selectedNetworkId);
    } else {
      console.log("DeviceManager: No network selected, clearing devices");
      setDevices([]);
    }
  }, [selectedNetworkId, fetchDevices]);

  // Function to fix discovery methods for newly discovered devices
  const fixDiscoveryMethodsForNewDevices = async (networkId) => {
    try {
      console.log("Fixing discovery methods for newly discovered devices in network:", networkId);
      
      // Get the current devices list
      const currentDevices = devices.filter(device => device.network_id == networkId);
      
      // Find devices that need discovery method fixes
      const devicesToFix = currentDevices.filter(device => {
        console.log(`🔍 Post-discovery check for device ${device.name}:`, {
          current_method: device.discovery_method,
          os_version: device.os_version,
          serial_number: device.serial_number,
          type: device.type,
          location: device.location
        });
        
        // Skip devices that already have the correct discovery method
        if (device.discovery_method === 'auto') {
          console.log(`⏭️ Device ${device.name} already has correct discovery method: auto`);
          return false;
        }
        
        // Also skip devices that have 'enhanced' as they are already auto-discovered by backend
        if (device.discovery_method === 'enhanced') {
          console.log(`⏭️ Device ${device.name} has backend auto-discovery method: enhanced`);
          return false;
        }
        
        // Check if device appears to be auto-discovered based on comprehensive data
        const hasOSVersion = device.os_version && device.os_version !== 'N/A';
        const hasSerialNumber = device.serial_number && device.serial_number !== 'N/A';
        const hasType = device.type && device.type !== 'N/A';
        const hasLocation = device.location && device.location !== 'N/A';
        
        console.log(`🔍 Device ${device.name} criteria check:`, {
          hasOSVersion,
          hasSerialNumber,
          hasType,
          hasLocation
        });
        
        // If device has comprehensive discovery data, it's likely auto-discovered
        if (hasOSVersion && hasSerialNumber && hasType) {
          console.log(`✅ Device ${device.name} has comprehensive data (OS: ${device.os_version}, Serial: ${device.serial_number}, Type: ${device.type}) - marking as auto-discovered`);
          return true;
        }
        
        // If device has detailed network information, it's likely auto-discovered
        if (hasOSVersion && hasSerialNumber && hasLocation) {
          console.log(`✅ Device ${device.name} has detailed network info (OS: ${device.os_version}, Serial: ${device.serial_number}, Location: ${device.location}) - marking as auto-discovered`);
          return true;
        }
        
        console.log(`❌ Device ${device.name} doesn't meet auto-discovery criteria`);
        return false;
      });
      
      if (devicesToFix.length > 0) {
        console.log(`Found ${devicesToFix.length} devices to fix discovery methods:`, devicesToFix.map(d => d.name));
        
        // Update local state to mark these devices as auto-discovered
        setDevices(prevDevices => 
          prevDevices.map(device => {
            if (devicesToFix.some(d => d.id === device.id)) {
              console.log(`Updating device ${device.name} discovery_method from '${device.discovery_method}' to 'auto'`);
              return { ...device, discovery_method: 'auto' };
            }
            return device;
          })
        );
        
        console.log("Successfully fixed discovery methods for newly discovered devices");
      } else {
        console.log("No devices need discovery method fixes");
      }
    } catch (error) {
      console.error("Error fixing discovery methods for new devices:", error);
    }
  };

  return {
    devices,
    setDevices,
    userRole,
    userTier,
    fetchDevices,
    fixDiscoveryMethodsForNewDevices
  };
};
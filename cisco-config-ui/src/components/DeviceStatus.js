import { Monitor, Server, Shield, Power } from "lucide-react";

// Status circle component for device status
export const PingStatusCircle = ({ device }) => {
  // Debug: Log the device object to see what properties are available
  console.log('PingStatusCircle received device:', device);
  
  const getStatusColor = () => {
    console.log(`Calculating status for device ${device.name}:`, {
      is_active: device.is_active,
      ping_status: device.ping_status,
      snmp_status: device.snmp_status
    });

    if (!device.is_active) {
      return 'red';
    }
    
    // Get the stored status from the device
    const pingStatus = device.ping_status ?? false;
    const snmpStatus = device.snmp_status ?? false;  // Default to false if not set - assume SNMP is not working
    
    // Calculate status based on ping and SNMP
    // Green: Both ping and SNMP are working
    // Orange: Ping is working but SNMP is not working (or not configured)
    // Red: Ping is not working
    if (pingStatus && snmpStatus) {
      return 'green';
    } else if (pingStatus) {
      return 'orange';  // Ping works but SNMP doesn't
    } else {
      return 'red';     // Ping doesn't work
    }
  };

  const color = getStatusColor();
  console.log(`Device ${device.name} final status:`, { 
    ping: device.ping_status, 
    snmp: device.snmp_status,
    color: color 
  });

  return (
    <div className="flex items-center gap-2">
      <div 
        className={`status-circle ${color}`}
        title={`Ping: ${device.ping_status ? 'Reachable' : 'Unreachable'}, SNMP: ${device.snmp_status ? 'Reachable' : 'Unreachable'}`}
        style={{
          width: '16px',
          height: '16px',
          borderRadius: '50%',
          backgroundColor: color === 'green' ? '#10b981' : color === 'orange' ? '#f59e0b' : '#ef4444',
          boxShadow: `0 0 8px ${color === 'green' ? 'rgba(16, 185, 129, 0.5)' : color === 'orange' ? 'rgba(245, 158, 11, 0.5)' : 'rgba(239, 68, 68, 0.5)'}`
        }}
      />
      <span className="text-xs text-gray-300">
        {color === 'green' ? 'Online' : color === 'orange' ? 'Warning' : 'Offline'}
      </span>
    </div>
  );
};

// Device icon component
export const DeviceIcon = ({ type }) => {
  const getIcon = () => {
    switch (type) {
      case "Router": 
        return <Server className="w-4 h-4 inline mr-1" />;
      case "Firewall": 
        return <Shield className="w-4 h-4 inline mr-1" />;
      default: 
        return <Monitor className="w-4 h-4 inline mr-1" />;
    }
  };

  return getIcon();
};

// Discovery method badge component
export const DiscoveryMethodBadge = ({ method }) => {
  const getBadgeStyle = () => {
    switch (method) {
      case 'auto':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'manual':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'enhanced':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getDisplayName = () => {
    switch (method) {
      case 'auto':
        return 'Auto';
      case 'manual':
        return 'Manual';
      case 'enhanced':
        return 'Enhanced';
      default:
        return 'Unknown';
    }
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getBadgeStyle()}`}>
      {getDisplayName()}
    </span>
  );
};

// Service status indicator component
export const ServiceStatusIndicator = ({ isActive, onClick, disabled = false }) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`service-toggle ${
        isActive ? 'service-active' : 'service-inactive'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      title={isActive ? 'Service Active - Click to disable' : 'Service Inactive - Click to enable'}
    >
      <Power className={`w-4 h-4 ${isActive ? 'text-green-400' : 'text-red-400'}`} />
    </button>
  );
}; 
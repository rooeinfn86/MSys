
import { PingStatusCircle, DeviceIcon, DiscoveryMethodBadge, ServiceStatusIndicator } from './DeviceStatus';
import { DeviceActions } from './DeviceActions';

// Individual device table row component
export const DeviceTableRow = ({ 
  device, 
  onRefresh, 
  onEdit, 
  onDelete, 
  onServiceToggle,
  isRefreshing = false,
  userRole,
  userTier 
}) => {
  return (
    <tr key={device.id} className="hover:bg-[#1a1d2a] transition-colors duration-200">
      {/* Status Column */}
      <td data-label="Status" className="text-center">
        <PingStatusCircle device={device} />
      </td>
      
      {/* Name Column */}
      <td data-label="Name">
        <div className="flex items-center">
          <DeviceIcon type={device.type} />
          <span className="font-medium text-white">{device.name}</span>
        </div>
      </td>
      
      {/* IP Address Column */}
      <td data-label="IP Address">
        <span className="font-mono text-gray-300">{device.ip}</span>
      </td>
      
      {/* Location Column */}
      <td data-label="Location">
        <span className="text-gray-300">{device.location || 'N/A'}</span>
      </td>
      
      {/* Type Column */}
      <td data-label="Type">
        <span className="text-gray-300">{device.type || 'N/A'}</span>
      </td>
      
      {/* OS Version Column */}
      <td data-label="OS Version">
        <span className="text-gray-300">{device.os_version || 'N/A'}</span>
      </td>
      
      {/* Serial Number Column */}
      <td data-label="Serial Number">
        <span className="font-mono text-gray-300">{device.serial_number || 'N/A'}</span>
      </td>
      
      {/* Discovery Method Column */}
      <td data-label="Discovery">
        <DiscoveryMethodBadge method={device.discovery_method} />
      </td>
      
                        {/* Service Column */}
                  <td data-label="Service">
                    <ServiceStatusIndicator
                      isActive={device.is_active}
                      onClick={() => onServiceToggle(device.id, device.is_active)}
                      disabled={false}
                    />
                  </td>
      
      {/* Actions Column */}
      <td data-label="Actions">
        <DeviceActions
          device={device}
          onRefresh={onRefresh}
          onEdit={onEdit}
          onDelete={onDelete}
          isRefreshing={isRefreshing}
          userRole={userRole}
          userTier={userTier}
        />
      </td>
    </tr>
  );
};

// Empty state row component
export const EmptyStateRow = ({ selectedOrgId, selectedNetworkId }) => {
  // Determine the appropriate message based on context
  let message, subtitle;
  
  if (!selectedOrgId) {
    message = "Please select an organization to view devices";
    subtitle = "Choose an organization from the dropdown to access your device inventory";
  } else if (!selectedNetworkId) {
    message = "Please select a network to view devices";
    subtitle = "Choose a network from the dropdown to see devices in that network";
  } else {
    message = "No devices found in this network";
    subtitle = "Try adding a device manually or start auto-discovery to find network devices";
  }

  return (
    <tr>
      <td colSpan="10" className="text-center py-12">
        <div className="flex flex-col items-center justify-center text-center">
          <p className="text-xl font-medium mb-3 text-gray-300">{message}</p>
          <p className="text-sm text-gray-500 max-w-md leading-relaxed">{subtitle}</p>
        </div>
      </td>
    </tr>
  );
};

// Full-page empty state block for use outside table structure
export const EmptyStateBlock = ({ selectedOrgId, selectedNetworkId }) => {
  let message, subtitle;

  if (!selectedOrgId) {
    message = "Please select an organization to view devices";
    subtitle = "Choose an organization from the dropdown to access your device inventory";
  } else if (!selectedNetworkId) {
    message = "Please select a network to view devices";
    subtitle = "Choose a network from the dropdown to see devices in that network";
  } else {
    message = "No devices found in this network";
    subtitle = "Try adding a device manually or start auto-discovery to find network devices";
  }

  return (
    <div className="w-full flex items-center justify-center text-center min-h-[70vh] px-4">
      <div className="flex flex-col items-center">
        <p className="text-xl font-medium mb-3 text-gray-300">{message}</p>
        <p className="text-sm text-gray-500 max-w-md leading-relaxed">{subtitle}</p>
      </div>
    </div>
  );
};

// Loading state row component
export const LoadingStateRow = () => {
  return (
    <tr>
      <td colSpan="10" className="text-center py-8">
        <div className="flex items-center justify-center text-gray-400">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
          <span className="ml-3">Loading devices...</span>
        </div>
      </td>
    </tr>
  );
}; 
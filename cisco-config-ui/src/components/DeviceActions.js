import { RefreshCw, Trash2, Power, Search } from "lucide-react";

// Device action buttons component
export const DeviceActions = ({ 
  device, 
  onRefresh, 
  onDelete, 
  isRefreshing = false,
  userRole,
  userTier 
}) => {

  return (
    <div className="flex gap-2 justify-center">
      <button
        onClick={() => onRefresh(device.id)}
        className="action-button refresh-button"
        title="Refresh device status"
        disabled={isRefreshing}
      >
        {isRefreshing ? (
          <RefreshCw className="w-4 h-4 animate-spin" />
        ) : (
          <RefreshCw className="w-4 h-4" />
        )}
        <span>Refresh</span>
      </button>
      
      <button
        onClick={() => onDelete(device.id)}
        className="action-button delete-button"
        title="Delete device"
      >
        <Trash2 className="w-4 h-4" />
        <span>Delete</span>
      </button>
    </div>
  );
};

// Service toggle button component
export const ServiceToggleButton = ({ 
  deviceId, 
  isActive, 
  onToggle, 
  userRole, 
  userTier 
}) => {
  const canToggle = userRole === "company_admin" || (userRole === "engineer" && userTier >= 3);
  
  if (!canToggle) {
    return (
      <button
        className="service-toggle service-inactive opacity-50 cursor-not-allowed"
        title="You don't have permission to toggle service status"
        disabled
      >
        <Power className="w-4 h-4 text-red-400" />
      </button>
    );
  }

  return (
    <button
      onClick={() => onToggle(deviceId, isActive)}
      className={`service-toggle ${
        isActive ? 'service-active' : 'service-inactive'
      }`}
      title={isActive ? 'Service Active - Click to disable' : 'Service Inactive - Click to enable'}
    >
      <Power className={`w-4 h-4 ${isActive ? 'text-green-400' : 'text-red-400'}`} />
    </button>
  );
};

// Bulk action buttons component
export const BulkActionButtons = ({ 
  onAutoDiscovery
}) => {
  return (
    <div className="device-inventory-actions">
      <button
        onClick={onAutoDiscovery}
        className="btn-auto-discovery"
      >
        <Search size={16} /> Auto Discovery
      </button>
    </div>
  );
}; 
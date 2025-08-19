import { Search } from 'lucide-react';
import { DeviceTableRow, LoadingStateRow, EmptyStateBlock } from './DeviceTableRow';
import { BulkActionButtons } from './DeviceActions';

// Device table component
export const DeviceTable = ({ 
  devices, 
  isLoading = false,
  onRefresh, 
  onDelete, 
  onServiceToggle,
  onAddDevice,
  onAutoDiscovery,
  userRole,
  userTier,
  refreshingDevices = new Set(),
  selectedOrgId,
  selectedNetworkId,
  backgroundMonitoring
}) => {
  if (isLoading) {
    return <LoadingStateRow />;
  }

  if (!devices || devices.length === 0) {
    // Use full-page empty state block for proper centering
    return <EmptyStateBlock selectedOrgId={selectedOrgId} selectedNetworkId={selectedNetworkId} />;
  }

  return (
    <div className="device-inventory-table-container">
      {/* Background Monitoring Status Bar */}
      {backgroundMonitoring && (
        <div className="background-monitoring-status">
          <div className="status-info">
            <span className="status-label">🔄 Auto-monitoring:</span>
            <span className={`status-indicator ${backgroundMonitoring.isActive ? 'active' : 'idle'}`}>
              {backgroundMonitoring.isActive ? 'Checking devices...' : 'Active'}
            </span>
          </div>
          <div className="status-details">
            {backgroundMonitoring.lastChecked && (
              <span className="last-checked">
                Last checked: {new Date(backgroundMonitoring.lastChecked).toLocaleTimeString()}
              </span>
            )}
            {backgroundMonitoring.nextCheck && (
              <span className="next-check">
                Next check: {new Date(backgroundMonitoring.nextCheck).toLocaleTimeString()}
              </span>
            )}
            <span className="interval-info">
              Checking every 3 minutes
            </span>
          </div>
        </div>
      )}
      
      <table className="device-inventory-table">
        <thead>
          <tr>
            <th>Status</th>
            <th>Name</th>
            <th>IP Address</th>
            <th>Location</th>
            <th>Type</th>
            <th>OS Version</th>
            <th>Serial Number</th>
            <th>Discovery</th>
            <th>Service</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {devices.map((device) => (
            <DeviceTableRow
              key={device.id}
              device={device}
              onRefresh={onRefresh}
              onDelete={onDelete}
              onServiceToggle={onServiceToggle}
              isRefreshing={refreshingDevices.has(device.id)}
              userRole={userRole}
              userTier={userTier}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
};

// Device inventory header component
export const DeviceInventoryHeader = ({ 
  onAutoDiscovery
}) => {
  return (
    <div className="device-inventory-header">
      <div className="device-inventory-title">Device Inventory</div>
      <BulkActionButtons
        onAutoDiscovery={onAutoDiscovery}
      />
    </div>
  );
};

// Search and filter component
export const DeviceSearchFilter = ({ 
  searchTerm, 
  onSearchChange, 
  onFilterChange, 
  filters = {} 
}) => {
  return (
    <div className="device-search-filter mb-4">
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search Input */}
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search devices by name, IP, or location..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#1a1d2a] border border-[#2a2f45] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
        
        {/* Filter Dropdowns */}
        <div className="flex gap-2">
          <select
            value={filters.status || ''}
            onChange={(e) => onFilterChange('status', e.target.value)}
            className="px-3 py-2 bg-[#1a1d2a] border border-[#2a2f45] rounded-lg text-white focus:outline-none focus:border-blue-500"
          >
            <option value="">All Status</option>
            <option value="online">Online</option>
            <option value="offline">Offline</option>
            <option value="warning">Warning</option>
          </select>
          
          <select
            value={filters.type || ''}
            onChange={(e) => onFilterChange('type', e.target.value)}
            className="px-3 py-2 bg-[#1a1d2a] border border-[#2a2f45] rounded-lg text-white focus:outline-none focus:border-blue-500"
          >
            <option value="">All Types</option>
            <option value="Router">Router</option>
            <option value="Switch">Switch</option>
            <option value="Firewall">Firewall</option>
            <option value="Server">Server</option>
          </select>
          
          <select
            value={filters.discovery || ''}
            onChange={(e) => onFilterChange('discovery', e.target.value)}
            className="px-3 py-2 bg-[#1a1d2a] border border-[#2a2f45] rounded-lg text-white focus:outline-none focus:border-blue-500"
          >
            <option value="">All Discovery</option>
            <option value="auto">Auto</option>
            <option value="manual">Manual</option>
            <option value="enhanced">Enhanced</option>
          </select>
        </div>
      </div>
    </div>
  );
}; 
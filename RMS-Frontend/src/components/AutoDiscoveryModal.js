


export const AutoDiscoveryModal = ({
  showAutoDiscoveryModal,
  setShowAutoDiscoveryModal,
  discoveryForm,
  setDiscoveryForm,
  selectedAgents,
  setSelectedAgents,
  availableAgents,
  discoveryProgress,
  handleStartDiscovery,
  onShowProgress
}) => {
  if (!showAutoDiscoveryModal) return null;

  return (
    <div className="modal-overlay fixed inset-0 flex items-center justify-center z-50 p-4">
      <div 
        className="modal-content p-6 rounded-lg shadow-lg relative"
        style={{
          width: '70vw',
          maxWidth: '70vw',
          maxHeight: '85vh',
          minWidth: '900px',
          overflowY: 'auto'
        }}
      >
        <button 
          onClick={() => setShowAutoDiscoveryModal(false)} 
          className="absolute top-4 right-4 text-white hover:text-red-500 text-xl z-10 bg-black/50 rounded-full w-8 h-8 flex items-center justify-center hover:bg-black/70 transition-all"
        >
          &times;
        </button>
        
        {/* Header Section */}
        <div className="text-center mb-6">
          <h3 className="modal-title text-2xl mb-2">Auto Discovery</h3>
          <p className="text-gray-400 text-sm">Configure network discovery settings and scan for devices</p>
        </div>
        
        {/* Main Content - Two Column Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
          {/* Left Column - Basic Settings */}
          <div className="space-y-4">
            {/* Agent Selection */}
            <div className="bg-[#11131a] border border-[#00ff00]/20 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <label className="block text-base font-medium text-gray-300">
                  Select Agents *
                </label>
                {availableAgents.length > 0 && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedAgents(availableAgents.map(agent => agent.id))}
                      className="px-3 py-1 text-xs bg-[#00ff00]/20 text-[#00ff00] border border-[#00ff00]/30 rounded hover:bg-[#00ff00]/30 transition-colors"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedAgents([])}
                      className="px-3 py-1 text-xs bg-gray-500/20 text-gray-300 border border-gray-500/30 rounded hover:bg-gray-500/30 transition-colors"
                    >
                      Clear All
                    </button>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                {availableAgents.map((agent) => (
                  <label key={agent.id} className="flex items-center space-x-2 p-2 rounded border border-transparent hover:border-[#00ff00]/30 hover:bg-[#00ff00]/5 transition-all duration-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedAgents.includes(agent.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedAgents([...selectedAgents, agent.id]);
                        } else {
                          setSelectedAgents(selectedAgents.filter(id => id !== agent.id));
                        }
                      }}
                      className="rounded border-[#00ff00]/50 text-[#00ff00] focus:ring-[#00ff00]/50 focus:ring-2"
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-white truncate">{agent.name}</span>
                      {agent.status && (
                        <span className={`ml-2 px-1.5 py-0.5 text-xs rounded-full ${
                          agent.status === 'online' ? 'bg-green-500/20 text-green-400' : 
                          agent.status === 'offline' ? 'bg-red-500/20 text-red-400' : 
                          'bg-gray-500/20 text-gray-400'
                        }`}>
                          {agent.status}
                        </span>
                      )}
                    </div>
                  </label>
                ))}
              </div>
              {availableAgents.length === 0 && (
                <div className="text-center py-4 text-gray-400">
                  No agents available. Please add agents first.
                </div>
              )}
              {availableAgents.length > 0 && (
                <div className="mt-3 pt-3 border-t border-[#00ff00]/20 text-center text-sm text-gray-400">
                  {selectedAgents.length} of {availableAgents.length} agents selected
                </div>
              )}
            </div>

            {/* Network Configuration */}
            <div className="bg-[#11131a] border border-[#00ff00]/20 rounded-lg p-4">
              <h4 className="text-lg font-medium text-white mb-3 border-b border-[#00ff00]/20 pb-2">Network Configuration</h4>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    IP Range *
                  </label>
                  <input
                    type="text"
                    value={discoveryForm.ipRange}
                    onChange={(e) => setDiscoveryForm({...discoveryForm, ipRange: e.target.value})}
                    placeholder="192.168.1.0/24 or 192.168.1.1-192.168.1.254"
                    className="form-input w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Discovery Method *
                  </label>
                  <select
                    value={discoveryForm.discovery_method}
                    onChange={(e) => setDiscoveryForm({...discoveryForm, discovery_method: e.target.value})}
                    className="form-input w-full"
                  >
                    <option value="auto">Auto (Ping + SNMP + SSH)</option>
                    <option value="ping_only">Ping Only</option>
                    <option value="snmp_only">SNMP Only</option>
                    <option value="ssh_only">SSH Only</option>
                  </select>
                  <div className="text-xs text-gray-400 mt-1 p-2 bg-black/20 rounded border border-[#00ff00]/10">
                    {discoveryForm.discovery_method === 'ping_only' && 'Only ping test - no credentials required'}
                    {discoveryForm.discovery_method === 'snmp_only' && 'SNMP discovery - requires SNMP configuration'}
                    {discoveryForm.discovery_method === 'ssh_only' && 'SSH discovery - requires SSH credentials'}
                    {discoveryForm.discovery_method === 'auto' && 'Full discovery - requires both SNMP and SSH credentials'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Credentials */}
          <div className="space-y-4">
            {/* SNMP Configuration Section */}
            <div className="bg-[#11131a] border border-[#00ff00]/20 rounded-lg p-4">
              <h4 className="text-lg font-medium text-white mb-3 border-b border-[#00ff00]/20 pb-2">SNMP Configuration</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">SNMP Version *</label>
                  <select
                    name="snmp_version"
                    value={discoveryForm.snmp_version}
                    onChange={(e) => setDiscoveryForm({...discoveryForm, snmp_version: e.target.value})}
                    className="form-input w-full"
                  >
                    <option value="v1">SNMP v1</option>
                    <option value="v2c">SNMP v2c</option>
                    <option value="v3">SNMP v3</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">SNMP Port</label>
                  <input
                    type="text"
                    name="snmp_port"
                    value={discoveryForm.snmp_port}
                    onChange={(e) => setDiscoveryForm({...discoveryForm, snmp_port: e.target.value})}
                    className="form-input w-full"
                    placeholder="161"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-1">Community String</label>
                  <input
                    type="text"
                    name="community"
                    value={discoveryForm.community}
                    onChange={(e) => setDiscoveryForm({...discoveryForm, community: e.target.value})}
                    className="form-input w-full"
                    placeholder="public"
                  />
                </div>
              </div>

              {/* SNMP v3 Additional Fields */}
              {discoveryForm.snmp_version === 'v3' && (
                <div className="mt-4 pt-4 border-t border-[#00ff00]/20">
                  <h5 className="text-md font-medium text-white mb-3">SNMP v3 Configuration</h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Username *</label>
                      <input
                        type="text"
                        name="snmp_username"
                        value={discoveryForm.snmp_username}
                        onChange={(e) => setDiscoveryForm({...discoveryForm, snmp_username: e.target.value})}
                        className="form-input w-full"
                        placeholder="Enter SNMP username"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Auth Protocol *</label>
                      <select
                        name="auth_protocol"
                        value={discoveryForm.auth_protocol}
                        onChange={(e) => setDiscoveryForm({...discoveryForm, auth_protocol: e.target.value})}
                        className="form-input w-full"
                      >
                        <option value="MD5">MD5</option>
                        <option value="SHA">SHA</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Auth Password *</label>
                      <input
                        type="password"
                        name="auth_password"
                        value={discoveryForm.auth_password}
                        onChange={(e) => setDiscoveryForm({...discoveryForm, auth_password: e.target.value})}
                        className="form-input w-full"
                        placeholder="Enter auth password"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Privacy Protocol *</label>
                      <select
                        name="priv_protocol"
                        value={discoveryForm.priv_protocol}
                        onChange={(e) => setDiscoveryForm({...discoveryForm, priv_protocol: e.target.value})}
                        className="form-input w-full"
                      >
                        <option value="DES">DES</option>
                        <option value="AES">AES</option>
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-300 mb-1">Privacy Password *</label>
                      <input
                        type="password"
                        name="priv_password"
                        value={discoveryForm.snmp_username}
                        onChange={(e) => setDiscoveryForm({...discoveryForm, priv_password: e.target.value})}
                        className="form-input w-full"
                        placeholder="Enter privacy password"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* SSH Configuration Section */}
            <div className="bg-[#11131a] border border-[#00ff00]/20 rounded-lg p-4">
              <h4 className="text-lg font-medium text-white mb-3 border-b border-[#00ff00]/20 pb-2">SSH Configuration</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">SSH Username *</label>
                  <input
                    type="text"
                    name="username"
                    value={discoveryForm.username}
                    onChange={(e) => setDiscoveryForm({...discoveryForm, username: e.target.value})}
                    className="form-input w-full"
                    placeholder="Enter SSH username"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">SSH Port</label>
                  <input
                    type="text"
                    name="ssh_port"
                    value={discoveryForm.ssh_port || "22"}
                    onChange={(e) => setDiscoveryForm({...discoveryForm, ssh_port: e.target.value})}
                    className="form-input w-full"
                    placeholder="22"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-1">SSH Password *</label>
                  <input
                    type="password"
                    name="password"
                    value={discoveryForm.password}
                    onChange={(e) => setDiscoveryForm({...discoveryForm, password: e.target.value})}
                    className="form-input w-full"
                    placeholder="Enter SSH password"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Discovery Progress - Now shows as a button when scanning */}
        {discoveryProgress.isScanning && (
          <div className="bg-[#11131a] border border-[#00ff00]/20 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-medium text-white">Discovery in Progress</h4>
              <div className="flex items-center gap-2">
                <span className="text-green-400 text-sm">●</span>
                <span className="text-green-400 text-sm">Active</span>
              </div>
            </div>
            
            {/* Quick Status Summary */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
              <div className="bg-black/20 border border-[#00ff00]/20 p-3 rounded-lg text-center">
                <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Progress</p>
                <p className="text-white text-lg font-semibold">{discoveryProgress.progress || 0}%</p>
              </div>
              <div className="bg-black/20 border border-[#00ff00]/20 p-3 rounded-lg text-center">
                <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Devices Found</p>
                <p className="text-green-500 text-lg font-semibold">{discoveryProgress.discoveredDevices || 0}</p>
              </div>
              <div className="bg-black/20 border border-[#00ff00]/20 p-3 rounded-lg text-center">
                <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Current IP</p>
                <p className="text-white font-mono text-sm">{discoveryProgress.currentIP || 'Initializing...'}</p>
              </div>
              <div className="bg-black/20 border border-[#00ff00]/20 p-3 rounded-lg text-center">
                <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Status</p>
                <p className="text-blue-400 text-sm font-medium">{discoveryProgress.status || 'starting'}</p>
              </div>
            </div>
            
            {/* View Full Progress Button */}
            <div className="text-center">
              <button
                onClick={onShowProgress}
                className="btn-primary px-8 py-3 text-lg"
              >
                📊 View Full Progress Details
              </button>
              <p className="text-gray-400 text-sm mt-2">
                Discovery continues in the background. Click to see detailed progress.
              </p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t border-[#00ff00]/20">
          <button
            onClick={() => setShowAutoDiscoveryModal(false)}
            className="btn-secondary px-6 py-2"
            disabled={discoveryProgress.isScanning}
          >
            Close
          </button>
          {!discoveryProgress.isScanning && (
            <button
              onClick={handleStartDiscovery}
              disabled={
                selectedAgents.length === 0 || 
                !discoveryForm.ipRange ||
                (discoveryForm.discovery_method !== 'ping_only' && !discoveryForm.username) ||
                (discoveryForm.discovery_method !== 'ping_only' && !discoveryForm.password) ||
                (discoveryForm.discovery_method === 'snmp_only' && discoveryForm.snmp_version === 'v3' && !discoveryForm.snmp_username) ||
                (discoveryForm.discovery_method === 'snmp_only' && discoveryForm.snmp_version === 'v3' && !discoveryForm.auth_password) ||
                (discoveryForm.discovery_method === 'snmp_only' && discoveryForm.snmp_version === 'v3' && !discoveryForm.priv_password)
              }
              className="btn-primary px-8 py-2"
            >
              Start Discovery
            </button>
          )}
        </div>
      </div>
    </div>
  );
}; 
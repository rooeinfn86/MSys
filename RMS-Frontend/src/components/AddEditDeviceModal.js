

export const AddEditDeviceModal = ({
  showForm,
  setShowForm,
  editingDeviceId,
  setEditingDeviceId,
  form,
  setForm,
  handleChange,
  handleSubmit,
  availableAgents,
  isLoadingAgents,
  agentError,
  refreshAgents
}) => {
  if (!showForm) return null;

  return (
    <div className="modal-overlay fixed inset-0 flex items-center justify-center z-50 p-4">
      <div 
        className="modal-content add-device-modal p-6 rounded-lg shadow-lg relative"
        style={{
          width: '80vw',
          maxWidth: '80vw',
          height: 'auto',
          maxHeight: '80vh',
          overflow: 'visible'
        }}
      >
        <button 
          onClick={() => setShowForm(false)} 
          className="absolute top-4 right-4 text-white hover:text-red-500 text-xl z-10 bg-black/50 rounded-full w-8 h-8 flex items-center justify-center hover:bg-black/70 transition-all"
        >
          &times;
        </button>
        
        {/* Header Section */}
        <div className="text-center mb-6">
          <h3 className="modal-title text-2xl mb-2">
            {editingDeviceId ? "Edit Device" : "Add Device"}
          </h3>
          <p className="text-gray-400 text-sm">
            {editingDeviceId ? "Update device configuration and settings" : "Configure new device with credentials and monitoring settings"}
          </p>
        </div>
        
        {/* Main Content - Two Column Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
          {/* Left Column - Basic Settings */}
          <div className="space-y-4">
            {/* Agent Selection Section */}
            <div className="bg-[#11131a] border border-[#00ff00]/20 rounded-lg p-4">
              <h4 className="text-lg font-medium text-white mb-3 border-b border-[#00ff00]/20 pb-2">Agent Selection *</h4>
          
              {/* Loading State */}
              {isLoadingAgents && (
                <div className="text-center py-4">
                  <div className="text-[#10b981] text-sm">Loading agents...</div>
                </div>
              )}
              
              {/* Error State */}
              {agentError && (
                <div className="text-center py-4">
                  <div className="text-red-400 text-sm mb-2">{agentError}</div>
                  <button
                    onClick={() => refreshAgents()}
                    className="px-3 py-1 text-xs bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/30 rounded hover:bg-[#10b981]/30 transition-colors"
                  >
                    Retry
                  </button>
                </div>
              )}
              
              {/* Agent Controls and Grid */}
              {!isLoadingAgents && !agentError && (
                <>
                  <div className="flex items-center justify-between mb-3">
                    {availableAgents.length > 0 && (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const allAgentIds = availableAgents.map(a => a.id);
                            console.log('Select All clicked, setting agents:', allAgentIds);
                            setForm({...form, selected_agent_ids: allAgentIds});
                          }}
                          className="px-3 py-1 text-xs bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/30 rounded hover:bg-[#10b981]/30 transition-colors"
                        >
                          Select All
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            console.log('Clear All clicked, clearing agents');
                            setForm({...form, selected_agent_ids: []});
                          }}
                          className="px-3 py-1 text-xs bg-gray-500/20 text-gray-300 border border-gray-500/30 rounded hover:bg-gray-500/30 transition-colors"
                        >
                          Clear All
                        </button>
                      </div>
                    )}
                    <div className="text-sm text-gray-300">
                      {form.selected_agent_ids && Array.isArray(form.selected_agent_ids) && form.selected_agent_ids.length > 0 ? 
                        `${form.selected_agent_ids.length} agent(s) selected` :
                        'No agents selected'
                      }
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                    {availableAgents.map((agent) => (
                      <label key={agent.id} className="flex items-center space-x-2 p-2 rounded border border-transparent hover:border-[#00ff00]/30 hover:bg-[#00ff00]/5 transition-all duration-200 cursor-pointer">
                        <input
                          type="checkbox"
                          name="selected_agent_ids"
                          value={agent.id}
                          checked={form.selected_agent_ids && Array.isArray(form.selected_agent_ids) && form.selected_agent_ids.includes(Number(agent.id))}
                          onChange={(e) => {
                            const agentId = Number(e.target.value);
                            const currentSelection = form.selected_agent_ids && Array.isArray(form.selected_agent_ids) ? form.selected_agent_ids : [];
                            console.log('Agent selection change:', { agentId, checked: e.target.checked, currentSelection });
                            
                            if (e.target.checked) {
                              // Add agent if not already selected
                              if (!currentSelection.includes(agentId)) {
                                const newSelection = [...currentSelection, agentId];
                                console.log('Adding agent, new selection:', newSelection);
                                setForm(prev => ({...prev, selected_agent_ids: newSelection}));
                              } else {
                                console.log('Agent already selected, ignoring duplicate');
                              }
                            } else {
                              // Remove agent if unchecked
                              const newSelection = currentSelection.filter(id => id !== agentId);
                              console.log('Removing agent, new selection:', newSelection);
                              setForm(prev => ({...prev, selected_agent_ids: newSelection}));
                            }
                          }}
                          className="rounded border-[#00ff00]/50 text-[#00ff00] focus:ring-[#00ff00]/50 focus:ring-2"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium text-white truncate">{agent.name}</span>
                          <div className="text-xs text-gray-400">
                            {agent.status === 'online' ? '🟢 Online' : 
                             agent.status === 'offline' ? '🔴 Offline' : 
                             '⚪ Unknown'}
                          </div>
                        </div>
                      </label>
                    ))}
                    {availableAgents.length === 0 && (
                      <div className="text-gray-400 text-center py-4 col-span-full">
                        No agents available. Please ensure you have at least one agent configured.
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
            
            {/* Device Information Section */}
            <div className="bg-[#11131a] border border-[#00ff00]/20 rounded-lg p-4">
              <h4 className="text-lg font-medium text-white mb-3 border-b border-[#00ff00]/20 pb-2">Device Information</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Device Name *</label>
                  <input 
                    name="name" 
                    placeholder="Enter device name" 
                    value={form.name} 
                    onChange={(e) => handleChange(e, form, setForm)} 
                    className={`form-input w-full ${!form.name ? 'error' : ''}`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">IP Address *</label>
                  <input 
                    name="ip" 
                    placeholder="192.168.1.1" 
                    value={form.ip} 
                    onChange={(e) => handleChange(e, form, setForm)} 
                    className={`form-input w-full ${!form.ip ? 'error' : ''}`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Location *</label>
                  <input 
                    name="location" 
                    placeholder="Data Center A" 
                    value={form.location} 
                    onChange={(e) => handleChange(e, form, setForm)} 
                    className={`form-input w-full ${!form.location ? 'error' : ''}`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Device Type *</label>
                  <select 
                    name="type" 
                    value={form.type} 
                    onChange={(e) => handleChange(e, form, setForm)} 
                    className={`form-input w-full ${!form.type ? 'error' : ''}`}
                  >
                    <option value="">Select Type</option>
                    <option value="Switch">Switch</option>
                    <option value="Router">Router</option>
                    <option value="Firewall">Firewall</option>
                    <option value="Server">Server</option>
                    <option value="Workstation">Workstation</option>
                  </select>
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
                    value={form.snmp_version}
                    onChange={(e) => handleChange(e, form, setForm)}
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
                    value={form.snmp_port}
                    onChange={(e) => handleChange(e, form, setForm)}
                    className="form-input w-full"
                    placeholder="161"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-1">SNMP Community String</label>
                  <input
                    type="text"
                    name="community"
                    value={form.community}
                    onChange={(e) => handleChange(e, form, setForm)}
                    className="form-input w-full"
                    placeholder="public"
                  />
                </div>
              </div>

              {/* SNMP v3 Additional Fields */}
              {form.snmp_version === 'v3' && (
                <div className="mt-4 pt-4 border-t border-[#00ff00]/20">
                  <h5 className="text-md font-medium text-white mb-3">SNMP v3 Configuration</h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Username *</label>
                      <input
                        type="text"
                        name="snmp_username"
                        value={form.snmp_username}
                        onChange={(e) => handleChange(e, form, setForm)}
                        className="form-input w-full"
                        placeholder="Enter SNMP username"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Auth Protocol *</label>
                      <select
                        name="auth_protocol"
                        value={form.auth_protocol}
                        onChange={(e) => handleChange(e, form, setForm)}
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
                        value={form.auth_password}
                        onChange={(e) => handleChange(e, form, setForm)}
                        className="form-input w-full"
                        placeholder="Enter auth password"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Privacy Protocol *</label>
                      <select
                        name="priv_protocol"
                        value={form.priv_protocol}
                        onChange={(e) => handleChange(e, form, setForm)}
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
                        value={form.priv_password}
                        onChange={(e) => handleChange(e, form, setForm)}
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
                    value={form.username}
                    onChange={(e) => handleChange(e, form, setForm)}
                    className={`form-input w-full ${!form.username ? 'error' : ''}`}
                    placeholder="admin"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">SSH Password *</label>
                  <input
                    type="password"
                    name="password"
                    value={form.password}
                    onChange={(e) => handleChange(e, form, setForm)}
                    className={`form-input w-full ${!form.password ? 'error' : ''}`}
                    placeholder="Enter password"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">SSH Port</label>
                  <input
                    type="text"
                    name="ssh_port"
                    value={form.ssh_port || "22"}
                    onChange={(e) => handleChange(e, form, setForm)}
                    className="form-input w-full"
                    placeholder="22"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t border-[#00ff00]/20">
          <button
            onClick={() => setShowForm(false)}
            className="btn-secondary px-6 py-2"
          >
            Cancel
          </button>
          <button
            onClick={() => handleSubmit(form, setForm, editingDeviceId, setEditingDeviceId, setShowForm)}
            className="btn-primary px-8 py-2"
            disabled={!form.name || !form.ip || !form.location || !form.type || !form.username || !form.password}
          >
            {editingDeviceId ? "Update Device" : "Add Device"}
          </button>
        </div>
      </div>
    </div>
  );
}; 
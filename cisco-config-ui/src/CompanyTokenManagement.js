import { useState, useEffect } from 'react';
import axiosInstance from './utils/axios';
import { tokenManager } from './utils/secureStorage';
import './styles/CompanyTokenManagement.css';

const CompanyTokenManagement = () => {
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newToken, setNewToken] = useState({ name: '' });
  const [createdToken, setCreatedToken] = useState(null);

  const [organizations, setOrganizations] = useState([]);
  const [networks, setNetworks] = useState([]);
  // Get user role from tokenManager
  const [userRole, setUserRole] = useState(null);



  // Add state for agent deployment modal
  const [showDeploymentModal, setShowDeploymentModal] = useState(false);
  const [deploymentStep, setDeploymentStep] = useState(1);
  const [deploymentData, setDeploymentData] = useState({
    selectedOrgId: '',
    selectedNetworkId: '',
    agentName: ''
  });
  const [deploymentResult, setDeploymentResult] = useState(null);
  const [deploymentLoading, setDeploymentLoading] = useState(false);

  // Add state for agents table
  const [agents, setAgents] = useState([]);
  const [agentsLoading, setAgentsLoading] = useState(false);
  const [agentsError, setAgentsError] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState({});
  const [deletingAgent, setDeletingAgent] = useState({});

  useEffect(() => {
    // Get user role from tokenManager
    const userData = tokenManager.getUserData();
    if (userData && userData.role) {
      setUserRole(userData.role);
      console.log('User role set to:', userData.role);
    } else {
      console.log('No user role found in userData:', userData);
    }
    
    fetchTokens();
    fetchAgents(); // Fetch agents on component mount
  }, []);

  useEffect(() => {
    if (userRole === 'company_admin' || userRole === 'full_control') {
      fetchOrganizations();
    }
  }, [userRole]);

  const fetchTokens = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get('/api/v1/company-tokens/');
      
      // Ensure response.data is an array
      if (Array.isArray(response.data)) {
        setTokens(response.data);
        setError(null);
      } else {
        console.error('API returned non-array data:', response.data);
        setTokens([]);
        setError('Invalid response format from server');
      }
    } catch (err) {
      console.error('Error fetching tokens:', err);
      setTokens([]);
      setError('Failed to fetch tokens: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  const createToken = async () => {
    try {
      const response = await axiosInstance.post('/api/v1/company-tokens/generate', { name: newToken.name });
      setCreatedToken(response.data);
      // Store the token in localStorage for later use
      localStorage.setItem('company_token', response.data.token);
      setShowCreateModal(false);
      setNewToken({ name: '' });
      fetchTokens();
    } catch (err) {
      setError('Failed to create token');
      console.error('Error creating token:', err);
    }
  };

  const revokeToken = async (tokenId) => {
    if (!window.confirm('Are you sure you want to revoke this token? This action cannot be undone.')) {
      return;
    }

    try {
      await axiosInstance.delete(`/api/v1/company-tokens/${tokenId}`);
      fetchTokens();
    } catch (err) {
      setError('Failed to revoke token');
      console.error('Error revoking token:', err);
    }
  };

  const updateToken = async (tokenId, updates) => {
    try {
      await axiosInstance.put(`/api/v1/company-tokens/${tokenId}`, updates);
      fetchTokens();
    } catch (err) {
      setError('Failed to update token');
      console.error('Error updating token:', err);
    }
  };

  const fetchOrganizations = async () => {
    try {
      const response = await axiosInstance.get('/org-network/organizations/');
      setOrganizations(response.data);
    } catch (err) {
      setOrganizations([]);
    }
  };

  const fetchNetworks = async (orgId) => {
    try {
      console.log('Fetching networks for organization:', orgId);
      const response = await axiosInstance.get(`/org-network/networks/?organization_id=${orgId}`);
      console.log('Networks response:', response.data);
      setNetworks(response.data);
    } catch (err) {
      console.error('Error fetching networks:', err);
      setNetworks([]);
    }
  };

  const fetchAgents = async () => {
    try {
      setAgentsLoading(true);
      
      // Use the working endpoint from Agents.js
      const response = await axiosInstance.get('/api/v1/agents/all');
      setAgents(response.data);
      setAgentsError(null); // Clear any previous agents errors
    } catch (err) {
      console.error('Error fetching agents:', err);
      setAgents([]);
      
      // Try alternative endpoint if the first one fails
      if (err.response?.status === 404) {
        try {
          const altResponse = await axiosInstance.get('/api/v1/agents/');
          setAgents(altResponse.data);
          setAgentsError(null);
          return;
        } catch (altErr) {
          console.error('Alternative endpoint also failed:', altErr);
        }
      }
      
      // Handle specific error cases
      if (err.response?.status === 404) {
        setAgentsError('Agents listing endpoint not available. The backend may not support agent listing yet. You can still deploy new agents using the Agent Deployment button above.');
      } else {
        setAgentsError('Failed to fetch agents: ' + (err.response?.data?.detail || err.message));
      }
    } finally {
      setAgentsLoading(false);
    }
  };







  // Agent Deployment Functions
  const handleDeploymentOrgChange = (orgId) => {
    setDeploymentData({ ...deploymentData, selectedOrgId: orgId, selectedNetworkId: '' });
    if (orgId) {
      fetchNetworks(orgId);
    } else {
      setNetworks([]);
    }
  };

  const handleDeploymentNetworkChange = (networkId) => {
    setDeploymentData({ ...deploymentData, selectedNetworkId: networkId });
  };

  const handleDeploymentNext = () => {
    if (deploymentStep === 1 && deploymentData.selectedOrgId && deploymentData.selectedNetworkId) {
      setDeploymentStep(2);
    } else if (deploymentStep === 2 && deploymentData.agentName.trim()) {
      setDeploymentStep(3);
    }
  };

  const handleDeploymentBack = () => {
    if (deploymentStep > 1) {
      setDeploymentStep(deploymentStep - 1);
    }
  };

  const handleDeploy = async () => {
    try {
      setDeploymentLoading(true);
      const companyToken = localStorage.getItem('company_token');
      
      if (!companyToken) {
        setError('Company token not found. Please generate a company token first.');
        return;
      }

      // Debug the data before creating payload
      console.log('Raw deployment data:', deploymentData);
      console.log('Company token from localStorage:', companyToken);
      
      // Use the working register endpoint with correct payload structure
      // Try including company token in payload instead of headers
      const payload = {
        name: deploymentData.agentName,
        organization_id: Number(deploymentData.selectedOrgId),
        networks: [Number(deploymentData.selectedNetworkId)],
        capabilities: ["snmp_discovery", "ssh_config", "health_monitoring"],
        version: "1.0.0",
        company_token: companyToken  // Add company token to payload
      };

      console.log('Agent registration payload:', payload);
      console.log('Using company token:', companyToken);

      console.log('Sending request to:', '/api/v1/agents/register');
      console.log('Request headers:', {
        'x-company-token': companyToken ? 'Present' : 'Missing',
        'X-Company-Token': companyToken ? 'Present' : 'Missing'
      });
      
      // Try without custom headers first (let axiosInstance handle Authorization)
      const response = await axiosInstance.post('/api/v1/agents/register', payload);

      console.log('Backend response:', response);
      console.log('Response data:', response.data);
      console.log('Response status:', response.status);
      console.log('Response data type:', typeof response.data);
      console.log('Response data keys:', Object.keys(response.data || {}));
      
      setDeploymentResult(response.data);
      setDeploymentStep(4);
      console.log('Agent deployment successful:', response.data);
      console.log('deploymentResult state:', response.data);
    } catch (err) {
      setError('Failed to deploy agent: ' + (err.response?.data?.detail || err.message));
      console.error('Deployment error details:', err);
    } finally {
      setDeploymentLoading(false);
    }
  };

  const resetDeployment = () => {
    setDeploymentStep(1);
    setDeploymentData({ selectedOrgId: '', selectedNetworkId: '', agentName: '' });
    setDeploymentResult(null);
    setShowDeploymentModal(false);
    fetchAgents(); // Refresh agents list after deployment
  };

  const downloadAgentPackage = async (agentId, agentName) => {
    try {
      console.log('Downloading agent package for agent ID:', agentId);
      
      const response = await axiosInstance.get(`/api/v1/agents/download-agent/${agentId}`, {
        responseType: 'blob'
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${agentName}_agent_package.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      console.log('Agent package downloaded successfully');
    } catch (error) {
      console.error('Failed to download agent package:', error);
      setError('Failed to download agent package: ' + (error.response?.data?.detail || error.message));
    }
  };

  const openDeleteConfirm = (agentId) => {
    setShowDeleteConfirm(prev => ({ ...prev, [agentId]: true }));
  };

  const closeDeleteConfirm = (agentId) => {
    setShowDeleteConfirm(prev => ({ ...prev, [agentId]: false }));
  };

  const deleteAgent = async (agentId, agentName) => {
    try {
      setDeletingAgent(prev => ({ ...prev, [agentId]: true }));
      
      await axiosInstance.delete(`/api/v1/agents/${agentId}`);
      console.log('Agent deleted successfully');
      
      // Close delete confirmation modal
      setShowDeleteConfirm(prev => ({ ...prev, [agentId]: false }));
      
      // Refresh the agents list
      fetchAgents();
      setAgentsError(null);
    } catch (error) {
      console.error('Failed to delete agent:', error);
      setAgentsError('Failed to delete agent: ' + (error.response?.data?.detail || error.message));
    } finally {
      setDeletingAgent(prev => ({ ...prev, [agentId]: false }));
    }
  };

  const openDeploymentModal = () => {
    setShowDeploymentModal(true);
    setDeploymentStep(1);
    setDeploymentData({ selectedOrgId: '', selectedNetworkId: '', agentName: '' });
    setDeploymentResult(null);
    // Clear networks when opening modal
    setNetworks([]);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  const getStatusText = (isActive, expiresAt) => {
    if (!isActive) return 'Inactive';
    if (expiresAt && new Date(expiresAt) < new Date()) return 'Expired';
    return 'Active';
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="company-token-container">
      <div className="company-token-header">
        <div className="company-token-title">Company API Tokens</div>
        <div className="company-token-actions">
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-generate-token"
          >
            Generate New Token
          </button>

          {(userRole === 'company_admin' || userRole === 'full_control') && (
            <button
              onClick={openDeploymentModal}
              className="btn-generate-agent-token"
            >
              Agent Deployment
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {createdToken && (
        <div className="success-message">
          <div className="success-title">Token Created Successfully!</div>
          <div className="success-token">
            <strong>Token:</strong> {createdToken.token}
          </div>
          <div className="success-note">
            <strong>Important:</strong> Copy this token now. It won't be shown again.
          </div>
          <button
            onClick={() => setCreatedToken(null)}
            className="btn-close-success"
          >
            Close
          </button>
        </div>
      )}



      <div className="company-token-table-container">
        <table className="company-token-table">
          <thead>
            <tr>
              <th data-label="Name">Name</th>
              <th data-label="Status">Status</th>
              <th data-label="Created">Created</th>
              <th data-label="Last Used">Last Used</th>
              <th data-label="Actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            {tokens.map((token) => (
              <tr key={token.id}>
                <td data-label="Name">
                  <span className="font-medium text-white">{token.name}</span>
                </td>
                <td data-label="Status">
                  <span className={`status-badge ${getStatusText(token.is_active, token.expires_at).toLowerCase()}`}>
                    {getStatusText(token.is_active, token.expires_at)}
                  </span>
                </td>
                <td data-label="Created">
                  <span className="text-gray-300">{formatDate(token.created_at)}</span>
                </td>
                <td data-label="Last Used">
                  <span className="text-gray-300">{formatDate(token.last_used)}</span>
                </td>
                <td data-label="Actions">
                  <div className="action-buttons">
                    <button
                      onClick={() => updateToken(token.id, { is_active: !token.is_active })}
                      className={token.is_active ? 'btn-deactivate' : 'btn-activate'}
                    >
                      {token.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => revokeToken(token.id)}
                      className="btn-revoke"
                    >
                      Revoke
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {tokens.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">🔑</div>
          <div className="empty-state-text">No API tokens found</div>
          <div className="empty-state-subtext">Generate your first token to get started</div>
        </div>
      )}

      {/* Agents Table */}
      <div className="company-token-table-container" style={{ marginTop: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 className="company-token-title" style={{ fontSize: '1.5rem', margin: 0 }}>Deployed Agents</h2>
          <button
            onClick={fetchAgents}
            className="btn-generate-token"
            style={{ padding: '8px 16px', fontSize: '0.9rem' }}
            title="Refresh Agents List"
          >
            🔄 Refresh
          </button>
        </div>
        

        

        
        {agentsLoading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
          </div>
        ) : agentsError ? (
          <div className="error-container" style={{ 
            textAlign: 'center', 
            padding: '40px 20px',
            background: 'rgba(255, 0, 0, 0.1)',
            border: '1px solid rgba(255, 0, 0, 0.3)', 
            borderRadius: '8px'
          }}>
            <div style={{ color: '#ff6b6b', fontSize: '1.1rem', marginBottom: '8px' }}>⚠️ Unable to Load Agents</div>
            <div style={{ color: '#e5e7eb', fontSize: '0.9rem' }}>
              {agentsError.includes('endpoint not available') 
                ? 'The agents listing feature may not be implemented in the backend yet. You can still deploy new agents using the Agent Deployment button above.'
                : agentsError
              }
            </div>
            {agentsError.includes('endpoint not available') && (
              <div style={{ 
                marginTop: '16px', 
                padding: '12px', 
                background: 'rgba(0, 255, 0, 0.1)', 
                border: '1px solid rgba(0, 255, 0, 0.3)', 
                borderRadius: '6px',
                color: '#00ff00'
              }}>
                💡 <strong>Note:</strong> Agent deployment functionality is still available and working!
              </div>
            )}
          </div>
        ) : (
          <>
            <table className="company-token-table">
              <thead>
                <tr>
                  <th data-label="Agent Name">Agent Name</th>
                  <th data-label="Organization">Organization</th>
                  <th data-label="Networks">Networks</th>
                  <th data-label="Created">Created</th>
                  <th data-label="Updated">Updated</th>
                  <th data-label="Status">Status</th>
                  <th data-label="Actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {agents.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '40px 20px' }}>
                      <div className="empty-state">
                        <div className="empty-state-icon">🤖</div>
                        <div className="empty-state-text">No agents deployed</div>
                        <div className="empty-state-subtext">Deploy your first agent to get started</div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  agents.map(agent => (
                    <tr key={agent.id}>
                      <td data-label="Agent Name">
                        <span className="font-medium text-white">{agent.name}</span>
                      </td>
                      <td data-label="Organization">
                        <span className="text-gray-300">
                          {organizations.find(org => org.id === agent.organization_id)?.name || 'Unknown'}
                        </span>
                      </td>
                      <td data-label="Networks">
                        <span className="text-gray-300">
                          {agent.networks && agent.networks.length > 0 
                            ? agent.networks.map(networkId => {
                                const network = networks.find(net => net.id === networkId);
                                return network ? network.name : `Network ${networkId}`;
                              }).join(', ')
                            : 'No networks'
                          }
                        </span>
                      </td>
                      <td data-label="Created">
                        <span className="text-gray-300">{formatDate(agent.created_at)}</span>
                      </td>
                      <td data-label="Updated">
                        <span className="text-gray-300">{formatDate(agent.updated_at)}</span>
                      </td>
                      <td data-label="Status">
                        <span className={`status-badge ${agent.status === 'online' ? 'active' : 'inactive'}`}>
                          {agent.status || 'offline'}
                        </span>
                      </td>
                      <td data-label="Actions">
                        <div className="action-buttons">
                          <button
                            onClick={() => downloadAgentPackage(agent.id, agent.name)}
                            className="btn-activate"
                            title="Download Agent Package"
                          >
                            📦 Download
                          </button>
                          <button
                            onClick={() => openDeleteConfirm(agent.id)}
                            className="btn-revoke"
                            title="Delete Agent"
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </>
        )}
      </div>

      {/* Create Token Modal */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 className="modal-title">Generate New API Token</h2>
            <div className="space-y-6">
              <div className="form-group">
                <label className="form-label">Token Name</label>
                <input
                  type="text"
                  value={newToken.name}
                  onChange={(e) => setNewToken({ ...newToken, name: e.target.value })}
                  className="form-input"
                  placeholder="e.g., Agent Deployment Token"
                  autoComplete="off"
                />
              </div>
            </div>
            <div className="modal-actions">
              <button
                onClick={() => setShowCreateModal(false)}
                className="btn-modal-cancel"
              >
                Cancel
              </button>
              <button
                onClick={createToken}
                disabled={!newToken.name.trim()}
                className="btn-modal-save"
              >
                Generate Token
              </button>
            </div>
          </div>
        </div>
      )}


            



      {/* Agent Deployment Modal */}
      {showDeploymentModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '900px', width: '90%' }}>
            <h2 className="modal-title">Agent Deployment</h2>
            
            {deploymentStep === 1 && (
              <div className="step-content">
                <h3 className="step-title">Step 1: Select Organization & Network</h3>
                <div className="form-group">
                  <label className="form-label">Organization</label>
                  <select
                    value={deploymentData.selectedOrgId}
                    onChange={(e) => handleDeploymentOrgChange(e.target.value)}
                    className="form-select"
                  >
                    <option value="">Select organization</option>
                    {organizations.map(org => (
                      <option key={org.id} value={org.id}>{org.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Network</label>
                  <select
                    value={deploymentData.selectedNetworkId}
                    onChange={(e) => handleDeploymentNetworkChange(e.target.value)}
                    className="form-select"
                    disabled={!deploymentData.selectedOrgId}
                  >
                    <option value="">Select network</option>
                    {networks.filter(net => net.organization_id === parseInt(deploymentData.selectedOrgId)).map(net => (
                      <option key={net.id} value={net.id}>{net.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {deploymentStep === 2 && (
              <div className="step-content">
                <h3 className="step-title">Step 2: Agent Configuration</h3>
                <div className="form-group">
                  <label className="form-label">Agent Name</label>
                  <input
                    type="text"
                    value={deploymentData.agentName}
                    onChange={(e) => setDeploymentData({ ...deploymentData, agentName: e.target.value })}
                    className="form-input"
                    placeholder="Enter agent name"
                  />
                </div>
              </div>
            )}

            {deploymentStep === 3 && (
              <div className="step-content">
                <h3 className="step-title">Step 3: Deployment Summary</h3>
                <div className="deployment-summary">
                  <div className="deployment-summary-item">
                    <strong>Organization:</strong> {organizations.find(org => org.id === parseInt(deploymentData.selectedOrgId))?.name}
                  </div>
                  <div className="deployment-summary-item">
                    <strong>Network:</strong> {networks.find(net => net.id === parseInt(deploymentData.selectedNetworkId))?.name}
                  </div>
                  <div className="deployment-summary-item">
                    <strong>Agent Name:</strong> {deploymentData.agentName}
                  </div>
                </div>
              </div>
            )}

            {deploymentStep === 4 && deploymentResult && (
              <div className="step-content">
                <h3 className="step-title">Deployment Complete!</h3>
                <div className="deployment-result">
                  <div className="success-message" style={{ 
                    background: 'rgba(0, 0, 0, 0.8)', 
                    border: '2px solid #00ff00', 
                    borderRadius: '12px', 
                    padding: '24px',
                    marginBottom: '24px',
                    boxShadow: '0 0 20px rgba(0, 255, 0, 0.3)',
                    position: 'relative'
                  }}>
                    <div className="success-title" style={{ 
                      color: '#00ff00', 
                      fontSize: '1.5rem', 
                      fontWeight: '700', 
                      marginBottom: '20px',
                      textAlign: 'center',
                      textShadow: '0 0 10px rgba(0, 255, 0, 0.5)'
                    }}>
                      🎉 Agent deployed successfully!
                    </div>
                    <div className="success-token" style={{ 
                      color: '#ffffff', 
                      marginBottom: '16px',
                      fontSize: '1.1rem',
                      padding: '12px',
                      background: 'rgba(0, 255, 0, 0.1)',
                      borderRadius: '8px',
                      border: '1px solid rgba(0, 255, 0, 0.2)'
                    }}>
                      <strong style={{ color: '#00ff00' }}>Agent ID:</strong> 
                      <span style={{ marginLeft: '8px', color: '#ffffff', fontWeight: '600' }}>
                        {deploymentResult.agent?.id || deploymentResult.id || deploymentResult.agent_id || 'N/A'}
                      </span>
                    </div>
                    <div className="success-token" style={{ 
                      color: '#ffffff', 
                      marginBottom: '16px',
                      fontSize: '1.1rem',
                      padding: '12px',
                      background: 'rgba(0, 255, 0, 0.1)',
                      borderRadius: '8px',
                      border: '1px solid rgba(0, 255, 0, 0.2)'
                    }}>
                      <strong style={{ color: '#00ff00' }}>Agent Name:</strong> 
                      <span style={{ marginLeft: '8px', color: '#ffffff', fontWeight: '600' }}>
                        {deploymentResult.agent?.name || deploymentResult.name || deploymentData.agentName}
                      </span>
                    </div>
                    <div className="success-note" style={{ 
                      color: '#e5e7eb', 
                      fontSize: '1rem',
                      textAlign: 'center',
                      marginTop: '20px',
                      padding: '16px',
                      background: 'rgba(0, 255, 0, 0.05)',
                      borderRadius: '8px'
                    }}>
                      Your agent is now ready for deployment. Download the package and follow the installation instructions.
                    </div>
                  </div>
                  
                  {(deploymentResult.agent?.id || deploymentResult.id || deploymentResult.agent_id) && (
                    <div className="deployment-download" style={{ 
                      textAlign: 'center',
                      marginTop: '20px',
                      padding: '20px',
                      background: 'rgba(0, 0, 0, 0.6)',
                      borderRadius: '12px',
                      border: '1px solid rgba(0, 255, 0, 0.3)'
                    }}>
                      <div style={{ 
                        marginBottom: '16px',
                        color: '#00ff00',
                        fontSize: '1.1rem',
                        fontWeight: '600'
                      }}>
                        📦 Download Agent Package
                      </div>
                      <button 
                        onClick={() => downloadAgentPackage(deploymentResult.agent?.id || deploymentResult.id || deploymentResult.agent_id, deploymentData.agentName)}
                        className="btn-generate-token"
                        style={{ 
                          display: 'inline-block',
                          padding: '12px 24px',
                          fontSize: '1rem',
                          fontWeight: '600',
                          textDecoration: 'none',
                          border: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        ⬇️ Download Package
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="modal-actions">
              {deploymentStep > 1 && deploymentStep < 4 && (
                <button onClick={handleDeploymentBack} className="btn-modal-cancel">
                  Back
                </button>
              )}
              {deploymentStep < 3 && (
                <button 
                  onClick={handleDeploymentNext}
                  disabled={
                    (deploymentStep === 1 && (!deploymentData.selectedOrgId || !deploymentData.selectedNetworkId)) ||
                    (deploymentStep === 2 && !deploymentData.agentName.trim())
                  }
                  className="btn-modal-save"
                >
                  Next
                </button>
              )}
              {deploymentStep === 3 && (
                <button 
                  onClick={handleDeploy}
                  disabled={deploymentLoading}
                  className="btn-modal-save"
                >
                  {deploymentLoading ? 'Deploying...' : 'Deploy Agent'}
                </button>
              )}
              {deploymentStep === 4 && (
                <button onClick={resetDeployment} className="btn-modal-save">
                  Deploy Another Agent
                </button>
              )}
              <button onClick={resetDeployment} className="btn-modal-cancel">
                {deploymentStep === 4 ? 'Close' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Agent Confirmation Modal */}
      {Object.keys(showDeleteConfirm).map(agentId => {
        if (!showDeleteConfirm[agentId]) return null;
        
        const agent = agents.find(a => a.id === parseInt(agentId));
        if (!agent) return null;
        
        return (
          <div key={agentId} className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '500px' }}>
              <h2 className="modal-title">Delete Agent</h2>
              
              <div style={{ marginBottom: '24px' }}>
                <div style={{ 
                  padding: '16px', 
                  background: 'rgba(255, 0, 0, 0.1)', 
                  border: '1px solid rgba(255, 0, 0, 0.3)', 
                  borderRadius: '8px',
                  marginBottom: '16px'
                }}>
                  <div style={{ color: '#ff6b6b', fontSize: '1.1rem', marginBottom: '8px' }}>
                    ⚠️ Warning: This action cannot be undone
                  </div>
                  <div style={{ color: '#e5e7eb', fontSize: '0.9rem' }}>
                    Are you sure you want to delete agent <strong>"{agent.name}"</strong>? 
                    This will permanently remove the agent and all associated data.
                  </div>
                </div>
                
                <div style={{ 
                  padding: '12px', 
                  background: 'rgba(0, 0, 0, 0.3)', 
                  borderRadius: '6px',
                  fontSize: '0.9rem',
                  color: '#d1d5db'
                }}>
                  <strong>Agent Details:</strong>
                  <div>ID: {agent.id}</div>
                  <div>Status: {agent.status}</div>
                  <div>Organization: {organizations.find(org => org.id === agent.organization_id)?.name || 'Unknown'}</div>
                </div>
              </div>
              
              <div className="modal-actions">
                <button
                  onClick={() => closeDeleteConfirm(agent.id)}
                  className="btn-modal-cancel"
                  disabled={deletingAgent[agent.id]}
                >
                  Cancel
                </button>
                <button
                  onClick={() => deleteAgent(agent.id, agent.name)}
                  className="btn-revoke"
                  disabled={deletingAgent[agent.id]}
                  style={{ 
                    background: '#dc2626',
                    color: 'white',
                    border: '1px solid #dc2626'
                  }}
                >
                  {deletingAgent[agent.id] ? 'Deleting...' : 'Delete Agent'}
                </button>
              </div>
            </div>
          </div>
        );
      })}

    </div>
  );
};

export default CompanyTokenManagement; 
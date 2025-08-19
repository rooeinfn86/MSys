import { useState, useEffect } from 'react';
import axiosInstance from './utils/axios';

const Agents = () => {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState({});
  const [deleting, setDeleting] = useState({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState({});
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    fetchAgents();
  }, []);

  // Auto-refresh agents status every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchAgents();
    }, 30000);
    
    return () => {
      clearInterval(interval);
    };
  }, []);

  const fetchAgents = async () => {
    try {
      console.log('=== FETCHING AGENTS (STANDALONE) ===');
      setLoading(true);
      setError(null);
      
      console.log('Making request to /api/v1/agents/all');
      const response = await axiosInstance.get('/api/v1/agents/all');
      console.log('Agents response status:', response.status);
      console.log('Agents response data:', response.data);
      console.log('Number of agents:', response.data.length);
      
      if (response.data && response.data.length > 0) {
        console.log('First agent status:', response.data[0].status);
        console.log('First agent last_heartbeat:', response.data[0].last_heartbeat);
      }
      
      setAgents(response.data);
    } catch (err) {
      console.error('Error fetching agents:', err);
      console.error('Error response:', err.response);
      setError('Failed to load agents: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  const downloadAgentPackage = async (agentId, agentName) => {
    try {
      setDownloading(prev => ({ ...prev, [agentId]: true }));
      
      const response = await axiosInstance.get(`/api/v1/agents/download-agent/${agentId}`, {
        responseType: 'blob'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `cisco_ai_agent_${agentName.replace(' ', '_')}.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
    } catch (err) {
      console.error('Error downloading agent package:', err);
      alert('Failed to download agent package: ' + (err.response?.data?.detail || err.message));
    } finally {
      setDownloading(prev => ({ ...prev, [agentId]: false }));
    }
  };

  const deleteAgent = async (agentId, agentName) => {
    try {
      setDeleting(prev => ({ ...prev, [agentId]: true }));
      
      await axiosInstance.delete(`/api/v1/agents/${agentId}`);
      
      // Remove agent from local state
      setAgents(prev => prev.filter(agent => agent.id !== agentId));
      
      // Close delete confirmation
      setShowDeleteConfirm(prev => ({ ...prev, [agentId]: false }));
      
      // Show success message
      setSuccessMessage(`Agent "${agentName}" has been deleted successfully.`);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(''), 3000);
      
    } catch (err) {
      console.error('Error deleting agent:', err);
      setSuccessMessage('Failed to delete agent: ' + (err.response?.data?.detail || err.message));
      setTimeout(() => setSuccessMessage(''), 5000);
    } finally {
      setDeleting(prev => ({ ...prev, [agentId]: false }));
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'online':
        return 'bg-green-100 text-green-800';
      case 'offline':
        return 'bg-red-100 text-red-800';
      case 'connecting':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading agents...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Agent Management</h1>
            <p className="text-gray-600">View and manage your deployed agents</p>
          </div>
          <button
            onClick={() => window.location.href = '/company-tokens'}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Deploy New Agent
          </button>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6">
            {successMessage}
          </div>
        )}

        {agents.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">🤖</div>
            <h3 className="text-xl font-semibold text-gray-600 mb-2">No Agents Found</h3>
            <p className="text-gray-500 mb-6">You haven't deployed any agents yet.</p>
            <button
              onClick={() => window.location.href = '/company-tokens'}
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Deploy Your First Agent
            </button>
          </div>
        ) : (
          <div>
            <div className="grid gap-6">
              {agents.map((agent) => (
                <div key={agent.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800">{agent.name}</h3>
                      <p className="text-sm text-gray-600">Agent ID: {agent.id}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(agent.status)}`}>
                        {agent.status || 'Unknown'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <h4 className="font-medium text-gray-700 mb-2">Agent Details</h4>
                      <div className="space-y-1 text-sm">
                        <div><span className="font-medium">Organization ID:</span> {agent.organization_id}</div>
                        <div><span className="font-medium">Created:</span> {formatDate(agent.created_at)}</div>
                        <div><span className="font-medium">Updated:</span> {formatDate(agent.updated_at)}</div>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-gray-700 mb-2">Capabilities</h4>
                      <div className="flex flex-wrap gap-1">
                        {agent.capabilities?.map((capability, index) => (
                          <span
                            key={index}
                            className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded"
                          >
                            {capability}
                          </span>
                        )) || (
                          <span className="text-gray-500 text-sm">No capabilities defined</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="text-sm text-gray-600">
                      <div><span className="font-medium">Token:</span> {agent.agent_token ? `${agent.agent_token.substring(0, 10)}...` : 'N/A'}</div>
                    </div>
                    
                    <div className="flex space-x-2">
                      <button
                        onClick={() => downloadAgentPackage(agent.id, agent.name)}
                        disabled={downloading[agent.id]}
                        className="bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white px-3 py-1 rounded text-sm transition-colors"
                      >
                        {downloading[agent.id] ? 'Downloading...' : 'Download Package'}
                      </button>
                      
                      <button
                        onClick={() => {
                          // Copy agent token to clipboard
                          if (agent.agent_token) {
                            navigator.clipboard.writeText(agent.agent_token);
                            setSuccessMessage('Agent token copied to clipboard!');
                            setTimeout(() => setSuccessMessage(''), 3000);
                          }
                        }}
                        className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm transition-colors"
                      >
                        Copy Token
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(prev => ({ ...prev, [agent.id]: true }))}
                        disabled={deleting[agent.id]}
                        className="bg-red-500 hover:bg-red-600 disabled:bg-gray-300 text-white px-3 py-1 rounded text-sm transition-colors"
                      >
                        {deleting[agent.id] ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-8 text-center">
              <button
                onClick={fetchAgents}
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Refresh Agents
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {Object.keys(showDeleteConfirm).map(agentId => {
        if (!showDeleteConfirm[agentId]) return null;
        const agent = agents.find(a => a.id === parseInt(agentId));
        if (!agent) return null;
        
        return (
          <div key={agentId} className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
              <div className="p-6">
                <div className="flex items-center mb-4">
                  <div className="text-red-500 text-2xl mr-3">⚠️</div>
                  <h3 className="text-lg font-bold text-gray-800">Delete Agent</h3>
                </div>
                
                <p className="text-gray-600 mb-6">
                  Are you sure you want to delete the agent "<strong>{agent.name}</strong>"? 
                  This action cannot be undone and will permanently remove the agent from your system.
                </p>
                
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setShowDeleteConfirm(prev => ({ ...prev, [agentId]: false }))}
                    disabled={deleting[agentId]}
                    className="bg-gray-500 hover:bg-gray-600 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => deleteAgent(agent.id, agent.name)}
                    disabled={deleting[agentId]}
                    className="bg-red-500 hover:bg-red-600 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    {deleting[agentId] ? 'Deleting...' : 'Delete Agent'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default Agents; 
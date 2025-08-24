const fetchConfigs = async () => {
  try {
    const response = await fetch(`/api/network/${selectedNetworkId}/configs`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`
      }
    });
    if (!response.ok) {
      throw new Error('Failed to fetch configurations');
    }
    const data = await response.json();
    setConfigs(data);
  } catch (error) {
    console.error('Error fetching configurations:', error);
    setError('Failed to load configurations');
  }
};

const fetchConfigDetails = async (configId) => {
  try {
    const response = await fetch(`/api/network/${selectedNetworkId}/config/${configId}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`
      }
    });
    if (!response.ok) {
      throw new Error('Failed to fetch configuration details');
    }
    const data = await response.json();
    setSelectedConfig(data);
  } catch (error) {
    console.error('Error fetching configuration details:', error);
    setError('Failed to load configuration details');
  }
}; 
import { useState, useEffect } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import NetworkDiagram from '../components/NetworkDiagram';

const NetworkTopology = ({ selectedNetworkId }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Check if we have a selected network
  useEffect(() => {
    if (!selectedNetworkId) {
      setError('Please select a network from the dropdown above');
      setLoading(false);
    } else {
      setError(null);
      setLoading(false);
    }
  }, [selectedNetworkId]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100vh', width: '100%' }}>
      {selectedNetworkId ? (
        <NetworkDiagram networkId={selectedNetworkId} />
      ) : (
        <Box display="flex" justifyContent="center" alignItems="center" height="100%">
          <Typography color="error">Please select a network to view the topology</Typography>
        </Box>
      )}
    </Box>
  );
};

export default NetworkTopology; 
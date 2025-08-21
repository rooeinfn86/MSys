
import React from 'react';
import { Box, Button, Typography, CircularProgress } from '@mui/material';


/**
 * TopologyControls Component
 * Handles the control UI elements for the topology visualization
 * 
 * @param {Object} props - Component props
 * @param {boolean} props.refreshing - Whether topology is currently refreshing
 * @param {Date} props.lastUpdated - Timestamp of last topology update
 * @param {Function} props.onRefresh - Function to handle refresh button click
 */
const TopologyControls = React.memo(({
  refreshing,
  lastUpdated,
  onRefresh
}) => {
  return (
    <Box sx={{
      position: 'absolute',
      top: 16,
      right: 16,
      zIndex: 10,
      display: 'flex',
      flexDirection: 'column',
      gap: 1,
      alignItems: 'flex-end'
    }}>
      {/* Refresh Button */}
      <Button
        variant="contained"
        onClick={onRefresh}
        disabled={refreshing}
        startIcon={refreshing ? <CircularProgress size={16} color="inherit" /> : null}
        sx={{
          background: 'linear-gradient(90deg, #00ff00 0%, #00cc00 100%)',
          color: '#000000',
          fontWeight: 'bold',
          borderRadius: '20px',
          px: 3,
          py: 1,
          boxShadow: '0 4px 8px rgba(0, 255, 0, 0.3)',
          '&:hover': {
            background: 'linear-gradient(90deg, #00cc00 0%, #009900 100%)',
            boxShadow: '0 6px 12px rgba(0, 255, 0, 0.4)',
            transform: 'translateY(-1px)'
          },
          '&:disabled': {
            background: 'rgba(0, 255, 0, 0.3)',
            color: 'rgba(0, 0, 0, 0.5)'
          },
          transition: 'all 0.2s ease-in-out'
        }}
      >
        {refreshing ? 'Refreshing...' : 'Refresh Topology'}
      </Button>
      
      {/* Last Updated Status */}
      {lastUpdated && (
        <Box sx={{
          background: 'rgba(0, 0, 0, 0.7)',
          color: '#00ff00',
          px: 2,
          py: 1,
          borderRadius: '12px',
          fontSize: '0.75rem',
          fontWeight: 'bold',
          border: '1px solid rgba(0, 255, 0, 0.3)',
          backdropFilter: 'blur(10px)'
        }}>
          Last updated: {lastUpdated.toLocaleTimeString()}
        </Box>
      )}
      
      {/* Device Status Legend */}
      <Box sx={{
        background: 'rgba(0, 0, 0, 0.8)',
        color: '#ffffff',
        px: 3,
        py: 2,
        borderRadius: '12px',
        fontSize: '0.8rem',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        backdropFilter: 'blur(10px)',
        mt: 1
      }}>
        <Typography variant="subtitle2" sx={{ 
          color: '#00ff00', 
          fontWeight: 'bold', 
          mb: 1,
          textAlign: 'center'
        }}>
          Device Status
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              backgroundColor: '#00ff00',
              border: '1px solid #ffffff'
            }} />
            <Typography variant="caption" sx={{ color: '#ffffff' }}>
              Online (Ping + SNMP)
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              backgroundColor: '#ff9800',
              border: '1px solid #ffffff'
            }} />
            <Typography variant="caption" sx={{ color: '#ffffff' }}>
              Partial (Ping only)
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              backgroundColor: '#ff0000',
              border: '1px solid #ffffff'
            }} />
            <Typography variant="caption" sx={{ color: '#ffffff' }}>
              Offline
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
});

export default TopologyControls; 
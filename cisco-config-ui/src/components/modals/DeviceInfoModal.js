import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Paper,
  Grid,
  CircularProgress
} from '@mui/material';

/**
 * Device Information Modal Component
 * @param {Object} props - Component props
 * @param {boolean} props.open - Whether modal is open
 * @param {Function} props.onClose - Function to close modal
 * @param {Object} props.modalData - Modal state data
 * @param {Function} props.onRefresh - Function to refresh device info
 */
const DeviceInfoModal = React.memo(({
  open,
  onClose,
  modalData,
  onRefresh
}) => {
  const { loading, error, data } = modalData;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          background: 'linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 50%, #1a1a1a 100%)',
          border: '1px solid #00ff00',
          boxShadow: '0 0 20px rgba(0, 255, 0, 0.3), 0 0 40px rgba(0, 255, 0, 0.1)',
          borderRadius: '8px',
          color: '#ffffff'
        }
      }}
    >
      <DialogTitle sx={{
        background: 'linear-gradient(90deg, #00ff00 0%, #00cc00 100%)',
        color: '#000000',
        fontWeight: 'bold',
        borderBottom: '1px solid #00ff00'
      }}>
        Device Information
        {data && (
          <Typography variant="subtitle2" color="rgba(0, 0, 0, 0.7)" sx={{ fontWeight: 'normal' }}>
            {data.device_name} ({data.device_ip})
          </Typography>
        )}
      </DialogTitle>

      <DialogContent sx={{
        background: 'transparent',
        '& .MuiDialogContent-root': {
          padding: '20px'
        }
      }}>
        {loading && (
          <Box display="flex" flexDirection="column" alignItems="center" p={3}>
            <CircularProgress sx={{ color: '#00ff00', mb: 2 }} />
            <Typography variant="body2" color="#00ff00" textAlign="center">
              Refreshing device information...
            </Typography>
            <Typography variant="caption" color="rgba(0, 255, 0, 0.7)" textAlign="center" mt={1}>
              Agent is collecting fresh data from the network
            </Typography>
          </Box>
        )}

        {error && (
          <Box p={2} sx={{
            background: 'rgba(255, 0, 0, 0.1)',
            border: '1px solid #ff0000',
            borderRadius: '4px'
          }}>
            <Typography color="#ff0000">
              Error: {error}
            </Typography>
          </Box>
        )}

        {data && !loading && (
          <Box>
            {/* Basic Device Info */}
            <Paper elevation={1} sx={{
              p: 2,
              mb: 2,
              background: 'rgba(0, 255, 0, 0.05)',
              border: '1px solid rgba(0, 255, 0, 0.2)',
              borderRadius: '6px'
            }}>
              <Typography variant="h6" gutterBottom sx={{
                color: '#00ff00',
                fontWeight: 'bold',
                borderBottom: '1px solid rgba(0, 255, 0, 0.3)',
                pb: 1
              }}>
                Basic Information
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="#00ff00" sx={{ fontWeight: 'bold' }}>Device Name</Typography>
                  <Typography variant="body1" sx={{ color: '#ffffff' }}>{data.device_name}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="#00ff00" sx={{ fontWeight: 'bold' }}>IP Address</Typography>
                  <Typography variant="body1" sx={{ color: '#ffffff' }}>{data.device_ip}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="#00ff00" sx={{ fontWeight: 'bold' }}>Device Type</Typography>
                  <Typography variant="body1" sx={{ color: '#ffffff' }}>{data.device_type || 'Unknown'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="#00ff00" sx={{ fontWeight: 'bold' }}>Platform</Typography>
                  <Typography variant="body1" sx={{ color: '#ffffff' }}>{data.device_platform || 'Unknown'}</Typography>
                </Grid>
              </Grid>
            </Paper>

            {/* MIB-2 Information */}
            <Paper elevation={1} sx={{
              p: 2,
              background: 'rgba(0, 255, 0, 0.05)',
              border: '1px solid rgba(0, 255, 0, 0.2)',
              borderRadius: '6px'
            }}>
              <Typography variant="h6" gutterBottom sx={{
                color: '#00ff00',
                fontWeight: 'bold',
                borderBottom: '1px solid rgba(0, 255, 0, 0.3)',
                pb: 1
              }}>
                MIB-2 System Information
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="body2" color="#00ff00" sx={{ fontWeight: 'bold' }}>Hostname</Typography>
                  <Typography variant="body1" sx={{
                    wordBreak: 'break-word',
                    color: '#ffffff',
                    background: 'rgba(0, 0, 0, 0.3)',
                    p: 1,
                    borderRadius: '4px',
                    fontFamily: 'monospace',
                    fontSize: '0.9em'
                  }}>
                    {data.agent_discovered_info?.hostname || 'Not available'}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2" color="#00ff00" sx={{ fontWeight: 'bold' }}>Description</Typography>
                  <Typography variant="body1" sx={{
                    fontFamily: 'monospace',
                    fontSize: '0.9em',
                    color: '#ffffff',
                    background: 'rgba(0, 0, 0, 0.3)',
                    p: 1,
                    borderRadius: '4px'
                  }}>
                    {data.agent_discovered_info?.vendor && data.agent_discovered_info?.model ?
                      `${data.agent_discovered_info.vendor} ${data.agent_discovered_info.model}` :
                      data.agent_discovered_info?.description || 'Not available'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="#00ff00" sx={{ fontWeight: 'bold' }}>Vendor</Typography>
                  <Typography variant="body1" sx={{ color: '#ffffff' }}>
                    {data.agent_discovered_info?.vendor || 'Not available'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="#00ff00" sx={{ fontWeight: 'bold' }}>Model</Typography>
                  <Typography variant="body1" sx={{ color: '#ffffff' }}>
                    {data.agent_discovered_info?.model || 'Not available'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="#00ff00" sx={{ fontWeight: 'bold' }}>Uptime</Typography>
                  <Typography variant="body1" sx={{ color: '#ffffff' }}>
                    {data.agent_discovered_info?.uptime || 'Not available'}
                  </Typography>
                  <Typography variant="caption" color="rgba(0, 255, 0, 0.7)" sx={{ fontStyle: 'italic' }}>
                    (Agent-discovered value)
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="#00ff00" sx={{ fontWeight: 'bold' }}>Ping Status</Typography>
                  <Typography variant="body1" sx={{ color: '#ffffff' }}>
                    {data.agent_discovered_info?.ping_status ? 'Reachable' : 'Unreachable'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="#00ff00" sx={{ fontWeight: 'bold' }}>SNMP Status</Typography>
                  <Typography variant="body1" sx={{ color: '#ffffff' }}>
                    {data.agent_discovered_info?.snmp_status ? 'Working' : 'Failed'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="#00ff00" sx={{ fontWeight: 'bold' }}>Active Status</Typography>
                  <Typography variant="body1" sx={{ color: '#ffffff' }}>
                    {data.agent_discovered_info?.is_active ? 'Active' : 'Inactive'}
                  </Typography>
                </Grid>
              </Grid>
            </Paper>

            {/* Last Updated */}
            <Box mt={2} textAlign="center">
              <Typography variant="caption" color="rgba(0, 255, 0, 0.6)" sx={{ fontStyle: 'italic' }}>
                Last updated: {new Date(data.last_updated).toLocaleString()}
              </Typography>
            </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{
        background: 'rgba(0, 0, 0, 0.3)',
        borderTop: '1px solid rgba(0, 255, 0, 0.2)',
        p: 2
      }}>
        <Button
          onClick={onRefresh}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={16} /> : null}
          sx={{
            background: 'linear-gradient(90deg, #2196f3 0%, #1976d2 100%)',
            color: '#ffffff',
            fontWeight: 'bold',
            mr: 1,
            '&:hover': {
              background: 'linear-gradient(90deg, #1976d2 0%, #1565c0 100%)',
              boxShadow: '0 0 10px rgba(33, 150, 243, 0.3)'
            }
          }}
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </Button>
        <Button
          onClick={onClose}
          sx={{
            background: 'linear-gradient(90deg, #00ff00 0%, #00cc00 100%)',
            color: '#000000',
            fontWeight: 'bold',
            '&:hover': {
              background: 'linear-gradient(90deg, #00cc00 0%, #009900 100%)',
              boxShadow: '0 0 10px rgba(0, 255, 0, 0.3)'
            }
          }}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
});

export default DeviceInfoModal; 
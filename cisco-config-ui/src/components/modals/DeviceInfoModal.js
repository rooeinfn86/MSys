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
          <Box display="flex" justifyContent="center" p={3}>
            <CircularProgress sx={{ color: '#00ff00' }} />
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

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 pt-4 border-t border-[#00ff00]/20">
        <button
          onClick={onRefresh}
          disabled={loading}
          className={`btn-primary px-6 py-2 flex items-center gap-2 ${
            loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#00ff00]/20'
          }`}
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Refreshing...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh Device
            </>
          )}
        </button>
        <button
          onClick={onClose}
          className="btn-secondary px-6 py-2"
          disabled={loading}
        >
          Close
        </button>
      </div>
    </Dialog>
  );
});

export default DeviceInfoModal; 
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
  CircularProgress,
  Chip
} from '@mui/material';

/**
 * Interface Information Modal Component
 * @param {Object} props - Component props
 * @param {boolean} props.open - Whether modal is open
 * @param {Function} props.onClose - Function to close modal
 * @param {Object} props.modalData - Modal state data
 */
const InterfaceInfoModal = React.memo(({
  open,
  onClose,
  modalData
}) => {
  const { loading, error, data } = modalData;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
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
        Interface Information (MIB-2)
        {data && (
          <Typography variant="subtitle2" color="rgba(0, 0, 0, 0.7)" sx={{ fontWeight: 'normal' }}>
            {data.device_name} ({data.device_ip}) - {data.interface_count} interfaces
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
            {data.interfaces.map((interface_data, index) => (
              <Paper key={index} elevation={1} sx={{
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
                  pb: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }}>
                  {interface_data.ifDescr}
                  <Chip
                    label={interface_data.ifOperStatus === 'up' ? 'UP' : 'DOWN'}
                    size="small"
                    sx={{
                      background: interface_data.ifOperStatus === 'up' ? '#00ff00' : '#ff0000',
                      color: '#000000',
                      fontWeight: 'bold',
                      fontSize: '0.7em'
                    }}
                  />
                </Typography>

                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="#00ff00" sx={{ fontWeight: 'bold' }}>Interface Name (ifDescr)</Typography>
                    <Typography variant="body1" sx={{
                      color: '#ffffff',
                      background: 'rgba(0, 0, 0, 0.3)',
                      p: 1,
                      borderRadius: '4px',
                      fontFamily: 'monospace',
                      fontSize: '0.9em'
                    }}>
                      {interface_data.ifDescr}
                    </Typography>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="#00ff00" sx={{ fontWeight: 'bold' }}>Interface Description</Typography>
                    <Typography variant="body1" sx={{
                      color: '#ffffff',
                      background: 'rgba(0, 0, 0, 0.3)',
                      p: 1,
                      borderRadius: '4px'
                    }}>
                      {interface_data.description}
                    </Typography>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="#00ff00" sx={{ fontWeight: 'bold' }}>Operational Status (ifOperStatus)</Typography>
                    <Typography variant="body1" sx={{
                      color: interface_data.ifOperStatus === 'up' ? '#00ff00' : '#ff0000',
                      fontWeight: 'bold'
                    }}>
                      {interface_data.ifOperStatus.toUpperCase()}
                    </Typography>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="#00ff00" sx={{ fontWeight: 'bold' }}>Administrative Status (ifAdminStatus)</Typography>
                    <Typography variant="body1" sx={{
                      color: interface_data.ifAdminStatus === 'up' ? '#00ff00' : '#ff0000',
                      fontWeight: 'bold'
                    }}>
                      {interface_data.ifAdminStatus.toUpperCase()}
                    </Typography>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="#00ff00" sx={{ fontWeight: 'bold' }}>Interface Speed (ifSpeed)</Typography>
                    <Typography variant="body1" sx={{ color: '#ffffff' }}>
                      {interface_data.ifSpeed === 'Unknown' ? 'Unknown' : `${interface_data.ifSpeed} Mbps`}
                    </Typography>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="#00ff00" sx={{ fontWeight: 'bold' }}>MAC Address (ifPhysAddress)</Typography>
                    <Typography variant="body1" sx={{
                      color: '#ffffff',
                      fontFamily: 'monospace',
                      fontSize: '0.9em'
                    }}>
                      {interface_data.ifPhysAddress}
                    </Typography>
                  </Grid>

                  <Grid item xs={12}>
                    <Typography variant="body2" color="#00ff00" sx={{ fontWeight: 'bold' }}>IP Address</Typography>
                    <Typography variant="body1" sx={{
                      color: '#ffffff',
                      fontFamily: 'monospace',
                      fontSize: '0.9em'
                    }}>
                      {interface_data.ip}
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>
            ))}

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

export default InterfaceInfoModal; 
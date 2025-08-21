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
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Thermometer, Activity } from 'lucide-react';

/**
 * System Health Modal Component
 * @param {Object} props - Component props
 * @param {boolean} props.open - Whether modal is open
 * @param {Function} props.onClose - Function to close modal
 * @param {Object} props.modalData - Modal state data
 */
const SystemHealthModal = React.memo(({ 
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
        System Health Dashboard
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
            {/* Overall Health Status */}
            <Paper elevation={1} sx={{ 
              p: 2, 
              mb: 3,
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
                gap: 2
              }}>
                Overall System Status
                <Chip 
                  label={data.overall_status.toUpperCase()} 
                  size="small"
                  sx={{
                    background: data.overall_status === 'normal' ? '#00ff00' : 
                              data.overall_status === 'warning' ? '#ff9800' : '#ff0000',
                    color: '#000000',
                    fontWeight: 'bold',
                    fontSize: '0.8em'
                  }}
                />
              </Typography>
              <Typography variant="body2" sx={{ color: '#ffffff', opacity: 0.8 }}>
                Last updated: {new Date(data.last_updated).toLocaleString()}
              </Typography>
            </Paper>

            {/* CPU Usage */}
            <Paper elevation={1} sx={{ 
              p: 2, 
              mb: 3,
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
                CPU Usage
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Box sx={{ 
                  width: '100%', 
                  height: 20, 
                  background: 'rgba(0, 0, 0, 0.3)', 
                  borderRadius: 10,
                  overflow: 'hidden',
                  position: 'relative'
                }}>
                  <Box sx={{
                    width: `${Math.min(data?.health_metrics?.cpu_load?.value || 0, 100)}%`,
                    height: '100%',
                    background: data?.health_metrics?.cpu_load?.status === 'normal' ? '#00ff00' :
                              data?.health_metrics?.cpu_load?.status === 'warning' ? '#ff9800' : '#ff0000',
                    borderRadius: 10,
                    transition: 'width 0.3s ease'
                  }} />
                </Box>
                <Typography variant="h6" sx={{ 
                  color: data?.health_metrics?.cpu_load?.status === 'normal' ? '#00ff00' :
                         data?.health_metrics?.cpu_load?.status === 'warning' ? '#ff9800' : '#ff0000',
                  fontWeight: 'bold',
                  minWidth: 60
                }}>
                  {data?.health_metrics?.cpu_load?.value || 0}%
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ color: '#ffffff', opacity: 0.8 }}>
                {data?.health_metrics?.cpu_load?.description || 'CPU usage information not available'}
              </Typography>
            </Paper>

            {/* Memory Usage */}
            {(data?.calculated_metrics?.memory_usage_percent || 
              data?.health_metrics?.memory_used_gb?.value > 0) && (
              <Paper elevation={1} sx={{ 
                p: 2, 
                mb: 3,
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
                  Memory Usage
                </Typography>
                <Typography variant="body2" sx={{ 
                  color: '#ffffff', 
                  opacity: 0.8,
                  mb: 2,
                  fontStyle: 'italic'
                }}>
                  Processor Memory (via SNMP)
                </Typography>
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Box sx={{ 
                    width: '100%', 
                    height: 20, 
                    background: 'rgba(0, 0, 0, 0.3)', 
                    borderRadius: 10,
                    overflow: 'hidden',
                    position: 'relative'
                  }}>
                    <Box sx={{
                      width: `${Math.min(data?.calculated_metrics?.memory_usage_percent?.value || 
                              (data?.health_metrics?.memory_used_gb?.value > 0 && 
                               data?.health_metrics?.memory_total_gb?.value > 0 ? 
                               Math.round((data?.health_metrics?.memory_used_gb?.value / 
                                          data?.health_metrics?.memory_total_gb?.value) * 100) : 0), 100)}%`,
                      height: '100%',
                      background: (() => {
                        const memPercent = data?.calculated_metrics?.memory_usage_percent?.value || 
                                         (data?.health_metrics?.memory_used_gb?.value > 0 && 
                                          data?.health_metrics?.memory_total_gb?.value > 0 ? 
                                          Math.round((data?.health_metrics?.memory_used_gb?.value / 
                                                     data?.health_metrics?.memory_total_gb?.value) * 100) : 0);
                        return memPercent < 80 ? '#00ff00' : memPercent < 95 ? '#ff9800' : '#ff0000';
                      })(),
                      borderRadius: 10,
                      transition: 'width 0.3s ease'
                    }} />
                  </Box>
                  <Typography variant="h6" sx={{ 
                    color: (() => {
                      const memPercent = data?.calculated_metrics?.memory_usage_percent?.value || 
                                       (data?.health_metrics?.memory_used_gb?.value > 0 && 
                                        data?.health_metrics?.memory_total_gb?.value > 0 ? 
                                        Math.round((data?.health_metrics?.memory_used_gb?.value / 
                                                   data?.health_metrics?.memory_total_gb?.value) * 100) : 0);
                      return memPercent < 80 ? '#00ff00' : memPercent < 95 ? '#ff9800' : '#ff0000';
                    })(),
                    fontWeight: 'bold',
                    minWidth: 60
                  }}>
                    {data?.calculated_metrics?.memory_usage_percent?.value || 
                     (data?.health_metrics?.memory_used_gb?.value > 0 && 
                      data?.health_metrics?.memory_total_gb?.value > 0 ? 
                      Math.round((data?.health_metrics?.memory_used_gb?.value / 
                                 data?.health_metrics?.memory_total_gb?.value) * 100) : 0)}%
                  </Typography>
                </Box>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="#00ff00" sx={{ fontWeight: 'bold' }}>Used Memory</Typography>
                    <Typography variant="body1" sx={{ color: '#ffffff' }}>
                      {data?.health_metrics?.memory_used_gb?.value || 0} GB
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="#00ff00" sx={{ fontWeight: 'bold' }}>Free Memory</Typography>
                    <Typography variant="body1" sx={{ color: '#ffffff' }}>
                      {data?.health_metrics?.memory_free_gb?.value || 0} GB
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="body2" color="#00ff00" sx={{ fontWeight: 'bold' }}>Total Memory</Typography>
                    <Typography variant="body1" sx={{ color: '#ffffff' }}>
                      {data?.health_metrics?.memory_total_gb?.value || 0} GB
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="caption" sx={{ 
                      color: '#ffffff', 
                      opacity: 0.6,
                      fontStyle: 'italic'
                    }}>
                      Note: This shows processor memory available for network operations. System memory may be larger.
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>
            )}

            {/* Temperature */}
            {(data?.health_metrics?.temperature?.value || 0) > 0 && (
              <Paper elevation={1} sx={{ 
                p: 2, 
                mb: 3,
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
                  Temperature Monitoring
                </Typography>
                
                {/* Main Temperature Display */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                  <Box sx={{
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    background: `conic-gradient(${data?.health_metrics?.temperature?.status === 'normal' ? '#00ff00' :
                                                 data?.health_metrics?.temperature?.status === 'warning' ? '#ff9800' : '#ff0000'} 0deg, 
                                                 ${data?.health_metrics?.temperature?.status === 'normal' ? '#00ff00' :
                                                 data?.health_metrics?.temperature?.status === 'warning' ? '#ff9800' : '#ff0000'} ${((data?.health_metrics?.temperature?.value || 0) / 100) * 360}deg, 
                                                 rgba(255, 255, 255, 0.1) ${((data?.health_metrics?.temperature?.value || 0) / 100) * 360}deg, 
                                                 rgba(255, 255, 255, 0.1) 360deg)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '3px solid rgba(0, 255, 0, 0.3)'
                  }}>
                    <Typography variant="h6" sx={{ 
                      color: data?.health_metrics?.temperature?.status === 'normal' ? '#00ff00' :
                             data?.health_metrics?.temperature?.status === 'warning' ? '#ff9800' : '#ff0000',
                      fontWeight: 'bold'
                    }}>
                      {data?.health_metrics?.temperature?.value || 0}°C
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" sx={{ color: '#ffffff', opacity: 0.8 }}>
                      {data?.health_metrics?.temperature?.description || 'Temperature monitoring information'}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#ffffff', opacity: 0.6 }}>
                      Normal: &lt;60°C | Warning: 60-80°C | Critical: &gt;80°C
                    </Typography>
                  </Box>
                </Box>

                {/* Detailed Temperature Information */}
                {data?.temperature_details && (
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <Typography variant="body2" color="#00ff00" sx={{ fontWeight: 'bold' }}>Inlet Temperature</Typography>
                      <Typography variant="body1" sx={{ color: '#ffffff' }}>
                        {data?.temperature_details?.inlet_temperature?.value || 0}°C
                      </Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="body2" color="#00ff00" sx={{ fontWeight: 'bold' }}>Hotspot Temperature</Typography>
                      <Typography variant="body1" sx={{ color: '#ffffff' }}>
                        {data?.temperature_details?.hotspot_temperature?.value || 0}°C
                      </Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="body2" color="#00ff00" sx={{ fontWeight: 'bold' }}>System Temperature</Typography>
                      <Typography variant="body1" sx={{ color: '#ffffff' }}>
                        {data?.temperature_details?.system_temperature?.description?.replace('System Status: ', '') || 'Unknown'}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="body2" color="#00ff00" sx={{ fontWeight: 'bold' }}>Yellow Threshold</Typography>
                      <Typography variant="body1" sx={{ color: '#ff9800' }}>
                        {data?.temperature_details?.yellow_threshold?.value || 0}°C
                      </Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="body2" color="#00ff00" sx={{ fontWeight: 'bold' }}>Red Threshold</Typography>
                      <Typography variant="body1" sx={{ color: '#ff0000' }}>
                        {data?.temperature_details?.red_threshold?.value || 0}°C
                      </Typography>
                    </Grid>
                  </Grid>
                )}
              </Paper>
            )}

            {/* Temperature Not Available Message */}
            {(data?.health_metrics?.temperature?.value || 0) === 0 && (
              <Paper elevation={1} sx={{ 
                p: 2, 
                mb: 3,
                background: 'rgba(255, 165, 0, 0.05)',
                border: '1px solid rgba(255, 165, 0, 0.2)',
                borderRadius: '6px'
              }}>
                <Typography variant="h6" gutterBottom sx={{ 
                  color: '#ffa500',
                  fontWeight: 'bold',
                  borderBottom: '1px solid rgba(255, 165, 0, 0.3)',
                  pb: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }}>
                  <Thermometer size={20} />
                  Temperature Monitoring
                </Typography>
                <Typography variant="body2" sx={{ color: '#ffffff', opacity: 0.8 }}>
                  Temperature monitoring is not available for this device. This could be because:
                </Typography>
                <Box component="ul" sx={{ mt: 1, pl: 2 }}>
                  <Typography component="li" variant="body2" sx={{ color: '#ffffff', opacity: 0.7 }}>
                    The device doesn't have temperature sensors
                  </Typography>
                  <Typography component="li" variant="body2" sx={{ color: '#ffffff', opacity: 0.7 }}>
                    Temperature SNMP OIDs are not supported on this device model
                  </Typography>
                  <Typography component="li" variant="body2" sx={{ color: '#ffffff', opacity: 0.7 }}>
                    SNMP access to temperature data is restricted
                  </Typography>
                </Box>
              </Paper>
            )}

            {/* Power Monitoring */}
            {((data?.health_metrics?.power_consumption?.value || 0) > 0 || 
              (data?.power_details && Object.keys(data.power_details).length > 0)) && (
              <Paper elevation={1} sx={{ 
                p: 2, 
                mb: 3,
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
                  <Activity size={20} />
                  Power Monitoring
                </Typography>
                
                {/* Main Power Display */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                  <Box sx={{
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    background: data?.health_metrics?.power_consumption?.status === 'normal' ? '#00ff00' :
                                 data?.health_metrics?.power_consumption?.status === 'warning' ? '#ff9800' : '#ff0000',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '3px solid rgba(0, 255, 0, 0.3)'
                  }}>
                    <Typography variant="h6" sx={{ 
                      color: '#000000',
                      fontWeight: 'bold'
                    }}>
                      {data?.health_metrics?.power_consumption?.status_text ||
                        (data?.power_details && Object.keys(data.power_details).length > 0 ? 
                          Object.values(data.power_details)[0]?.status || 'ERROR' : 
                          (data?.health_metrics?.power_consumption?.status === 'normal' ? 'OK' : 'ERROR'))}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" sx={{ color: '#ffffff', opacity: 0.8 }}>
                      {data?.health_metrics?.power_consumption?.description || 'Power status monitoring'}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#ffffff', opacity: 0.6 }}>
                      Power Status
                    </Typography>
                  </Box>
                </Box>

                {/* Detailed Power Information */}
                {data?.power_details && (
                  <Grid container spacing={2}>
                    {Object.entries(data.power_details).map(([psu_name, psu_data]) => (
                      <Grid item xs={12} md={6} key={psu_name}>
                        <Paper elevation={1} sx={{ 
                          p: 2,
                          background: 'rgba(0, 255, 0, 0.05)',
                          border: '1px solid rgba(0, 255, 0, 0.2)',
                          borderRadius: '4px'
                        }}>
                          <Typography variant="h6" color="#00ff00" sx={{ fontWeight: 'bold', mb: 1 }}>
                            {psu_name.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </Typography>
                          
                          {psu_data?.type === 'PSU' ? (
                            // Enhanced PSU information
                            <Box>
                              <Typography variant="body2" sx={{ color: '#ffffff', mb: 0.5 }}>
                                <strong>Model:</strong> {psu_data?.model || 'Unknown'}
                              </Typography>
                              <Typography variant="body2" sx={{ color: '#ffffff', mb: 0.5 }}>
                                <strong>Serial:</strong> {psu_data?.serial || 'Unknown'}
                              </Typography>
                              <Typography variant="body2" sx={{ color: '#ffffff', mb: 0.5 }}>
                                <strong>Capacity:</strong> {psu_data?.capacity || 'Unknown'}
                              </Typography>
                              <Typography variant="body2" sx={{ color: '#ffffff', mb: 0.5 }}>
                                <strong>Status:</strong> 
                                <span style={{ 
                                  color: psu_data?.status === 'OK' ? '#00ff00' : 
                                         psu_data?.status === 'WARNING' ? '#ff9800' : '#ff0000',
                                  fontWeight: 'bold',
                                  marginLeft: '4px'
                                }}>
                                  {psu_data?.status || 'Unknown'}
                                </span>
                              </Typography>
                              <Typography variant="body2" sx={{ color: '#ffffff', mb: 0.5 }}>
                                <strong>Power:</strong> {psu_data?.power_consumption || 'Unknown'}
                              </Typography>
                              <Typography variant="body2" sx={{ color: '#ffffff' }}>
                                <strong>Voltage:</strong> {psu_data?.voltage || 'Unknown'}
                              </Typography>
                            </Box>
                          ) : (
                            // Legacy power sensor data
                            <Typography variant="body1" sx={{ color: '#ffffff' }}>
                              {psu_data?.value || 0}W
                            </Typography>
                          )}
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                )}
              </Paper>
            )}

            {/* Fan Monitoring */}
            {(data?.health_metrics?.fan_speed?.value || 0) > 0 && (
              <Paper elevation={1} sx={{ 
                p: 2, 
                mb: 3,
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
                  <Activity size={20} />
                  Fan Monitoring
                </Typography>
                
                {/* Main Fan Display */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                  <Box sx={{
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    background: `conic-gradient(${data?.health_metrics?.fan_speed?.status === 'normal' ? '#00ff00' :
                                                 data?.health_metrics?.fan_speed?.status === 'warning' ? '#ff9800' : '#ff0000'} 0deg, 
                                                 ${data?.health_metrics?.fan_speed?.status === 'normal' ? '#00ff00' :
                                                 data?.health_metrics?.fan_speed?.status === 'warning' ? '#ff9800' : '#ff0000'} ${((data?.health_metrics?.fan_speed?.value || 0) / 100) * 360}deg, 
                                                 rgba(255, 255, 255, 0.1) ${((data?.health_metrics?.fan_speed?.value || 0) / 100) * 360}deg, 
                                                 rgba(255, 255, 255, 0.1) 360deg)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '3px solid rgba(0, 255, 0, 0.3)'
                  }}>
                    <Typography variant="h6" sx={{ 
                      color: data?.health_metrics?.fan_speed?.status === 'normal' ? '#00ff00' :
                             data?.health_metrics?.fan_speed?.status === 'warning' ? '#ff9800' : '#ff0000',
                      fontWeight: 'bold'
                    }}>
                      {data?.health_metrics?.fan_speed?.value || 0} RPM
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" sx={{ color: '#ffffff', opacity: 0.8 }}>
                      {data?.health_metrics?.fan_speed?.description || 'Fan speed monitoring'}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#ffffff', opacity: 0.6 }}>
                      Current fan speed
                    </Typography>
                  </Box>
                </Box>

                {/* Detailed Fan Information */}
                {data?.fan_details && (
                  <Grid container spacing={2}>
                    {Object.entries(data.fan_details).map(([sensor_name, sensor_data]) => (
                      <Grid item xs={12} md={6} key={sensor_name}>
                        <Typography variant="body2" color="#00ff00" sx={{ fontWeight: 'bold' }}>
                          {sensor_name.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </Typography>
                        <Typography variant="body1" sx={{ color: '#ffffff' }}>
                          {sensor_data?.value || 0} RPM
                        </Typography>
                      </Grid>
                    ))}
                  </Grid>
                )}
              </Paper>
            )}

            {/* Health Metrics Chart */}
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
                Health Metrics Overview
              </Typography>
              <Box sx={{ height: 300, mt: 2 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[
                    {
                      name: 'CPU',
                      value: data?.health_metrics?.cpu_load?.value || 0,
                      status: data?.health_metrics?.cpu_load?.status || 'unknown'
                    },
                    ...((data?.calculated_metrics?.memory_usage_percent || 
                         data?.health_metrics?.memory_used_gb?.value > 0) ? [{
                      name: 'Memory',
                      value: data?.calculated_metrics?.memory_usage_percent?.value || 
                             (data?.health_metrics?.memory_used_gb?.value > 0 && 
                              data?.health_metrics?.memory_total_gb?.value > 0 ? 
                              Math.round((data?.health_metrics?.memory_used_gb?.value / 
                                         data?.health_metrics?.memory_total_gb?.value) * 100) : 0),
                      status: data?.calculated_metrics?.memory_usage_percent?.status || 
                              (() => {
                                const memPercent = data?.calculated_metrics?.memory_usage_percent?.value || 
                                                 (data?.health_metrics?.memory_used_gb?.value > 0 && 
                                                  data?.health_metrics?.memory_total_gb?.value > 0 ? 
                                                  Math.round((data?.health_metrics?.memory_used_gb?.value / 
                                                             data?.health_metrics?.memory_total_gb?.value) * 100) : 0);
                                return memPercent < 80 ? 'normal' : memPercent < 95 ? 'warning' : 'critical';
                              })()
                    }] : []),
                    ...((data?.health_metrics?.temperature?.value || 0) > 0 ? [{
                      name: 'Temperature',
                      value: data?.health_metrics?.temperature?.value || 0,
                      status: data?.health_metrics?.temperature?.status || 'unknown'
                    }] : []),
                    ...((data?.health_metrics?.power_consumption?.value || 0) > 0 ? [{
                      name: 'Power',
                      value: data?.health_metrics?.power_consumption?.value || 0,
                      status: data?.health_metrics?.power_consumption?.status || 'unknown'
                    }] : []),
                    ...((data?.health_metrics?.fan_speed?.value || 0) > 0 ? [{
                      name: 'Fan',
                      value: data?.health_metrics?.fan_speed?.value || 0,
                      status: data?.health_metrics?.fan_speed?.status || 'unknown'
                    }] : [])
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0, 255, 0, 0.2)" />
                    <XAxis 
                      dataKey="name" 
                      stroke="#00ff00"
                      tick={{ fill: '#ffffff' }}
                    />
                    <YAxis 
                      stroke="#00ff00"
                      tick={{ fill: '#ffffff' }}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: '#1a1a1a',
                        border: '1px solid #00ff00',
                        borderRadius: '4px',
                        color: '#ffffff'
                      }}
                    />
                    <Bar 
                      dataKey="value" 
                      fill={(entry) => {
                        return entry.status === 'normal' ? '#00ff00' :
                               entry.status === 'warning' ? '#ff9800' : '#ff0000';
                      }}
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </Paper>
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

export default SystemHealthModal; 
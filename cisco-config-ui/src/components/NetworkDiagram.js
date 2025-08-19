import { useEffect, useState, useRef, useLayoutEffect, useCallback } from 'react';
import CytoscapeComponent from 'react-cytoscapejs';
import { Box, Typography, CircularProgress, Menu, MenuItem, Dialog, DialogTitle, DialogContent, DialogActions, Button, Paper, Grid, Chip } from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Thermometer, Activity } from 'lucide-react';
import api from '../utils/axios';
import { 
  getDeviceStatusColor, 
  getDeviceCategory, 
  getDeviceIcon,
  defaultLayout,
  topologyStyles,
  STATUS_COLORS,
  DEVICE_CATEGORIES,
  MODAL_TYPES
} from '../utils/topologyIndex';



const NetworkDiagram = ({ networkId }) => {
  const [elements, setElements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  
  // Context menu state
  const [contextMenu, setContextMenu] = useState({
    mouseX: null,
    mouseY: null,
    nodeData: null,
    discovering: false
  });
  
  // Device information modal state
  const [deviceInfoModal, setDeviceInfoModal] = useState({
    open: false,
    loading: false,
    data: null,
    error: null
  });
  
  // Interface information modal state
  const [interfaceInfoModal, setInterfaceInfoModal] = useState({
    open: false,
    loading: false,
    data: null,
    error: null
  });

  // System health modal state
  const [systemHealthModal, setSystemHealthModal] = useState({
    open: false,
    loading: false,
    data: null,
    error: null
  });

  // Function to fetch topology data (without discovery)
  const fetchTopology = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      
      // Force refresh to bypass cache and get fresh data with status information
      const response = await api.get(`/api/v1/topology/${networkId}?force_refresh=true`);
      const { nodes, links } = response.data;

      // Check if we have any data
      if (!nodes || nodes.length === 0) {
        console.log('No topology data found, triggering initial discovery...');
        // If no data, trigger discovery and fetch again
        await api.post(`/api/v1/topology/${networkId}/discover`);
        const refreshResponse = await api.get(`/api/v1/topology/${networkId}`);
        const { nodes: refreshNodes, links: refreshLinks } = refreshResponse.data;
        
        if (!refreshNodes || refreshNodes.length === 0) {
          throw new Error('No devices found in network');
        }
        
        // Use the refreshed data
        const cytoscapeElements = [
          ...refreshNodes.map(node => {
            console.log('Processing node:', node);
            console.log('Node data:', node.data);
            console.log('Device status data:', {
              ping_status: node.data?.ping_status,
              snmp_status: node.data?.snmp_status,
              is_active: node.data?.is_active
            });
            
            // Calculate device status for display (but don't override visual styling)
            const statusColor = getDeviceStatusColor(node.data);
            console.log('Calculated status color:', statusColor, 'for device:', node.data?.label);
            
            return {
              data: {
                id: node.id,
                label: node.label,
                type: node.type,
                deviceType: node.data?.type,
                platform: node.data?.platform,
                ...node.data,
                // Add status information for display purposes only
                statusColor: statusColor,
                pingStatus: node.data?.ping_status ?? false,
                snmpStatus: node.data?.snmp_status ?? true,
                isActive: node.data?.is_active ?? true,
                // Add simple device category for styling (without forcing shapes)
                deviceCategory: getDeviceCategory(node.data?.type)
              }
            };
          }),
          ...refreshLinks.map(link => ({
            data: {
              source: link.source,
              target: link.target,
              type: link.type,
              ...link.data
            }
          }))
        ];

        setElements(cytoscapeElements);
        setError(null);
        setLastUpdated(new Date());
        return;
      }

      // Convert nodes and links to Cytoscape elements with device-specific styling
      const cytoscapeElements = [
        ...nodes.map(node => {
          console.log('Processing node:', node);
          console.log('Node data:', node.data);
          console.log('Device status data:', {
            ping_status: node.data?.ping_status,
            snmp_status: node.data?.snmp_status,
            is_active: node.data?.is_active
          });
          
          // Calculate device status for display (but don't override visual styling)
          const statusColor = getDeviceStatusColor(node.data);
          console.log('Calculated status color:', statusColor, 'for device:', node.data?.label);
          
          return {
            data: {
              id: node.id,
              label: node.label,
              type: node.type,
              deviceType: node.data?.type,
              platform: node.data?.platform,
              ...node.data,
              // Add status information for display purposes only
              statusColor: statusColor,
              pingStatus: node.data?.ping_status ?? false,
              snmpStatus: node.data?.snmp_status ?? true,
              isActive: node.data?.is_active ?? true,
              // Add simple device category for styling (without forcing shapes)
              deviceCategory: getDeviceCategory(node.data?.type)
            }
          };
        }),
        ...links.map(link => ({
          data: {
            source: link.source,
            target: link.target,
            type: link.type,
            ...link.data
          }
        }))
      ];

      setElements(cytoscapeElements);
      setError(null);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching topology:', err);
      setError('Failed to load network topology');
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, [networkId]);

  // Function to refresh topology (with discovery)
  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      
      // First, clear the topology cache to ensure fresh data
      try {
        await api.delete(`/api/v1/topology/${networkId}/cache`);
        console.log('Topology cache cleared');
      } catch (cacheError) {
        console.log('Could not clear cache (this is okay):', cacheError);
      }
      
      // Then, trigger topology discovery
      await api.post(`/api/v1/topology/${networkId}/discover`);
      
      // Then fetch the updated topology data
      await fetchTopology(false);
      
    } catch (err) {
      console.error('Error refreshing topology:', err);
      setError('Failed to refresh network topology');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (networkId) {
      fetchTopology();
    }
  }, [networkId, fetchTopology]);

  // Track container size for animation
  useLayoutEffect(() => {
    if (!containerRef.current) {
      console.log('Container ref is null');
      return;
    }
    
    const updateSize = () => {
      if (!containerRef.current) {
        console.log('Container ref is null in updateSize');
        return;
      }
      
      const newSize = {
        width: containerRef.current.offsetWidth,
        height: containerRef.current.offsetHeight,
      };
      
      console.log('Container size updated:', newSize);
      
      // Only update if size actually changed
      if (newSize.width !== containerSize.width || newSize.height !== containerSize.height) {
        setContainerSize(newSize);
      }
    };
    
    // Initial size update
    updateSize();
    
    // Set up resize observer
    const resizeObserver = new window.ResizeObserver(() => {
      // Add a small delay to ensure DOM is stable
      setTimeout(updateSize, 10);
    });
    
    resizeObserver.observe(containerRef.current);
    
    // Also listen for window resize
    window.addEventListener('resize', updateSize);
    
    return () => {
      console.log('Cleaning up container size tracking');
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, [containerSize.width, containerSize.height]);

  // Matrix-style falling code animation
  useEffect(() => {
    console.log('Matrix animation useEffect triggered');
    
    // Simple initialization without complex timing
    const initMatrix = () => {
      if (!canvasRef.current || !containerRef.current) {
        console.log('Refs not ready, retrying in 50ms');
        setTimeout(initMatrix, 50);
        return;
      }
      
      const canvas = canvasRef.current;
      const container = containerRef.current;
      const width = container.offsetWidth;
      const height = container.offsetHeight;
      
      if (width === 0 || height === 0) {
        console.log('Container size is zero, retrying in 50ms');
        setTimeout(initMatrix, 50);
        return;
      }
      
      console.log('Starting Matrix animation with dimensions:', { width, height });
      
      const ctx = canvas.getContext('2d');
      
      // Set canvas size to match container size for crisp rendering
      canvas.width = width;
      canvas.height = height;
      
      // Ensure crisp pixel rendering
      ctx.imageSmoothingEnabled = false;
      
      let animationFrameId;
      let fontSize = 16;
      let columns = Math.floor(width / fontSize);
      let drops = Array(columns).fill(1);
      const binary = ['0', '1'];

      function draw() {
        // Clear the canvas with a semi-transparent black overlay for Matrix effect
        ctx.fillStyle = 'rgba(0, 0, 0, 0.05)'; // Very transparent black for trailing effect
        ctx.fillRect(0, 0, width, height);
        
        // Set font and color for the binary characters
        ctx.font = `${fontSize}px "Courier New", monospace`;
        ctx.textBaseline = 'top';
        
        // Draw the falling binary characters
        for (let i = 0; i < columns; i++) {
          const text = binary[Math.floor(Math.random() * binary.length)];
          const x = i * fontSize;
          const y = drops[i] * fontSize;
          
          // Add some variation to the characters
          if (Math.random() > 0.95) {
            ctx.fillStyle = '#ffffff'; // Occasional white characters
          } else {
            ctx.fillStyle = '#00ff00'; // Mostly green
          }
          
          ctx.fillText(text, x, y);
          
          // Reset drop when it goes off screen
          if (drops[i] * fontSize > height && Math.random() > 0.975) {
            drops[i] = 0;
          }
          // Slow down the falling speed
          drops[i] += 0.2;
        }
        
        // Debug: Log every 60 frames (about once per second)
        if (Math.random() < 0.016) {
          console.log('Matrix animation running - Canvas size:', { width, height }, 'Columns:', columns);
        }
        
        animationFrameId = requestAnimationFrame(draw);
      }

      draw();
      console.log('Matrix animation started successfully');

      // Cleanup function
      return () => {
        console.log('Cleaning up Matrix animation');
        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
        }
      };
    };
    
    initMatrix();
  }, []); // Only run once when component mounts

  // Handle context menu
  const handleContextMenu = (event) => {
    event.preventDefault();
    event.stopPropagation();
    
    // Hide the tooltip when context menu is opened
    const tooltip = document.getElementById('device-tooltip');
    if (tooltip) {
      tooltip.remove();
    }
    
    const node = event.target;
    if (node.isNode()) {
      const nodeData = node.data();
      setContextMenu({
        mouseX: event.originalEvent.clientX,
        mouseY: event.originalEvent.clientY,
        nodeData: nodeData
      });
    }
  };

  const handleCloseContextMenu = () => {
    // Ensure tooltip is hidden when context menu closes
    const tooltip = document.getElementById('device-tooltip');
    if (tooltip) {
      tooltip.remove();
    }
    
    setContextMenu({
      mouseX: null,
      mouseY: null,
      nodeData: null,
      discovering: false
    });
  };

  // Prevent browser context menu on the container
  const handleContainerContextMenu = (event) => {
    event.preventDefault();
    event.stopPropagation();
  };

  // Handle device information
  const handleDeviceInfo = async () => {
    if (!contextMenu.nodeData) return;
    
    setDeviceInfoModal(prev => ({ ...prev, open: true, loading: true, error: null }));
    
    try {
      // Extract device ID from the node ID (format: "device_123")
      const deviceId = contextMenu.nodeData.id.replace('device_', '');
      
      const response = await api.get(`/api/v1/topology/${networkId}/device/${deviceId}/info`);
      
      setDeviceInfoModal(prev => ({
        ...prev,
        loading: false,
        data: response.data
      }));
    } catch (error) {
      console.error('Error fetching device info:', error);
      setDeviceInfoModal(prev => ({
        ...prev,
        loading: false,
        error: error.response?.data?.detail || 'Failed to fetch device information'
      }));
    }
    
    handleCloseContextMenu();
  };

  const handleCloseDeviceInfoModal = () => {
    setDeviceInfoModal({
      open: false,
      loading: false,
      data: null,
      error: null
    });
  };

  // Handle refresh device information
  const handleRefreshDeviceInfo = async () => {
    if (!deviceInfoModal.data) return;
    
    try {
      setDeviceInfoModal(prev => ({ ...prev, loading: true, error: null }));
      
      // Extract device ID from the current device data
      const deviceId = deviceInfoModal.data.device_id;
      
      const response = await api.get(`/api/v1/topology/${networkId}/device/${deviceId}/info`);
      setDeviceInfoModal(prev => ({ 
        ...prev, 
        loading: false, 
        data: response.data 
      }));
    } catch (err) {
      console.error('Error refreshing device info:', err);
      setDeviceInfoModal(prev => ({ 
        ...prev, 
        loading: false, 
        error: 'Failed to refresh device information' 
      }));
    }
  };

  // Handle interface information
  const handleInterfaceInfo = async () => {
    if (!contextMenu.nodeData) return;
    
    try {
      setInterfaceInfoModal(prev => ({ ...prev, open: true, loading: true, error: null }));
      
      // Extract device ID from node ID (format: "device_123")
      const deviceId = contextMenu.nodeData.id.replace('device_', '');
      
      const response = await api.get(`/api/v1/topology/${networkId}/device/${deviceId}/interfaces`);
      setInterfaceInfoModal(prev => ({ 
        ...prev, 
        loading: false, 
        data: response.data 
      }));
    } catch (err) {
      console.error('Error fetching interface info:', err);
      setInterfaceInfoModal(prev => ({ 
        ...prev, 
        loading: false, 
        error: 'Failed to load interface information' 
      }));
    }
  };

  // Handle system health information
  const handleSystemHealth = async () => {
    if (!contextMenu.nodeData) return;
    
    try {
      setSystemHealthModal(prev => ({ ...prev, open: true, loading: true, error: null }));
      
      // Extract device ID from node ID (format: "device_123")
      const deviceId = contextMenu.nodeData.id.replace('device_', '');
      
      const response = await api.get(`/api/v1/topology/${networkId}/device/${deviceId}/health`);
      setSystemHealthModal(prev => ({ 
        ...prev, 
        loading: false, 
        data: response.data 
      }));
    } catch (err) {
      console.error('Error fetching system health:', err);
      setSystemHealthModal(prev => ({ 
        ...prev, 
        loading: false, 
        error: 'Failed to load system health information' 
      }));
    }
    
    handleCloseContextMenu();
  };

  const handleCloseSystemHealthModal = () => {
    setSystemHealthModal({
      open: false,
      loading: false,
      data: null,
      error: null
    });
  };

  // Handle discover neighbors
  const handleDiscoverNeighbors = async () => {
    if (!contextMenu.nodeData) return;
    
    try {
      // Extract device ID from node ID (format: "device_123")
      const deviceId = contextMenu.nodeData.id.replace('device_', '');
      
      // Show loading state
      setContextMenu(prev => ({ ...prev, discovering: true }));
      
      // Trigger neighbor discovery for this device
      await api.post(`/api/v1/topology/${networkId}/device/${deviceId}/discover`);
      
      // Wait a moment for the background task to start
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Refresh the topology to show new connections
      await fetchTopology(false);
      
      // Close context menu
      setContextMenu({
        mouseX: null,
        mouseY: null,
        nodeData: null,
        discovering: false
      });
      
    } catch (err) {
      console.error('Error discovering neighbors:', err);
      setContextMenu(prev => ({ ...prev, discovering: false }));
      // You could show an error message here
    }
  };

  const handleCloseInterfaceInfoModal = () => {
    setInterfaceInfoModal({
      open: false,
      loading: false,
      data: null,
      error: null
    });
  };

  // Format uptime
  const formatUptime = (uptimeString) => {
    if (!uptimeString || uptimeString === 'Not available') return 'Not available';
    
    try {
      // Parse uptime string like "1234567890" (hundredths of seconds / centiseconds)
      const uptimeCentiseconds = parseInt(uptimeString);
      
      if (isNaN(uptimeCentiseconds)) {
        console.error('Invalid uptime value - not a number:', uptimeString);
        return uptimeString;
      }
      
      const uptimeSeconds = Math.floor(uptimeCentiseconds / 100);
      
      const days = Math.floor(uptimeSeconds / 86400);
      const hours = Math.floor((uptimeSeconds % 86400) / 3600);
      const minutes = Math.floor((uptimeSeconds % 3600) / 60);
      const seconds = uptimeSeconds % 60;
      
      // Build the formatted string
      let result = '';
      if (days > 0) {
        result += `${days}d `;
      }
      if (hours > 0 || days > 0) {
        result += `${hours}h `;
      }
      if (minutes > 0 || hours > 0 || days > 0) {
        result += `${minutes}m `;
      }
      result += `${seconds}s`;
      
      return result;
      
    } catch (error) {
      console.error('Error parsing uptime:', error, 'Original value:', uptimeString);
      return uptimeString;
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100%" bgcolor="#1a1a1a">
        <CircularProgress sx={{ color: '#1976d2' }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100%" bgcolor="#1a1a1a">
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  const layout = {
    name: 'cose',
    idealEdgeLength: 150,
    nodeOverlap: 20,
    refresh: 20,
    fit: true,
    padding: 50,
    randomize: false,
    componentSpacing: 150,
    nodeRepulsion: 450000,
    edgeElasticity: 150,
    nestingFactor: 5,
    gravity: 100,
    numIter: 1000,
    initialTemp: 200,
    coolingFactor: 0.95,
    minTemp: 1.0
  };

  const style = [
    {
      selector: 'core',
      style: {
        'background-color': 'transparent'
      }
    },
    {
      selector: 'node',
      style: {
        'label': 'data(label)',
        'text-valign': 'center',
        'text-halign': 'center',
        'text-wrap': 'wrap',
        'text-max-width': '120px',
        'font-size': '12px',
        'font-weight': '500',
        'color': '#ffffff',
        'text-outline-color': '#000000',
        'text-outline-width': '2px',
        'text-background-color': '#000000',
        'text-background-opacity': 0.3,
        'text-background-padding': '3px',
        'text-background-shape': 'roundrectangle'
      }
    },
    {
      selector: 'node[deviceCategory="router"]',
      style: {
        // No background or border, icon will be used
      }
    },
    {
      selector: 'node[deviceCategory="switch"]',
      style: {
        'shape': 'rectangle',
        'width': '64px',
        'height': '64px',
        'background-color': 'transparent',
        'background-opacity': 0,
        'border-width': 0,
        'background-image': '/images/network-icons/switch-cisco.png',
        'background-image-opacity': 1,
        'background-fit': 'contain',
        'background-clip': 'node',
        'background-position-x': '50%',
        'background-position-y': '50%',
        'label': 'data(label)',
        'text-valign': 'bottom',
        'text-halign': 'center',
        'font-size': '13px',
        'font-weight': '600',
        'color': '#ffffff',
        'text-outline-color': '#000000',
        'text-outline-width': '2px',
        'text-background-color': '#000000',
        'text-background-opacity': 0.3,
        'text-background-padding': '4px',
        'text-background-shape': 'roundrectangle',
      }
    },
    {
      selector: 'node[deviceCategory="firewall"]',
      style: {
        // No background or border, icon will be used
      }
    },
    {
      selector: 'node[deviceCategory="access point"]',
      style: {
        // No background or border, icon will be used
      }
    },
    {
      selector: 'node[deviceCategory="server"]',
      style: {
        // No background or border, icon will be used
      }
    },
    {
      selector: 'node[deviceCategory="appliance"]',
      style: {
        // No background or border, icon will be used
      }
    },
    {
      selector: 'node[deviceCategory="unknown"]',
      style: {
        // No background or border, icon will be used
      }
    },
    {
      selector: 'edge',
      style: {
        'width': 3,
        'line-color': '#666666',
        'target-arrow-color': '#666666',
        'target-arrow-shape': 'triangle',
        'source-arrow-color': '#666666',
        'source-arrow-shape': 'triangle',
        'curve-style': 'bezier',
        'edge-distances': 'intersection',
        'loop-direction': '-45deg',
        'loop-sweep': '-90deg',
        'text-rotation': 'autorotate',
        'text-margin-y': -10,
        'font-size': '12px',
        'font-weight': 'bold',
        'color': '#ffffff',
        'text-outline-color': '#000000',
        'text-outline-width': '2px',
        'text-background-color': '#000000',
        'text-background-opacity': 0.4,
        'text-background-padding': '3px',
        'text-background-shape': 'roundrectangle'
      }
    },
    {
      selector: 'edge[type="neighbor"]',
      style: {
        'line-color': '#4caf50',
        'target-arrow-color': '#4caf50',
        'source-arrow-color': '#4caf50',
        'label': function(ele) {
          const data = ele.data();
          return `${data.local_interface} ↔ ${data.remote_interface}`;
        }
      }
    },
    {
      selector: 'node[type="device"]',
      style: {
        'shape': 'rectangle',
        'width': 'data(width)',
        'height': 'data(height)',
        'background-color': 'transparent',
        'background-opacity': 0,
        'border-width': 0,
        'background-image': function(ele) {
          const data = ele.data();
          console.log('Setting background image for node:', data.label, 'Icon:', data.icon);
          return data.icon;
        },
        'background-image-opacity': 1,
        'background-fit': 'cover',
        'background-clip': 'node',
        'background-position-x': '50%',
        'background-position-y': '50%',
        'label': 'data(label)',
        'text-valign': 'bottom',
        'text-halign': 'center',
        'font-size': '13px',
        'font-weight': '600',
        'color': '#ffffff',
        'text-outline-color': '#000000',
        'text-outline-width': '2px',
        'text-background-color': '#000000',
        'text-background-opacity': 0.3,
        'text-background-padding': '4px',
        'text-background-shape': 'roundrectangle',
      }
    },
    // Status indicator styles
    {
      selector: 'node[statusColor="green"]',
      style: {
        'border-width': '3px',
        'border-color': '#00ff00',
        'border-opacity': 0.8,
        'border-style': 'solid'
      }
    },
    {
      selector: 'node[statusColor="orange"]',
      style: {
        'border-width': '3px',
        'border-color': '#ff9800',
        'border-opacity': 0.8,
        'border-style': 'solid'
      }
    },
    {
      selector: 'node[statusColor="red"]',
      style: {
        'border-width': '3px',
        'border-color': '#ff0000',
        'border-opacity': 0.8,
        'border-style': 'solid'
      }
    }
  ];

  return (
    <Box ref={containerRef} sx={{ 
      height: '100%', 
      width: '100%',
      background: 'linear-gradient(135deg, #000000 0%, #0a0a0a 50%, #000000 100%)',
      borderRadius: '8px',
      boxShadow: '0 0 50px rgba(0, 255, 0, 0.2), 0 0 100px rgba(0, 255, 0, 0.1), inset 0 0 50px rgba(0, 0, 0, 0.8)',
      overflow: 'hidden',
      position: 'relative'
    }}
    onContextMenu={handleContainerContextMenu}
    >
      {/* Refresh Button - Floating in top-right corner */}
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
        <Button
          variant="contained"
          onClick={handleRefresh}
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

      {/* Layer 1: Matrix Animation Canvas (z-index: 0) */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 0,
          pointerEvents: 'none',
          opacity: 0.8,
          imageRendering: 'crisp-edges',
        }}
      />
      {/* Layer 2: Cytoscape Network Diagram (z-index: 1) */}
      <Box sx={{ position: 'relative', zIndex: 1, height: '100%', width: '100%' }}>
        <CytoscapeComponent
          elements={elements}
          style={{ width: '100%', height: '100%' }}
          layout={layout}
          stylesheet={style}
          cy={(cy) => {
            cy.on('tap', 'node', function(evt) {
              const node = evt.target;
              console.log('Node clicked:', node.data());
            });
            cy.on('mousewheel', function(evt) {
              if (evt.originalEvent.ctrlKey) {
                evt.preventDefault();
              }
            });
            cy.on('cxttap', 'node', handleContextMenu);
            
            // Add tooltip for device status
            cy.on('mouseover', 'node', function(evt) {
              // Don't show tooltip if context menu is open
              if (contextMenu.mouseY !== null) {
                return;
              }
              
              const node = evt.target;
              const data = node.data();
              const statusText = data.statusColor === 'green' ? 'Online (Ping + SNMP)' :
                               data.statusColor === 'orange' ? 'Partial (Ping only)' :
                               'Offline';
              
              // Create tooltip elements safely to prevent XSS
              const tooltipContainer = document.createElement('div');
              tooltipContainer.style.cssText = `
                position: fixed;
                background: rgba(0, 0, 0, 0.9);
                color: white;
                padding: 8px 12px;
                border-radius: 6px;
                font-size: 12px;
                font-weight: bold;
                border: 1px solid #00ff00;
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
                z-index: 1000;
                pointer-events: none;
                white-space: nowrap;
              `;

              // Create elements safely
              const labelDiv = document.createElement('div');
              labelDiv.style.cssText = 'color: #00ff00; margin-bottom: 4px;';
              labelDiv.textContent = data.label || 'Unknown Device'; // Safe text assignment

              const statusDiv = document.createElement('div');
              const statusColor = data.statusColor === 'green' ? '#00ff00' : data.statusColor === 'orange' ? '#ff9800' : '#ff0000';
              statusDiv.style.cssText = `color: ${statusColor};`;
              statusDiv.textContent = `Status: ${statusText}`; // Safe text assignment

              const infoDiv = document.createElement('div');
              infoDiv.style.cssText = 'color: #cccccc; font-size: 11px;';
              
              const ipSpan = document.createElement('span');
              ipSpan.textContent = `IP: ${data.ip || 'Unknown'}`; // Safe text assignment
              
              const typeSpan = document.createElement('span');
              typeSpan.textContent = `Type: ${data.deviceType || 'Unknown'}`; // Safe text assignment
              
              infoDiv.appendChild(ipSpan);
              infoDiv.appendChild(document.createElement('br'));
              infoDiv.appendChild(typeSpan);

              tooltipContainer.appendChild(labelDiv);
              tooltipContainer.appendChild(statusDiv);
              tooltipContainer.appendChild(infoDiv);

              tooltipContainer.id = 'device-tooltip';
              document.body.appendChild(tooltipContainer);
            });
            
            cy.on('mousemove', 'node', function(evt) {
              // Don't move tooltip if context menu is open
              if (contextMenu.mouseY !== null) {
                return;
              }
              
              const tooltip = document.getElementById('device-tooltip');
              if (tooltip) {
                tooltip.style.left = evt.originalEvent.pageX + 10 + 'px';
                tooltip.style.top = evt.originalEvent.pageY - 10 + 'px';
              }
            });
            
            cy.on('mouseout', 'node', function(evt) {
              const tooltip = document.getElementById('device-tooltip');
              if (tooltip) {
                tooltip.remove();
              }
            });
            
            // Prevent browser context menu on the Cytoscape container
            cy.on('cxtstart', function(evt) {
              evt.originalEvent.preventDefault();
              evt.originalEvent.stopPropagation();
            });
          }}
        />
        
        {/* Refresh Loading Overlay */}
        {refreshing && (
          <Box sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2,
            backdropFilter: 'blur(2px)'
          }}>
            <Box sx={{
              background: 'rgba(0, 0, 0, 0.8)',
              color: '#00ff00',
              px: 4,
              py: 3,
              borderRadius: '12px',
              border: '1px solid #00ff00',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2
            }}>
              <CircularProgress sx={{ color: '#00ff00' }} />
              <Typography variant="body1" sx={{ color: '#00ff00', fontWeight: 'bold' }}>
                Refreshing Network Topology...
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(0, 255, 0, 0.7)' }}>
                Discovering devices and connections
              </Typography>
            </Box>
          </Box>
        )}
      </Box>
      
      {/* Context Menu */}
      <Menu
        open={contextMenu.mouseY !== null}
        onClose={handleCloseContextMenu}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu.mouseY !== null && contextMenu.mouseX !== null
            ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
            : undefined
        }
        PaperProps={{
          sx: {
            background: 'linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 50%, #1a1a1a 100%)',
            border: '1px solid #00ff00',
            boxShadow: '0 0 15px rgba(0, 255, 0, 0.3), 0 0 30px rgba(0, 255, 0, 0.1)',
            borderRadius: '6px',
            color: '#ffffff',
            '& .MuiMenuItem-root': {
              color: '#ffffff',
              '&:hover': {
                background: 'rgba(0, 255, 0, 0.2)',
                color: '#00ff00'
              }
            }
          }
        }}
      >
        <MenuItem onClick={handleDeviceInfo} sx={{ 
          fontWeight: 'bold',
          '&:hover': {
            background: 'rgba(0, 255, 0, 0.2)',
            color: '#00ff00'
          }
        }}>
          Device Information
        </MenuItem>
        <MenuItem onClick={handleInterfaceInfo} sx={{ 
          fontWeight: 'bold',
          '&:hover': {
            background: 'rgba(0, 255, 0, 0.2)',
            color: '#00ff00'
          }
        }}>
          Interface Information
        </MenuItem>
        <MenuItem onClick={handleSystemHealth} sx={{ 
          fontWeight: 'bold',
          '&:hover': {
            background: 'rgba(0, 255, 0, 0.2)',
            color: '#00ff00'
          }
        }}>
          System Health
        </MenuItem>
        <MenuItem 
          onClick={handleDiscoverNeighbors}
          disabled={contextMenu.discovering}
          sx={{ 
            fontWeight: 'bold',
            '&:hover': {
              background: 'rgba(0, 255, 0, 0.2)',
              color: '#00ff00'
            },
            '&:disabled': {
              color: 'rgba(255, 255, 255, 0.5)',
              cursor: 'not-allowed'
            }
          }}
        >
          {contextMenu.discovering ? 'Discovering...' : 'Discover Neighbors'}
        </MenuItem>
      </Menu>
      
      {/* Device Information Modal */}
      <Dialog
        open={deviceInfoModal.open}
        onClose={handleCloseDeviceInfoModal}
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
          {deviceInfoModal.data && (
            <Typography variant="subtitle2" color="rgba(0, 0, 0, 0.7)" sx={{ fontWeight: 'normal' }}>
              {deviceInfoModal.data.device_name} ({deviceInfoModal.data.device_ip})
            </Typography>
          )}
        </DialogTitle>
        <DialogContent sx={{ 
          background: 'transparent',
          '& .MuiDialogContent-root': {
            padding: '20px'
          }
        }}>
          {deviceInfoModal.loading && (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress sx={{ color: '#00ff00' }} />
            </Box>
          )}
          
          {deviceInfoModal.error && (
            <Box p={2} sx={{ 
              background: 'rgba(255, 0, 0, 0.1)', 
              border: '1px solid #ff0000',
              borderRadius: '4px'
            }}>
              <Typography color="#ff0000">
                Error: {deviceInfoModal.error}
              </Typography>
            </Box>
          )}
          
          {deviceInfoModal.data && !deviceInfoModal.loading && (
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
                    <Typography variant="body1" sx={{ color: '#ffffff' }}>{deviceInfoModal.data.device_name}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="#00ff00" sx={{ fontWeight: 'bold' }}>IP Address</Typography>
                    <Typography variant="body1" sx={{ color: '#ffffff' }}>{deviceInfoModal.data.device_ip}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="#00ff00" sx={{ fontWeight: 'bold' }}>Device Type</Typography>
                    <Typography variant="body1" sx={{ color: '#ffffff' }}>{deviceInfoModal.data.device_type || 'Unknown'}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="#00ff00" sx={{ fontWeight: 'bold' }}>Platform</Typography>
                    <Typography variant="body1" sx={{ color: '#ffffff' }}>{deviceInfoModal.data.device_platform || 'Unknown'}</Typography>
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
                      {deviceInfoModal.data.agent_discovered_info?.hostname || 'Not available'}
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
                      {deviceInfoModal.data.agent_discovered_info?.vendor && deviceInfoModal.data.agent_discovered_info?.model ? 
                        `${deviceInfoModal.data.agent_discovered_info.vendor} ${deviceInfoModal.data.agent_discovered_info.model}` : 
                        deviceInfoModal.data.agent_discovered_info?.description || 'Not available'}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="#00ff00" sx={{ fontWeight: 'bold' }}>Vendor</Typography>
                    <Typography variant="body1" sx={{ color: '#ffffff' }}>
                      {deviceInfoModal.data.agent_discovered_info?.vendor || 'Not available'}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="#00ff00" sx={{ fontWeight: 'bold' }}>Model</Typography>
                    <Typography variant="body1" sx={{ color: '#ffffff' }}>
                      {deviceInfoModal.data.agent_discovered_info?.model || 'Not available'}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="#00ff00" sx={{ fontWeight: 'bold' }}>Uptime</Typography>
                    <Typography variant="body1" sx={{ color: '#ffffff' }}>
                      {deviceInfoModal.data.agent_discovered_info?.uptime || 'Not available'}
                    </Typography>
                    <Typography variant="caption" color="rgba(0, 255, 0, 0.7)" sx={{ fontStyle: 'italic' }}>
                      (Agent-discovered value)
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="#00ff00" sx={{ fontWeight: 'bold' }}>Ping Status</Typography>
                    <Typography variant="body1" sx={{ color: '#ffffff' }}>
                      {deviceInfoModal.data.agent_discovered_info?.ping_status ? 'Reachable' : 'Unreachable'}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="#00ff00" sx={{ fontWeight: 'bold' }}>SNMP Status</Typography>
                    <Typography variant="body1" sx={{ color: '#ffffff' }}>
                      {deviceInfoModal.data.agent_discovered_info?.snmp_status ? 'Working' : 'Failed'}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="#00ff00" sx={{ fontWeight: 'bold' }}>Active Status</Typography>
                    <Typography variant="body1" sx={{ color: '#ffffff' }}>
                      {deviceInfoModal.data.agent_discovered_info?.is_active ? 'Active' : 'Inactive'}
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>
              
              {/* Last Updated */}
              <Box mt={2} textAlign="center">
                <Typography variant="caption" color="rgba(0, 255, 0, 0.6)" sx={{ fontStyle: 'italic' }}>
                  Last updated: {new Date(deviceInfoModal.data.last_updated).toLocaleString()}
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
            onClick={handleRefreshDeviceInfo}
            disabled={deviceInfoModal.loading}
            startIcon={deviceInfoModal.loading ? <CircularProgress size={16} /> : null}
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
            {deviceInfoModal.loading ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Button 
            onClick={handleCloseDeviceInfoModal}
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
      
      {/* Interface Information Modal */}
      <Dialog
        open={interfaceInfoModal.open}
        onClose={handleCloseInterfaceInfoModal}
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
          {interfaceInfoModal.data && (
            <Typography variant="subtitle2" color="rgba(0, 0, 0, 0.7)" sx={{ fontWeight: 'normal' }}>
              {interfaceInfoModal.data.device_name} ({interfaceInfoModal.data.device_ip}) - {interfaceInfoModal.data.interface_count} interfaces
            </Typography>
          )}
        </DialogTitle>
        <DialogContent sx={{ 
          background: 'transparent',
          '& .MuiDialogContent-root': {
            padding: '20px'
          }
        }}>
          {interfaceInfoModal.loading && (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress sx={{ color: '#00ff00' }} />
            </Box>
          )}
          
          {interfaceInfoModal.error && (
            <Box p={2} sx={{ 
              background: 'rgba(255, 0, 0, 0.1)', 
              border: '1px solid #ff0000',
              borderRadius: '4px'
            }}>
              <Typography color="#ff0000">
                Error: {interfaceInfoModal.error}
              </Typography>
            </Box>
          )}
          
          {interfaceInfoModal.data && !interfaceInfoModal.loading && (
            <Box>
              {interfaceInfoModal.data.interfaces.map((interface_data, index) => (
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
                  Last updated: {new Date(interfaceInfoModal.data.last_updated).toLocaleString()}
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
            onClick={handleCloseInterfaceInfoModal}
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
      
      {/* System Health Modal */}
      <Dialog
        open={systemHealthModal.open}
        onClose={handleCloseSystemHealthModal}
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
          {systemHealthModal.data && (
            <Typography variant="subtitle2" color="rgba(0, 0, 0, 0.7)" sx={{ fontWeight: 'normal' }}>
              {systemHealthModal.data.device_name} ({systemHealthModal.data.device_ip})
            </Typography>
          )}
        </DialogTitle>
        <DialogContent sx={{ 
          background: 'transparent',
          '& .MuiDialogContent-root': {
            padding: '20px'
          }
        }}>
          {systemHealthModal.loading && (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress sx={{ color: '#00ff00' }} />
            </Box>
          )}
          
          {systemHealthModal.error && (
            <Box p={2} sx={{ 
              background: 'rgba(255, 0, 0, 0.1)', 
              border: '1px solid #ff0000',
              borderRadius: '4px'
            }}>
              <Typography color="#ff0000">
                Error: {systemHealthModal.error}
              </Typography>
            </Box>
          )}
          
          {systemHealthModal.data && !systemHealthModal.loading && (
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
                    label={systemHealthModal.data.overall_status.toUpperCase()} 
                    size="small"
                    sx={{
                      background: systemHealthModal.data.overall_status === 'normal' ? '#00ff00' : 
                                systemHealthModal.data.overall_status === 'warning' ? '#ff9800' : '#ff0000',
                      color: '#000000',
                      fontWeight: 'bold',
                      fontSize: '0.8em'
                    }}
                  />
                </Typography>
                <Typography variant="body2" sx={{ color: '#ffffff', opacity: 0.8 }}>
                  Last updated: {new Date(systemHealthModal.data.last_updated).toLocaleString()}
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
                      width: `${Math.min(systemHealthModal.data?.health_metrics?.cpu_load?.value || 0, 100)}%`,
                      height: '100%',
                      background: systemHealthModal.data?.health_metrics?.cpu_load?.status === 'normal' ? '#00ff00' :
                                systemHealthModal.data?.health_metrics?.cpu_load?.status === 'warning' ? '#ff9800' : '#ff0000',
                      borderRadius: 10,
                      transition: 'width 0.3s ease'
                    }} />
                  </Box>
                  <Typography variant="h6" sx={{ 
                    color: systemHealthModal.data?.health_metrics?.cpu_load?.status === 'normal' ? '#00ff00' :
                           systemHealthModal.data?.health_metrics?.cpu_load?.status === 'warning' ? '#ff9800' : '#ff0000',
                    fontWeight: 'bold',
                    minWidth: 60
                  }}>
                    {systemHealthModal.data?.health_metrics?.cpu_load?.value || 0}%
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ color: '#ffffff', opacity: 0.8 }}>
                  {systemHealthModal.data?.health_metrics?.cpu_load?.description || 'CPU usage information not available'}
                </Typography>
              </Paper>

              {/* Memory Usage */}
              {(systemHealthModal.data?.calculated_metrics?.memory_usage_percent || 
                systemHealthModal.data?.health_metrics?.memory_used_gb?.value > 0) && (
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
                        width: `${Math.min(systemHealthModal.data?.calculated_metrics?.memory_usage_percent?.value || 
                                (systemHealthModal.data?.health_metrics?.memory_used_gb?.value > 0 && 
                                 systemHealthModal.data?.health_metrics?.memory_total_gb?.value > 0 ? 
                                 Math.round((systemHealthModal.data?.health_metrics?.memory_used_gb?.value / 
                                            systemHealthModal.data?.health_metrics?.memory_total_gb?.value) * 100) : 0), 100)}%`,
                        height: '100%',
                        background: (() => {
                          const memPercent = systemHealthModal.data?.calculated_metrics?.memory_usage_percent?.value || 
                                           (systemHealthModal.data?.health_metrics?.memory_used_gb?.value > 0 && 
                                            systemHealthModal.data?.health_metrics?.memory_total_gb?.value > 0 ? 
                                            Math.round((systemHealthModal.data?.health_metrics?.memory_used_gb?.value / 
                                                       systemHealthModal.data?.health_metrics?.memory_total_gb?.value) * 100) : 0);
                          return memPercent < 80 ? '#00ff00' : memPercent < 95 ? '#ff9800' : '#ff0000';
                        })(),
                        borderRadius: 10,
                        transition: 'width 0.3s ease'
                      }} />
                    </Box>
                    <Typography variant="h6" sx={{ 
                      color: (() => {
                        const memPercent = systemHealthModal.data?.calculated_metrics?.memory_usage_percent?.value || 
                                         (systemHealthModal.data?.health_metrics?.memory_used_gb?.value > 0 && 
                                          systemHealthModal.data?.health_metrics?.memory_total_gb?.value > 0 ? 
                                          Math.round((systemHealthModal.data?.health_metrics?.memory_used_gb?.value / 
                                                     systemHealthModal.data?.health_metrics?.memory_total_gb?.value) * 100) : 0);
                        return memPercent < 80 ? '#00ff00' : memPercent < 95 ? '#ff9800' : '#ff0000';
                      })(),
                      fontWeight: 'bold',
                      minWidth: 60
                    }}>
                      {systemHealthModal.data?.calculated_metrics?.memory_usage_percent?.value || 
                       (systemHealthModal.data?.health_metrics?.memory_used_gb?.value > 0 && 
                        systemHealthModal.data?.health_metrics?.memory_total_gb?.value > 0 ? 
                        Math.round((systemHealthModal.data?.health_metrics?.memory_used_gb?.value / 
                                   systemHealthModal.data?.health_metrics?.memory_total_gb?.value) * 100) : 0)}%
                    </Typography>
                  </Box>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="#00ff00" sx={{ fontWeight: 'bold' }}>Used Memory</Typography>
                      <Typography variant="body1" sx={{ color: '#ffffff' }}>
                        {systemHealthModal.data?.health_metrics?.memory_used_gb?.value || 0} GB
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="#00ff00" sx={{ fontWeight: 'bold' }}>Free Memory</Typography>
                      <Typography variant="body1" sx={{ color: '#ffffff' }}>
                        {systemHealthModal.data?.health_metrics?.memory_free_gb?.value || 0} GB
                      </Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="body2" color="#00ff00" sx={{ fontWeight: 'bold' }}>Total Memory</Typography>
                      <Typography variant="body1" sx={{ color: '#ffffff' }}>
                        {systemHealthModal.data?.health_metrics?.memory_total_gb?.value || 0} GB
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
              {(systemHealthModal.data?.health_metrics?.temperature?.value || 0) > 0 && (
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
                      background: `conic-gradient(${systemHealthModal.data?.health_metrics?.temperature?.status === 'normal' ? '#00ff00' :
                                                   systemHealthModal.data?.health_metrics?.temperature?.status === 'warning' ? '#ff9800' : '#ff0000'} 0deg, 
                                                   ${systemHealthModal.data?.health_metrics?.temperature?.status === 'normal' ? '#00ff00' :
                                                   systemHealthModal.data?.health_metrics?.temperature?.status === 'warning' ? '#ff9800' : '#ff0000'} ${((systemHealthModal.data?.health_metrics?.temperature?.value || 0) / 100) * 360}deg, 
                                                   rgba(255, 255, 255, 0.1) ${((systemHealthModal.data?.health_metrics?.temperature?.value || 0) / 100) * 360}deg, 
                                                   rgba(255, 255, 255, 0.1) 360deg)`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '3px solid rgba(0, 255, 0, 0.3)'
                    }}>
                      <Typography variant="h6" sx={{ 
                        color: systemHealthModal.data?.health_metrics?.temperature?.status === 'normal' ? '#00ff00' :
                               systemHealthModal.data?.health_metrics?.temperature?.status === 'warning' ? '#ff9800' : '#ff0000',
                        fontWeight: 'bold'
                      }}>
                        {systemHealthModal.data?.health_metrics?.temperature?.value || 0}°C
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" sx={{ color: '#ffffff', opacity: 0.8 }}>
                        {systemHealthModal.data?.health_metrics?.temperature?.description || 'Temperature monitoring information'}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#ffffff', opacity: 0.6 }}>
                        Normal: &lt;60°C | Warning: 60-80°C | Critical: &gt;80°C
                      </Typography>
                    </Box>
                  </Box>

                  {/* Detailed Temperature Information */}
                  {systemHealthModal.data?.temperature_details && (
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <Typography variant="body2" color="#00ff00" sx={{ fontWeight: 'bold' }}>Inlet Temperature</Typography>
                        <Typography variant="body1" sx={{ color: '#ffffff' }}>
                          {systemHealthModal.data?.temperature_details?.inlet_temperature?.value || 0}°C
                        </Typography>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Typography variant="body2" color="#00ff00" sx={{ fontWeight: 'bold' }}>Hotspot Temperature</Typography>
                        <Typography variant="body1" sx={{ color: '#ffffff' }}>
                          {systemHealthModal.data?.temperature_details?.hotspot_temperature?.value || 0}°C
                        </Typography>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Typography variant="body2" color="#00ff00" sx={{ fontWeight: 'bold' }}>System Temperature</Typography>
                        <Typography variant="body1" sx={{ color: '#ffffff' }}>
                          {systemHealthModal.data?.temperature_details?.system_temperature?.description?.replace('System Status: ', '') || 'Unknown'}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Typography variant="body2" color="#00ff00" sx={{ fontWeight: 'bold' }}>Yellow Threshold</Typography>
                        <Typography variant="body1" sx={{ color: '#ff9800' }}>
                          {systemHealthModal.data?.temperature_details?.yellow_threshold?.value || 0}°C
                        </Typography>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Typography variant="body2" color="#00ff00" sx={{ fontWeight: 'bold' }}>Red Threshold</Typography>
                        <Typography variant="body1" sx={{ color: '#ff0000' }}>
                          {systemHealthModal.data?.temperature_details?.red_threshold?.value || 0}°C
                        </Typography>
                      </Grid>
                    </Grid>
                  )}
                </Paper>
              )}

              {/* Temperature Not Available Message */}
              {(systemHealthModal.data?.health_metrics?.temperature?.value || 0) === 0 && (
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
              {((systemHealthModal.data?.health_metrics?.power_consumption?.value || 0) > 0 || 
                (systemHealthModal.data?.power_details && Object.keys(systemHealthModal.data.power_details).length > 0)) && (
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
                      background: systemHealthModal.data?.health_metrics?.power_consumption?.status === 'normal' ? '#00ff00' :
                                   systemHealthModal.data?.health_metrics?.power_consumption?.status === 'warning' ? '#ff9800' : '#ff0000',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '3px solid rgba(0, 255, 0, 0.3)'
                    }}>
                      <Typography variant="h6" sx={{ 
                        color: '#000000',
                        fontWeight: 'bold'
                      }}>
                        {systemHealthModal.data?.health_metrics?.power_consumption?.status_text ||
                          (systemHealthModal.data?.power_details && Object.keys(systemHealthModal.data.power_details).length > 0 ? 
                            Object.values(systemHealthModal.data.power_details)[0]?.status || 'ERROR' : 
                            (systemHealthModal.data?.health_metrics?.power_consumption?.status === 'normal' ? 'OK' : 'ERROR'))}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" sx={{ color: '#ffffff', opacity: 0.8 }}>
                        {systemHealthModal.data?.health_metrics?.power_consumption?.description || 'Power status monitoring'}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#ffffff', opacity: 0.6 }}>
                        Power Status
                      </Typography>
                    </Box>
                  </Box>

                  {/* Detailed Power Information */}
                  {systemHealthModal.data?.power_details && (
                    <Grid container spacing={2}>
                      {Object.entries(systemHealthModal.data.power_details).map(([psu_name, psu_data]) => (
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
              {(systemHealthModal.data?.health_metrics?.fan_speed?.value || 0) > 0 && (
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
                      background: `conic-gradient(${systemHealthModal.data?.health_metrics?.fan_speed?.status === 'normal' ? '#00ff00' :
                                                   systemHealthModal.data?.health_metrics?.fan_speed?.status === 'warning' ? '#ff9800' : '#ff0000'} 0deg, 
                                                   ${systemHealthModal.data?.health_metrics?.fan_speed?.status === 'normal' ? '#00ff00' :
                                                   systemHealthModal.data?.health_metrics?.fan_speed?.status === 'warning' ? '#ff9800' : '#ff0000'} ${((systemHealthModal.data?.health_metrics?.fan_speed?.value || 0) / 100) * 360}deg, 
                                                   rgba(255, 255, 255, 0.1) ${((systemHealthModal.data?.health_metrics?.fan_speed?.value || 0) / 100) * 360}deg, 
                                                   rgba(255, 255, 255, 0.1) 360deg)`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '3px solid rgba(0, 255, 0, 0.3)'
                    }}>
                      <Typography variant="h6" sx={{ 
                        color: systemHealthModal.data?.health_metrics?.fan_speed?.status === 'normal' ? '#00ff00' :
                               systemHealthModal.data?.health_metrics?.fan_speed?.status === 'warning' ? '#ff9800' : '#ff0000',
                        fontWeight: 'bold'
                      }}>
                        {systemHealthModal.data?.health_metrics?.fan_speed?.value || 0} RPM
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" sx={{ color: '#ffffff', opacity: 0.8 }}>
                        {systemHealthModal.data?.health_metrics?.fan_speed?.description || 'Fan speed monitoring'}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#ffffff', opacity: 0.6 }}>
                        Current fan speed
                      </Typography>
                    </Box>
                  </Box>

                  {/* Detailed Fan Information */}
                  {systemHealthModal.data?.fan_details && (
                    <Grid container spacing={2}>
                      {Object.entries(systemHealthModal.data.fan_details).map(([sensor_name, sensor_data]) => (
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
                        value: systemHealthModal.data?.health_metrics?.cpu_load?.value || 0,
                        status: systemHealthModal.data?.health_metrics?.cpu_load?.status || 'unknown'
                      },
                          ...((systemHealthModal.data?.calculated_metrics?.memory_usage_percent || 
         systemHealthModal.data?.health_metrics?.memory_used_gb?.value > 0) ? [{
      name: 'Memory',
      value: systemHealthModal.data?.calculated_metrics?.memory_usage_percent?.value || 
             (systemHealthModal.data?.health_metrics?.memory_used_gb?.value > 0 && 
              systemHealthModal.data?.health_metrics?.memory_total_gb?.value > 0 ? 
              Math.round((systemHealthModal.data?.health_metrics?.memory_used_gb?.value / 
                         systemHealthModal.data?.health_metrics?.memory_total_gb?.value) * 100) : 0),
      status: systemHealthModal.data?.calculated_metrics?.memory_usage_percent?.status || 
              (() => {
                const memPercent = systemHealthModal.data?.calculated_metrics?.memory_usage_percent?.value || 
                                 (systemHealthModal.data?.health_metrics?.memory_used_gb?.value > 0 && 
                                  systemHealthModal.data?.health_metrics?.memory_total_gb?.value > 0 ? 
                                  Math.round((systemHealthModal.data?.health_metrics?.memory_used_gb?.value / 
                                             systemHealthModal.data?.health_metrics?.memory_total_gb?.value) * 100) : 0);
                return memPercent < 80 ? 'normal' : memPercent < 95 ? 'warning' : 'critical';
              })()
    }] : []),
                      ...((systemHealthModal.data?.health_metrics?.temperature?.value || 0) > 0 ? [{
                        name: 'Temperature',
                        value: systemHealthModal.data?.health_metrics?.temperature?.value || 0,
                        status: systemHealthModal.data?.health_metrics?.temperature?.status || 'unknown'
                      }] : []),
                      ...((systemHealthModal.data?.health_metrics?.power_consumption?.value || 0) > 0 ? [{
                        name: 'Power',
                        value: systemHealthModal.data?.health_metrics?.power_consumption?.value || 0,
                        status: systemHealthModal.data?.health_metrics?.power_consumption?.status || 'unknown'
                      }] : []),
                      ...((systemHealthModal.data?.health_metrics?.fan_speed?.value || 0) > 0 ? [{
                        name: 'Fan',
                        value: systemHealthModal.data?.health_metrics?.fan_speed?.value || 0,
                        status: systemHealthModal.data?.health_metrics?.fan_speed?.status || 'unknown'
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
            onClick={handleCloseSystemHealthModal}
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
    </Box>
  );
};

export default NetworkDiagram; 
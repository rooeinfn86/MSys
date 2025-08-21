
import React from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import { lazy, Suspense, useMemo } from 'react';
import { 
  ContextMenu
} from './modals';
import TopologyCanvas from './NetworkDiagram/TopologyCanvas';
import TopologyControls from './NetworkDiagram/TopologyControls';
import { useNetworkDiagramState } from '../hooks';
import ErrorBoundary from './ErrorBoundary';

// Lazy load modal components for better performance
const DeviceInfoModal = lazy(() => import('./modals/DeviceInfoModal'));
const InterfaceInfoModal = lazy(() => import('./modals/InterfaceInfoModal'));
const SystemHealthModal = lazy(() => import('./modals/SystemHealthModal'));




const NetworkDiagram = React.memo(({ networkId }) => {
  // Consolidated state management hook
  const {
    // State
    elements,
    loading,
    error,
    refreshing,
    lastUpdated,
    
    // Modal states
    deviceInfoModal,
    interfaceInfoModal,
    systemHealthModal,
    contextMenu,
    
    // Actions
    handleRefresh,
    handleDeviceInfo,
    handleRefreshDeviceInfo,
    handleInterfaceInfo,
    handleSystemHealth,
    handleDiscoverNeighbors,
    closeDeviceInfoModal,
    closeInterfaceInfoModal,
    closeSystemHealthModal,
    handleCloseContextMenu,
    handleClickOutside,
    setContextMenuDiscovering,
    
    // Visualization
    layout,
    style,
    getCytoscapeEventHandlers,
    setCytoscapeInstance,
    
    // Container
    containerRef: sizeContainerRef
  } = useNetworkDiagramState(networkId);

  // Memoize container styles to prevent unnecessary re-renders
  const containerStyles = useMemo(() => ({
    height: '100%',
    width: '100%',
    background: 'linear-gradient(135deg, #000000 0%, #0a0a0a 50%, #000000 100%)',
    borderRadius: '8px',
    boxShadow: '0 0 50px rgba(0, 255, 0, 0.2), 0 0 100px rgba(0, 255, 0, 0.1), inset 0 0 50px rgba(0, 0, 0, 0.8)',
    overflow: 'hidden',
    position: 'relative'
  }), []);





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



  return (
    <ErrorBoundary onReset={() => window.location.reload()}>
      <Box 
        ref={sizeContainerRef} 
        sx={containerStyles} 
        onClick={handleClickOutside}
        onContextMenu={(e) => e.preventDefault()}
      >
      {/* Topology Controls */}
      <TopologyControls
        refreshing={refreshing}
        lastUpdated={lastUpdated}
        onRefresh={handleRefresh}
      />

      {/* Layer 2: Cytoscape Network Diagram (z-index: 1) */}
              <TopologyCanvas
          elements={elements}
          layout={layout}
          style={style}
          refreshing={refreshing}
          getCytoscapeEventHandlers={getCytoscapeEventHandlers}
          containerRef={sizeContainerRef}
          setCytoscapeInstance={setCytoscapeInstance}
        />
      
      {/* Context Menu */}
      <ContextMenu
        open={contextMenu.mouseY !== null}
        onClose={handleCloseContextMenu}
        contextMenu={contextMenu}
        onDeviceInfo={() => handleDeviceInfo(contextMenu.nodeData)}
        onInterfaceInfo={() => handleInterfaceInfo(contextMenu.nodeData)}
        onSystemHealth={() => handleSystemHealth(contextMenu.nodeData)}
        onDiscoverNeighbors={() => handleDiscoverNeighbors(contextMenu.nodeData, handleRefresh, setContextMenuDiscovering)}
      />
      
      {/* Device Information Modal */}
      <Suspense fallback={
        <Box sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <CircularProgress sx={{ color: '#00ff00' }} />
        </Box>
      }>
        <DeviceInfoModal
          open={deviceInfoModal.open}
          onClose={closeDeviceInfoModal}
          modalData={deviceInfoModal}
          onRefresh={handleRefreshDeviceInfo}
        />
      </Suspense>
      
      {/* Interface Information Modal */}
      <Suspense fallback={
        <Box sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <CircularProgress sx={{ color: '#00ff00' }} />
        </Box>
      }>
        <InterfaceInfoModal
          open={interfaceInfoModal.open}
          onClose={closeInterfaceInfoModal}
          modalData={interfaceInfoModal}
        />
      </Suspense>
      
      {/* System Health Modal */}
      <Suspense fallback={
        <Box sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <CircularProgress sx={{ color: '#00ff00' }} />
        </Box>
      }>
        <SystemHealthModal
          open={systemHealthModal.open}
          onClose={closeSystemHealthModal}
          modalData={systemHealthModal}
        />
      </Suspense>
      </Box>
    </ErrorBoundary>
  );
});

export default NetworkDiagram; 
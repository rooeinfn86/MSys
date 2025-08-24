/**
 * Topology Styles - Centralized styling for NetworkDiagram components
 * Extracted from inline styles to improve maintainability and reusability
 */

// Main NetworkDiagram container styles
export const networkDiagramStyles = {
  container: {
    height: '100%',
    width: '100%',
    background: 'linear-gradient(135deg, #000000 0%, #0a0a0a 50%, #000000 100%)',
    borderRadius: '8px',
    boxShadow: '0 0 50px rgba(0, 255, 0, 0.2), 0 0 100px rgba(0, 255, 0, 0.1), inset 0 0 50px rgba(0, 0, 0, 0.8)',
    overflow: 'hidden',
    position: 'relative'
  },
  
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
    bgcolor: '#1a1a1a'
  },
  
  loadingSpinner: {
    color: '#1976d2'
  },
  
  errorContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
    bgcolor: '#1a1a1a'
  }
};

// Matrix Animation styles
export const matrixAnimationStyles = {
  canvas: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    zIndex: 0,
    pointerEvents: 'none'
  },
  
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    zIndex: 0
  }
};

// Topology Canvas styles
export const topologyCanvasStyles = {
  container: {
    position: 'relative',
    zIndex: 1,
    height: '100%',
    width: '100%'
  },
  
  cytoscape: {
    width: '100%',
    height: '100%'
  },
  
  loadingOverlay: {
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
  },
  
  loadingContent: {
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
  },
  
  loadingSpinner: {
    color: '#00ff00'
  },
  
  loadingText: {
    color: '#00ff00',
    fontWeight: 'bold'
  },
  
  loadingSubtext: {
    color: 'rgba(0, 255, 0, 0.7)'
  }
};

// Topology Controls styles
export const topologyControlsStyles = {
  container: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    display: 'flex',
    flexDirection: 'column',
    gap: 1,
    alignItems: 'flex-end'
  },
  
  refreshButton: {
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
  },
  
  lastUpdated: {
    background: 'rgba(0, 0, 0, 0.7)',
    color: '#00ff00',
    px: 2,
    py: 1,
    borderRadius: '12px',
    fontSize: '0.75rem',
    fontWeight: 'bold',
    border: '1px solid rgba(0, 255, 0, 0.3)',
    backdropFilter: 'blur(10px)'
  },
  
  legend: {
    background: 'rgba(0, 0, 0, 0.8)',
    color: '#ffffff',
    px: 3,
    py: 2,
    borderRadius: '12px',
    fontSize: '0.8rem',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    backdropFilter: 'blur(10px)',
    mt: 1
  },
  
  legendTitle: {
    color: '#00ff00',
    fontWeight: 'bold',
    mb: 1,
    textAlign: 'center'
  },
  
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 1
  },
  
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: '50%',
    border: '1px solid #ffffff'
  },
  
  legendText: {
    color: '#ffffff'
  }
};

// Context Menu styles
export const contextMenuStyles = {
  menu: {
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
  },
  
  menuItem: {
    fontWeight: 'bold',
    '&:hover': {
      background: 'rgba(0, 255, 0, 0.2)',
      color: '#00ff00'
    }
  },
  
  disabledMenuItem: {
    color: 'rgba(255, 255, 255, 0.5)',
    cursor: 'not-allowed'
  }
};

// Basic modal styles (for simple dialogs)
export const basicModalStyles = {
  dialog: {
    '& .MuiDialog-paper': {
      background: 'linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 50%, #1a1a1a 100%)',
      border: '1px solid #00ff00',
      boxShadow: '0 0 20px rgba(0, 255, 0, 0.3)',
      borderRadius: '12px',
      color: '#ffffff'
    }
  },
  
  dialogTitle: {
    background: 'linear-gradient(90deg, #00ff00 0%, #00cc00 100%)',
    color: '#000000',
    fontWeight: 'bold',
    borderRadius: '12px 12px 0 0'
  },
  
  dialogContent: {
    background: 'rgba(0, 0, 0, 0.8)',
    color: '#ffffff'
  },
  
  dialogActions: {
    background: 'rgba(0, 0, 0, 0.9)',
    borderTop: '1px solid rgba(0, 255, 0, 0.3)',
    borderRadius: '0 0 12px 12px'
  }
};

// Device status colors
export const deviceStatusColors = {
  online: '#00ff00',
  partial: '#ff9800',
  offline: '#ff0000'
};

// Animation settings
export const animationSettings = {
  transition: 'all 0.2s ease-in-out',
  hoverTransform: 'translateY(-1px)',
  activeTransform: 'translateY(0px)'
};

// Z-index layers
export const zIndexLayers = {
  matrixAnimation: 0,
  topologyCanvas: 1,
  loadingOverlay: 2,
  topologyControls: 10,
  contextMenu: 20,
  modals: 30
};

// Export all styles as a single object for easy access
export const topologyStyles = {
  networkDiagram: networkDiagramStyles,
  matrixAnimation: matrixAnimationStyles,
  topologyCanvas: topologyCanvasStyles,
  topologyControls: topologyControlsStyles,
  contextMenu: contextMenuStyles,
  deviceStatus: deviceStatusColors,
  animation: animationSettings,
  zIndex: zIndexLayers
}; 
/**
 * Modal Styles - Centralized styling for all modal components
 * Extracted from inline styles to improve maintainability and consistency
 */

// Common modal styles
export const commonModalStyles = {
  dialog: {
    '& .MuiDialog-paper': {
      background: 'linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 50%, #1a1a1a 100%)',
      border: '1px solid #00ff00',
      boxShadow: '0 0 20px rgba(0, 255, 0, 0.3), 0 0 40px rgba(0, 255, 0, 0.1)',
      borderRadius: '16px',
      color: '#ffffff',
      maxWidth: '90vw',
      maxHeight: '90vh'
    }
  },
  
  dialogTitle: {
    background: 'linear-gradient(90deg, #00ff00 0%, #00cc00 100%)',
    color: '#000000',
    fontWeight: 'bold',
    borderRadius: '16px 16px 0 0',
    borderBottom: '2px solid rgba(0, 255, 0, 0.5)',
    '& .MuiTypography-root': {
      fontWeight: 'bold',
      fontSize: '1.25rem'
    }
  },
  
  dialogContent: {
    background: 'rgba(0, 0, 0, 0.9)',
    color: '#ffffff',
    padding: '24px',
    '& .MuiTypography-root': {
      color: '#ffffff'
    }
  },
  
  dialogActions: {
    background: 'rgba(0, 0, 0, 0.95)',
    borderTop: '1px solid rgba(0, 255, 0, 0.3)',
    borderRadius: '0 0 16px 16px',
    padding: '16px 24px'
  },
  
  closeButton: {
    color: '#00ff00',
    '&:hover': {
      background: 'rgba(0, 255, 0, 0.1)',
      transform: 'scale(1.1)'
    },
    transition: 'all 0.2s ease-in-out'
  }
};

// Device Info Modal specific styles
export const deviceInfoModalStyles = {
  deviceHeader: {
    background: 'linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%)',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '16px',
    border: '1px solid rgba(0, 255, 0, 0.3)'
  },
  
  deviceName: {
    color: '#00ff00',
    fontWeight: 'bold',
    fontSize: '1.5rem',
    marginBottom: '8px'
  },
  
  deviceType: {
    color: '#ffffff',
    fontSize: '1rem',
    opacity: 0.8
  },
  
  infoSection: {
    background: 'rgba(0, 0, 0, 0.6)',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '16px',
    border: '1px solid rgba(255, 255, 255, 0.1)'
  },
  
  sectionTitle: {
    color: '#00ff00',
    fontWeight: 'bold',
    fontSize: '1.1rem',
    marginBottom: '12px',
    borderBottom: '1px solid rgba(0, 255, 0, 0.3)',
    paddingBottom: '4px'
  },
  
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px'
  },
  
  infoItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  
  infoLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: '0.875rem',
    fontWeight: '500'
  },
  
  infoValue: {
    color: '#ffffff',
    fontSize: '1rem',
    fontWeight: 'bold'
  },
  
  statusIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: '50%',
    border: '2px solid #ffffff'
  },
  
  refreshButton: {
    background: 'linear-gradient(90deg, #00ff00 0%, #00cc00 100%)',
    color: '#000000',
    fontWeight: 'bold',
    borderRadius: '20px',
    '&:hover': {
      background: 'linear-gradient(90deg, #00cc00 0%, #009900 100%)',
      transform: 'translateY(-1px)'
    },
    transition: 'all 0.2s ease-in-out'
  }
};

// Interface Info Modal specific styles
export const interfaceInfoModalStyles = {
  interfaceList: {
    background: 'rgba(0, 0, 0, 0.6)',
    borderRadius: '8px',
    padding: '16px',
    maxHeight: '400px',
    overflow: 'auto'
  },
  
  interfaceItem: {
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '6px',
    padding: '12px',
    marginBottom: '8px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    '&:hover': {
      background: 'rgba(255, 255, 255, 0.08)',
      borderColor: 'rgba(0, 255, 0, 0.3)'
    },
    transition: 'all 0.2s ease-in-out'
  },
  
  interfaceHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px'
  },
  
  interfaceName: {
    color: '#00ff00',
    fontWeight: 'bold',
    fontSize: '1rem'
  },
  
  interfaceStatus: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  
  interfaceDetails: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '8px',
    fontSize: '0.875rem'
  },
  
  noInterfaces: {
    textAlign: 'center',
    color: 'rgba(255, 255, 255, 0.6)',
    fontStyle: 'italic',
    padding: '32px 16px'
  }
};

// System Health Modal specific styles
export const systemHealthModalStyles = {
  healthOverview: {
    background: 'linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%)',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '20px',
    border: '1px solid rgba(0, 255, 0, 0.3)'
  },
  
  healthScore: {
    textAlign: 'center',
    marginBottom: '16px'
  },
  
  scoreValue: {
    fontSize: '3rem',
    fontWeight: 'bold',
    marginBottom: '8px'
  },
  
  scoreLabel: {
    fontSize: '1.1rem',
    opacity: 0.8
  },
  
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
    gap: '16px',
    marginBottom: '20px'
  },
  
  metricCard: {
    background: 'rgba(0, 0, 0, 0.6)',
    borderRadius: '8px',
    padding: '16px',
    textAlign: 'center',
    border: '1px solid rgba(255, 255, 255, 0.1)'
  },
  
  metricValue: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    marginBottom: '4px'
  },
  
  metricLabel: {
    fontSize: '0.875rem',
    opacity: 0.7
  },
  
  chartContainer: {
    background: 'rgba(0, 0, 0, 0.6)',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '20px',
    border: '1px solid rgba(255, 255, 255, 0.1)'
  },
  
  chartTitle: {
    color: '#00ff00',
    fontWeight: 'bold',
    fontSize: '1.1rem',
    marginBottom: '16px',
    textAlign: 'center'
  },
  
  chartWrapper: {
    height: '300px',
    width: '100%'
  }
};

// Export all modal styles
export const modalStyles = {
  common: commonModalStyles,
  deviceInfo: deviceInfoModalStyles,
  interfaceInfo: interfaceInfoModalStyles,
  systemHealth: systemHealthModalStyles
}; 
/**
 * Styles Index - Central export point for all styling modules
 * Provides easy access to all extracted styles from components
 */

// Topology-specific styles
export {
  networkDiagramStyles,
  matrixAnimationStyles,
  topologyCanvasStyles,
  topologyControlsStyles,
  contextMenuStyles,
  basicModalStyles,
  deviceStatusColors,
  animationSettings,
  zIndexLayers,
  topologyStyles
} from './topologyStyles';

// Modal-specific styles  
export {
  commonModalStyles,
  deviceInfoModalStyles,
  interfaceInfoModalStyles,
  systemHealthModalStyles,
  modalStyles
} from './modalStyles';

// Cytoscape-specific styles
export {
  cytoscapeLayouts,
  cytoscapeStylesheet,
  cytoscapeInteractionStyles,
  cytoscapeStyles
} from './cytoscapeStyles';

// Re-export existing CSS files for backward compatibility
export { default as deviceInventoryStyles } from './DeviceInventory.css';
export { default as companyTokenStyles } from './CompanyTokenManagement.css';
export { default as teamManagementStyles } from './TeamManagement.css';
export { default as complianceStyles } from './Compliance.css';
export { default as configVerificationStyles } from './ConfigVerification.css';
export { default as configReviewStyles } from './ConfigReview.css';
export { default as deviceLogsStyles } from './DeviceLogs.css';
export { default as navigationStyles } from './Navigation.css'; 
// Hooks index - exports all custom hooks

// Existing hooks
export { useDeviceActions } from './useDeviceActions';
export { useDevices } from './useDevices';
export { useAgents } from './useAgents';
export { useTooltip } from './useTooltip';
export { default as useAuth } from './useAuth';
export { default as useFeatures } from './useFeatures';
export { default as useOrganizations } from './useOrganizations';
export { default as useNotifications } from './useNotifications';

// New topology-related hooks
export { useTopologyData } from './useTopologyData';
export { useTopologyVisualization } from './useTopologyVisualization';
export { useTopologyModals } from './useTopologyModals';
export { useMatrixAnimation } from './useMatrixAnimation';
export { useContainerSize } from './useContainerSize';

// New consolidated state management hooks (Phase 6)
export { default as useTopologyState } from './useTopologyState';
export { default as useModalState } from './useModalState';
export { default as useVisualizationState } from './useVisualizationState';
export { default as useAnimationState } from './useAnimationState';

// Master consolidated hook (Phase 6)
export { default as useNetworkDiagramState } from './useNetworkDiagramState'; 
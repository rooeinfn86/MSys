// Service layer index - exports all services

// Core services
export { deviceService } from './deviceService';
export { discoveryService } from './discoveryService';
export { topologyService, topologyMonitoringService } from './topologyService';
export { agentService } from './agentService';
export { default as backgroundMonitoringService } from './backgroundMonitoringService';

// UI services
export { default as ModalService } from './ModalService';
export { default as NotificationService } from './NotificationService';
export { default as TeamManagementService } from './TeamManagementService';

// Re-export commonly used service functions with aliases
export { topologyService as topology } from './topologyService';
export { topologyMonitoringService as topologyMonitoring } from './topologyService';
export { deviceService as devices } from './deviceService';
export { discoveryService as discovery } from './discoveryService';
export { agentService as agents } from './agentService';
export { default as monitoring } from './backgroundMonitoringService'; 